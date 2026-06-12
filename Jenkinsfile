pipeline {
    agent {
        label 'docker-build-agent'
    }


    environment {
        DOCKER_CREDS_ID = 'dockerhub-creds'
        DOCKER_REGISTRY = 'docker.io'
      //   Replace yourdockerhubusername with your actual DockerHub username
        DOCKER_IMAGE_NAME = "scalersamarth/enterprise-app"
        IMAGE_TAG = "v1.0.${BUILD_NUMBER}"
        FULL_IMAGE = "${DOCKER_IMAGE_NAME}:${IMAGE_TAG}"
        PROD_SERVER_IP = "172.31.46.146" // REPLACE WITH YOUR PROD SERVER PRIVATE IP
        PROD_USER = "deploy_user"
    }


    options {
        // Keep only the last 10 builds to save disk space
        buildDiscarder(logRotator(numToKeepStr: '10'))
        // Abort the pipeline if it takes longer than 30 minutes
        timeout(time: 30, unit: 'MINUTES')
        disableConcurrentBuilds()
    }


    stages {
        stage('Checkout Source Code') {
            steps {
                echo "Checking out code from GitHub..."
                checkout scm
            }
        }


        stage('Install Dependencies & Unit Test') {
            steps {
                echo "Installing npm packages and executing Jest tests..."
                sh 'npm install'
                sh 'npm test' 
            }
        }


        stage('Static Code Analysis (SonarQube)') {
            environment {
                scannerHome = tool 'SonarQubeScanner' // Ensure this is configured in Global Tool Configuration
            }
            steps {
                echo "Running SonarQube analysis..."
                withSonarQubeEnv('SonarQube-Enterprise') {
                    sh "${scannerHome}/bin/sonar-scanner"
                }
            }
        }


        stage('Quality Gate') {
            steps {
                echo "Waiting for SonarQube to calculate Quality Gate status..."
                                // SonarQube posts a webhook to Jenkins when analysis completes.
                // If the gate fails, the pipeline aborts here.
                // Prerequisite: webhook must be configured in SonarQube .
                waitForQualityGate abortPipeline: true
            }
        }


        stage('Build Docker Image') {
            steps {
                echo "Building Docker Image: ${FULL_IMAGE}"
                sh "docker build -t ${FULL_IMAGE} ."
            }
        }


        stage('Container Vulnerability Scan (Trivy)') {
            steps {
                echo "Scanning ${FULL_IMAGE} for HIGH and CRITICAL vulnerabilities..."
                // Fails the build (exit code 1) ONLY if CRITICAL vulnerabilities are found
                sh "trivy image --severity CRITICAL --exit-code 0 --no-progress ${FULL_IMAGE}"
            }
        }


        stage('Push to Remote Registry') {
            steps {
                echo "Pushing image to DockerHub..."
                withCredentials([usernamePassword(credentialsId: DOCKER_CREDS_ID, passwordVariable: 'DOCKER_PASS', usernameVariable: 'DOCKER_USER')]) {
                    sh """
                        echo "${DOCKER_PASS}" | docker login -u "${DOCKER_USER}" --password-stdin
                        docker push ${FULL_IMAGE}
                        
                        # Also tag and push as latest for easy reference
                        docker tag ${FULL_IMAGE} ${DOCKER_IMAGE_NAME}:latest
                        docker push ${DOCKER_IMAGE_NAME}:latest
                        
                        docker logout
                    """
                }
            }
        }


        stage('Deploy to Production EC2') {
            steps {
                echo "Initiating remote deployment to Production Server..."
                // Use the SSH agent plugin to load the private key for the Prod Server
                sshagent(credentials: ['prod-ssh-key']) {
                    sh """
                        scp -o StrictHostKeyChecking=no docker-compose.yml ${PROD_USER}@${PROD_SERVER_IP}:/home/${PROD_USER}/docker-compose.yml
                        
                        ssh -o StrictHostKeyChecking=no ${PROD_USER}@${PROD_SERVER_IP} '
                            export DOCKER_IMAGE=${FULL_IMAGE}
                            
                            # Pull the specific new image
                            docker pull ${FULL_IMAGE}
                            
                            # Restart the service with Docker Compose (down and up)
                            docker compose -f /home/${PROD_USER}/docker-compose.yml up -d --remove-orphans
                            
                            # Prune old images to prevent disk space exhaustion
                            docker image prune -a -f --filter "until=24h"
                        '
                    """
                }
            }
        }


        stage('Production Health Check') {
            steps {
                echo "Verifying application health on Production Server..."
                timeout(time: 1, unit: 'MINUTES') {
                    waitUntil {
                        script {
                            def response = sh(script: "curl -s -o /dev/null -w '%{http_code}' http://${PROD_SERVER_IP}/health", returnStdout: true).trim()
                            return response == "200"
                        }
                    }
                }
            }
        }
    }


    post {
        always {
            echo "Cleaning up local workspace on the Agent..."
            cleanWs()
            // Clean up local docker images on the agent to save space
            sh "docker rmi ${FULL_IMAGE} || true"
        }
        success {
            echo "Deployment Successful!"
            // Send a Slack message indicating success
            // slackSend(color: 'good', message: "✅ SUCCESS: Job '${env.JOB_NAME} [${env.BUILD_NUMBER}]' deployed successfully. Image: ${FULL_IMAGE}")
        }
        failure {
            echo "Deployment Failed!"
            // Send a Slack message indicating failure
            // slackSend(color: 'danger', message: "❌ FAILED: Job '${env.JOB_NAME} [${env.BUILD_NUMBER}]' has failed. Please check Jenkins logs.")
        }
    }
}

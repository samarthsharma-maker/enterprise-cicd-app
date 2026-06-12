FROM node:18-alpine AS builder
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --only=production
COPY . .

FROM node:18-alpine
WORKDIR /usr/src/app
# Create non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY --from=builder /usr/src/app .
RUN chown -R appuser:appgroup /usr/src/app
USER appuser
EXPOSE 3000
CMD ["npm", "start"]

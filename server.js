const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;


app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', message: 'Application is healthy', version: '1.0.0' });
});


app.get('/', (req, res) => {
  res.send('<h1>Enterprise CI/CD Pipeline Successful!</h1>');
});


const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


module.exports = server;

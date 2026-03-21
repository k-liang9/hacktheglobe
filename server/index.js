const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');

require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const routes = require('./routes');

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
}));
app.use(express.json());

app.use('/api', routes);

// HTTP on port 3000 — used by the extension
http.createServer(app).listen(3000, '0.0.0.0', () => {
  console.log('DouglasAI server (HTTP) running on http://localhost:3000');
});

// HTTPS on port 3443 — used for Epic OAuth callback only
const sslOptions = {
  key: fs.readFileSync(path.join(__dirname, 'key.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'cert.pem')),
};

https.createServer(sslOptions, app).listen(3443, '0.0.0.0', () => {
  console.log('DouglasAI server (HTTPS) running on https://localhost:3443');
});

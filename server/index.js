const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
}));
app.use(express.json());

app.use('/api', routes);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`MyChart Copilot server running on http://localhost:${PORT}`);
});

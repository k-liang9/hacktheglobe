const express = require('express');
const { z } = require('zod');
const { getAuthUrl, exchangeCode } = require('./auth');
const { fetchAllPatientData } = require('./fhir');
const { deidentify } = require('./deidentify');
const { generateInsight, chat } = require('./inference');
const context = require('./context');

const router = express.Router();

const PageUpdateSchema = z.object({
  url: z.string(),
  title: z.string(),
  bodyText: z.string().max(10000),
});

const CallbackSchema = z.object({
  code: z.string(),
});

// Health check
router.get('/health', (req, res) => {
  res.json({ ok: true });
});

// Start OAuth flow — returns the authorization URL
router.get('/auth/start', (req, res) => {
  try {
    const url = getAuthUrl();
    res.json({ url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// OAuth callback — exchange code for token, then fetch FHIR data
// POST version (from extension background.js)
router.post('/auth/callback', async (req, res) => {
  try {
    const { code } = CallbackSchema.parse(req.body);
    await exchangeCode(code);
    await fetchAllPatientData();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET version (Epic redirects here with ?code= in the browser)
router.get('/auth/callback', async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) {
      res.status(400).send('Missing authorization code');
      return;
    }
    await exchangeCode(code);
    await fetchAllPatientData();
    res.send(`
      <!DOCTYPE html>
      <html>
      <head><title>DouglasAI</title></head>
      <body style="font-family: system-ui, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f9fafb;">
        <div style="text-align: center; padding: 2rem;">
          <h1 style="font-size: 1.5rem; color: #111827;">Connected successfully</h1>
          <p style="color: #6b7280; margin-top: 0.5rem;">You can close this tab and return to the DouglasAI sidebar.</p>
        </div>
      </body>
      </html>
    `);
  } catch (err) {
    res.status(500).send(`Authorization failed: ${err.message}`);
  }
});

// Check if user is authenticated
router.get('/auth/status', (req, res) => {
  const token = context.get('accessToken');
  res.json({ authenticated: !!token });
});

// Log out — clear all session data
router.post('/auth/logout', (req, res) => {
  context.reset();
  res.json({ ok: true });
});

// Receive page updates from the extension
router.post('/page-update', async (req, res) => {
  try {
    const pageData = PageUpdateSchema.parse(req.body);
    const deidentifiedBody = await deidentify(pageData.bodyText);
    context.set('currentPage', {
      url: pageData.url,
      title: pageData.title,
      bodyText: deidentifiedBody,
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Generate insight from current context
router.post('/generate-insight', async (req, res) => {
  try {
    const language = req.body?.language || 'en';
    const result = await generateInsight(language);
    res.json(result);
  } catch (err) {
    console.error('Insight generation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Chat with patient context
router.post('/chat', async (req, res) => {
  try {
    const { messages, language } = req.body;
    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ error: 'messages array is required' });
      return;
    }
    const reply = await chat(messages, language || 'en');
    res.json({ reply });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: err.message });
  }
});

// MyChart shim — multi-page demo site
const shimRouter = require('./shim');

router.use('/mychart', shimRouter);

module.exports = router;

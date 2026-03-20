const express = require('express');
const { z } = require('zod');
const { getAuthUrl, exchangeCode } = require('./auth');
const { fetchAllPatientData } = require('./fhir');
const { deidentify } = require('./deidentify');
const { generateInsight } = require('./inference');
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
    const result = await generateInsight();
    const currentPage = context.get('currentPage');
    res.json({
      ...result,
      pageTitle: currentPage?.title || 'Unknown page',
    });
  } catch (err) {
    console.error('Insight generation error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

const axios = require('axios');

const PRESIDIO_ANALYZER_URL = process.env.PRESIDIO_ANALYZER_URL || 'http://localhost:5002';
const PRESIDIO_ANONYMIZER_URL = process.env.PRESIDIO_ANONYMIZER_URL || 'http://localhost:5001';

const ENTITIES_TO_STRIP = [
  'PERSON',
  'DATE_TIME',
  'LOCATION',
  'PHONE_NUMBER',
  'EMAIL_ADDRESS',
  'MEDICAL_LICENSE',
  'US_SSN',
  'URL',
  'NRP',
];

function fallbackDeidentify(text) {
  let cleaned = text;
  // SSN
  cleaned = cleaned.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[US SSN]');
  // Phone numbers
  cleaned = cleaned.replace(/\b(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, '[PHONE NUMBER]');
  // Email
  cleaned = cleaned.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL ADDRESS]');
  // Dates (MM/DD/YYYY, YYYY-MM-DD)
  cleaned = cleaned.replace(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g, '[DATE TIME]');
  cleaned = cleaned.replace(/\b\d{4}-\d{2}-\d{2}\b/g, '[DATE TIME]');
  return cleaned;
}

async function deidentify(text) {
  if (!text || !text.trim()) return '';

  try {
    // Step 1: Analyze — detect PII entities
    const analyzeResponse = await axios.post(`${PRESIDIO_ANALYZER_URL}/analyze`, {
      text,
      language: 'en',
      entities: ENTITIES_TO_STRIP,
      score_threshold: 0.5,
    });

    const analyzerResults = analyzeResponse.data;

    if (!analyzerResults.length) return text;

    // Step 2: Anonymize — replace detected entities with tags
    const anonymizeResponse = await axios.post(`${PRESIDIO_ANONYMIZER_URL}/anonymize`, {
      text,
      analyzer_results: analyzerResults,
      anonymizers: ENTITIES_TO_STRIP.reduce((acc, entity) => {
        acc[entity] = { type: 'replace', new_value: `[${entity.replace(/_/g, ' ')}]` };
        return acc;
      }, {
        DEFAULT: { type: 'replace', new_value: '[REDACTED]' },
      }),
    });

    return anonymizeResponse.data.text;
  } catch (err) {
    // If Presidio is unavailable, fall back to a basic regex scrub
    console.warn('Presidio unavailable, using fallback de-identification:', err.message);
    return fallbackDeidentify(text);
  }
}

module.exports = { deidentify };

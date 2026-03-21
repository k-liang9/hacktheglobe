const axios = require('axios');
const context = require('./context');
const { summarizeFhirData } = require('./fhir');
const { deidentify } = require('./deidentify');

const DEEPSEEK_BASE = 'https://api.deepseek.com';

function llmHeaders() {
  return {
    Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    'Content-Type': 'application/json',
  };
}

async function callLLM(messages, maxTokens = 1536) {
  const response = await axios.post(
    `${DEEPSEEK_BASE}/chat/completions`,
    {
      model: 'deepseek-chat',
      max_tokens: maxTokens,
      response_format: { type: 'json_object' },
      messages,
    },
    { headers: llmHeaders() },
  );
  return response.data.choices[0].message.content;
}

function parseJSON(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    return null;
  }
}

// ── Build context strings (shared across features) ──────────────

async function buildContext() {
  const currentPage = context.get('currentPage');
  const fhirData = context.get('fhirData');

  const pageText = currentPage
    ? `Current page: ${currentPage.title}\nURL: ${currentPage.url}\n\nPage content:\n${currentPage.bodyText}`
    : 'No page content available.';

  const deidentifiedPage = await deidentify(pageText);
  const historySummary = summarizeFhirData(fhirData);
  const deidentifiedHistory = await deidentify(historySummary);

  return { deidentifiedPage, deidentifiedHistory, currentPage };
}

// ── Generate full insight (summary + insights + aftercare) ──────

const INSIGHT_SYSTEM = `You are a helpful medical document assistant for patients using MyChart.
Your job is to help patients understand their medical documents in plain, accessible language.
All patient data you receive has been de-identified — names, dates, and locations have been replaced with generic tags.

Guidelines:
- Use simple, non-technical language whenever possible
- When using medical terms, provide a brief plain-language explanation in parentheses
- Be empathetic and reassuring, but never dismiss concerns
- Do not diagnose or give medical advice — instead, suggest questions the patient can raise with their doctor
- Focus on helping the patient understand what the document says and what it might mean for their care

You MUST respond with valid JSON in this exact format:
{
  "summary": "A plain-language summary of the current document",
  "insights": ["Proactive observation 1 about test results or health data", "Observation 2", ...],
  "aftercare": {
    "medication_schedule": ["Medication 1: dosage and when to take it", "Medication 2: dosage and when to take it", ...],
    "symptoms_to_monitor": ["Symptom 1 to watch for and when to seek care", "Symptom 2", ...],
    "daily_reminders": ["Stay hydrated — drink 8 glasses of water daily", "Reminder 2", ...]
  },
  "issues": ["Question to discuss with doctor 1", "Question 2", ...]
}`;

async function generateInsight(language) {
  const { deidentifiedPage, deidentifiedHistory, currentPage } = await buildContext();

  const languageInstruction = language && language !== 'en'
    ? `\n\nIMPORTANT: Respond with ALL text content in ${language}. The JSON keys must remain in English, but all string values (summary, insights, aftercare, issues) must be written in ${language}.`
    : '';

  const userPrompt = `Here is the medical document the patient is currently viewing:

---
${deidentifiedPage}
---

Here is the patient's relevant medical history for context:

---
${deidentifiedHistory}
---

Please analyze the current document and provide:
1. "summary": A clear, plain-language summary of what this document says
2. "insights": Proactive observations about the patient's health data — flag any concerning lab values, potential drug interactions, trends worth noting, or anything the patient should be aware of based on their conditions and medications
3. "aftercare": An object with three subsections:
   - "medication_schedule": A daily schedule of when the patient should take each active medication, with dosage info. Be specific about timing (morning, evening, with food, etc.)
   - "symptoms_to_monitor": Symptoms the patient should watch for given their conditions and medications, and when to seek urgent care
   - "daily_reminders": General wellness reminders like hydration, exercise, sleep — keep these practical and relevant to their conditions. Do NOT include appointment logistics, prescription pickups, or insurance reminders.
4. "issues": Questions or important points the patient should raise with their doctor at their next visit
${languageInstruction}
Respond with JSON only.`;

  const text = await callLLM([
    { role: 'system', content: INSIGHT_SYSTEM },
    { role: 'user', content: userPrompt },
  ], 2048);

  const parsed = parseJSON(text);
  if (parsed) {
    const ac = parsed.aftercare || {};
    return {
      summary: parsed.summary || '',
      insights: parsed.insights || [],
      aftercare: {
        medication_schedule: ac.medication_schedule || [],
        symptoms_to_monitor: ac.symptoms_to_monitor || [],
        daily_reminders: ac.daily_reminders || [],
      },
      issues: parsed.issues || [],
      pageTitle: currentPage?.title || 'Unknown page',
    };
  }

  return {
    summary: text,
    insights: [],
    aftercare: { medication_schedule: [], symptoms_to_monitor: [], daily_reminders: [] },
    issues: ['Could not parse structured response — showing raw output above.'],
    pageTitle: currentPage?.title || 'Unknown page',
  };
}

// ── Chat ────────────────────────────────────────────────────────

const CHAT_SYSTEM = `You are DouglasAI, a friendly and empathetic medical document assistant.
You help patients understand their health records, lab results, medications, and medical documents.
All patient data has been de-identified.

Guidelines:
- Answer in plain, accessible language
- When using medical terms, explain them in parentheses
- Never diagnose — suggest the patient discuss concerns with their doctor
- Be warm, patient, and encouraging
- If asked about something not in the provided context, say so honestly
- Keep responses concise but thorough

You have access to the patient's current page context and medical history (provided below).
Respond naturally as a conversational assistant. Do NOT respond with JSON — respond in plain text.`;

async function chat(messages, language) {
  const { deidentifiedPage, deidentifiedHistory } = await buildContext();

  const languageInstruction = language && language !== 'en'
    ? `\nRespond in ${language}.`
    : '';

  const systemMsg = `${CHAT_SYSTEM}

--- CURRENT PAGE ---
${deidentifiedPage}

--- PATIENT HISTORY ---
${deidentifiedHistory}
${languageInstruction}`;

  const response = await axios.post(
    `${DEEPSEEK_BASE}/chat/completions`,
    {
      model: 'deepseek-chat',
      max_tokens: 1024,
      messages: [
        { role: 'system', content: systemMsg },
        ...messages,
      ],
    },
    { headers: llmHeaders() },
  );

  return response.data.choices[0].message.content;
}

module.exports = { generateInsight, chat };

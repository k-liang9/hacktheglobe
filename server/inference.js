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
    "medication_schedule": [
      {"time": "6:30 AM", "label": "Wake up", "meds": ["Omeprazole 20mg — on empty stomach"]},
      {"time": "7:00 AM", "label": "Breakfast", "meds": ["Metformin 500mg — with food", "Lisinopril 10mg"]},
      {"time": "12:00 PM", "label": "Lunch", "meds": ["Ibuprofen 400mg — with food, if needed for pain"]},
      {"time": "6:00 PM", "label": "Dinner", "meds": ["Metformin 500mg — with food", "Amlodipine 5mg"]},
      {"time": "9:00 PM", "label": "Bedtime", "meds": ["Atorvastatin 20mg"]}
    ],
    "symptoms_to_monitor": ["Symptom 1 to watch for and when to seek care", "Symptom 2", ...],
    "daily_reminders": ["Stay hydrated — drink 8 glasses of water daily", "Reminder 2", ...],
    "follow_up_appointments": ["Appointment 1: who to see, when, and why", "Appointment 2", ...]
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
   - "medication_schedule": An array of time-slot objects for a full daily schedule. Each object has: "time" (e.g. "6:30 AM"), "label" (e.g. "Wake up", "Breakfast", "Lunch", "Dinner", "Bedtime"), and "meds" (array of medication instructions for that slot). Order medications by when they must be taken, accounting for spacing rules (e.g. Omeprazole 30min before food). Group medications into ~5 time slots across the day. Include specific dosage and any instructions (with food, empty stomach, etc.).
   - "symptoms_to_monitor": Symptoms the patient should watch for given their conditions and medications, and when to seek urgent care
   - "daily_reminders": General wellness reminders like hydration, exercise, sleep — keep these practical and relevant to their conditions. Do NOT include appointment logistics, prescription pickups, or insurance reminders.
   - "follow_up_appointments": ONLY include follow-up appointments that are explicitly mentioned in the visit notes or provider recommendations. Include who to see, when, and why. Do NOT invent or recommend appointments that are not stated in the data. If no follow-ups are mentioned, return an empty array.
4. "issues": Cross-reference the patient's ENTIRE medical history to find things their doctors may have missed or that fell through the cracks across multiple providers. Specifically look for:
   - Medications that one provider prescribed but another provider recommended stopping or flagged as harmful (this is the HIGHEST priority — list it first if found)
   - Lab values with concerning trends over time (e.g. a value that was normal 6 months ago but is now high, or steadily worsening across multiple tests)
   - Drug interactions or contraindications given the patient's current conditions
   - Ordered follow-ups or tests that appear overdue based on the timeline
   - Conditions that may be worsening based on recent labs but haven't been addressed in recent visit notes
   Frame each issue as a SHORT question (1-2 sentences max). Be specific but concise — state the finding and the question, nothing more.
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
        follow_up_appointments: ac.follow_up_appointments || [],
      },
      issues: parsed.issues || [],
      pageTitle: currentPage?.title || 'Unknown page',
    };
  }

  return {
    summary: text,
    insights: [],
    aftercare: {
      medication_schedule: [],
      symptoms_to_monitor: [],
      daily_reminders: [],
      follow_up_appointments: [],
    },
    issues: [
      'Could not parse structured response — showing raw output above.',
    ],
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

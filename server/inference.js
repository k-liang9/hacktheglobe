const OpenAI = require('openai');
const context = require('./context');
const { summarizeFhirData } = require('./fhir');
const { deidentify } = require('./deidentify');

const client = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.DEEPSEEK_API_KEY,
});

const SYSTEM_PROMPT = `You are a helpful medical document assistant for patients using MyChart.
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
  "issues": ["Issue or question 1 to discuss with doctor", "Issue or question 2", ...]
}`;

async function generateInsight() {
  const currentPage = context.get('currentPage');
  const fhirData = context.get('fhirData');

  const pageText = currentPage
    ? `Current page: ${currentPage.title}\nURL: ${currentPage.url}\n\nPage content:\n${currentPage.bodyText}`
    : 'No page content available.';

  const deidentifiedPage = await deidentify(pageText);
  const historySummary = summarizeFhirData(fhirData);
  const deidentifiedHistory = await deidentify(historySummary);

  const userPrompt = `Here is the medical document the patient is currently viewing:

---
${deidentifiedPage}
---

Here is the patient's relevant medical history for context:

---
${deidentifiedHistory}
---

Please analyze the current document and provide:
1. A clear, plain-language summary of what this document says
2. A list of potential issues, questions, or important points the patient should discuss with their doctor — especially anything that relates to their broader medical history

Respond with JSON only.`;

  const response = await client.chat.completions.create({
    model: 'deepseek-chat',
    max_tokens: 1024,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
  });

  const text = response.choices[0].message.content;

  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    return {
      summary: text,
      issues: ['Could not parse structured response — showing raw output above.'],
    };
  }
}

module.exports = { generateInsight };

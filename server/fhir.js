const axios = require('axios');
const { z } = require('zod');
const context = require('./context');
const { enrichFhirData } = require('./supplement');

const FHIR_BASE = 'https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4';

const BundleSchema = z.object({
  resourceType: z.literal('Bundle'),
  entry: z.array(z.object({
    resource: z.record(z.unknown()),
  })).optional().default([]),
});

function fhirClient() {
  const token = context.get('accessToken');
  return axios.create({
    baseURL: FHIR_BASE,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/fhir+json',
    },
  });
}

async function fetchBundle(resourceType, params = {}) {
  const client = fhirClient();
  const patientId = context.get('patient');
  const { data } = await client.get(`/${resourceType}`, {
    params: { patient: patientId, ...params },
  });
  const bundle = BundleSchema.parse(data);
  return bundle.entry.map((e) => e.resource);
}

async function fetchAllPatientData() {
  const [conditions, medications, observations, allergies] = await Promise.all([
    fetchBundle('Condition', { 'clinical-status': 'active' }),
    fetchBundle('MedicationRequest', { status: 'active' }),
    fetchBundle('Observation', { category: 'laboratory', _count: 20, _sort: '-date' }),
    fetchBundle('AllergyIntolerance'),
  ]);

  const rawData = {
    conditions,
    medications,
    observations,
    allergies,
  };

  const fhirData = enrichFhirData(rawData);
  context.set('fhirData', fhirData);
  return fhirData;
}

function summarizeFhirData(fhirData) {
  if (!fhirData) return 'No medical history available.';

  const parts = [];

  if (fhirData.conditions.length) {
    const items = fhirData.conditions
      .map((c) => c.code?.text || c.code?.coding?.[0]?.display || 'Unknown')
      .join(', ');
    parts.push(`Active conditions: ${items}`);
  }

  if (fhirData.medications.length) {
    const items = fhirData.medications
      .map((m) => m.medicationCodeableConcept?.text
        || m.medicationCodeableConcept?.coding?.[0]?.display
        || 'Unknown')
      .join(', ');
    parts.push(`Active medications: ${items}`);
  }

  if (fhirData.observations.length) {
    const items = fhirData.observations.slice(0, 10).map((o) => {
      const name = o.code?.text || o.code?.coding?.[0]?.display || 'Unknown';
      const val = o.valueQuantity
        ? `${o.valueQuantity.value} ${o.valueQuantity.unit || ''}`
        : o.valueString || '';
      return `${name}: ${val}`.trim();
    }).join('; ');
    parts.push(`Recent labs: ${items}`);
  }

  if (fhirData.allergies.length) {
    const items = fhirData.allergies
      .map((a) => a.code?.text || a.code?.coding?.[0]?.display || 'Unknown')
      .join(', ');
    parts.push(`Allergies: ${items}`);
  }

  if (fhirData.observations.length > 10) {
    // Include lab trends for key markers
    const trendNames = [
      'Creatinine', 'eGFR', 'Hemoglobin A1c',
      'Systolic Blood Pressure', 'ALT', 'Potassium',
    ];
    const trends = trendNames.map((name) => {
      const vals = fhirData.observations
        .filter((o) => (o.code?.text || '') === name)
        .sort((a, b) => (a.effectiveDateTime || '')
          .localeCompare(b.effectiveDateTime || ''));
      if (vals.length < 2) return null;
      const points = vals.map((v) => {
        const d = v.effectiveDateTime
          ? v.effectiveDateTime.slice(0, 10) : '?';
        const val = v.valueQuantity
          ? `${v.valueQuantity.value}` : '?';
        return `${d}: ${val}`;
      }).join(' → ');
      return `${name} trend: ${points} ${vals[0].valueQuantity?.unit || ''}`;
    }).filter(Boolean);
    if (trends.length) {
      parts.push(`Lab trends over time:\n${trends.join('\n')}`);
    }
  }

  if (fhirData.visits && fhirData.visits.length) {
    const visitSummaries = fhirData.visits.map(
      (v) => `${v.date} — ${v.type} (${v.provider}): ${v.summary.slice(0, 300)}...`,
    ).join('\n\n');
    parts.push(`Recent visit notes:\n${visitSummaries}`);
  }

  return parts.join('\n\n');
}

module.exports = { fetchAllPatientData, summarizeFhirData };

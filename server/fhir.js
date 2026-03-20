const axios = require('axios');
const { z } = require('zod');
const context = require('./context');

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

  const fhirData = {
    conditions,
    medications,
    observations,
    allergies,
  };

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

  return parts.join('\n\n');
}

module.exports = { fetchAllPatientData, summarizeFhirData };

const { enrichFhirData } = require('../supplement');

describe('enrichFhirData', () => {
  test('enriches null/undefined input with all supplement data', () => {
    const result = enrichFhirData(null);
    expect(result.conditions.length).toBeGreaterThan(0);
    expect(result.medications.length).toBeGreaterThan(0);
    expect(result.observations.length).toBeGreaterThan(0);
    expect(result.allergies.length).toBeGreaterThan(0);
    expect(result.visits.length).toBeGreaterThan(0);
  });

  test('merges without duplicating existing conditions', () => {
    const existing = {
      conditions: [
        {
          resourceType: 'Condition',
          code: { text: 'Essential Hypertension' },
        },
      ],
      medications: [],
      observations: [],
      allergies: [],
    };
    const result = enrichFhirData(existing);
    const hyperCount = result.conditions.filter(
      (c) => (c.code?.text || '').toLowerCase()
        .includes('hypertension'),
    ).length;
    expect(hyperCount).toBe(1);
  });

  test('merges without duplicating existing medications', () => {
    const existing = {
      conditions: [],
      medications: [
        {
          resourceType: 'MedicationRequest',
          medicationCodeableConcept: { text: 'Metformin 500mg' },
        },
      ],
      observations: [],
      allergies: [],
    };
    const result = enrichFhirData(existing);
    const metCount = result.medications.filter(
      (m) => (m.medicationCodeableConcept?.text || '')
        .toLowerCase()
        .includes('metformin'),
    ).length;
    expect(metCount).toBe(1);
  });

  test('sorts observations by date descending', () => {
    const result = enrichFhirData(null);
    for (let i = 1; i < result.observations.length; i += 1) {
      const prev = result.observations[i - 1].effectiveDateTime || '';
      const curr = result.observations[i].effectiveDateTime || '';
      expect(prev >= curr).toBe(true);
    }
  });

  test('deduplication is case-insensitive', () => {
    const existing = {
      conditions: [
        { resourceType: 'Condition', code: { text: 'essential hypertension' } },
      ],
      medications: [],
      observations: [],
      allergies: [],
    };
    const result = enrichFhirData(existing);
    const hyperCount = result.conditions.filter(
      (c) => (c.code?.text || '').toLowerCase()
        .includes('hypertension'),
    ).length;
    expect(hyperCount).toBe(1);
  });

  test('preserves existing observations and merges supplements', () => {
    const existingObs = {
      resourceType: 'Observation',
      code: { text: 'Custom Lab' },
      valueQuantity: { value: 99, unit: 'mg/dL' },
      effectiveDateTime: '2026-06-01',
    };
    const result = enrichFhirData({
      conditions: [],
      medications: [],
      observations: [existingObs],
      allergies: [],
    });
    const found = result.observations.find(
      (o) => o.code?.text === 'Custom Lab',
    );
    expect(found).toBeDefined();
    expect(result.observations.length).toBeGreaterThan(1);
  });

  test('allergy deduplication works', () => {
    const existing = {
      conditions: [],
      medications: [],
      observations: [],
      allergies: [
        { resourceType: 'AllergyIntolerance', code: { text: 'Penicillin' } },
      ],
    };
    const result = enrichFhirData(existing);
    const penCount = result.allergies.filter(
      (a) => (a.code?.text || '').toLowerCase() === 'penicillin',
    ).length;
    expect(penCount).toBe(1);
  });
});

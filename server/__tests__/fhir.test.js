const { summarizeFhirData } = require('../fhir');

describe('summarizeFhirData', () => {
  test('returns fallback message for null input', () => {
    expect(summarizeFhirData(null)).toBe(
      'No medical history available.',
    );
  });

  test('summarizes active conditions', () => {
    const data = {
      conditions: [
        { code: { text: 'Hypertension' } },
        { code: { text: 'Diabetes' } },
      ],
      medications: [],
      observations: [],
      allergies: [],
    };
    const result = summarizeFhirData(data);
    expect(result).toContain('Active conditions');
    expect(result).toContain('Hypertension');
    expect(result).toContain('Diabetes');
  });

  test('summarizes medications', () => {
    const data = {
      conditions: [],
      medications: [
        { medicationCodeableConcept: { text: 'Metformin 500mg' } },
        {
          medicationCodeableConcept: {
            coding: [{ display: 'Lisinopril 10mg' }],
          },
        },
      ],
      observations: [],
      allergies: [],
    };
    const result = summarizeFhirData(data);
    expect(result).toContain('Active medications');
    expect(result).toContain('Metformin 500mg');
    expect(result).toContain('Lisinopril 10mg');
  });

  test('summarizes recent lab observations', () => {
    const data = {
      conditions: [],
      medications: [],
      observations: [
        {
          code: { text: 'Creatinine' },
          valueQuantity: { value: 1.4, unit: 'mg/dL' },
        },
      ],
      allergies: [],
    };
    const result = summarizeFhirData(data);
    expect(result).toContain('Recent labs');
    expect(result).toContain('Creatinine');
    expect(result).toContain('1.4');
  });

  test('summarizes allergies', () => {
    const data = {
      conditions: [],
      medications: [],
      observations: [],
      allergies: [
        { code: { text: 'Penicillin' } },
      ],
    };
    const result = summarizeFhirData(data);
    expect(result).toContain('Allergies');
    expect(result).toContain('Penicillin');
  });

  test('handles observations with valueString', () => {
    const data = {
      conditions: [],
      medications: [],
      observations: [
        {
          code: { text: 'Blood Type' },
          valueString: 'A+',
        },
      ],
      allergies: [],
    };
    const result = summarizeFhirData(data);
    expect(result).toContain('Blood Type: A+');
  });

  test('includes lab trends when >10 observations', () => {
    const obs = [];
    // Creatinine trend (2 points needed)
    obs.push({
      code: { text: 'Creatinine' },
      valueQuantity: { value: 0.9, unit: 'mg/dL' },
      effectiveDateTime: '2024-09-15',
    });
    obs.push({
      code: { text: 'Creatinine' },
      valueQuantity: { value: 1.4, unit: 'mg/dL' },
      effectiveDateTime: '2025-11-15',
    });
    // Pad to >10 observations
    for (let i = 0; i < 10; i += 1) {
      obs.push({
        code: { text: `Filler Lab ${i}` },
        valueQuantity: { value: i, unit: 'U/L' },
        effectiveDateTime: `2025-01-${String(i + 1).padStart(2, '0')}`,
      });
    }
    const data = {
      conditions: [],
      medications: [],
      observations: obs,
      allergies: [],
    };
    const result = summarizeFhirData(data);
    expect(result).toContain('Lab trends over time');
    expect(result).toContain('Creatinine trend');
  });

  test('includes visit notes when present', () => {
    const data = {
      conditions: [],
      medications: [],
      observations: [],
      allergies: [],
      visits: [
        {
          date: 'January 8, 2026',
          type: 'Office Visit',
          provider: 'Dr. Torres',
          summary: 'Kidney function evaluation',
        },
      ],
    };
    const result = summarizeFhirData(data);
    expect(result).toContain('Recent visit notes');
    expect(result).toContain('Dr. Torres');
    expect(result).toContain('Kidney function evaluation');
  });

  test('falls back to coding display when text is missing', () => {
    const data = {
      conditions: [
        { code: { coding: [{ display: 'CKD Stage 2' }] } },
      ],
      medications: [],
      observations: [],
      allergies: [],
    };
    const result = summarizeFhirData(data);
    expect(result).toContain('CKD Stage 2');
  });

  test('handles completely empty data', () => {
    const data = {
      conditions: [],
      medications: [],
      observations: [],
      allergies: [],
    };
    const result = summarizeFhirData(data);
    expect(result).toBe('');
  });
});

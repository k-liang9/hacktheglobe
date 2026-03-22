const axios = require('axios');

jest.mock('axios');

const { deidentify } = require('../deidentify');

describe('deidentify', () => {
  beforeEach(() => jest.clearAllMocks());

  test('returns empty string for empty input', async () => {
    expect(await deidentify('')).toBe('');
    expect(await deidentify('   ')).toBe('');
    expect(await deidentify(null)).toBe('');
    expect(await deidentify(undefined)).toBe('');
  });

  test('calls Presidio and returns anonymized text', async () => {
    axios.post
      .mockResolvedValueOnce({
        data: [
          {
            entity_type: 'PERSON',
            start: 0,
            end: 8,
            score: 0.95,
          },
        ],
      })
      .mockResolvedValueOnce({
        data: { text: '[PERSON] has diabetes.' },
      });

    const result = await deidentify('John Doe has diabetes.');
    expect(result).toBe('[PERSON] has diabetes.');
    expect(axios.post).toHaveBeenCalledTimes(2);
  });

  test('returns original text when Presidio finds no entities', async () => {
    axios.post.mockResolvedValueOnce({ data: [] });

    const result = await deidentify('No PII here.');
    expect(result).toBe('No PII here.');
    expect(axios.post).toHaveBeenCalledTimes(1);
  });

  describe('fallback de-identification (Presidio unavailable)', () => {
    beforeEach(() => {
      axios.post.mockRejectedValue(new Error('ECONNREFUSED'));
    });

    test('redacts SSNs', async () => {
      const result = await deidentify('SSN: 123-45-6789');
      expect(result).toBe('SSN: [US SSN]');
    });

    test('redacts phone numbers', async () => {
      const result = await deidentify(
        'Call 555-123-4567 or (555) 987-6543',
      );
      expect(result).not.toContain('555-123-4567');
      expect(result).not.toContain('987-6543');
    });

    test('redacts email addresses', async () => {
      const result = await deidentify(
        'Email john@example.com for info',
      );
      expect(result).toBe('Email [EMAIL ADDRESS] for info');
    });

    test('redacts dates in MM/DD/YYYY format', async () => {
      const result = await deidentify('Born 01/15/1990');
      expect(result).toBe('Born [DATE TIME]');
    });

    test('redacts dates in YYYY-MM-DD format', async () => {
      const result = await deidentify('Date: 1990-01-15');
      expect(result).toBe('Date: [DATE TIME]');
    });

    test('redacts multiple PII types in one string', async () => {
      const input = 'Patient SSN 123-45-6789, '
        + 'email patient@test.com, DOB 03/15/1985';
      const result = await deidentify(input);
      expect(result).not.toContain('123-45-6789');
      expect(result).not.toContain('patient@test.com');
      expect(result).not.toContain('03/15/1985');
    });
  });
});

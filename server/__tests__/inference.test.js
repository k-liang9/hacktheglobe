const axios = require('axios');
const context = require('../context');

jest.mock('axios');

const { generateInsight, chat } = require('../inference');

describe('inference', () => {
  beforeEach(() => {
    context.reset();
    jest.clearAllMocks();
    process.env.DEEPSEEK_API_KEY = 'test-key';
  });

  function llmResponse(content) {
    return {
      data: {
        choices: [{ message: { content } }],
      },
    };
  }

  describe('generateInsight', () => {
    test('returns structured insight from LLM response', async () => {
      context.set('currentPage', {
        url: 'http://localhost/mychart/results',
        title: 'Lab Results',
        bodyText: 'Creatinine: 1.6 mg/dL (High)',
      });
      context.set('fhirData', {
        conditions: [{ code: { text: 'CKD Stage 2' } }],
        medications: [],
        observations: [],
        allergies: [],
      });

      const mockResult = {
        summary: 'Your creatinine is elevated.',
        insights: ['Kidney function declining'],
        aftercare: {
          medication_schedule: [],
          symptoms_to_monitor: ['Swelling'],
          daily_reminders: ['Stay hydrated'],
          follow_up_appointments: [],
        },
        issues: ['Ask about NSAID use'],
      };

      // buildContext: deidentify(pageText) + deidentify(historySummary)
      // fhirData has conditions, so summarizeFhirData returns non-empty
      // → both deidentify calls hit Presidio (return no entities)
      axios.post
        .mockResolvedValueOnce({ data: [] }) // deidentify page
        .mockResolvedValueOnce({ data: [] }) // deidentify history
        .mockResolvedValueOnce(llmResponse(JSON.stringify(mockResult)));

      const result = await generateInsight('en');
      expect(result.summary).toBe('Your creatinine is elevated.');
      expect(result.insights).toContain('Kidney function declining');
      expect(result.aftercare.symptoms_to_monitor).toContain('Swelling');
      expect(result.issues).toContain('Ask about NSAID use');
      expect(result.pageTitle).toBe('Lab Results');
    });

    test('returns raw text when LLM returns non-JSON', async () => {
      context.set('currentPage', {
        url: 'http://localhost/mychart',
        title: 'Summary',
        bodyText: 'Patient health overview',
      });
      // Empty fhirData → summarizeFhirData returns ''
      // → deidentify('') short-circuits → only 1 deidentify axios call
      context.set('fhirData', {
        conditions: [],
        medications: [],
        observations: [],
        allergies: [],
      });

      axios.post
        .mockResolvedValueOnce({ data: [] }) // deidentify page
        // no 2nd deidentify call (empty history)
        .mockResolvedValueOnce(
          llmResponse('This is not JSON at all'),
        );

      const result = await generateInsight('en');
      expect(result.summary).toBe('This is not JSON at all');
      expect(result.issues).toContain(
        'Could not parse structured response'
          + ' — showing raw output above.',
      );
    });

    test('handles missing aftercare in LLM response', async () => {
      context.set('currentPage', {
        url: 'http://localhost/mychart',
        title: 'Page',
        bodyText: 'content',
      });
      context.set('fhirData', {
        conditions: [],
        medications: [],
        observations: [],
        allergies: [],
      });

      axios.post
        .mockResolvedValueOnce({ data: [] }) // deidentify page
        .mockResolvedValueOnce(
          llmResponse(JSON.stringify({ summary: 'Short summary' })),
        );

      const result = await generateInsight('en');
      expect(result.summary).toBe('Short summary');
      expect(result.aftercare.medication_schedule).toEqual([]);
      expect(result.aftercare.symptoms_to_monitor).toEqual([]);
      expect(result.insights).toEqual([]);
    });
  });

  describe('chat', () => {
    test('returns LLM chat response', async () => {
      context.set('currentPage', {
        url: 'http://localhost/mychart',
        title: 'Test',
        bodyText: 'test content',
      });
      context.set('fhirData', {
        conditions: [],
        medications: [],
        observations: [],
        allergies: [],
      });

      axios.post
        .mockResolvedValueOnce({ data: [] }) // deidentify page
        // no 2nd deidentify (empty history)
        .mockResolvedValueOnce(
          llmResponse('I can help you understand that!'),
        );

      const messages = [
        { role: 'user', content: 'What does my creatinine mean?' },
      ];
      const result = await chat(messages, 'en');
      expect(result).toBe('I can help you understand that!');
    });
  });
});

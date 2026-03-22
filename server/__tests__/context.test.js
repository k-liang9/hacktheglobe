const {
  get, set, getAll, reset,
} = require('../context');

describe('context store', () => {
  beforeEach(() => {
    reset();
  });

  test('get returns null for unset keys', () => {
    expect(get('accessToken')).toBeNull();
    expect(get('patient')).toBeNull();
  });

  test('set and get round-trip a value', () => {
    set('accessToken', 'tok_123');
    expect(get('accessToken')).toBe('tok_123');
  });

  test('set overwrites a previous value', () => {
    set('patient', 'p1');
    set('patient', 'p2');
    expect(get('patient')).toBe('p2');
  });

  test('getAll returns a shallow copy of all keys', () => {
    set('accessToken', 'tok');
    set('patient', 'pat');
    const all = getAll();
    expect(all.accessToken).toBe('tok');
    expect(all.patient).toBe('pat');
    // Mutating the copy must not affect the store
    all.accessToken = 'changed';
    expect(get('accessToken')).toBe('tok');
  });

  test('reset clears every key back to null', () => {
    set('accessToken', 'tok');
    set('patient', 'pat');
    set('fhirData', { conditions: [] });
    reset();
    expect(get('accessToken')).toBeNull();
    expect(get('patient')).toBeNull();
    expect(get('fhirData')).toBeNull();
  });

  test('stores complex objects', () => {
    const page = {
      url: 'https://example.com',
      title: 'Test',
      bodyText: 'hello',
    };
    set('currentPage', page);
    expect(get('currentPage')).toEqual(page);
  });
});

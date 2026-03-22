const context = require('../context');
const { getAuthUrl } = require('../auth');
const { generateInsight, chat } = require('../inference');

jest.mock('../auth', () => ({
  getAuthUrl: jest.fn(() => 'https://epic.com/authorize?fake=1'),
  exchangeCode: jest.fn(() => Promise.resolve({
    access_token: 'tok',
    patient: 'p1',
  })),
}));
jest.mock('../fhir', () => ({
  fetchAllPatientData: jest.fn(() => Promise.resolve({
    conditions: [],
    medications: [],
    observations: [],
    allergies: [],
  })),
  summarizeFhirData: jest.fn(() => 'summary'),
}));
jest.mock('../deidentify', () => ({
  deidentify: jest.fn((text) => Promise.resolve(text)),
}));
jest.mock('../inference', () => ({
  generateInsight: jest.fn(() => Promise.resolve({
    summary: 'Test summary',
    insights: [],
    aftercare: {
      medication_schedule: [],
      symptoms_to_monitor: [],
      daily_reminders: [],
      follow_up_appointments: [],
    },
    issues: [],
    pageTitle: 'Test',
  })),
  chat: jest.fn(() => Promise.resolve('Chat reply')),
}));
// eslint-disable-next-line global-require
jest.mock('../shim', () => require('express').Router());

const router = require('../routes');

describe('routes', () => {
  beforeEach(() => {
    context.reset();
    jest.clearAllMocks();
  });

  test('exports an Express router', () => {
    expect(router).toBeDefined();
    expect(typeof router).toBe('function');
  });

  test('router has expected route paths registered', () => {
    const routes = [];
    router.stack.forEach((layer) => {
      if (layer.route) {
        const methods = Object.keys(layer.route.methods);
        routes.push({
          path: layer.route.path,
          methods,
        });
      }
    });

    const paths = routes.map((r) => r.path);
    expect(paths).toContain('/health');
    expect(paths).toContain('/auth/start');
    expect(paths).toContain('/auth/callback');
    expect(paths).toContain('/auth/status');
    expect(paths).toContain('/auth/logout');
    expect(paths).toContain('/page-update');
    expect(paths).toContain('/generate-insight');
    expect(paths).toContain('/chat');
  });

  test('health check handler returns ok', () => {
    const healthRoute = router.stack.find(
      (l) => l.route && l.route.path === '/health',
    );
    const handler = healthRoute.route.stack[0].handle;
    const res = {
      json: jest.fn(),
    };
    handler({}, res);
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });

  test('auth/status returns false when no token', () => {
    const route = router.stack.find(
      (l) => l.route && l.route.path === '/auth/status',
    );
    const handler = route.route.stack[0].handle;
    const res = { json: jest.fn() };
    handler({}, res);
    expect(res.json).toHaveBeenCalledWith({ authenticated: false });
  });

  test('auth/status returns true when token exists', () => {
    context.set('accessToken', 'tok-123');
    const route = router.stack.find(
      (l) => l.route && l.route.path === '/auth/status',
    );
    const handler = route.route.stack[0].handle;
    const res = { json: jest.fn() };
    handler({}, res);
    expect(res.json).toHaveBeenCalledWith({ authenticated: true });
  });

  test('auth/logout clears context', () => {
    context.set('accessToken', 'tok');
    context.set('patient', 'p1');
    const route = router.stack.find(
      (l) => l.route && l.route.path === '/auth/logout',
    );
    const handler = route.route.stack[0].handle;
    const res = { json: jest.fn() };
    handler({}, res);
    expect(res.json).toHaveBeenCalledWith({ ok: true });
    expect(context.get('accessToken')).toBeNull();
    expect(context.get('patient')).toBeNull();
  });

  test('auth/start returns auth URL', () => {
    const route = router.stack.find(
      (l) => l.route && l.route.path === '/auth/start',
    );
    const handler = route.route.stack[0].handle;
    const res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };
    handler({}, res);
    expect(getAuthUrl).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      url: 'https://epic.com/authorize?fake=1',
    });
  });

  test('generate-insight calls inference module', async () => {
    const route = router.stack.find(
      (l) => l.route && l.route.path === '/generate-insight',
    );
    const handler = route.route.stack[0].handle;
    const req = { body: { language: 'en' } };
    const res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };
    await handler(req, res);
    expect(generateInsight).toHaveBeenCalledWith('en');
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ summary: 'Test summary' }),
    );
  });

  test('chat returns reply from inference module', async () => {
    const route = router.stack.find(
      (l) => l.route && l.route.path === '/chat',
    );
    const handler = route.route.stack[0].handle;
    const req = {
      body: {
        messages: [{ role: 'user', content: 'Hi' }],
        language: 'en',
      },
    };
    const res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };
    await handler(req, res);
    expect(chat).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ reply: 'Chat reply' });
  });

  test('chat rejects missing messages', async () => {
    const route = router.stack.find(
      (l) => l.route && l.route.path === '/chat',
    );
    const handler = route.route.stack[0].handle;
    const req = { body: { language: 'en' } };
    const res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'messages array is required' }),
    );
  });
});

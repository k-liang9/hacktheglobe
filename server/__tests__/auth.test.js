const axios = require('axios');
const context = require('../context');

jest.mock('axios');

const { getAuthUrl, exchangeCode } = require('../auth');

describe('auth', () => {
  beforeEach(() => {
    context.reset();
    process.env.EPIC_CLIENT_ID = 'test-client-id';
    process.env.EPIC_REDIRECT_URI = 'https://localhost:3443/api/auth/callback';
  });

  afterEach(() => jest.restoreAllMocks());

  describe('getAuthUrl', () => {
    test('returns a URL with required OAuth params', () => {
      const url = getAuthUrl();
      expect(url).toContain('authorize');
      expect(url).toContain('response_type=code');
      expect(url).toContain('client_id=test-client-id');
      expect(url).toContain('code_challenge=');
      expect(url).toContain('code_challenge_method=S256');
      expect(url).toContain('scope=');
    });

    test('stores code verifier in context', () => {
      getAuthUrl();
      const verifier = context.get('codeVerifier');
      expect(verifier).toBeTruthy();
      expect(typeof verifier).toBe('string');
      expect(verifier.length).toBeGreaterThan(0);
    });

    test('generates different PKCE values each call', () => {
      getAuthUrl();
      const v1 = context.get('codeVerifier');
      getAuthUrl();
      const v2 = context.get('codeVerifier');
      // Extremely unlikely to collide
      expect(v1).not.toBe(v2);
    });

    test('PKCE challenge is base64url-safe', () => {
      const url = getAuthUrl();
      const params = new URLSearchParams(url.split('?')[1]);
      const challenge = params.get('code_challenge');
      // base64url: no +, /, or = characters
      expect(challenge).not.toMatch(/[+/=]/);
    });
  });

  describe('exchangeCode', () => {
    test('exchanges code for token and stores in context', async () => {
      context.set('codeVerifier', 'test-verifier');

      axios.post.mockResolvedValueOnce({
        data: {
          access_token: 'epic-token-123',
          patient: 'patient-456',
          token_type: 'Bearer',
        },
      });

      const result = await exchangeCode('auth-code-789');
      expect(result.access_token).toBe('epic-token-123');
      expect(context.get('accessToken')).toBe('epic-token-123');
      expect(context.get('patient')).toBe('patient-456');

      // Verify the token endpoint was called correctly
      const [url, body] = axios.post.mock.calls[0];
      expect(url).toContain('/token');
      expect(body).toContain('grant_type=authorization_code');
      expect(body).toContain('code=auth-code-789');
      expect(body).toContain('code_verifier=test-verifier');
    });
  });
});

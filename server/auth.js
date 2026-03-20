const crypto = require('crypto');
const axios = require('axios');
const context = require('./context');

const EPIC_AUTH_BASE = 'https://fhir.epic.com/interconnect-fhir-oauth/oauth2';
const AUTHORIZE_URL = `${EPIC_AUTH_BASE}/authorize`;
const TOKEN_URL = `${EPIC_AUTH_BASE}/token`;

function base64url(buffer) {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function generatePKCE() {
  const verifier = base64url(crypto.randomBytes(32));
  const challenge = base64url(crypto.createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

function getAuthUrl() {
  const { verifier, challenge } = generatePKCE();
  context.set('codeVerifier', verifier);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.EPIC_CLIENT_ID,
    redirect_uri: process.env.EPIC_REDIRECT_URI,
    scope: 'openid fhirUser patient/*.read',
    state: crypto.randomBytes(16).toString('hex'),
    aud: 'https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4',
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });

  return `${AUTHORIZE_URL}?${params.toString()}`;
}

async function exchangeCode(code) {
  const codeVerifier = context.get('codeVerifier');

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: process.env.EPIC_REDIRECT_URI,
    client_id: process.env.EPIC_CLIENT_ID,
    code_verifier: codeVerifier,
  });

  const { data } = await axios.post(TOKEN_URL, body.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  context.set('accessToken', data.access_token);
  context.set('patient', data.patient);

  return data;
}

module.exports = { getAuthUrl, exchangeCode };

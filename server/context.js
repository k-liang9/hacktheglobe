/**
 * In-memory session context store.
 * Single-user hackathon demo — no persistence, no multi-tenancy.
 */

const store = {
  accessToken: null,
  patient: null,
  fhirData: null,
  deidentifiedHistory: null,
  currentPage: null,
  codeVerifier: null,
};

function get(key) {
  return store[key];
}

function set(key, value) {
  store[key] = value;
}

function getAll() {
  return { ...store };
}

function reset() {
  Object.keys(store).forEach((key) => {
    store[key] = null;
  });
}

module.exports = {
  get, set, getAll, reset,
};

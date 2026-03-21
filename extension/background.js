/**
 * Background service worker: relays messages between content script,
 * sidebar, and the backend server.
 */

const API_BASE = 'http://localhost:3000/api';

// Open side panel when extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id });
});

// Listen for messages from content script and sidebar
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PAGE_UPDATE') {
    // Forward page updates to the backend
    fetch(`${API_BASE}/page-update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: message.url,
        title: message.title,
        bodyText: message.bodyText,
      }),
    }).catch((err) => console.warn('Failed to send page update:', err.message));
    return false;
  }

  if (message.type === 'GENERATE_INSIGHT') {
    fetch(`${API_BASE}/generate-insight`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: message.language || 'en' }),
    })
      .then((res) => res.json())
      .then((data) => sendResponse({ ok: true, data }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (message.type === 'CHAT') {
    fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: message.messages, language: message.language || 'en' }),
    })
      .then((res) => res.json())
      .then((data) => sendResponse({ ok: true, reply: data.reply }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (message.type === 'START_AUTH') {
    fetch(`${API_BASE}/auth/start`)
      .then((res) => res.json())
      .then(({ url }) => {
        chrome.tabs.create({ url });
        sendResponse({ ok: true });
      })
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (message.type === 'AUTH_CALLBACK') {
    fetch(`${API_BASE}/auth/callback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: message.code }),
    })
      .then((res) => res.json())
      .then((data) => sendResponse({ ok: true, data }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (message.type === 'LOGOUT') {
    fetch(`${API_BASE}/auth/logout`, { method: 'POST' })
      .then((res) => res.json())
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (message.type === 'CHECK_AUTH') {
    fetch(`${API_BASE}/auth/status`)
      .then((res) => res.json())
      .then((data) => sendResponse({ ok: true, authenticated: data.authenticated }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (message.type === 'HEALTH_CHECK') {
    fetch(`${API_BASE}/health`)
      .then((res) => res.json())
      .then((data) => sendResponse({ ok: true, data }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  return false;
});

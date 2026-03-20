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
    })
      .then((res) => res.json())
      .then((data) => sendResponse({ ok: true, data }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true; // keep channel open for async response
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

  if (message.type === 'HEALTH_CHECK') {
    fetch(`${API_BASE}/health`)
      .then((res) => res.json())
      .then((data) => sendResponse({ ok: true, data }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  return false;
});

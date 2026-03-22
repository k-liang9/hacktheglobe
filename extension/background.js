/**
 * Background service worker: relays messages between content script,
 * sidebar, and the backend server. Also handles medication reminders
 * via chrome.alarms + chrome.notifications.
 */

const API_BASE = 'http://localhost:3000/api';

// ── Medication reminder scheduling ─────────────────────────────

function parseTimeString(timeStr) {
  // Parse "6:30 AM", "12:00 PM", etc.
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return null;
  let hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  if (period === 'PM' && hour !== 12) hour += 12;
  if (period === 'AM' && hour === 12) hour = 0;
  return { hour, minute };
}

function scheduleReminders(medSchedule) {
  // Clear all existing med alarms first
  chrome.alarms.getAll((alarms) => {
    alarms.forEach((alarm) => {
      if (alarm.name.startsWith('med-')) {
        chrome.alarms.clear(alarm.name);
      }
    });

    // Schedule from structured time slots
    // Each slot: { time: "6:30 AM", label: "Wake up", meds: [...] }
    medSchedule.forEach((slot, i) => {
      const parsed = parseTimeString(slot.time || '');
      if (!parsed) return;

      const now = new Date();
      const target = new Date();
      target.setHours(parsed.hour, parsed.minute, 0, 0);

      // If time already passed today, schedule for tomorrow
      if (target <= now) {
        target.setDate(target.getDate() + 1);
      }

      const delayMs = target.getTime() - now.getTime();
      const alarmName = `med-${i}-${parsed.hour}${parsed.minute}`;

      chrome.alarms.create(alarmName, {
        delayInMinutes: delayMs / 60000,
        periodInMinutes: 24 * 60, // repeat daily
      });

      // Store details for the notification
      const medList = (slot.meds || []).join('\n• ');
      chrome.storage.local.get('med_alarms', (result) => {
        const mapping = result.med_alarms || {};
        mapping[alarmName] = {
          label: slot.label || 'Medication',
          time: slot.time,
          message: `• ${medList}`,
        };
        chrome.storage.local.set({ med_alarms: mapping });
      });
    });
  });
}

// Fire notifications when alarms trigger
chrome.alarms.onAlarm.addListener((alarm) => {
  if (!alarm.name.startsWith('med-')) return;

  chrome.storage.local.get('med_alarms', (result) => {
    const mapping = result.med_alarms || {};
    const info = mapping[alarm.name];
    if (!info) return;

    chrome.notifications.create(alarm.name, {
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: `${info.time} — ${info.label}`,
      message: info.message,
      priority: 2,
      requireInteraction: true,
    });
  });
});

// ── Side panel ─────────────────────────────────────────────────

chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id });
});

// ── Message relay ──────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_TAB_URL') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      sendResponse({ url: tabs[0]?.url || '' });
    });
    return true;
  }

  if (message.type === 'PAGE_UPDATE') {
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
      body: JSON.stringify({
        messages: message.messages,
        language: message.language || 'en',
      }),
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
    // Clear med reminders on logout
    chrome.alarms.getAll((alarms) => {
      alarms.forEach((alarm) => {
        if (alarm.name.startsWith('med-')) {
          chrome.alarms.clear(alarm.name);
        }
      });
    });
    chrome.storage.local.remove('med_alarms');

    fetch(`${API_BASE}/auth/logout`, { method: 'POST' })
      .then((res) => res.json())
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (message.type === 'CHECK_AUTH') {
    fetch(`${API_BASE}/auth/status`)
      .then((res) => res.json())
      .then((data) => sendResponse({
        ok: true,
        authenticated: data.authenticated,
      }))
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

  if (message.type === 'DEMO_NOTIFICATION') {
    chrome.notifications.create(`demo-${Date.now()}`, {
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: message.title || 'Medication Reminder',
      message: message.message || '',
      priority: 2,
      requireInteraction: true,
    });
    return false;
  }

  if (message.type === 'SET_MED_REMINDERS') {
    scheduleReminders(message.schedule || []);
    sendResponse({ ok: true });
    return false;
  }

  return false;
});

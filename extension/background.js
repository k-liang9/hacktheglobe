/**
 * Background service worker: relays messages between content script,
 * sidebar, and the backend server. Also handles medication reminders
 * via chrome.alarms + chrome.notifications.
 */

const API_BASE = 'http://localhost:3000/api';

// ── Medication reminder scheduling ─────────────────────────────

const TIME_KEYWORDS = {
  morning: { hour: 8, label: 'Morning' },
  breakfast: { hour: 8, label: 'Breakfast' },
  'with breakfast': { hour: 8, label: 'Breakfast' },
  noon: { hour: 12, label: 'Lunchtime' },
  lunch: { hour: 12, label: 'Lunchtime' },
  lunchtime: { hour: 12, label: 'Lunchtime' },
  midday: { hour: 12, label: 'Lunchtime' },
  afternoon: { hour: 14, label: 'Afternoon' },
  evening: { hour: 18, label: 'Evening' },
  dinner: { hour: 18, label: 'Dinner' },
  'with dinner': { hour: 18, label: 'Dinner' },
  night: { hour: 21, label: 'Bedtime' },
  bedtime: { hour: 21, label: 'Bedtime' },
  'before bed': { hour: 21, label: 'Bedtime' },
};

function parseTimeFromText(text) {
  const lower = text.toLowerCase();
  const times = [];

  Object.entries(TIME_KEYWORDS).forEach(([keyword, info]) => {
    if (lower.includes(keyword)) {
      times.push(info);
    }
  });

  // If no keyword matched, default to morning
  if (!times.length) {
    times.push({ hour: 9, label: 'Daily' });
  }

  // Deduplicate by hour
  const seen = new Set();
  return times.filter((t) => {
    if (seen.has(t.hour)) return false;
    seen.add(t.hour);
    return true;
  });
}

function scheduleReminders(medSchedule) {
  // Clear all existing med alarms first
  chrome.alarms.getAll((alarms) => {
    alarms.forEach((alarm) => {
      if (alarm.name.startsWith('med-')) {
        chrome.alarms.clear(alarm.name);
      }
    });

    // Schedule new ones
    medSchedule.forEach((med, i) => {
      const times = parseTimeFromText(med);
      times.forEach((t) => {
        const now = new Date();
        const target = new Date();
        target.setHours(t.hour, 0, 0, 0);

        // If time already passed today, schedule for tomorrow
        if (target <= now) {
          target.setDate(target.getDate() + 1);
        }

        const delayMs = target.getTime() - now.getTime();
        const alarmName = `med-${i}-${t.hour}`;

        chrome.alarms.create(alarmName, {
          delayInMinutes: delayMs / 60000,
          periodInMinutes: 24 * 60, // repeat daily
        });

        // Store the med text for the notification
        chrome.storage.local.get('med_alarms', (result) => {
          const mapping = result.med_alarms || {};
          mapping[alarmName] = {
            med,
            timeLabel: t.label,
          };
          chrome.storage.local.set({ med_alarms: mapping });
        });
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
      title: `${info.timeLabel} Medication Reminder`,
      message: info.med,
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

  if (message.type === 'SET_MED_REMINDERS') {
    scheduleReminders(message.schedule || []);
    sendResponse({ ok: true });
    return false;
  }

  return false;
});

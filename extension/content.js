/**
 * Content script: runs on MyChart pages.
 * Tracks page changes and sends context to the background service worker.
 */

function getPageState() {
  return {
    type: 'PAGE_UPDATE',
    url: window.location.href,
    title: document.title,
    bodyText: document.body.innerText.slice(0, 8000),
  };
}

function sendPageUpdate() {
  chrome.runtime.sendMessage(getPageState());
}

// Send initial page state
sendPageUpdate();

// Watch for URL changes via pushState/replaceState interception
const originalPushState = history.pushState;
const originalReplaceState = history.replaceState;

history.pushState = function pushState(...args) {
  originalPushState.apply(this, args);
  setTimeout(sendPageUpdate, 500);
};

history.replaceState = function replaceState(...args) {
  originalReplaceState.apply(this, args);
  setTimeout(sendPageUpdate, 500);
};

window.addEventListener('popstate', () => {
  setTimeout(sendPageUpdate, 500);
});

// Watch for title changes as a proxy for SPA navigation
const observer = new MutationObserver(() => {
  sendPageUpdate();
});

const titleEl = document.querySelector('title');
if (titleEl) {
  observer.observe(titleEl, { childList: true });
}

// Respond to direct requests for page state
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_PAGE') {
    sendResponse(getPageState());
  }
});

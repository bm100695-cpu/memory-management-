/**
 * JARVIS Chrome Extension — Background Service Worker (Manifest V3)
 * Coordinates autonomous browser actions, tab navigation, search, and form filling.
 */

const BACKEND_URL = 'http://localhost:5000/api';

// Listen for messages from popup, content scripts, and web page
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleIncomingMessage(message, sender, sendResponse);
  return true; // Keep async channel open
});

// Listen for messages from the JARVIS dashboard web app
chrome.runtime.onMessageExternal?.addListener((message, sender, sendResponse) => {
  handleIncomingMessage(message, sender, sendResponse);
  return true;
});

async function handleIncomingMessage(message, sender, sendResponse) {
  try {
    switch (message.type) {
      case 'PING':
        sendResponse({ success: true, version: '2.0.0', status: 'ready' });
        break;

      case 'OPEN_URL':
      case 'NAVIGATE': {
        const url = message.url || 'https://www.google.com';
        const tab = await chrome.tabs.create({ url, active: true });
        sendResponse({ success: true, tabId: tab.id, url });
        break;
      }

      case 'SEARCH': {
        const query = message.query;
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        const tab = await chrome.tabs.create({ url: searchUrl, active: true });
        sendResponse({ success: true, tabId: tab.id, query, url: searchUrl });
        break;
      }

      case 'ANALYZE_FORM': {
        const tabId = message.tabId || (await getActiveTabId());
        chrome.tabs.sendMessage(tabId, { type: 'ANALYZE_FORM' }, sendResponse);
        break;
      }

      case 'FILL_FORM': {
        const tabId = message.tabId || (await getActiveTabId());
        chrome.tabs.sendMessage(tabId, { type: 'FILL_FORM', mappings: message.mappings }, sendResponse);
        break;
      }

      case 'EXTRACT_DATA': {
        const tabId = message.tabId || (await getActiveTabId());
        chrome.tabs.sendMessage(tabId, { type: 'EXTRACT_DATA', options: message.options }, sendResponse);
        break;
      }

      case 'CLICK_ELEMENT': {
        const tabId = message.tabId || (await getActiveTabId());
        chrome.tabs.sendMessage(tabId, { type: 'CLICK_ELEMENT', selector: message.selector, text: message.text }, sendResponse);
        break;
      }

      default:
        sendResponse({ success: false, error: `Unknown background command: ${message.type}` });
    }
  } catch (err) {
    sendResponse({ success: false, error: err.message });
  }
}

async function getActiveTabId() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.id;
}

document.getElementById('openJarvisBtn').addEventListener('click', () => {
  chrome.tabs.create({ url: 'http://localhost:5173/chat' });
});

document.getElementById('analyzeBtn').addEventListener('click', async () => {
  const status = document.getElementById('status');
  status.style.display = 'block';
  status.textContent = '⏳ Analyzing form fields on active page...';
  status.style.background = 'rgba(124, 58, 237, 0.15)';
  status.style.color = '#c084fc';

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  chrome.tabs.sendMessage(tab.id, { type: 'ANALYZE_FORM' }, (response) => {
    if (response?.success) {
      const fields = response.data?.fields || [];
      if (fields.length === 0) {
        status.textContent = 'ℹ️ No interactive form fields found on this page.';
        status.style.background = 'rgba(239,68,68,0.1)';
        status.style.color = '#ef4444';
      } else {
        status.textContent = `✅ Found ${fields.length} field(s) on ${response.data.title || 'page'}. Ready for JARVIS autofill.`;
        status.style.background = 'rgba(16,185,129,0.1)';
        status.style.color = '#10b981';
      }
    } else {
      status.textContent = `❌ ${response?.error || 'Make sure you are on a webpage and refresh.'}`;
      status.style.background = 'rgba(239,68,68,0.1)';
      status.style.color = '#ef4444';
    }
  });
});

document.getElementById('extractBtn').addEventListener('click', async () => {
  const status = document.getElementById('status');
  status.style.display = 'block';
  status.textContent = '⏳ Extracting visible data and listings...';
  status.style.background = 'rgba(124, 58, 237, 0.15)';
  status.style.color = '#c084fc';

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_DATA', options: { maxItems: 10 } }, (response) => {
    if (response?.success) {
      const items = response.data?.items || [];
      status.textContent = `✅ Extracted ${items.length} structured items from ${response.data.title || 'page'}.`;
      status.style.background = 'rgba(16,185,129,0.1)';
      status.style.color = '#10b981';
    } else {
      status.textContent = `❌ Extraction error: ${response?.error || 'Cannot inspect internal Chrome pages.'}`;
      status.style.background = 'rgba(239,68,68,0.1)';
      status.style.color = '#ef4444';
    }
  });
});

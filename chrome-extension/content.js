/**
 * JARVIS Chrome Extension — Content Script (Manifest V3)
 * Provides autonomous page analysis, DOM navigation, search, data extraction, and form autofill.
 */

// Listen for commands from background service worker or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'PING':
      sendResponse({ success: true, status: 'ready', url: window.location.href });
      break;

    case 'ANALYZE_FORM':
      handleAnalyzeForm(sendResponse);
      break;

    case 'FILL_FORM':
      handleFillForm(message.mappings, sendResponse);
      break;

    case 'SEARCH_PAGE':
      handleSearchPage(message.query, sendResponse);
      break;

    case 'EXTRACT_DATA':
      handleExtractData(message.options, sendResponse);
      break;

    case 'CLICK_ELEMENT':
      handleClickElement(message.selector || message.text, sendResponse);
      break;

    default:
      sendResponse({ success: false, error: `Unknown action: ${message.type}` });
  }
  return true; // Keep async response channel open
});

/**
 * 1. Analyze Form Fields on current page
 */
function handleAnalyzeForm(sendResponse) {
  try {
    const fields = [];
    const inputs = document.querySelectorAll('input, select, textarea');
    inputs.forEach((el, i) => {
      if (el.type === 'hidden' || el.type === 'submit' || el.type === 'button') return;
      const label =
        el.labels?.[0]?.textContent?.trim() ||
        el.getAttribute('placeholder') ||
        el.getAttribute('aria-label') ||
        el.name ||
        `field_${i}`;

      fields.push({
        fieldId: el.id || el.name || `field_${i}`,
        name: el.name || '',
        label,
        type: el.type || el.tagName.toLowerCase(),
        required: el.required,
        value: el.value || '',
        index: i,
      });
    });

    sendResponse({
      success: true,
      data: {
        url: window.location.href,
        title: document.title,
        fields,
      },
    });
  } catch (err) {
    sendResponse({ success: false, error: err.message });
  }
}

/**
 * 2. Fill Form Fields
 */
function handleFillForm(mappings = [], sendResponse) {
  try {
    let filledCount = 0;
    const errors = [];

    mappings.forEach(({ fieldId, name, label, value }) => {
      let el = null;
      if (fieldId) el = document.getElementById(fieldId);
      if (!el && name) el = document.querySelector(`[name="${name}"]`);
      if (!el && label) {
        // Find input matching placeholder or aria-label
        el = document.querySelector(
          `input[placeholder*="${label}" i], input[aria-label*="${label}" i]`
        );
      }

      if (el && value) {
        el.focus();
        el.value = value;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.blur();
        filledCount++;
      } else {
        errors.push(`Field ${label || fieldId} not found`);
      }
    });

    sendResponse({
      success: true,
      message: `Successfully filled ${filledCount} fields.`,
      filledCount,
      errors,
    });
  } catch (err) {
    sendResponse({ success: false, error: err.message });
  }
}

/**
 * 3. Search Page
 */
function handleSearchPage(query, sendResponse) {
  try {
    const searchInput =
      document.querySelector('input[type="search"]') ||
      document.querySelector('input[name="q"]') ||
      document.querySelector('input[name*="search" i]') ||
      document.querySelector('input[placeholder*="search" i]');

    if (searchInput && query) {
      searchInput.focus();
      searchInput.value = query;
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      searchInput.dispatchEvent(new Event('change', { bubbles: true }));

      // Look for search form or submit
      const form = searchInput.form || searchInput.closest('form');
      if (form) {
        form.submit();
      }

      sendResponse({
        success: true,
        message: `Query "${query}" submitted to search field.`,
      });
    } else {
      sendResponse({
        success: false,
        error: 'No active search bar found on page.',
      });
    }
  } catch (err) {
    sendResponse({ success: false, error: err.message });
  }
}

/**
 * 4. Extract Structured Data
 */
function handleExtractData(options = {}, sendResponse) {
  try {
    const items = [];
    // Extract listing items (e.g., job cards, search result snippets)
    const cards = document.querySelectorAll(
      '.listing-card, .job-card, .card, [data-testid*="job"], article, .g'
    );

    cards.forEach((card, index) => {
      if (index >= (options.maxItems || 10)) return;
      const title = card.querySelector('h1, h2, h3, a')?.textContent?.trim();
      const link = card.querySelector('a')?.href;
      const snippet = card.textContent?.slice(0, 300).trim();

      if (title) {
        items.push({
          title,
          link: link || window.location.href,
          snippet,
        });
      }
    });

    // Fallback: extract page headings and main text
    if (items.length === 0) {
      document.querySelectorAll('h1, h2, h3').forEach((h, i) => {
        if (i < 8 && h.textContent.trim()) {
          items.push({
            title: h.textContent.trim(),
            link: window.location.href,
            snippet: h.nextElementSibling?.textContent?.slice(0, 200).trim() || '',
          });
        }
      });
    }

    sendResponse({
      success: true,
      data: {
        url: window.location.href,
        title: document.title,
        items,
        count: items.length,
      },
    });
  } catch (err) {
    sendResponse({ success: false, error: err.message });
  }
}

/**
 * 5. Click Element
 */
function handleClickElement(target, sendResponse) {
  try {
    let el = null;
    if (target.startsWith('.') || target.startsWith('#') || target.includes('[')) {
      el = document.querySelector(target);
    }
    if (!el) {
      // Find button or link with matching text
      const buttons = Array.from(document.querySelectorAll('button, a, input[type="submit"]'));
      el = buttons.find((b) => b.textContent?.trim().toLowerCase().includes(target.toLowerCase()));
    }

    if (el) {
      el.click();
      sendResponse({ success: true, message: `Clicked element "${target}"` });
    } else {
      sendResponse({ success: false, error: `Element matching "${target}" not found.` });
    }
  } catch (err) {
    sendResponse({ success: false, error: err.message });
  }
}

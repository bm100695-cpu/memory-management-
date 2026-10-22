/**
 * JARVIS Browser Automation Service
 * Coordinates browser navigation between the web app and the companion Chrome Extension.
 */

export const openWebsite = async (url, title = '') => {
  if (!url || typeof url !== 'string') {
    return { success: false, error: 'Invalid URL provided' };
  }

  // Ensure safe URL protocol
  let sanitized = url.trim();
  if (!/^https?:\/\//i.test(sanitized)) {
    sanitized = `https://${sanitized}`;
  }

  try {
    const parsed = new URL(sanitized);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { success: false, error: `Unsafe URL protocol: ${parsed.protocol}` };
    }

    // Try communicating with Chrome Extension if available
    let extensionNotified = false;
    if (typeof window !== 'undefined' && window.chrome?.runtime?.sendMessage) {
      try {
        window.chrome.runtime.sendMessage(
          { type: 'OPEN_URL', url: parsed.toString(), title },
          (response) => {
            if (response?.success) extensionNotified = true;
          }
        );
      } catch (e) {
        // Extension not installed or inactive, proceed to window.open
      }
    }

    // Open in browser tab
    const newWindow = window.open(parsed.toString(), '_blank', 'noopener,noreferrer');
    if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
      // Pop-up blocker may have intercepted; return notice so UI can show fallback button
      return {
        success: true,
        url: parsed.toString(),
        popupBlocked: true,
        message: 'Pop-up was blocked by browser. Click the direct link to proceed.',
      };
    }

    return {
      success: true,
      url: parsed.toString(),
      extensionNotified,
    };
  } catch (err) {
    return {
      success: false,
      error: `Failed to open website: ${err.message}`,
    };
  }
};

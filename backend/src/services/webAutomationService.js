const { env } = require('../config/env');
const logger = require('../utils/logger');
const SavedSource = require('../models/SavedSource');

/**
 * Safe URL Validator
 * Enforces http/https protocol, rejects private/internal networks, and blocks unsafe schemes.
 * Never bypasses authentication, OTP, or CAPTCHA controls.
 */
const validateUrl = (rawUrl) => {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { valid: false, error: 'URL must be a non-empty string' };
  }

  let trimmed = rawUrl.trim();
  // If user provided a domain without protocol (e.g. "youtube.com" or "www.flipkart.com")
  if (!/^https?:\/\//i.test(trimmed) && /^([a-z0-9-]+\.)+[a-z]{2,}(:\d+)?(\/.*)?$/i.test(trimmed)) {
    trimmed = `https://${trimmed}`;
  }

  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch (e) {
    return { valid: false, error: `Invalid URL format: ${rawUrl}` };
  }

  // 1. Strict protocol check: only http and https allowed
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return {
      valid: false,
      error: `Disallowed protocol "${parsed.protocol}". Only HTTP and HTTPS are permitted for safe navigation.`,
    };
  }

  const hostname = parsed.hostname.toLowerCase();

  // 2. Reject internal/loopback and private network targets to prevent SSRF
  const isPrivateOrLoopback =
    hostname === 'localhost' ||
    hostname === '::1' ||
    hostname === '0.0.0.0' ||
    hostname.startsWith('127.') ||
    hostname.startsWith('10.') ||
    hostname.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname) ||
    hostname.startsWith('169.254.') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal');

  if (isPrivateOrLoopback) {
    return {
      valid: false,
      error: 'Access to local or private network addresses is restricted for security.',
    };
  }

  return {
    valid: true,
    url: parsed.toString(),
    hostname,
    origin: parsed.origin,
    protocol: parsed.protocol,
  };
};

/**
 * Fetch and extract readable plain text from a URL
 * Safely fetches with timeout and extracts visible text content.
 */
const fetchPageContent = async (url, timeoutMs = 8000) => {
  const urlCheck = validateUrl(url);
  if (!urlCheck.valid) {
    throw new Error(urlCheck.error);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(urlCheck.url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }

    const html = await res.text();

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : urlCheck.hostname;

    // Extract meta description
    const descMatch =
      html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
    const metaDescription = descMatch ? descMatch[1].trim() : '';

    // Strip scripts, styles, and html tags to get readable text
    const cleanText = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
      .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 10000);

    return {
      success: true,
      url: urlCheck.url,
      title,
      metaDescription,
      text: cleanText,
      length: cleanText.length,
    };
  } catch (err) {
    clearTimeout(timer);
    const msg = err.name === 'AbortError' ? 'Page fetch timed out after 8s' : err.message;
    return {
      success: false,
      url: urlCheck.url,
      error: msg,
    };
  }
};

/**
 * Dynamic Web and Website Intent Resolver
 * Leverages Gemini API (or structured heuristic fallback) to interpret ANY website or search request.
 */
const resolveWebIntent = async (userInstruction, lang = 'en', geminiRunner = null) => {
  const instructionLower = userInstruction.toLowerCase().trim();

  // 1. Direct URL check (e.g. "go to https://github.com", "open leetcode.com")
  const urlMatch = userInstruction.match(/(https?:\/\/[^\s]+|[a-z0-9-]+\.(?:com|org|net|edu|gov|io|in|co|ai|dev|app|me)(?:\/[^\s]*)?)/i);
  if (urlMatch && /^(open|go to|visit|navigate|launch|browse)\b/i.test(instructionLower)) {
    const rawTarget = urlMatch[1];
    const validation = validateUrl(rawTarget);
    if (validation.valid) {
      const isResearch = /summarize|summary|research|notes|extract/i.test(instructionLower);
      return {
        intentType: 'DIRECT_URL',
        title: `Navigate: ${validation.hostname}`,
        targetWebsite: validation.hostname,
        primaryUrl: validation.url,
        isOfficial: true,
        multipleMatches: false,
        isResearch,
        candidates: [
          {
            title: validation.hostname,
            url: validation.url,
            snippet: `Direct URL navigation to ${validation.url}`,
            isOfficial: true,
            domain: validation.hostname,
          },
        ],
        acknowledgement:
          lang === 'hi'
            ? `मैं सुरक्षित रूप से ${validation.hostname} खोल रहा हूँ।`
            : lang === 'hinglish'
            ? `Main ${validation.hostname} open kar raha hoon.`
            : `Opening ${validation.hostname} in your browser.`,
      };
    }
  }

  // 2. Dynamic resolution using Gemini if available
  if (geminiRunner && env.GOOGLE_AI_API_KEY) {
    try {
      const systemPrompt = `You are the Memory Management Autonomous Web & Navigation Engine.
Given ANY natural language command, identify the intended website, URL, or web search dynamically.
Support ANY website or topic in the world. DO NOT restrict to fixed websites.

Return STRICT JSON only (no markdown, no backticks, no code block):
{
  "intentType": "OPEN_WEBSITE" | "SEARCH_WEB" | "FIND_OFFICIAL" | "RESEARCH_SUMMARY",
  "targetWebsite": string, // Name of the primary service or website (e.g. "YouTube", "Flipkart", "IIT Bombay", "LeetCode")
  "primaryUrl": string | null, // The official direct URL if identifiable with high confidence (e.g. "https://www.youtube.com"), else null
  "isOfficial": boolean, // true if primaryUrl is the verified official site
  "multipleMatches": boolean, // true if user asked for options/alternatives or if several top sites match (e.g. "practice DSA")
  "isResearch": boolean, // true if user asked to summarize, explain, or extract information from the site
  "title": string, // Short descriptive task title (e.g. "Open YouTube", "Find Official Website: Harvard University")
  "query": string, // Clean search query to query search engines
  "candidates": [
    {
      "title": string,
      "url": string,
      "snippet": string,
      "isOfficial": boolean,
      "category": string
    }
  ],
  "acknowledgement": string // Natural short response in ${lang === 'hi' ? 'Hindi' : lang === 'hinglish' ? 'Hinglish' : 'English'}
}`;

      const rawJson = await geminiRunner(
        env.GOOGLE_AI_MODEL || 'gemini-3.5-flash',
        systemPrompt,
        `User Command: "${userInstruction}"`,
        env.GOOGLE_AI_API_KEY
      );

      // Clean potential json code block wrappers
      const cleanJson = rawJson.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
      const parsed = JSON.parse(cleanJson);

      // Validate all URLs in candidates
      if (Array.isArray(parsed.candidates)) {
        parsed.candidates = parsed.candidates
          .map((c) => {
            const v = validateUrl(c.url);
            return v.valid ? { ...c, url: v.url, domain: v.hostname } : null;
          })
          .filter(Boolean);
      }

      if (parsed.primaryUrl) {
        const primaryV = validateUrl(parsed.primaryUrl);
        parsed.primaryUrl = primaryV.valid ? primaryV.url : null;
      }

      if (parsed.candidates && parsed.candidates.length > 0) {
        if (!parsed.primaryUrl && parsed.candidates[0].isOfficial) {
          parsed.primaryUrl = parsed.candidates[0].url;
        }
        return parsed;
      }
    } catch (err) {
      logger.warn(`AI web intent parsing fallback: ${err.message}`);
    }
  }

  // 3. Robust Heuristic Dynamic Fallback
  return generateDynamicHeuristicIntent(userInstruction, lang);
};

/**
 * Heuristic Dynamic Web Search Resolver
 * Handles ANY website without hardcoding specific names
 */
const generateDynamicHeuristicIntent = (instruction, lang) => {
  const lower = instruction.toLowerCase().trim();
  const isResearch = /summarize|summary|details|notes|key points|useful information|extract/i.test(lower);

  // Extract website name or topic after action verbs
  let cleanSubject = instruction
    .replace(/^(?:jarvis[,:\s]+)?(?:please\s+)?(?:open|launch|visit|go to|browse|search for|search the web for|find the official website of|find the official login page for|find a website to|find|lookup|kholo|chalao|dhoondo|khojo)\s+/i, '')
    .replace(/(?:and summarize.*|and give summary.*|summarize its useful information|website|official website|login page|portal|karo|chahiye)$/i, '')
    .trim();

  if (!cleanSubject) cleanSubject = instruction;

  // Check if subject looks like a domain name (e.g. "github.com", "amazon.in")
  const domainPattern = /^([a-z0-9-]+)\.(com|org|net|edu|gov|io|in|co|ai|dev|app|me)$/i;
  const domainMatch = cleanSubject.match(domainPattern);

  if (domainMatch) {
    const fullUrl = `https://${cleanSubject.toLowerCase()}`;
    return {
      intentType: 'OPEN_WEBSITE',
      title: `Open ${cleanSubject}`,
      targetWebsite: cleanSubject,
      primaryUrl: fullUrl,
      isOfficial: true,
      multipleMatches: false,
      isResearch,
      candidates: [
        {
          title: cleanSubject,
          url: fullUrl,
          snippet: `Official website: ${fullUrl}`,
          isOfficial: true,
          domain: cleanSubject.toLowerCase(),
        },
      ],
      acknowledgement:
        lang === 'hi'
          ? `मैं ${cleanSubject} खोल रहा हूँ।`
          : lang === 'hinglish'
          ? `Main ${cleanSubject} open kar raha hoon.`
          : `Opening ${cleanSubject} in your browser.`,
    };
  }

  // Generate safe standard web candidates for any topic or website name
  const searchQuery = encodeURIComponent(cleanSubject);
  const isOfficialQuery = /official|login page|portal/i.test(lower);

  // Derive guessed primary domain for standard single-word names (e.g. "YouTube" -> youtube.com)
  const isSingleWordName = /^[a-z0-9-]+$/i.test(cleanSubject);
  const guessedDomain = isSingleWordName ? `https://www.${cleanSubject.toLowerCase()}.com` : null;

  const candidates = [];
  if (guessedDomain) {
    candidates.push({
      title: `${cleanSubject} (Official)`,
      url: guessedDomain,
      snippet: `Official website for ${cleanSubject}`,
      isOfficial: true,
      domain: `${cleanSubject.toLowerCase()}.com`,
    });
  }

  candidates.push({
    title: `${cleanSubject} — Web Search`,
    url: `https://www.google.com/search?q=${searchQuery}`,
    snippet: `Search results for "${cleanSubject}"`,
    isOfficial: false,
    domain: 'google.com',
  });

  candidates.push({
    title: `${cleanSubject} — DuckDuckGo Safe Search`,
    url: `https://duckduckgo.com/?q=${searchQuery}`,
    snippet: `Privacy search results for "${cleanSubject}"`,
    isOfficial: false,
    domain: 'duckduckgo.com',
  });

  return {
    intentType: isOfficialQuery ? 'FIND_OFFICIAL' : isResearch ? 'RESEARCH_SUMMARY' : 'SEARCH_WEB',
    title: `${isResearch ? 'Research & Summarize' : 'Web Search'}: ${cleanSubject.slice(0, 40)}`,
    targetWebsite: cleanSubject,
    primaryUrl: guessedDomain || candidates[0].url,
    isOfficial: Boolean(guessedDomain),
    multipleMatches: !guessedDomain,
    isResearch,
    candidates,
    acknowledgement:
      lang === 'hi'
        ? `मैं "${cleanSubject}" के लिए आधिकारिक वेबसाइट और परिणाम खोज रहा हूँ।`
        : lang === 'hinglish'
        ? `Main "${cleanSubject}" ke liye official website aur search results dhoondh raha hoon.`
        : `Searching the web for "${cleanSubject}" and locating relevant official sources.`,
  };
};

/**
 * Summarize Research Findings using Gemini
 */
const summarizeWebResearch = async (url, title, rawText, userQuery, lang = 'en', geminiRunner = null) => {
  if (!rawText || rawText.length < 50) {
    return {
      summary: `Could not extract readable textual content from ${url}. The website may require interactive JavaScript or login.`,
      sources: [{ title, url }],
    };
  }

  if (geminiRunner && env.GOOGLE_AI_API_KEY) {
    try {
      const prompt = `You are Memory Management, an advanced personal AI researcher.
Summarize the following website content in response to the user's inquiry: "${userQuery}".
Language: ${lang === 'hi' ? 'Hindi' : lang === 'hinglish' ? 'Hinglish' : 'English'}.

Website Title: ${title}
Website URL: ${url}

Content:
${rawText.slice(0, 7000)}

Instructions:
1. Provide a crisp 2-3 sentence overview.
2. List 3-5 bullet points covering the most useful features, offerings, or insights.
3. Include the source link for verification.
4. Professional, clear, and structured format.`;

      const summaryText = await geminiRunner(
        env.GOOGLE_AI_MODEL || 'gemini-3.5-flash',
        'Provide helpful, truthful, well-structured summaries of web pages.',
        prompt,
        env.GOOGLE_AI_API_KEY
      );

      return {
        summary: summaryText,
        sources: [{ title, url }],
      };
    } catch (e) {
      logger.warn(`Gemini research summarization failed: ${e.message}`);
    }
  }

  // Heuristic excerpt summary fallback
  const snippet = rawText.slice(0, 450).trim() + '...';
  return {
    summary: `**${title}**\n\n${snippet}\n\n*Source: [${url}](${url})*`,
    sources: [{ title, url }],
  };
};

module.exports = {
  validateUrl,
  fetchPageContent,
  resolveWebIntent,
  summarizeWebResearch,
};

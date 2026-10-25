const { sanitizeSecrets, containsSecret } = require('../utils/secretSanitizer');
const logger = require('../utils/logger');

/**
 * Heuristic fallback extraction when LLM extraction is unavailable or skipped.
 * Returns array of memory candidates.
 */
const extractHeuristicMemories = (userText, assistantText = '') => {
  const memories = [];
  const lower = userText.toLowerCase().trim();

  // 1. Explicit memory command: "remember that ...", "yaad rakhna ki ...", "save to memory: ..."
  const explicitMatch = userText.match(
    /(?:please\s+)?(?:remember\s+that|remember\s*:|yaad\s+rakhna\s+ki|yaad\s+rakho\s+ki|save\s+to\s+memory(?:\s*:)?|note\s+that)\s*(.+)/i
  );
  if (explicitMatch && explicitMatch[1].trim().length > 5) {
    const content = explicitMatch[1].trim();
    memories.push({
      title: content.slice(0, 50).trim(),
      content,
      category: 'personal',
      importance: 5,
      source: 'user_explicit',
      tags: ['explicit-memory'],
    });
    return memories;
  }

  // 2. Personal Preferences: "I prefer X", "I always use X", "My favorite X is Y", "Mujhe X pasand hai"
  const prefMatch = userText.match(
    /(?:i\s+prefer|i\s+always\s+use|i\s+like\s+to\s+use|my\s+favorite\s+\w+\s+is|mujhe\s+.+\s+pasand\s+hai)\s*(.+)/i
  );
  if (prefMatch && prefMatch[0].trim().length > 10) {
    memories.push({
      title: 'User Preference',
      content: userText.trim(),
      category: 'preference',
      importance: 4,
      source: 'conversation',
      tags: ['preference'],
    });
  }

  // 3. Project Requirements / Architecture: "The project uses...", "Architecture is...", "Stack is..."
  const projectMatch = userText.match(
    /(?:project\s+requirement|we\s+are\s+using|the\s+architecture\s+is|the\s+tech\s+stack\s+is|our\s+database\s+is|the\s+backend\s+is)\s*(.+)/i
  );
  if (projectMatch && projectMatch[0].trim().length > 15) {
    memories.push({
      title: 'Project Requirement',
      content: userText.trim(),
      category: 'project',
      importance: 4,
      source: 'conversation',
      tags: ['project-architecture'],
    });
  }

  // 4. Decisions: "We decided to...", "Let's go with...", "Decision is..."
  const decisionMatch = userText.match(
    /(?:we\s+decided\s+to|let'?s\s+go\s+with|i\s+decided\s+to|decision\s+is\s+to)\s*(.+)/i
  );
  if (decisionMatch && decisionMatch[0].trim().length > 12) {
    memories.push({
      title: 'Key Decision',
      content: userText.trim(),
      category: 'decision',
      importance: 4,
      source: 'conversation',
      tags: ['decision'],
    });
  }

  // 5. Goals & Plans: "My goal is...", "Plan for this week is..."
  const goalMatch = userText.match(
    /(?:my\s+goal\s+is|the\s+goal\s+is|i\s+plan\s+to|target\s+is\s+to)\s*(.+)/i
  );
  if (goalMatch && goalMatch[0].trim().length > 12) {
    memories.push({
      title: 'User Goal',
      content: userText.trim(),
      category: 'goal',
      importance: 4,
      source: 'conversation',
      tags: ['goal'],
    });
  }

  // 6. Technical problem and verified solution:
  const problemMatch = userText.match(
    /(?:the\s+fix\s+was|solved\s+by|the\s+solution\s+to\s+.+\s+is|issue\s+resolved\s+by)\s*(.+)/i
  );
  if (problemMatch && problemMatch[0].trim().length > 15) {
    memories.push({
      title: 'Verified Technical Solution',
      content: userText.trim(),
      category: 'fact',
      importance: 4,
      source: 'conversation',
      tags: ['solution', 'technical'],
    });
  }

  return memories;
};

/**
 * Extract memories using LLM if available, falling back to heuristics.
 */
const extractMemoriesWithAI = async (userText, assistantText, generateAiFn) => {
  if (!generateAiFn) {
    return extractHeuristicMemories(userText, assistantText);
  }

  const prompt = `You are the memory extraction engine for the Memory Management system.
Analyze the following exchange between the User and the AI Assistant.
Identify if any LONG-TERM useful facts should be saved to the user's permanent memory.

Categories to look for:
1. "personal": Identity, habits, background facts.
2. "preference": Programming languages, UI themes, tools, personal likes/dislikes.
3. "project": Architecture rules, tech stack, specs, repository details.
4. "decision": Architectural, technical, or design choices finalized.
5. "goal": Long-term goals, milestones, learning targets.
6. "fact": Technical problems and their verified fixes, important credentials info (NEVER passwords or actual API keys).
7. "contact": Key people, roles, emails.

CRITICAL RULES:
- DO NOT save generic greetings, casual conversation, transient queries, or every single sentence.
- NEVER include passwords, API keys, database credentials, or secret tokens.
- Return a valid JSON array of objects. If no long-term memories should be saved, return [].
- Format for each object:
  {
    "title": "Concise descriptive title (3-6 words)",
    "content": "Clear, concise, standalone fact or decision statement",
    "category": "personal" | "preference" | "goal" | "project" | "decision" | "fact" | "contact" | "other",
    "topic": "Specific project or topic (e.g. Browser Automation, React Frontend, Authentication)",
    "importance": 1 to 5,
    "tags": ["tag1", "tag2"]
  }

USER MESSAGE:
"${userText}"

ASSISTANT REPLY:
"${assistantText.slice(0, 500)}"

Return ONLY the JSON array, with no other markdown or explanation.`;

  try {
    const rawResult = await generateAiFn(prompt);
    const cleaned = rawResult.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((item) => ({
        title: item.title || item.content?.slice(0, 50),
        content: item.content,
        category: [
          'personal',
          'preference',
          'goal',
          'project',
          'decision',
          'fact',
          'contact',
          'other',
        ].includes(item.category)
          ? item.category
          : 'other',
        topic: item.topic || 'General',
        importance: Math.min(5, Math.max(1, Number(item.importance) || 3)),
        tags: Array.isArray(item.tags) ? item.tags : [],
        source: 'conversation',
      }));
    }
  } catch (err) {
    logger.warn(`AI memory extraction failed, falling back to heuristics: ${err.message}`);
  }

  return extractHeuristicMemories(userText, assistantText);
};

module.exports = {
  extractHeuristicMemories,
  extractMemoriesWithAI,
};

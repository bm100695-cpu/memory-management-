const { OpenAI } = require('openai');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const { env } = require('../config/env');
const taskService = require('./taskService');
const memoryService = require('./memoryService');
const journalService = require('./journalService');
const taskPlannerService = require('./taskPlannerService');
const logger = require('../utils/logger');

let openaiClient = null;
if (env.OPENAI_API_KEY && env.OPENAI_API_KEY !== 'sk-your-openai-key-here') {
  openaiClient = new OpenAI({ apiKey: env.OPENAI_API_KEY });
}

const generateGeminiContent = async (model, systemPrompt, userContent, apiKey) => {
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const response = await fetch(geminiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ parts: [{ text: userContent }] }],
      generationConfig: { temperature: 0.7 },
    }),
  });

  if (!response.ok) {
    const rawError = await response.text();
    let safeMessage = `Gemini API returned HTTP ${response.status}`;
    try {
      const parsed = JSON.parse(rawError);
      if (parsed.error?.message) {
        safeMessage = parsed.error.message;
      }
    } catch {
      safeMessage = rawError.slice(0, 300);
    }

    if (apiKey) {
      safeMessage = safeMessage.split(apiKey).join('[REDACTED]');
    }

    const error = new Error(`Gemini API error (${response.status}): ${safeMessage}`);
    error.status = response.status;
    error.statusCode = response.status >= 500 ? 502 : response.status;
    throw error;
  }

  const data = await response.json();
  const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!replyText) {
    const reason = data.candidates?.[0]?.finishReason || data.promptFeedback?.blockReason || 'No content';
    const err = new Error(`Gemini returned empty response (${reason})`);
    err.status = 502;
    err.statusCode = 502;
    throw err;
  }

  return replyText;
};

const detectLanguage = (text = '') => {
  if (/[\u0900-\u097F]/.test(text)) return 'hi';
  const hinglishMarkers = [/\b(mera|meri|mere|aaj|kal|karo|karna|hai|hain|tha|kya|kaise|batao|yaad|rakhna|bhejo|mujhe|hum|aap|tum)\b/i];
  for (const marker of hinglishMarkers) {
    if (marker.test(text)) return 'hinglish';
  }
  return 'en';
};

const detectTopic = (text) => {
  if (!text) return null;
  const match = text.match(
    /(?:continue|work\s+on|about|regarding|task\s+on|project\s+on|details\s+of)\s+(?:the\s+)?([a-zA-Z0-9\s_-]{3,40})(?:\s+from|\s+work|\s+feature|\s+task|\s+project|\?|$)/i
  );
  if (match && match[1]) {
    return match[1].trim();
  }
  return null;
};

const parseIntent = (text) => {
  const lower = text.toLowerCase().trim();
  if (/(?:add task|new task|create task|task add|task banao|remind me to|kaam add karo|task:)\s*(.+)/i.test(lower)) {
    const match = lower.match(/(?:add task|new task|create task|task add|task banao|remind me to|kaam add karo|task:)\s*(.+)/i);
    return { type: 'CREATE_TASK', title: match[1].trim() };
  }
  if (/(kar do|kardo|kar dena|add karo|save karo).*task/i.test(lower) || /task.*(add|banao|rakho)/i.test(lower)) {
    const clean = lower.replace(/(task|add|kar do|kardo|banao|rakho|please)/gi, '').trim();
    return { type: 'CREATE_TASK', title: clean || 'New Task' };
  }
  if (/(what are my tasks|my tasks|list tasks|show tasks|pending tasks|aaj ke tasks|mere kaam|tasks dikhao)/i.test(lower)) return { type: 'LIST_TASKS' };
  
  const memoryStoreMatch = lower.match(/(?:remember that|remember:|yaad rakhna ki|yaad rakho ki|save to memory|memory me save karo)\s*(.+)/i);
  if (memoryStoreMatch) return { type: 'SAVE_MEMORY', content: memoryStoreMatch[1].trim() };
  
  if (/(yaad rakhna|yaad rakho|save this)/i.test(lower) && lower.length > 15) {
    return { type: 'SAVE_MEMORY', content: text.replace(/(yaad rakhna|yaad rakho|please|save this)/gi, '').trim() };
  }
  const memoryQueryMatch = lower.match(/(?:what is my|where is my|kya hai mera|mera|meri|search memory for)\s*(.+)/i);
  if (memoryQueryMatch && /(passport|wifi|license|card|key|address|password|id|number|code)/i.test(lower)) {
    return { type: 'SEARCH_MEMORY', query: memoryQueryMatch[1].replace(/\?+$/, '').trim() };
  }
  if (/(daily summary|today'?s summary|aaj ka summary|summary of today|din kaisa raha)/i.test(lower)) return { type: 'GET_SUMMARY' };
  
  return { type: 'CHAT' };
};

const handleMessage = async (userId, content, conversationId = null, activeTaskId = null) => {
  const language = detectLanguage(content);

  let conversation;
  if (conversationId) conversation = await Conversation.findOne({ _id: conversationId, user: userId });
  if (!conversation) {
    const snippet = content.slice(0, 40);
    conversation = await Conversation.create({ user: userId, title: snippet.length > 0 ? snippet : 'Continuous Voice Chat', language });
  }

  await Message.create({
    conversation: conversation._id,
    user: userId,
    role: 'user',
    content,
    language,
    inputSource: 'voice_or_text',
  });

  let assistantReply = '';
  let toolResult = null;
  let taskExecution = null;
  let taskSteps = [];
  let retrievedMemories = [];

  // Dynamically detect any website opening, web searching, URL navigation, form filling, or research command
  const isAutomationIntent =
    Boolean(activeTaskId) ||
    /^(?:open|launch|visit|go to|browse|navigate to|search|find|lookup|kholo|chalao|dhoondo|khojo)\b/i.test(content.trim()) ||
    /(?:https?:\/\/|[a-z0-9-]+\.(?:com|org|net|edu|gov|io|in|co|ai|dev|app|me)\b)/i.test(content) ||
    /(?:website|web-search|web search|login page|official site|official website|portal|web page)/i.test(content) ||
    /(?:search.*for|search the web|find.*website|practice dsa|tutorials?|internship|internships|stipend|filter|save.*details|details.*save|autofill|form.*fill)/i.test(content);

  if (isAutomationIntent) {
    try {
      const taskResult = await taskPlannerService.planTask(userId, content, { activeTaskId });
      taskExecution = taskResult.execution;
      taskSteps = taskResult.steps;
      assistantReply = taskResult.message;

      for (const step of taskSteps) {
        if (['queued', 'pending'].includes(step.status)) {
          try {
            const executed = await taskPlannerService.executeTaskStep(taskExecution._id, step._id, userId);
            step.status = executed.step.status;
            step.output = executed.step.output;
          } catch (e) { logger.warn(`Step execution error: ${e.message}`); }
        }
      }
    } catch (err) { logger.error(`Task planning error: ${err.message}`); }
  }

  if (!assistantReply) {
    const intent = parseIntent(content);
    const aiProvider = env.AI_PROVIDER || 'gemini';
    const geminiKey = env.GOOGLE_AI_API_KEY;

    // Detect topic and fetch relevant memories, past conversations, and recent messages
    const detectedTopic = detectTopic(content);
    if (detectedTopic && !conversation.topics?.includes(detectedTopic.toLowerCase())) {
      conversation.topics = conversation.topics || [];
      conversation.topics.push(detectedTopic.toLowerCase());
    }

    // Explicit memory intent: save immediately so it's guaranteed stored in MongoDB!
    let explicitlySavedMemory = null;
    if (intent.type === 'SAVE_MEMORY') {
      try {
        explicitlySavedMemory = await memoryService.createMemory(userId, {
          title: intent.content.slice(0, 50),
          content: intent.content,
          category: 'personal',
          tags: ['explicit-memory', 'voice-chat'],
          source: 'user_explicit',
          conversation: conversation._id,
          importance: 5,
        });
        logger.info(`Explicitly saved memory: ${explicitlySavedMemory._id}`);
      } catch (saveErr) {
        logger.warn(`Failed to explicitly save memory: ${saveErr.message}`);
      }
    }

    const [memories, pastConversations, recentMessages] = await Promise.all([
      memoryService.retrieveRelevantMemories(userId, content, { topic: detectedTopic, limit: 6 }),
      memoryService.retrieveRelevantConversations(userId, {
        currentConversationId: conversation._id,
        query: content,
        topic: detectedTopic,
        limit: 3,
      }),
      Message.find({ conversation: conversation._id, isDeleted: false })
        .sort({ createdAt: -1 })
        .limit(8)
        .lean(),
    ]);

    retrievedMemories = memories;
    if (explicitlySavedMemory && !retrievedMemories.some((m) => String(m._id) === String(explicitlySavedMemory._id))) {
      retrievedMemories.unshift(explicitlySavedMemory);
    }

    const memoryContext = retrievedMemories
      .map((m) => `- [${(m.category || 'other').toUpperCase()}] ${m.title ? `${m.title}: ` : ''}${m.content}`)
      .join('\n');

    const pastConvContext = pastConversations
      .map((c) => {
        const dateStr = c.lastMessageAt ? new Date(c.lastMessageAt).toLocaleDateString() : '';
        const summaryText = c.summary ? `Summary: ${c.summary}\n` : '';
        const recentDialogue = (c.messages || []).slice(-4).join('\n  ');
        return `• Prior Conversation "${c.title}" (${dateStr}):\n  ${summaryText}${recentDialogue ? `Discussion:\n  ${recentDialogue}` : ''}`;
      })
      .join('\n\n');

    const recentChatTurns = recentMessages
      .reverse()
      .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n');

    const explicitMemoryNote = explicitlySavedMemory
      ? `\nNOTE: The user explicitly asked to remember: "${explicitlySavedMemory.content}". This has ALREADY been saved to permanent memory. Acknowledge this cleanly and warmly.`
      : '';

    const systemPrompt = `You are Memory Management, a highly intelligent and personal AI assistant.
Your personality is professional, proactive, smart, and warm. 
The user speaks in ${language === 'hi' ? 'Hindi' : language === 'hinglish' ? 'Hinglish' : 'English'}. You MUST reply in the exact same language naturally.
Give detailed, accurate, and smart answers. DO NOT give generic robotic responses.

CRITICAL MEMORY & CONVERSATION GROUNDING RULES:
1. When the user returns to a previous topic or asks to continue work (e.g. "Continue the browser automation work from yesterday"), utilize the previous discussion, requirements, completed work, and pending steps provided below without asking the user to explain everything again.
2. Ground all answers strictly in facts from the context. Never invent previous discussions or claim a task is completed without evidence.
3. If multiple past topics match ambiguously, ask a short polite clarification.
${explicitMemoryNote}

User Stored Memories:
${memoryContext || 'No stored memories yet.'}

Previous Conversations on Related Topics:
${pastConvContext || 'No previous conversation history found for this topic.'}

Recent Conversation History:
${recentChatTurns || 'New conversation started.'}`;

    if (aiProvider === 'gemini') {
      if (!geminiKey) {
        logger.error('Gemini API key is missing in configuration.');
        if (intent.type !== 'CHAT') {
          assistantReply = await executeLocalIntent(userId, intent, content, language);
        } else {
          const err = new Error('Gemini API key is not configured. Please set GOOGLE_AI_API_KEY in backend/.env');
          err.statusCode = 503;
          throw err;
        }
      } else {
        try {
          const candidateModels = [
            env.GOOGLE_AI_MODEL || 'gemini-3.5-flash',
            'gemini-3.5-flash-lite',
            'gemini-flash-latest',
            'gemini-3.1-flash-lite',
            'gemini-3.8-flash',
          ];
          const uniqueModels = [...new Set(candidateModels)];

          let lastError = null;
          let anyQuotaExceeded = false;
          for (const modelName of uniqueModels) {
            try {
              logger.info(`Sending chat message to Gemini (model: ${modelName})`);
              assistantReply = await generateGeminiContent(modelName, systemPrompt, content, geminiKey);
              if (assistantReply) break;
            } catch (modelErr) {
              lastError = modelErr;
              if (modelErr.status === 429) {
                anyQuotaExceeded = true;
              }
              if (modelErr.status === 429 || modelErr.status === 503 || modelErr.status === 404) {
                logger.warn(`Gemini model ${modelName} returned HTTP ${modelErr.status} (${modelErr.message}). Attempting alternate model...`);
                continue;
              } else {
                throw modelErr;
              }
            }
          }

          if (!assistantReply && lastError) {
            if (anyQuotaExceeded || lastError.status === 429) {
              logger.error('All Gemini free tier candidate models exceeded daily quota limit.');
              if (intent.type !== 'CHAT') {
                assistantReply = await executeLocalIntent(userId, intent, content, language);
              } else {
                assistantReply =
                  language === 'hi'
                    ? `⚠️ आपके Google Gemini Free Tier का दैनिक कोटा समाप्त हो गया है। कृपया नई API key प्रदान करें।`
                    : language === 'hinglish'
                    ? `⚠️ Aapke Google Gemini Free Tier ka daily quota exceed ho gaya hai. Local memory aur tasks abhi bhi save hain.`
                    : `⚠️ Google Gemini Free Tier daily quota has been exceeded. Local memory and tasks remain active.`;
              }
            } else {
              throw lastError;
            }
          }
        } catch (err) {
          logger.error(`Gemini request failed: HTTP ${err.status || err.statusCode || 500} - ${err.message}`);
          if (intent.type !== 'CHAT') {
            assistantReply = await executeLocalIntent(userId, intent, content, language);
          } else if (err.status === 429 || err.statusCode === 429) {
            assistantReply =
              language === 'hi'
                ? `⚠️ आपके Google Gemini Free Tier का दैनिक कोटा समाप्त हो गया है।`
                : language === 'hinglish'
                ? `⚠️ Aapke Google Gemini Free Tier ka daily quota exceed ho gaya hai.`
                : `⚠️ Google Gemini Free Tier daily quota has been exceeded for your API key.`;
          } else {
            throw err;
          }
        }
      }
    } else if (aiProvider === 'openai' && openaiClient) {
      try {
        const completion = await openaiClient.chat.completions.create({
          model: env.OPENAI_MODEL || 'gpt-4o-mini',
          messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content }],
          temperature: 0.7,
        });
        assistantReply = completion.choices[0]?.message?.content || 'Understood.';
      } catch (err) {
        logger.error(`OpenAI request failed: ${err.message}`);
        if (intent.type !== 'CHAT') {
          assistantReply = await executeLocalIntent(userId, intent, content, language);
        } else {
          throw err;
        }
      }
    } else {
      logger.warn(`No active AI provider configured for: ${aiProvider}`);
      if (intent.type !== 'CHAT') {
        assistantReply = await executeLocalIntent(userId, intent, content, language);
      } else {
        const err = new Error(`AI provider "${aiProvider}" is not configured or API key is missing.`);
        err.statusCode = 503;
        throw err;
      }
    }
  }

  const memoryIds = retrievedMemories.map((m) => m._id);

  const assistantMsg = await Message.create({
    conversation: conversation._id,
    user: userId,
    role: 'assistant',
    content: assistantReply,
    language,
    inputSource: 'voice_or_text',
    toolCalls: toolResult ? [toolResult] : [],
    memoriesUsed: memoryIds,
  });

  conversation.lastMessageAt = new Date();
  conversation.messageCount = (conversation.messageCount || 0) + 2;
  if (memoryIds.length > 0) {
    const combinedMemories = new Set([
      ...(conversation.memoriesUsed || []).map(String),
      ...memoryIds.map(String),
    ]);
    conversation.memoriesUsed = Array.from(combinedMemories);
  }
  await conversation.save();

  // Asynchronously extract and save useful long-term memories in background
  const geminiKey = env.GOOGLE_AI_API_KEY;
  setTimeout(async () => {
    try {
      await memoryService.extractAndSaveMemoriesFromConversation(
        userId,
        conversation._id,
        content,
        assistantReply,
        geminiKey
          ? (p) => generateGeminiContent('gemini-3.5-flash-lite', 'You are a JSON memory extractor.', p, geminiKey)
          : null
      );
    } catch (extractErr) {
      logger.warn(`Async background memory extraction error: ${extractErr.message}`);
    }
  }, 0);

  return {
    conversationId: conversation._id,
    message: assistantReply,
    language,
    memoriesUsed: memoryIds,
    taskExecution,
    steps: taskSteps,
    createdAt: assistantMsg.createdAt,
  };
};

const executeLocalIntent = async (userId, intent, rawText, lang) => {
  if (intent.type === 'CREATE_TASK') {
    const task = await taskService.createTask(userId, { title: intent.title, priority: 'medium', scheduledDate: new Date() });
    if (lang === 'hi') return `✅ मैंने आपका कार्य "${task.title}" आज की कार्य-सूची में जोड़ दिया है।`;
    if (lang === 'hinglish') return `✅ Maine aapka task "${task.title}" aaj ke task list me add kar diya hai!`;
    return `✅ I have added "${task.title}" to your tasks for today.`;
  }
  if (intent.type === 'LIST_TASKS') {
    const tasks = await taskService.getTasksByDate(userId, new Date());
    if (tasks.length === 0) return 'Aaj ke liye koi pending task nahi hai. Sab set hai!';
    const taskLines = tasks.map((t) => `${t.status === 'completed' ? '✅' : '⏳'} ${t.title}`).join('\n');
    return `Here are your scheduled tasks for today:\n\n${taskLines}`;
  }
  if (intent.type === 'SAVE_MEMORY') {
    const memory = await memoryService.createMemory(userId, { content: intent.content, category: 'personal', tags: ['voice-agent'], source: 'user_explicit', importance: 4 });
    if (lang === 'hinglish') return `🧠 Maine yaad rakh liya hai: "${memory.content}".`;
    return `🧠 Saved to your memory: "${memory.content}".`;
  }
  if (intent.type === 'SEARCH_MEMORY') {
    const results = await memoryService.getMemories(userId, { search: intent.query, limit: 3 });
    if (results.memories.length === 0) return `Mujhe "${intent.query}" se related koi memory nahi mili.`;
    const memList = results.memories.map((m) => `• ${m.content}`).join('\n');
    return `Yeh rahi aapki memory se information:\n\n${memList}`;
  }
  if (intent.type === 'GET_SUMMARY') {
    const summary = await journalService.getDailySummary(userId, new Date());
    if (summary) return `Here is your summary for today:\n\n${summary.content || summary.summary}`;
    return 'Aaj ka summary abhi generate nahi hua hai.';
  }

  throw new Error(`Local action not supported for intent: ${intent.type}`);
};

module.exports = { handleMessage, detectLanguage, parseIntent, generateGeminiContent, detectTopic };
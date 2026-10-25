const Memory = require('../models/Memory');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const { sanitizeSecrets, containsSecret } = require('../utils/secretSanitizer');
const { extractMemoriesWithAI } = require('./memoryExtractor');
const logger = require('../utils/logger');

/**
 * Save or Merge Memory:
 * Prevents duplicates by checking for existing memories with matching content,
 * same title, or same topic+category. Updates existing memories if new information arrives.
 */
const saveOrMergeMemory = async (userId, memoryData) => {
  const sanitizedContent = sanitizeSecrets(memoryData.content || '').trim();
  const sanitizedTitle = sanitizeSecrets(memoryData.title || '').trim();

  if (!sanitizedContent) {
    return null;
  }

  // Generate fallback title if missing
  const title = sanitizedTitle || sanitizedContent.slice(0, 60).replace(/\n/g, ' ').trim();
  const category = memoryData.category || 'other';
  const topic = memoryData.topic || '';
  const importance = Math.min(5, Math.max(1, Number(memoryData.importance) || 3));
  const tags = Array.isArray(memoryData.tags)
    ? memoryData.tags.map((t) => t.toLowerCase().trim()).filter(Boolean)
    : [];
  const source = memoryData.source || 'conversation';
  const sourceRef = memoryData.sourceRef || memoryData.conversation;
  const conversationId = memoryData.conversation || memoryData.sourceRef;

  // Check for duplicate or closely related memory for this user
  // 1. Exact or near-exact content match
  let existing = await Memory.findOne({
    user: userId,
    isArchived: false,
    $or: [
      { content: sanitizedContent },
      ...(topic && title ? [{ topic, title }] : []),
      ...(title ? [{ title, category }] : []),
    ],
  });

  if (existing) {
    logger.info(`Existing memory match found (ID: ${existing._id}). Merging updates.`);
    // If the new content is richer or different, update content
    if (sanitizedContent.length > existing.content.length || !existing.content.includes(sanitizedContent)) {
      existing.content = sanitizedContent;
    }
    if (title && (!existing.title || existing.title.length < title.length)) {
      existing.title = title;
    }
    if (topic && !existing.topic) {
      existing.topic = topic;
    }
    // Merge tags
    const combinedTags = new Set([...(existing.tags || []), ...tags]);
    existing.tags = Array.from(combinedTags);
    existing.importance = Math.max(existing.importance || 3, importance);
    existing.lastAccessedAt = new Date();
    existing.accessCount = (existing.accessCount || 0) + 1;
    if (conversationId && !existing.conversation) {
      existing.conversation = conversationId;
    }
    if (sourceRef && !existing.sourceRef) {
      existing.sourceRef = sourceRef;
    }

    await existing.save();
    return existing;
  }

  // Create new memory entry
  return Memory.create({
    user: userId,
    title,
    content: sanitizedContent,
    category,
    topic,
    tags,
    source,
    sourceRef,
    conversation: conversationId,
    importance,
    accessCount: 1,
    lastAccessedAt: new Date(),
  });
};

/**
 * Create a new memory entry (manual or explicit).
 */
const createMemory = async (
  userId,
  { title, content, category, topic, tags, source, sourceRef, conversation, importance }
) => {
  return saveOrMergeMemory(userId, {
    title,
    content,
    category: category || 'other',
    topic,
    tags,
    source: source || 'user_explicit',
    sourceRef,
    conversation,
    importance,
  });
};

/**
 * Get all memories for a user with optional filters.
 */
const getMemories = async (
  userId,
  { category, topic, tags, search, page = 1, limit = 50, includeArchived = false } = {}
) => {
  const query = { user: userId };
  if (!includeArchived) query.isArchived = false;
  if (category) query.category = category;
  if (topic) query.topic = topic;
  if (tags && tags.length > 0) query.tags = { $in: Array.isArray(tags) ? tags : [tags] };

  let dbQuery;
  if (search && search.trim()) {
    const cleanSearch = search.trim();
    // Try text search or regex fallback
    dbQuery = Memory.find(
      {
        ...query,
        $or: [
          { $text: { $search: cleanSearch } },
          { title: { $regex: cleanSearch, $options: 'i' } },
          { content: { $regex: cleanSearch, $options: 'i' } },
          { topic: { $regex: cleanSearch, $options: 'i' } },
        ],
      }
    ).populate('conversation', 'title createdAt');
  } else {
    dbQuery = Memory.find(query)
      .sort({ importance: -1, createdAt: -1 })
      .populate('conversation', 'title createdAt');
  }

  const skip = (page - 1) * limit;
  const [memories, total] = await Promise.all([
    dbQuery.skip(skip).limit(limit),
    Memory.countDocuments(query),
  ]);

  return {
    memories,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
};

/**
 * Get a single memory by ID (scoped to user).
 */
const getMemoryById = async (userId, memoryId) => {
  const memory = await Memory.findOne({ _id: memoryId, user: userId }).populate('conversation', 'title createdAt');
  if (!memory) {
    const err = new Error('Memory not found');
    err.statusCode = 404;
    throw err;
  }
  memory.lastAccessedAt = new Date();
  memory.accessCount = (memory.accessCount || 0) + 1;
  await memory.save({ validateBeforeSave: false });
  return memory;
};

/**
 * Update a memory (user-scoped).
 */
const updateMemory = async (userId, memoryId, updates) => {
  const allowed = ['title', 'content', 'category', 'topic', 'tags', 'importance', 'isArchived'];
  const sanitized = {};
  allowed.forEach((key) => {
    if (updates[key] !== undefined) sanitized[key] = updates[key];
  });

  if (sanitized.content) {
    sanitized.content = sanitizeSecrets(sanitized.content);
  }
  if (sanitized.title) {
    sanitized.title = sanitizeSecrets(sanitized.title);
  }

  const memory = await Memory.findOneAndUpdate(
    { _id: memoryId, user: userId },
    sanitized,
    { new: true, runValidators: true }
  ).populate('conversation', 'title createdAt');

  if (!memory) {
    const err = new Error('Memory not found');
    err.statusCode = 404;
    throw err;
  }
  return memory;
};

/**
 * Delete a memory (user-scoped).
 */
const deleteMemory = async (userId, memoryId) => {
  const memory = await Memory.findOneAndDelete({ _id: memoryId, user: userId });
  if (!memory) {
    const err = new Error('Memory not found');
    err.statusCode = 404;
    throw err;
  }
  return memory;
};

/**
 * Retrieve relevant memories for context injection before AI calls.
 * Performs hybrid matching on keywords, topic, and text search, boosting importance.
 */
const retrieveRelevantMemories = async (userId, query, { topic = null, limit = 6 } = {}) => {
  if (!userId) return [];

  const queryTerms = (query || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);

  const conditions = [{ user: userId, isArchived: false }];

  if (topic) {
    conditions.push({
      $or: [
        { topic: { $regex: topic, $options: 'i' } },
        { tags: { $in: [topic.toLowerCase()] } },
      ],
    });
  }

  let candidates = [];

  // Try text search if query is non-empty
  if (query && query.trim().length > 0) {
    try {
      const textMatches = await Memory.find(
        { user: userId, isArchived: false, $text: { $search: query } },
        { score: { $meta: 'textScore' } }
      )
        .sort({ score: { $meta: 'textScore' }, importance: -1 })
        .limit(limit)
        .lean();
      candidates.push(...textMatches);
    } catch (e) {
      // Text index issue fallback
    }
  }

  // Regex fallback matching key keywords
  if (candidates.length < limit && queryTerms.length > 0) {
    const regexPattern = queryTerms.slice(0, 5).join('|');
    const regexMatches = await Memory.find({
      user: userId,
      isArchived: false,
      _id: { $nin: candidates.map((c) => c._id) },
      $or: [
        { title: { $regex: regexPattern, $options: 'i' } },
        { content: { $regex: regexPattern, $options: 'i' } },
        { topic: { $regex: regexPattern, $options: 'i' } },
        { tags: { $in: queryTerms } },
      ],
    })
      .sort({ importance: -1, createdAt: -1 })
      .limit(limit - candidates.length)
      .lean();
    candidates.push(...regexMatches);
  }

  // If still fewer than limit, fetch top high-importance recent memories
  if (candidates.length < 3) {
    const topMemories = await Memory.find({
      user: userId,
      isArchived: false,
      _id: { $nin: candidates.map((c) => c._id) },
    })
      .sort({ importance: -1, lastAccessedAt: -1, createdAt: -1 })
      .limit(limit - candidates.length)
      .lean();
    candidates.push(...topMemories);
  }

  // Update access tracking asynchronously
  if (candidates.length > 0) {
    const candidateIds = candidates.map((c) => c._id);
    Memory.updateMany(
      { _id: { $in: candidateIds } },
      { $inc: { accessCount: 1 }, $set: { lastAccessedAt: new Date() } }
    ).exec();
  }

  return candidates.slice(0, limit);
};

/**
 * Retrieve Relevant Past Conversation History:
 * When the user says "Continue the browser automation work from yesterday"
 * or discusses a previously touched topic, retrieve previous conversations and messages.
 */
const retrieveRelevantConversations = async (userId, { currentConversationId = null, query = '', topic = null, limit = 2 } = {}) => {
  if (!userId) return [];

  const filter = {
    user: userId,
    isActive: true,
  };
  if (currentConversationId) {
    filter._id = { $ne: currentConversationId };
  }

  // Extract significant words from user query
  const stopWords = new Set(['continue', 'yesterday', 'work', 'from', 'with', 'what', 'the', 'and', 'about', 'this', 'that', 'our', 'project']);
  const keywords = (query || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));

  let conversations = [];

  // 1. Search by topic or title matches
  if (topic || keywords.length > 0) {
    const searchRegex = topic || keywords.join('|');
    if (searchRegex) {
      conversations = await Conversation.find({
        ...filter,
        $or: [
          { title: { $regex: searchRegex, $options: 'i' } },
          { summary: { $regex: searchRegex, $options: 'i' } },
          { topics: { $in: [topic?.toLowerCase(), ...keywords].filter(Boolean) } },
        ],
      })
        .sort({ lastMessageAt: -1 })
        .limit(limit)
        .lean();
    }
  }

  // 2. If no direct match in conversation meta, search past messages
  if (conversations.length === 0 && keywords.length > 0) {
    const messageMatches = await Message.find({
      user: userId,
      ...(currentConversationId ? { conversation: { $ne: currentConversationId } } : {}),
      content: { $regex: keywords.join('|'), $options: 'i' },
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .distinct('conversation');

    if (messageMatches.length > 0) {
      conversations = await Conversation.find({
        _id: { $in: messageMatches },
        ...filter,
      })
        .sort({ lastMessageAt: -1 })
        .limit(limit)
        .lean();
    }
  }

  // 3. If query mentions "yesterday" or "previous" or "last time" and no specific match found, fetch the most recent prior conversation
  if (conversations.length === 0 && /(yesterday|previous|last\s+time|pehle\s+ka|kal\s+ka)/i.test(query)) {
    conversations = await Conversation.find(filter)
      .sort({ lastMessageAt: -1 })
      .limit(1)
      .lean();
  }

  // For each conversation, pull key context messages
  const results = [];
  for (const conv of conversations) {
    const recentMsgs = await Message.find({
      conversation: conv._id,
      isDeleted: false,
    })
      .sort({ createdAt: 1 })
      .limit(10)
      .lean();

    const formattedMessages = recentMsgs.map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content.slice(0, 300)}`);

    results.push({
      conversationId: conv._id,
      title: conv.title,
      summary: conv.summary || '',
      topics: conv.topics || [],
      lastMessageAt: conv.lastMessageAt,
      messages: formattedMessages,
    });
  }

  return results;
};

/**
 * Automatically extracts memories from a conversation exchange and saves/merges them.
 */
const extractAndSaveMemoriesFromConversation = async (
  userId,
  conversationId,
  userMessage,
  assistantReply,
  generateAiFn = null
) => {
  try {
    const extractedCandidates = await extractMemoriesWithAI(userMessage, assistantReply, generateAiFn);

    if (!extractedCandidates || extractedCandidates.length === 0) {
      return [];
    }

    const savedMemories = [];
    for (const candidate of extractedCandidates) {
      const memory = await saveOrMergeMemory(userId, {
        ...candidate,
        conversation: conversationId,
        sourceRef: conversationId,
        source: candidate.source || 'conversation',
      });
      if (memory) {
        savedMemories.push(memory);
      }
    }

    if (savedMemories.length > 0) {
      logger.info(`Extracted and saved ${savedMemories.length} memories for user ${userId}`);
    }

    return savedMemories;
  } catch (err) {
    logger.error(`Error in extractAndSaveMemoriesFromConversation: ${err.message}`);
    return [];
  }
};

/**
 * Delete ALL memories for a user (GDPR data deletion).
 */
const deleteAllMemories = async (userId) => {
  return Memory.deleteMany({ user: userId });
};

module.exports = {
  createMemory,
  saveOrMergeMemory,
  getMemories,
  getMemoryById,
  updateMemory,
  deleteMemory,
  retrieveRelevantMemories,
  retrieveRelevantConversations,
  extractAndSaveMemoriesFromConversation,
  deleteAllMemories,
};

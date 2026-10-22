const Memory = require('../models/Memory');

/**
 * Create a new memory entry.
 */
const createMemory = async (userId, { content, category, tags, source, importance }) => {
  return Memory.create({
    user: userId,
    content,
    category: category || 'other',
    tags: tags || [],
    source: source || 'user_explicit',
    importance: importance || 3,
  });
};

/**
 * Get all memories for a user with optional filters.
 */
const getMemories = async (userId, { category, tags, search, page = 1, limit = 20, includeArchived = false } = {}) => {
  const query = { user: userId };
  if (!includeArchived) query.isArchived = false;
  if (category) query.category = category;
  if (tags && tags.length > 0) query.tags = { $in: Array.isArray(tags) ? tags : [tags] };

  let dbQuery;
  if (search) {
    dbQuery = Memory.find({ ...query, $text: { $search: search } }, { score: { $meta: 'textScore' } })
      .sort({ score: { $meta: 'textScore' }, createdAt: -1 });
  } else {
    dbQuery = Memory.find(query).sort({ importance: -1, createdAt: -1 });
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
  const memory = await Memory.findOne({ _id: memoryId, user: userId });
  if (!memory) {
    const err = new Error('Memory not found');
    err.statusCode = 404;
    throw err;
  }
  // Update access tracking
  memory.lastAccessedAt = new Date();
  memory.accessCount += 1;
  await memory.save({ validateBeforeSave: false });
  return memory;
};

/**
 * Update a memory (user-scoped).
 */
const updateMemory = async (userId, memoryId, updates) => {
  const allowed = ['content', 'category', 'tags', 'importance', 'isArchived'];
  const sanitized = {};
  allowed.forEach((key) => { if (updates[key] !== undefined) sanitized[key] = updates[key]; });

  const memory = await Memory.findOneAndUpdate(
    { _id: memoryId, user: userId },
    sanitized,
    { new: true, runValidators: true }
  );

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
 * Uses text search as a simple semantic proxy.
 */
const retrieveRelevantMemories = async (userId, query, limit = 5) => {
  if (!query || query.trim().length === 0) return [];
  return Memory.find(
    { user: userId, isArchived: false, $text: { $search: query } },
    { score: { $meta: 'textScore' } }
  )
    .sort({ score: { $meta: 'textScore' } })
    .limit(limit)
    .lean();
};

/**
 * Delete ALL memories for a user (GDPR data deletion).
 */
const deleteAllMemories = async (userId) => {
  return Memory.deleteMany({ user: userId });
};

module.exports = {
  createMemory,
  getMemories,
  getMemoryById,
  updateMemory,
  deleteMemory,
  retrieveRelevantMemories,
  deleteAllMemories,
};

const memoryService = require('../services/memoryService');

const createMemory = async (req, res, next) => {
  try {
    const memory = await memoryService.createMemory(req.user._id, req.body);
    res.status(201).json({ success: true, data: { memory } });
  } catch (error) {
    next(error);
  }
};

const getMemories = async (req, res, next) => {
  try {
    const { category, tags, search, page, limit, includeArchived } = req.query;
    const result = await memoryService.getMemories(req.user._id, {
      category,
      tags: tags ? tags.split(',') : undefined,
      search,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      includeArchived: includeArchived === 'true',
    });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

const getMemoryById = async (req, res, next) => {
  try {
    const memory = await memoryService.getMemoryById(req.user._id, req.params.id);
    res.json({ success: true, data: { memory } });
  } catch (error) {
    next(error);
  }
};

const updateMemory = async (req, res, next) => {
  try {
    const memory = await memoryService.updateMemory(req.user._id, req.params.id, req.body);
    res.json({ success: true, data: { memory } });
  } catch (error) {
    next(error);
  }
};

const deleteMemory = async (req, res, next) => {
  try {
    await memoryService.deleteMemory(req.user._id, req.params.id);
    res.json({ success: true, message: 'Memory deleted' });
  } catch (error) {
    next(error);
  }
};

const deleteAllMemories = async (req, res, next) => {
  try {
    const result = await memoryService.deleteAllMemories(req.user._id);
    res.json({ success: true, message: `Deleted ${result.deletedCount} memories` });
  } catch (error) {
    next(error);
  }
};

module.exports = { createMemory, getMemories, getMemoryById, updateMemory, deleteMemory, deleteAllMemories };

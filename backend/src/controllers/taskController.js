const taskService = require('../services/taskService');

const createTask = async (req, res, next) => {
  try {
    const task = await taskService.createTask(req.user._id, req.body);
    res.status(201).json({ success: true, data: { task } });
  } catch (error) {
    next(error);
  }
};

const getTasksByDate = async (req, res, next) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const tasks = await taskService.getTasksByDate(req.user._id, date);
    res.json({ success: true, data: { tasks, date } });
  } catch (error) {
    next(error);
  }
};

const getTasks = async (req, res, next) => {
  try {
    const { status, category, startDate, endDate, search, page, limit } = req.query;
    const result = await taskService.getTasks(req.user._id, {
      status,
      category,
      startDate,
      endDate,
      search,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
    });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

const getTaskById = async (req, res, next) => {
  try {
    const task = await taskService.getTaskById(req.user._id, req.params.id);
    res.json({ success: true, data: { task } });
  } catch (error) {
    next(error);
  }
};

const updateTask = async (req, res, next) => {
  try {
    const task = await taskService.updateTask(req.user._id, req.params.id, req.body);
    res.json({ success: true, data: { task } });
  } catch (error) {
    next(error);
  }
};

const deleteTask = async (req, res, next) => {
  try {
    await taskService.deleteTask(req.user._id, req.params.id);
    res.json({ success: true, message: 'Task deleted' });
  } catch (error) {
    next(error);
  }
};

const getTaskStats = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const stats = await taskService.getTaskStats(req.user._id, { startDate, endDate });
    res.json({ success: true, data: { stats } });
  } catch (error) {
    next(error);
  }
};

module.exports = { createTask, getTasksByDate, getTasks, getTaskById, updateTask, deleteTask, getTaskStats };

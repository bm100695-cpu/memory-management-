const DailyTask = require('../models/DailyTask');

/**
 * Normalize a date to midnight UTC for consistent day-based queries.
 */
const toDateKey = (dateInput) => {
  const d = dateInput ? new Date(dateInput) : new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

/**
 * Create a task.
 */
const createTask = async (userId, data) => {
  const scheduledDate = toDateKey(data.scheduledDate || new Date());
  return DailyTask.create({ ...data, user: userId, scheduledDate });
};

/**
 * Get tasks for a specific date (defaults to today).
 */
const getTasksByDate = async (userId, date) => {
  const day = toDateKey(date);
  const nextDay = new Date(day);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);

  return DailyTask.find({
    user: userId,
    scheduledDate: { $gte: day, $lt: nextDay },
  }).sort({ priority: -1, createdAt: 1 });
};

/**
 * Get tasks with flexible filters and pagination.
 */
const getTasks = async (
  userId,
  { status, category, startDate, endDate, search, page = 1, limit = 20 } = {}
) => {
  const query = { user: userId };
  if (status) query.status = status;
  if (category) query.category = category;
  if (startDate || endDate) {
    query.scheduledDate = {};
    if (startDate) query.scheduledDate.$gte = toDateKey(startDate);
    if (endDate) {
      const end = toDateKey(endDate);
      end.setUTCDate(end.getUTCDate() + 1);
      query.scheduledDate.$lt = end;
    }
  }
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (page - 1) * limit;
  const [tasks, total] = await Promise.all([
    DailyTask.find(query).sort({ scheduledDate: -1, createdAt: -1 }).skip(skip).limit(limit),
    DailyTask.countDocuments(query),
  ]);

  return { tasks, total, page, totalPages: Math.ceil(total / limit) };
};

/**
 * Get a single task (user-scoped).
 */
const getTaskById = async (userId, taskId) => {
  const task = await DailyTask.findOne({ _id: taskId, user: userId });
  if (!task) {
    const err = new Error('Task not found');
    err.statusCode = 404;
    throw err;
  }
  return task;
};

/**
 * Update a task (user-scoped).
 */
const updateTask = async (userId, taskId, updates) => {
  const allowed = ['title', 'description', 'status', 'category', 'customCategory', 'priority', 'scheduledDate', 'deadline', 'tags'];
  const sanitized = {};
  allowed.forEach((key) => { if (updates[key] !== undefined) sanitized[key] = updates[key]; });
  if (sanitized.scheduledDate) sanitized.scheduledDate = toDateKey(sanitized.scheduledDate);
  if (sanitized.status === 'completed') {
    sanitized.completedAt = new Date();
  } else if (sanitized.status && sanitized.status !== 'completed') {
    sanitized.completedAt = null;
  }

  const task = await DailyTask.findOneAndUpdate(
    { _id: taskId, user: userId },
    sanitized,
    { new: true, runValidators: true }
  );
  if (!task) {
    const err = new Error('Task not found');
    err.statusCode = 404;
    throw err;
  }
  return task;
};

/**
 * Delete a task (user-scoped).
 */
const deleteTask = async (userId, taskId) => {
  const task = await DailyTask.findOneAndDelete({ _id: taskId, user: userId });
  if (!task) {
    const err = new Error('Task not found');
    err.statusCode = 404;
    throw err;
  }
  return task;
};

/**
 * Get summary stats for a date range.
 */
const getTaskStats = async (userId, { startDate, endDate } = {}) => {
  const query = { user: userId };
  if (startDate || endDate) {
    query.scheduledDate = {};
    if (startDate) query.scheduledDate.$gte = toDateKey(startDate);
    if (endDate) {
      const end = toDateKey(endDate);
      end.setUTCDate(end.getUTCDate() + 1);
      query.scheduledDate.$lt = end;
    }
  }

  const stats = await DailyTask.aggregate([
    { $match: query },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);

  const result = { total: 0, completed: 0, pending: 0, in_progress: 0, planned: 0, cancelled: 0 };
  stats.forEach(({ _id, count }) => {
    result[_id] = count;
    result.total += count;
  });
  result.completionPercentage =
    result.total > 0 ? Math.round((result.completed / result.total) * 100) : 0;

  return result;
};

module.exports = {
  createTask,
  getTasksByDate,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
  getTaskStats,
  toDateKey,
};

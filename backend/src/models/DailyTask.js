const mongoose = require('mongoose');

const TASK_CATEGORIES = [
  'dsa',
  'college',
  'project',
  'internship',
  'learning',
  'career',
  'personal',
  'custom',
];

const TASK_STATUS = ['planned', 'in_progress', 'completed', 'pending', 'cancelled'];
const TASK_PRIORITY = ['low', 'medium', 'high', 'urgent'];

const dailyTaskSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      maxlength: [300, 'Title too long'],
    },
    description: {
      type: String,
      maxlength: [2000, 'Description too long'],
    },
    category: {
      type: String,
      enum: TASK_CATEGORIES,
      default: 'personal',
      index: true,
    },
    customCategory: String, // When category === 'custom'
    status: {
      type: String,
      enum: TASK_STATUS,
      default: 'planned',
      index: true,
    },
    priority: {
      type: String,
      enum: TASK_PRIORITY,
      default: 'medium',
    },
    // The calendar date this task belongs to (YYYY-MM-DD stored as Date midnight UTC)
    scheduledDate: {
      type: Date,
      required: true,
      index: true,
    },
    deadline: { type: Date },
    completedAt: { type: Date },
    // Original natural language input from the user
    rawInput: { type: String },
    // Tags for flexible querying
    tags: [String],
    // Source: voice, chat, or manual
    inputSource: {
      type: String,
      enum: ['voice', 'chat', 'manual'],
      default: 'manual',
    },
  },
  { timestamps: true }
);

dailyTaskSchema.index({ user: 1, scheduledDate: 1 });
dailyTaskSchema.index({ user: 1, status: 1, scheduledDate: -1 });
dailyTaskSchema.index({ user: 1, category: 1, scheduledDate: -1 });

// Auto-set completedAt when status changes to 'completed'
dailyTaskSchema.pre('save', function (next) {
  if (this.isModified('status') && this.status === 'completed' && !this.completedAt) {
    this.completedAt = new Date();
  }
  next();
});

module.exports = mongoose.model('DailyTask', dailyTaskSchema);
module.exports.TASK_CATEGORIES = TASK_CATEGORIES;
module.exports.TASK_STATUS = TASK_STATUS;
module.exports.TASK_PRIORITY = TASK_PRIORITY;

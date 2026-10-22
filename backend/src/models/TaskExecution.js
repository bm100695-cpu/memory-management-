const mongoose = require('mongoose');

const taskExecutionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: { type: String, required: true },
    description: String,
    status: {
      type: String,
      enum: ['pending', 'running', 'paused', 'completed', 'failed', 'cancelled'],
      default: 'pending',
      index: true,
    },
    totalSteps: { type: Number, default: 0 },
    completedSteps: { type: Number, default: 0 },
    startedAt: Date,
    completedAt: Date,
    error: String,
    result: mongoose.Schema.Types.Mixed,
    // Original request from user
    originalRequest: String,
    // Whether user approval was required
    requiresApproval: { type: Boolean, default: false },
    approvedAt: Date,
    cancelledAt: Date,
    cancelReason: String,
  },
  { timestamps: true }
);

const taskStepSchema = new mongoose.Schema(
  {
    execution: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TaskExecution',
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    stepIndex: { type: Number, required: true },
    title: { type: String, required: true },
    description: String,
    status: {
      type: String,
      enum: ['pending', 'running', 'completed', 'failed', 'skipped'],
      default: 'pending',
    },
    actionType: {
      type: String,
      enum: [
        'ai_query',
        'memory_retrieve',
        'task_update',
        'form_fill',
        'browse',
        'open_url',
        'search_web',
        'extract_info',
        'filter_data',
        'save_research',
        'create_task',
        'notify',
        'other',
      ],
    },
    input: mongoose.Schema.Types.Mixed,
    output: mongoose.Schema.Types.Mixed,
    error: String,
    startedAt: Date,
    completedAt: Date,
    retryCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

taskExecutionSchema.index({ user: 1, createdAt: -1 });
taskExecutionSchema.index({ user: 1, status: 1 });

const TaskExecution = mongoose.model('TaskExecution', taskExecutionSchema);
const TaskStep = mongoose.model('TaskStep', taskStepSchema);

module.exports = { TaskExecution, TaskStep };

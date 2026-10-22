const mongoose = require('mongoose');

const memorySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: [true, 'Memory content is required'],
      maxlength: [5000, 'Memory content too long'],
    },
    category: {
      type: String,
      enum: [
        'personal',
        'preference',
        'goal',
        'project',
        'decision',
        'fact',
        'contact',
        'other',
      ],
      default: 'other',
      index: true,
    },
    tags: [{ type: String, lowercase: true, trim: true }],
    source: {
      type: String,
      enum: ['user_explicit', 'conversation', 'task', 'research', 'profile', 'system'],
      default: 'user_explicit',
    },
    sourceRef: {
      type: mongoose.Schema.Types.ObjectId,
      // Could point to Conversation, DailyTask, etc.
    },
    importance: {
      type: Number,
      min: 1,
      max: 5,
      default: 3,
    },
    isArchived: { type: Boolean, default: false },
    lastAccessedAt: { type: Date },
    accessCount: { type: Number, default: 0 },
    // Embedding vector for semantic search (stored as array of floats)
    embedding: {
      type: [Number],
      select: false,
    },
  },
  { timestamps: true }
);

// Indexes for common queries
memorySchema.index({ user: 1, category: 1 });
memorySchema.index({ user: 1, tags: 1 });
memorySchema.index({ user: 1, createdAt: -1 });
memorySchema.index({ user: 1, isArchived: 1 });

// Text search index
memorySchema.index({ content: 'text', tags: 'text' });

module.exports = mongoose.model('Memory', memorySchema);

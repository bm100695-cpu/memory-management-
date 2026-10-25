const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      default: 'New Conversation',
      maxlength: [200, 'Title too long'],
    },
    isActive: { type: Boolean, default: true },
    lastMessageAt: { type: Date, default: Date.now },
    messageCount: { type: Number, default: 0 },
    language: {
      type: String,
      enum: ['en', 'hi', 'hinglish', 'auto'],
      default: 'auto',
    },
    // Rolling summary of this conversation (requirements, decisions, pending steps)
    summary: {
      type: String,
      maxlength: [3000, 'Summary too long'],
    },
    topics: [{ type: String, trim: true, lowercase: true }],
    // Context memories used in this conversation
    memoriesUsed: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Memory' }],
  },
  { timestamps: true }
);

conversationSchema.index({ user: 1, lastMessageAt: -1 });
conversationSchema.index({ user: 1, topics: 1 });
conversationSchema.index(
  { title: 'text', summary: 'text', topics: 'text' },
  { language_override: 'none' }
);

module.exports = mongoose.model('Conversation', conversationSchema);

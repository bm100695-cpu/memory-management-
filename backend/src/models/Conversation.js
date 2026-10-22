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
    // Context memories used in this conversation
    memoriesUsed: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Memory' }],
  },
  { timestamps: true }
);

conversationSchema.index({ user: 1, lastMessageAt: -1 });

module.exports = mongoose.model('Conversation', conversationSchema);

const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['user', 'assistant', 'system'],
      required: true,
    },
    content: {
      type: String,
      required: [true, 'Message content is required'],
      maxlength: [20000, 'Message too long'],
    },
    // For voice messages
    audioUrl: String,
    // Detected language
    language: {
      type: String,
      enum: ['en', 'hi', 'hinglish', 'unknown'],
      default: 'en',
    },
    inputSource: {
      type: String,
      enum: ['text', 'voice', 'system', 'voice_or_text'],
      default: 'text',
    },
    // Tool calls the AI made (if any)
    toolCalls: [
      {
        name: String,
        arguments: mongoose.Schema.Types.Mixed,
        result: mongoose.Schema.Types.Mixed,
        status: { type: String, enum: ['pending', 'success', 'error'] },
      },
    ],
    // Memories retrieved for this message
    memoriesUsed: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Memory' }],
    // Token usage for cost tracking
    tokenUsage: {
      promptTokens: Number,
      completionTokens: Number,
      totalTokens: Number,
    },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

messageSchema.index({ conversation: 1, createdAt: 1 });
messageSchema.index({ user: 1, createdAt: -1 });
messageSchema.index({ content: 'text' }, { language_override: 'none' });

module.exports = mongoose.model('Message', messageSchema);
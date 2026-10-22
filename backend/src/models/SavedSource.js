const mongoose = require('mongoose');

const savedSourceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    url: {
      type: String,
      required: [true, 'URL is required'],
      maxlength: [2000, 'URL too long'],
    },
    title: {
      type: String,
      maxlength: [500, 'Title too long'],
    },
    notes: {
      type: String,
      maxlength: [5000, 'Notes too long'],
    },
    excerpt: {
      type: String,
      maxlength: [3000, 'Excerpt too long'],
    },
    summary: {
      type: String,
      maxlength: [2000, 'Summary too long'],
    },
    tags: [String],
    // Related tasks or projects
    relatedTasks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'DailyTask' }],
    // Metadata
    lastCheckedAt: { type: Date },
    isAvailable: { type: Boolean, default: true },
    // Whether this is AI-generated summary vs user notes
    summaryIsAI: { type: Boolean, default: false },
  },
  { timestamps: true }
);

savedSourceSchema.index({ user: 1, createdAt: -1 });
savedSourceSchema.index({ user: 1, tags: 1 });
// Text search
savedSourceSchema.index({ title: 'text', notes: 'text', tags: 'text' });

module.exports = mongoose.model('SavedSource', savedSourceSchema);

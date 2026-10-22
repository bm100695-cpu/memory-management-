const mongoose = require('mongoose');

const formSessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    url: { type: String, required: true },
    formTitle: String,
    status: {
      type: String,
      enum: ['analyzing', 'prepared', 'reviewing', 'approved', 'submitted', 'failed', 'cancelled'],
      default: 'analyzing',
    },
    // Fields detected in the form
    detectedFields: [
      {
        fieldId: String,
        label: String,
        type: String, // text, email, select, checkbox, textarea
        required: Boolean,
      },
    ],
    // Mapping from field to profile data
    fieldMappings: [
      {
        fieldId: String,
        label: String,
        value: String,
        source: String, // profile field path or 'manual'
        confidence: Number, // 0–1
        needsReview: Boolean,
      },
    ],
    // Fields user explicitly approved
    approvedAt: Date,
    submittedAt: Date,
    submissionResult: String,
    error: String,
  },
  { timestamps: true }
);

formSessionSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('FormSession', formSessionSchema);

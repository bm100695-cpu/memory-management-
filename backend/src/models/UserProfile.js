const mongoose = require('mongoose');

const userProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    // Personal info
    fullName: String,
    phone: String,
    dateOfBirth: Date,
    gender: String,
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      pincode: String,
    },
    // Education
    education: [
      {
        institution: String,
        degree: String,
        field: String,
        startYear: Number,
        endYear: Number,
        grade: String,
        current: Boolean,
      },
    ],
    // Skills
    skills: [String],
    // Work experience
    workExperience: [
      {
        company: String,
        role: String,
        startDate: Date,
        endDate: Date,
        current: Boolean,
        description: String,
      },
    ],
    // Projects
    projects: [
      {
        name: String,
        description: String,
        technologies: [String],
        url: String,
        github: String,
      },
    ],
    // Social links
    socialLinks: {
      linkedin: String,
      github: String,
      portfolio: String,
      twitter: String,
    },
    // Common application answers (not passwords)
    commonAnswers: [
      {
        question: String,
        answer: String,
      },
    ],
    // Bio / summary
    bio: String,
    languages: [String],
    // NOTE: Never store passwords, OTPs, tokens here
  },
  { timestamps: true }
);

module.exports = mongoose.model('UserProfile', userProfileSchema);

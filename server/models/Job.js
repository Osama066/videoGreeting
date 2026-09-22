const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema(
  {
    userName: {
      type: String,
      required: true,
      trim: true,
    },
    userMobile: {
      type: String,
      required: true,
      trim: true,
    },
    userEmail: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'generating_voice', 'generating_lipsync', 'completed', 'failed'],
      default: 'pending',
      index: true,
    },
    greetingText: {
      type: String,
      default: '',
    },
    audioUrl: {
      type: String,
      default: '',
    },
    masterVideoUrl: {
      type: String,
      default: '',
    },
    finalVideoUrl: {
      type: String,
      default: '',
    },
    errorMessage: {
      type: String,
      default: '',
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// In-memory job repository fallback
const inMemoryJobs = new Map();

const Job = mongoose.models.Job || mongoose.model('Job', jobSchema);

module.exports = {
  Job,
  inMemoryJobs,
};

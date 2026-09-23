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

const { loadStore, saveStore } = require('../config/localStore');

// In-memory job repository fallback backed by localStore
const inMemoryJobs = new Map();

// Initialize from localStore
const store = loadStore();
if (Array.isArray(store.jobs)) {
  store.jobs.forEach((job) => {
    if (job && job._id) {
      inMemoryJobs.set(job._id, job);
    }
  });
}

const syncJobs = () => {
  const current = loadStore();
  current.jobs = Array.from(inMemoryJobs.values());
  saveStore(current);
};

const Job = mongoose.models.Job || mongoose.model('Job', jobSchema);

module.exports = {
  Job,
  inMemoryJobs,
  syncJobs,
};

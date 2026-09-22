const mongoose = require('mongoose');

const masterVideoSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    cloudinaryUrl: {
      type: String,
      required: true,
    },
    cloudinaryPublicId: {
      type: String,
      default: '',
    },
    duration: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Fallback in-memory storage if MongoDB is not connected
let inMemoryMasterVideos = [];

const MasterVideo = mongoose.models.MasterVideo || mongoose.model('MasterVideo', masterVideoSchema);

module.exports = {
  MasterVideo,
  inMemoryMasterVideos,
};

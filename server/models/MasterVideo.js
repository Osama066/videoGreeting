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
    mode: {
      type: String,
      enum: ['name_slot', 'full_video'],
      default: 'name_slot',
    },
    nameSlotStart: {
      type: Number,
      default: 1.0,
    },
    nameSlotEnd: {
      type: Number,
      default: 2.6,
    },
    prefixPhrase: {
      type: String,
      default: 'Hello',
    },
    suffixPhrase: {
      type: String,
      default: '',
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

const { loadStore, saveStore } = require('../config/localStore');

// Persistent local storage if MongoDB is not connected
const store = loadStore();
let inMemoryMasterVideos = store.masterVideos || [];

const syncMasterVideos = () => {
  const current = loadStore();
  current.masterVideos = inMemoryMasterVideos;
  saveStore(current);
};

const MasterVideo = mongoose.models.MasterVideo || mongoose.model('MasterVideo', masterVideoSchema);

module.exports = {
  MasterVideo,
  inMemoryMasterVideos,
  syncMasterVideos,
};

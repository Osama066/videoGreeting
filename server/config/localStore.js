const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
const storeFilePath = path.join(dataDir, 'store.json');

// Default initial state, pre-seeding the user's master video so it is immediately active
const DEFAULT_STORE = {
  masterVideos: [
    {
      _id: 'mv_greeting_voice',
      title: 'Greeting Voice Master',
      cloudinaryUrl: 'https://res.cloudinary.com/dfyrmbgia/video/upload/v1790180798/voice/atfqdgfmpwgmy7g0ky57.mp4',
      cloudinaryPublicId: 'voice/atfqdgfmpwgmy7g0ky57',
      duration: 15,
      isActive: true,
      createdAt: '2026-09-23T16:26:00.000Z',
    },
  ],
  greetingTemplate:
    'Hello {name}! Thank you for connecting with us. We are thrilled to welcome you and look forward to building wonderful experiences together!',
  jobs: [],
};

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  try {
    fs.mkdirSync(dataDir, { recursive: true });
  } catch (err) {
    console.warn('[LocalStore] Could not create data directory:', err.message);
  }
}

// Load store from disk or create default
function loadStore() {
  try {
    if (fs.existsSync(storeFilePath)) {
      const raw = fs.readFileSync(storeFilePath, 'utf8');
      const parsed = JSON.parse(raw);
      // Ensure all expected properties exist
      return {
        masterVideos: parsed.masterVideos || DEFAULT_STORE.masterVideos,
        greetingTemplate: parsed.greetingTemplate || DEFAULT_STORE.greetingTemplate,
        jobs: parsed.jobs || [],
      };
    }
  } catch (err) {
    console.warn('[LocalStore] Failed to read store.json, using defaults:', err.message);
  }

  // If file doesn't exist, create it with defaults
  saveStore(DEFAULT_STORE);
  return DEFAULT_STORE;
}

// Save store to disk
function saveStore(data) {
  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(storeFilePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.warn('[LocalStore] Failed to save store.json:', err.message);
  }
}

module.exports = {
  loadStore,
  saveStore,
  DEFAULT_STORE,
};

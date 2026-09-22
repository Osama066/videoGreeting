const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai_video_greeting';

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    isConnected = true;
    console.log(`[MongoDB] Connected successfully: ${conn.connection.host}`);
  } catch (error) {
    isConnected = false;
    console.warn(`[MongoDB] Connection warning: ${error.message}`);
    console.warn('[MongoDB] Note: Running without active MongoDB connection or awaiting Atlas URI in server/.env');
  }
};

const getIsConnected = () => isConnected;

module.exports = { connectDB, getIsConnected };

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectDB, getIsConnected } = require('./config/db');
const { isCloudinaryConfigured } = require('./config/cloudinary');
const jobsRoutes = require('./routes/jobs');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend Vite client (default localhost:5173 or custom)
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
//
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    services: {
      database: getIsConnected() ? 'connected' : 'in-memory-fallback',
      cloudinary: isCloudinaryConfigured() ? 'configured' : 'pending',
      elevenLabs: process.env.ELEVENLABS_API_KEY ? 'configured' : 'pending',
      modalWav2Lip: (process.env.MODAL_WAV2LIP_ENDPOINT && !process.env.MODAL_WAV2LIP_ENDPOINT.includes('your-username')) ? 'configured' : 'pending',
    },
  });
});

// Register API routes
app.use('/api/jobs', jobsRoutes);
app.use('/api/admin', adminRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error',
  });
});

// Initialize database and start listening
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`  AI Video Greeting Server listening on port ${PORT}`);
    console.log(`  API Health: http://localhost:${PORT}/api/health`);
    console.log(`====================================================`);
  });
});

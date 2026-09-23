const express = require('express');
const multer = require('multer');
const router = express.Router();
const { MasterVideo, inMemoryMasterVideos, syncMasterVideos } = require('../models/MasterVideo');
const { Job, inMemoryJobs } = require('../models/Job');
const { Config, DEFAULT_GREETING_TEMPLATE, inMemoryConfig, syncConfig } = require('../models/Config');
const { getIsConnected } = require('../config/db');
const { isCloudinaryConfigured } = require('../config/cloudinary');
const { uploadMasterVideo, deleteAsset } = require('../services/cloudinaryService');

// Multer in-memory upload (max 50MB for master greeting video)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video files (MP4, MOV, WebM) are allowed.'));
    }
  },
});

/**
 * POST /api/admin/master-video
 * Upload new master video to Cloudinary
 */
router.post('/master-video', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Video file is required.' });
    }

    const title = req.body.title || req.file.originalname.replace(/\.[^/.]+$/, '');

    let uploadedAsset;
    if (isCloudinaryConfigured()) {
      uploadedAsset = await uploadMasterVideo(req.file.buffer, req.file.originalname);
    } else {
      // Local fallback placeholder for quick initial testing before Cloudinary setup
      console.warn('[Admin] Cloudinary not configured. Using dummy master video reference.');
      uploadedAsset = {
        url: 'https://res.cloudinary.com/demo/video/upload/dog.mp4',
        publicId: 'local_master_' + Date.now(),
        duration: 15,
      };
    }

    const videoData = {
      title,
      cloudinaryUrl: uploadedAsset.url,
      cloudinaryPublicId: uploadedAsset.publicId,
      duration: uploadedAsset.duration,
      isActive: true, // Auto-activate newly uploaded master video
      createdAt: new Date(),
    };

    if (getIsConnected()) {
      // Unset active on all other master videos
      await MasterVideo.updateMany({}, { isActive: false });
      const video = new MasterVideo(videoData);
      await video.save();
      return res.status(201).json({ success: true, masterVideo: video });
    } else {
      // In-memory update
      inMemoryMasterVideos.forEach((v) => (v.isActive = false));
      const inMemVideo = {
        _id: 'mv_' + Date.now(),
        ...videoData,
      };
      inMemoryMasterVideos.unshift(inMemVideo);
      syncMasterVideos();
      return res.status(201).json({ success: true, masterVideo: inMemVideo });
    }
  } catch (error) {
    console.error('[Admin Route] Upload master video error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/admin/master-videos
 * List all master videos
 */
router.get('/master-videos', async (req, res) => {
  try {
    let videos = [];
    if (getIsConnected()) {
      videos = await MasterVideo.find().sort({ createdAt: -1 });
    } else {
      videos = [...inMemoryMasterVideos];
    }
    return res.json({ success: true, masterVideos: videos });
  } catch (error) {
    console.error('[Admin Route] List master videos error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/admin/master-videos/:id/activate
 * Set a master video as active
 */
router.post('/master-videos/:id/activate', async (req, res) => {
  try {
    const { id } = req.params;

    if (getIsConnected()) {
      await MasterVideo.updateMany({}, { isActive: false });
      const updated = await MasterVideo.findByIdAndUpdate(id, { isActive: true }, { new: true });
      if (!updated) {
        return res.status(404).json({ success: false, error: 'Master video not found.' });
      }
      return res.json({ success: true, masterVideo: updated });
    } else {
      let found = false;
      inMemoryMasterVideos.forEach((v) => {
        if (v._id === id) {
          v.isActive = true;
          found = true;
        } else {
          v.isActive = false;
        }
      });
      if (!found) {
        return res.status(404).json({ success: false, error: 'Master video not found.' });
      }
      syncMasterVideos();
      return res.json({ success: true, message: 'Master video activated.' });
    }
  } catch (error) {
    console.error('[Admin Route] Activate master video error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/admin/master-videos/:id
 */
router.delete('/master-videos/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (getIsConnected()) {
      const video = await MasterVideo.findById(id);
      if (video) {
        if (video.cloudinaryPublicId) {
          await deleteAsset(video.cloudinaryPublicId, 'video');
        }
        await MasterVideo.findByIdAndDelete(id);
      }
    } else {
      const idx = inMemoryMasterVideos.findIndex((v) => v._id === id);
      if (idx !== -1) {
        inMemoryMasterVideos.splice(idx, 1);
        syncMasterVideos();
      }
    }
    return res.json({ success: true, message: 'Master video deleted successfully.' });
  } catch (error) {
    console.error('[Admin Route] Delete master video error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/admin/jobs
 * List all user greeting jobs
 */
router.get('/jobs', async (req, res) => {
  try {
    let jobs = [];
    if (getIsConnected()) {
      jobs = await Job.find().sort({ createdAt: -1 });
    } else {
      jobs = Array.from(inMemoryJobs.values()).sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
    }
    return res.json({ success: true, jobs });
  } catch (error) {
    console.error('[Admin Route] List jobs error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/admin/leads/export
 * Download CSV export of captured leads
 */
router.get('/leads/export', async (req, res) => {
  try {
    let jobs = [];
    if (getIsConnected()) {
      jobs = await Job.find().sort({ createdAt: -1 });
    } else {
      jobs = Array.from(inMemoryJobs.values());
    }

    // Generate CSV string
    const headers = 'Job ID,Full Name,Mobile Number,Email,Status,Video URL,Created Date\n';
    const rows = jobs
      .map((j) => {
        const id = j._id ? j._id.toString() : j.id;
        const cleanName = `"${(j.userName || '').replace(/"/g, '""')}"`;
        const cleanMobile = `"${(j.userMobile || '').replace(/"/g, '""')}"`;
        const cleanEmail = `"${(j.userEmail || '').replace(/"/g, '""')}"`;
        const status = j.status || 'unknown';
        const videoUrl = j.finalVideoUrl ? `"${j.finalVideoUrl}"` : '""';
        const date = j.createdAt ? new Date(j.createdAt).toISOString() : '';
        return `${id},${cleanName},${cleanMobile},${cleanEmail},${status},${videoUrl},${date}`;
      })
      .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="video_greeting_leads.csv"');
    return res.send(headers + rows);
  } catch (error) {
    console.error('[Admin Route] Export leads error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/admin/config
 * Get greeting script template and service status
 */
router.get('/config', async (req, res) => {
  try {
    let template = inMemoryConfig.greetingTemplate || DEFAULT_GREETING_TEMPLATE;
    if (getIsConnected()) {
      const configDoc = await Config.findOne({ key: 'greetingTemplate' });
      if (configDoc && configDoc.value) template = configDoc.value;
    }

    return res.json({
      success: true,
      config: {
        greetingTemplate: template,
        isMongoConnected: getIsConnected(),
        isCloudinaryConfigured: isCloudinaryConfigured(),
        hasElevenLabsKey: Boolean(process.env.ELEVENLABS_API_KEY),
        hasElevenLabsVoice: Boolean(process.env.ELEVENLABS_VOICE_ID),
        hasModalEndpoint: Boolean(process.env.MODAL_WAV2LIP_ENDPOINT && !process.env.MODAL_WAV2LIP_ENDPOINT.includes('your-username')),
      },
    });
  } catch (error) {
    console.error('[Admin Route] Get config error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/admin/config
 * Update greeting script template
 */
router.put('/config', async (req, res) => {
  try {
    const { greetingTemplate } = req.body;
    if (!greetingTemplate || !greetingTemplate.trim()) {
      return res.status(400).json({ success: false, error: 'Greeting template cannot be empty.' });
    }

    if (!greetingTemplate.includes('{name}')) {
      return res.status(400).json({
        success: false,
        error: 'Greeting template must contain the {name} placeholder.',
      });
    }

    const trimmed = greetingTemplate.trim();

    if (getIsConnected()) {
      await Config.findOneAndUpdate(
        { key: 'greetingTemplate' },
        { key: 'greetingTemplate', value: trimmed },
        { upsert: true, new: true }
      );
    }
    inMemoryConfig.greetingTemplate = trimmed;
    syncConfig();

    return res.json({
      success: true,
      greetingTemplate: trimmed,
      message: 'Greeting template updated successfully.',
    });
  } catch (error) {
    console.error('[Admin Route] Update config error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

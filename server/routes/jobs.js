const express = require('express');
const router = express.Router();
const { Job, inMemoryJobs } = require('../models/Job');
const { getIsConnected } = require('../config/db');
const { processGreetingJob } = require('../services/orchestrationService');

/**
 * Calculate progress percentage and user-friendly step message
 */
const getJobProgressMeta = (status) => {
  switch (status) {
    case 'pending':
      return { progress: 15, step: 1, message: 'Initializing greeting request...' };
    case 'generating_voice':
      return { progress: 45, step: 1, message: 'Synthesizing personal message in cloned voice...' };
    case 'generating_lipsync':
      return { progress: 80, step: 2, message: 'Matching lips and facial animation with master video...' };
    case 'completed':
      return { progress: 100, step: 3, message: 'High-definition video rendering complete!' };
    case 'failed':
      return { progress: 100, step: 0, message: 'Generation failed. Please try again.' };
    default:
      return { progress: 0, step: 0, message: 'Waiting...' };
  }
};

/**
 * POST /api/jobs
 * Accepts: { userName, userMobile, userEmail }
 */
router.post('/', async (req, res) => {
  try {
    const { userName, userMobile, userEmail } = req.body;

    if (!userName || !userName.trim()) {
      return res.status(400).json({ success: false, error: 'Full Name is required.' });
    }

    if (!userMobile || !userMobile.trim()) {
      return res.status(400).json({ success: false, error: 'Mobile Number is required.' });
    }

    const jobData = {
      userName: userName.trim(),
      userMobile: userMobile.trim(),
      userEmail: (userEmail || '').trim(),
      status: 'pending',
      createdAt: new Date(),
    };

    let savedJob;
    if (getIsConnected()) {
      const job = new Job(jobData);
      savedJob = await job.save();
    } else {
      const id = 'mem_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
      savedJob = { _id: id, id, ...jobData };
      inMemoryJobs.set(id, savedJob);
    }

    const jobId = savedJob._id ? savedJob._id.toString() : savedJob.id;

    // Launch pipeline asynchronously without blocking HTTP response
    setImmediate(() => {
      processGreetingJob(jobId).catch((err) => {
        console.error(`[Jobs Route] Async error for ${jobId}:`, err);
      });
    });

    return res.status(201).json({
      success: true,
      jobId,
      status: 'pending',
      message: 'Greeting generation initiated successfully.',
    });
  } catch (error) {
    console.error('[Jobs Route] Create job error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/jobs/:id
 * Returns current job status and progress metadata for polling
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let job = null;

    if (getIsConnected()) {
      try {
        job = await Job.findById(id);
      } catch (err) {
        // Invalid ObjectId or not found
      }
    }

    if (!job) {
      job = inMemoryJobs.get(id);
    }

    if (!job) {
      return res.status(404).json({ success: false, error: 'Greeting job not found.' });
    }

    const progressMeta = getJobProgressMeta(job.status);

    return res.json({
      success: true,
      job: {
        id: job._id ? job._id.toString() : job.id,
        userName: job.userName,
        userMobile: job.userMobile,
        userEmail: job.userEmail,
        status: job.status,
        greetingText: job.greetingText,
        audioUrl: job.audioUrl,
        finalVideoUrl: job.finalVideoUrl,
        errorMessage: job.errorMessage,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
        ...progressMeta,
      },
    });
  } catch (error) {
    console.error('[Jobs Route] Get job error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

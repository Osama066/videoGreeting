const { Job, inMemoryJobs } = require('../models/Job');
const { MasterVideo, inMemoryMasterVideos } = require('../models/MasterVideo');
const { Config, DEFAULT_GREETING_TEMPLATE, inMemoryConfig } = require('../models/Config');
const { getIsConnected } = require('../config/db');
const { generateClonedSpeech } = require('./elevenLabsService');
const { generateLipSyncVideo } = require('./modalWav2LipService');

/**
 * Retrieves the greeting template from database or in-memory fallback.
 */
const getGreetingTemplate = async () => {
  if (getIsConnected()) {
    try {
      const configDoc = await Config.findOne({ key: 'greetingTemplate' });
      if (configDoc && configDoc.value) return configDoc.value;
    } catch (err) {
      console.warn('[Orchestration] Failed to load config from DB:', err.message);
    }
  }
  return inMemoryConfig.greetingTemplate || DEFAULT_GREETING_TEMPLATE;
};

/**
 * Retrieves the active master video URL.
 */
const getActiveMasterVideoUrl = async () => {
  if (getIsConnected()) {
    try {
      // 1. First look for active master video
      let master = await MasterVideo.findOne({ isActive: true });
      if (master) return master.cloudinaryUrl;

      // 2. Otherwise fall back to latest uploaded video
      master = await MasterVideo.findOne().sort({ createdAt: -1 });
      if (master) return master.cloudinaryUrl;
    } catch (err) {
      console.warn('[Orchestration] Error fetching master video from DB:', err.message);
    }
  }

  // Check in-memory fallback
  const activeInMemory = inMemoryMasterVideos.find((v) => v.isActive) || inMemoryMasterVideos[0];
  if (activeInMemory) return activeInMemory.cloudinaryUrl;

  // Default sample video URL if no master video has been uploaded yet
  return 'https://res.cloudinary.com/demo/video/upload/dog.mp4';
};

/**
 * Updates a job record in DB or in-memory map.
 */
const updateJob = async (jobId, updates) => {
  if (getIsConnected()) {
    try {
      return await Job.findByIdAndUpdate(jobId, updates, { new: true });
    } catch (err) {
      console.warn('[Orchestration] DB update failed, falling back to memory:', err.message);
    }
  }

  const existing = inMemoryJobs.get(jobId);
  if (existing) {
    const updated = { ...existing, ...updates, updatedAt: new Date() };
    inMemoryJobs.set(jobId, updated);
    return updated;
  }
  return null;
};

/**
 * Asynchronously processes the greeting generation pipeline.
 * @param {string} jobId - The unique ID of the job to process.
 */
const processGreetingJob = async (jobId) => {
  console.log(`[Orchestration] Starting generation pipeline for Job ID: ${jobId}`);

  let job;
  if (getIsConnected()) {
    job = await Job.findById(jobId);
  } else {
    job = inMemoryJobs.get(jobId);
  }

  if (!job) {
    console.error(`[Orchestration] Job ${jobId} not found.`);
    return;
  }

  try {
    // 1. Prepare personalized text
    const template = await getGreetingTemplate();
    const personalizedText = template.replace(/\{name\}/gi, job.userName.trim());
    await updateJob(jobId, {
      greetingText: personalizedText,
      status: 'generating_voice',
    });

    // 2. Synthesize Cloned Voice Audio via ElevenLabs
    console.log(`[Orchestration] Generating voice for: ${job.userName}`);
    const audioUrl = await generateClonedSpeech(personalizedText);
    await updateJob(jobId, {
      audioUrl,
      status: 'generating_lipsync',
    });

    // 3. Obtain Master Video URL
    const masterVideoUrl = await getActiveMasterVideoUrl();
    await updateJob(jobId, { masterVideoUrl });

    // 4. Generate Lip-Synced Video via Modal Wav2Lip Worker
    console.log(`[Orchestration] Generating Wav2Lip lip-sync video...`);
    const finalVideoUrl = await generateLipSyncVideo(masterVideoUrl, audioUrl);

    // 5. Complete Job
    await updateJob(jobId, {
      finalVideoUrl,
      status: 'completed',
      completedAt: new Date(),
    });
    console.log(`[Orchestration] Job ${jobId} completed successfully! Video: ${finalVideoUrl}`);
  } catch (error) {
    console.error(`[Orchestration] Pipeline failed for Job ${jobId}:`, error);
    await updateJob(jobId, {
      status: 'failed',
      errorMessage: error.message || 'An unexpected error occurred during generation.',
    });
  }
};

module.exports = {
  processGreetingJob,
  getGreetingTemplate,
  getActiveMasterVideoUrl,
};

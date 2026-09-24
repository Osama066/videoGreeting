const { Job, inMemoryJobs, syncJobs } = require('../models/Job');
const { MasterVideo, inMemoryMasterVideos } = require('../models/MasterVideo');
const { Config, DEFAULT_GREETING_TEMPLATE, inMemoryConfig } = require('../models/Config');
const { getIsConnected } = require('../config/db');
const { generateClonedSpeech, generateNameSnippetSpeech } = require('./elevenLabsService');
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
 * Retrieves the active master video object.
 */
const getActiveMasterVideo = async () => {
  if (getIsConnected()) {
    try {
      // 1. First look for active master video
      let master = await MasterVideo.findOne({ isActive: true });
      if (master) return master;

      // 2. Otherwise fall back to latest uploaded video
      master = await MasterVideo.findOne().sort({ createdAt: -1 });
      if (master) return master;
    } catch (err) {
      console.warn('[Orchestration] Error fetching master video from DB:', err.message);
    }
  }

  // Check in-memory fallback
  const activeInMemory = inMemoryMasterVideos.find((v) => v.isActive) || inMemoryMasterVideos[0];
  if (activeInMemory) return activeInMemory;

  // Default fallback sample video if none exists
  return {
    cloudinaryUrl: 'https://res.cloudinary.com/dfyrmbgia/video/upload/v1790180798/voice/atfqdgfmpwgmy7g0ky57.mp4',
    mode: 'name_slot',
    nameSlotStart: 1.0,
    nameSlotEnd: 2.6,
    prefixPhrase: 'Hello',
    suffixPhrase: '',
  };
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
    syncJobs();
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
    const masterVideo = await getActiveMasterVideo();
    const mode = masterVideo.mode || 'name_slot';
    console.log(`[Orchestration] Master video mode: ${mode} (Start: ${masterVideo.nameSlotStart}s, End: ${masterVideo.nameSlotEnd}s)`);

    let audioUrl = '';
    let spokenText = '';

    if (mode === 'name_slot') {
      // 1. Name-Slot Mode: Generate ONLY name snippet speech (saves ~90% cost)
      const prefix = masterVideo.prefixPhrase !== undefined ? masterVideo.prefixPhrase : 'Hello';
      const suffix = masterVideo.suffixPhrase || '';
      console.log(`[Orchestration] Generating Name Snippet for: ${job.userName} (Prefix: "${prefix}")`);
      
      const snippetResult = await generateNameSnippetSpeech(job.userName, prefix, suffix);
      audioUrl = snippetResult.audioUrl;
      spokenText = snippetResult.snippetText;

      await updateJob(jobId, {
        greetingText: spokenText,
        masterVideoUrl: masterVideo.cloudinaryUrl,
        audioUrl,
        status: 'generating_lipsync',
      });

      // 2. Generate Lip-Synced subclip & stitch seamlessly
      console.log(`[Orchestration] Generating targeted Wav2Lip slot [${masterVideo.nameSlotStart}s - ${masterVideo.nameSlotEnd}s]...`);
      const finalVideoUrl = await generateLipSyncVideo(masterVideo.cloudinaryUrl, audioUrl, {
        startTime: typeof masterVideo.nameSlotStart === 'number' ? masterVideo.nameSlotStart : 1.0,
        endTime: typeof masterVideo.nameSlotEnd === 'number' ? masterVideo.nameSlotEnd : 2.6,
      });

      // 3. Complete Job
      await updateJob(jobId, {
        finalVideoUrl,
        status: 'completed',
        completedAt: new Date(),
      });
      console.log(`[Orchestration] Job ${jobId} (Name-Slot) completed successfully! Video: ${finalVideoUrl}`);

    } else {
      // Full Script Mode: Legacy / Fallback mode
      const template = await getGreetingTemplate();
      spokenText = template.replace(/\{name\}/gi, job.userName.trim());

      await updateJob(jobId, {
        greetingText: spokenText,
        status: 'generating_voice',
      });

      console.log(`[Orchestration] Generating full voice for: ${job.userName}`);
      audioUrl = await generateClonedSpeech(spokenText);

      await updateJob(jobId, {
        audioUrl,
        masterVideoUrl: masterVideo.cloudinaryUrl,
        status: 'generating_lipsync',
      });

      console.log(`[Orchestration] Generating full Wav2Lip video...`);
      const finalVideoUrl = await generateLipSyncVideo(masterVideo.cloudinaryUrl, audioUrl);

      await updateJob(jobId, {
        finalVideoUrl,
        status: 'completed',
        completedAt: new Date(),
      });
      console.log(`[Orchestration] Job ${jobId} (Full Video) completed successfully! Video: ${finalVideoUrl}`);
    }

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
  getActiveMasterVideo,
};

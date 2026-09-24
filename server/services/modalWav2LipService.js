const axios = require('axios');
const { uploadBuffer, isCloudinaryConfigured } = require('../config/cloudinary');

/**
 * Dispatches a lip-sync generation job to the Modal Wav2Lip serverless worker.
 * @param {string} videoUrl - Public URL of the master talking head video.
 * @param {string} audioUrl - Public URL of the synthesized ElevenLabs audio.
 * @param {object} options - Optional timing and rendering options (startTime, endTime, pads, resizeFactor).
 * @returns {Promise<string>} Public URL of the synchronized final video.
 */
const generateLipSyncVideo = async (videoUrl, audioUrl, options = {}) => {
  const modalEndpoint = process.env.MODAL_WAV2LIP_ENDPOINT;

  const isConfigured = Boolean(
    modalEndpoint &&
    !modalEndpoint.includes('your-username') &&
    modalEndpoint.trim() !== ''
  );

  if (!isConfigured) {
    console.warn('[Modal Wav2Lip] MODAL_WAV2LIP_ENDPOINT is not yet configured or contains placeholder (your-username).');
    console.warn('[Modal Wav2Lip] Returning master video as fallback for testing.');
    return videoUrl;
  }

  console.log(`[Modal Wav2Lip] Dispatching lip-sync request to: ${modalEndpoint}`, options);

  const payload = {
    video_url: videoUrl,
    audio_url: audioUrl,
    start_time: typeof options.startTime === 'number' ? options.startTime : null,
    end_time: typeof options.endTime === 'number' ? options.endTime : null,
    pads: options.pads || '0 10 0 0',
    resize_factor: options.resizeFactor || 1,
    cloudinary_cloud_name: process.env.CLOUDINARY_CLOUD_NAME || null,
    cloudinary_upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET || null,
    cloudinary_api_key: (process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_KEY !== 'your_cloudinary_api_key') ? process.env.CLOUDINARY_API_KEY : null,
    cloudinary_api_secret: (process.env.CLOUDINARY_API_SECRET && process.env.CLOUDINARY_API_SECRET !== 'your_cloudinary_api_secret') ? process.env.CLOUDINARY_API_SECRET : null,
    cloudinary_folder: process.env.CLOUDINARY_FOLDER || 'voice',
  };

  try {
    const response = await axios.post(modalEndpoint, payload, {
      timeout: 300000, // 5-minute timeout for GPU container cold-start & rendering
      headers: {
        'Content-Type': 'application/json',
      },
      responseType: 'arraybuffer', // Handles both JSON response and direct binary MP4 stream
    });

    // Check if response returned JSON (e.g. { success: true, video_url: '...' })
    const contentType = response.headers['content-type'] || '';
    if (contentType.includes('application/json')) {
      const jsonStr = Buffer.from(response.data).toString('utf-8');
      const data = JSON.parse(jsonStr);
      if (data.video_url) {
        console.log(`[Modal Wav2Lip] Completed successfully with Cloudinary URL: ${data.video_url}`);
        return data.video_url;
      }
    }

    // Otherwise, response returned binary video/mp4
    console.log('[Modal Wav2Lip] Received raw video bytes from Modal worker.');
    const videoBuffer = Buffer.from(response.data);

    if (isCloudinaryConfigured()) {
      const folder = process.env.CLOUDINARY_FOLDER || 'voice';
      console.log(`[Cloudinary] Uploading rendered video to Cloudinary folder '${folder}'...`);
      const uploadResult = await uploadBuffer(videoBuffer, {
        resource_type: 'video',
        folder: folder,
      });
      console.log(`[Cloudinary] Rendered video uploaded: ${uploadResult.secure_url}`);
      return uploadResult.secure_url;
    } else {
      console.warn('[Cloudinary] Cloudinary not configured, returning data URI for video');
      return `data:video/mp4;base64,${videoBuffer.toString('base64')}`;
    }
  } catch (error) {
    let errorDetails = error.message;
    if (error.response && error.response.data) {
      try {
        errorDetails = Buffer.isBuffer(error.response.data)
          ? error.response.data.toString('utf-8')
          : JSON.stringify(error.response.data);
      } catch (e) {
        errorDetails = error.response.statusText;
      }
    }
    console.error('[Modal Wav2Lip] Job failed:', errorDetails);
    throw new Error(`Modal Wav2Lip Generation Error: ${errorDetails}`);
  }
};

module.exports = {
  generateLipSyncVideo,
};

const { cloudinary, isCloudinaryConfigured, uploadBuffer } = require('../config/cloudinary');

/**
 * Uploads a master video file to Cloudinary.
 * @param {Buffer} buffer - Video buffer from multer
 * @param {string} originalName - Original uploaded file name
 * @returns {Promise<Object>} Upload result including secure_url, public_id, duration
 */
const uploadMasterVideo = async (buffer, originalName) => {
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary credentials not configured in server/.env.');
  }

  const folder = process.env.CLOUDINARY_FOLDER || 'voice';
  const hasApiKeys = Boolean(
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_KEY !== 'your_cloudinary_api_key' &&
    process.env.CLOUDINARY_API_SECRET &&
    process.env.CLOUDINARY_API_SECRET !== 'your_cloudinary_api_secret'
  );

  const uploadOptions = {
    resource_type: 'video',
    folder,
  };

  // If signed API keys are available, assign a custom public_id safely
  if (hasApiKeys) {
    const cleanTitle = originalName ? originalName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_') : 'master_video';
    uploadOptions.public_id = `${cleanTitle}_${Date.now()}`;
  }

  const result = await uploadBuffer(buffer, uploadOptions);

  return {
    url: result.secure_url,
    publicId: result.public_id,
    duration: result.duration || 0,
    width: result.width,
    height: result.height,
  };
};

/**
 * Deletes a video asset from Cloudinary.
 * @param {string} publicId - Cloudinary public ID
 */
const deleteAsset = async (publicId, resourceType = 'video') => {
  if (!isCloudinaryConfigured() || !publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (err) {
    console.warn(`[Cloudinary] Failed to delete asset ${publicId}:`, err.message);
  }
};

module.exports = {
  uploadMasterVideo,
  deleteAsset,
};

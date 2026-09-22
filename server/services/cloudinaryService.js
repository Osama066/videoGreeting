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

  const cleanTitle = originalName ? originalName.replace(/\.[^/.]+$/, '') : 'master_video';

  const result = await uploadBuffer(buffer, {
    resource_type: 'video',
    folder: 'ai_greetings/master_videos',
    public_id: `${cleanTitle}_${Date.now()}`,
  });

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

const cloudinary = require('cloudinary').v2;

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_KEY !== 'your_cloudinary_api_key' ? process.env.CLOUDINARY_API_KEY : undefined;
const apiSecret = process.env.CLOUDINARY_API_SECRET && process.env.CLOUDINARY_API_SECRET !== 'your_cloudinary_api_secret' ? process.env.CLOUDINARY_API_SECRET : undefined;

const configOptions = {
  cloud_name: cloudName,
  secure: true,
};
if (apiKey) configOptions.api_key = apiKey;
if (apiSecret) configOptions.api_secret = apiSecret;

cloudinary.config(configOptions);

const isCloudinaryConfigured = () => {
  const hasCloudName = Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloudinary_cloud_name'
  );
  const hasApiKeys = Boolean(
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_KEY !== 'your_cloudinary_api_key' &&
    process.env.CLOUDINARY_API_SECRET &&
    process.env.CLOUDINARY_API_SECRET !== 'your_cloudinary_api_secret'
  );
  const hasPreset = Boolean(
    process.env.CLOUDINARY_UPLOAD_PRESET &&
    process.env.CLOUDINARY_UPLOAD_PRESET !== 'your_cloudinary_upload_preset'
  );
  return hasCloudName && (hasApiKeys || hasPreset);
};

/**
 * Uploads a buffer directly to Cloudinary using an upload stream.
 * Supports both unsigned upload presets and signed API uploads.
 * @param {Buffer} buffer - File buffer (audio or video)
 * @param {Object} options - Cloudinary upload options (resource_type, folder, etc.)
 * @returns {Promise<Object>} Cloudinary upload result
 */
const uploadBuffer = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadPreset = options.upload_preset || process.env.CLOUDINARY_UPLOAD_PRESET;
    const defaultFolder = process.env.CLOUDINARY_FOLDER || 'voice';

    const hasApiKeys = Boolean(
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_KEY !== 'your_cloudinary_api_key' &&
      process.env.CLOUDINARY_API_SECRET &&
      process.env.CLOUDINARY_API_SECRET !== 'your_cloudinary_api_secret'
    );

    const uploadOptions = {
      resource_type: options.resource_type || 'auto',
      folder: options.folder || defaultFolder,
      ...options,
    };

    let uploadStream;
    if (uploadPreset && !hasApiKeys) {
      // Cloudinary unsigned upload endpoint strictly disallows 'format', custom transformations, etc.
      // Format is auto-detected from buffer content.
      delete uploadOptions.format;
      delete uploadOptions.transformation;

      // Use unsigned upload stream with upload preset
      uploadStream = cloudinary.uploader.unsigned_upload_stream(
        uploadPreset,
        uploadOptions,
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
    } else {
      if (uploadPreset) {
        uploadOptions.upload_preset = uploadPreset;
      }
      uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
    }

    uploadStream.end(buffer);
  });
};

module.exports = {
  cloudinary,
  isCloudinaryConfigured,
  uploadBuffer,
};

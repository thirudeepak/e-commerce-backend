'use strict';

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const cloudinary = require('cloudinary').v2;
const logger = require('./logger');

function initCloudinaryConfig() {
  const cloud_name = (process.env.CLOUDINARY_CLOUD_NAME || '').trim();
  const api_key = (process.env.CLOUDINARY_API_KEY || '').trim();
  const api_secret = (process.env.CLOUDINARY_API_SECRET || '').trim();

  if (cloud_name && api_key && api_secret) {
    cloudinary.config({
      cloud_name,
      api_key,
      api_secret,
      secure: true,
    });
    return true;
  }
  return false;
}

// Initial check
initCloudinaryConfig();

/**
 * Upload a buffer to Cloudinary with safe error handling and fallback.
 * @param {Buffer} buffer - The file buffer to upload.
 * @param {string} folder - The Cloudinary folder to upload into.
 * @returns {Promise<{ url: string, publicId: string }>}
 */
function uploadToCloudinary(buffer, folder = 'ecommerce/products') {
  return new Promise((resolve) => {
    const isConfigured = initCloudinaryConfig();

    if (!isConfigured) {
      logger.warn('Cloudinary credentials missing or empty in .env. Falling back to default asset.');
      const mockId = `mock_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      return resolve({
        url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500',
        publicId: mockId,
      });
    }

    try {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
          transformation: [{ quality: 'auto', fetch_format: 'auto' }],
        },
        (error, result) => {
          if (error) {
            logger.warn(`Cloudinary upload failed: ${error.message}. Using fallback image.`);
            return resolve({
              url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500',
              publicId: `fallback_${Date.now()}`,
            });
          }

          logger.info(`Cloudinary image uploaded successfully: ${result.secure_url}`);
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
          });
        }
      );

      // Listen for error event on the stream to prevent uncaughtException crash
      uploadStream.on('error', (streamErr) => {
        logger.warn(`Cloudinary stream error: ${streamErr.message}. Using fallback image.`);
        resolve({
          url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500',
          publicId: `fallback_${Date.now()}`,
        });
      });

      uploadStream.end(buffer);
    } catch (err) {
      logger.warn(`Cloudinary sync error: ${err.message}. Using fallback image.`);
      resolve({
        url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500',
        publicId: `fallback_${Date.now()}`,
      });
    }
  });
}

/**
 * Delete an asset from Cloudinary by its public ID.
 * @param {string} publicId - The public ID of the asset to delete.
 * @returns {Promise<object>} - Cloudinary deletion result.
 */
async function deleteFromCloudinary(publicId) {
  const isConfigured = initCloudinaryConfig();
  if (!isConfigured || !publicId || publicId.startsWith('mock_') || publicId.startsWith('fallback_') || publicId.startsWith('default_')) {
    return { result: 'ok (skipped local/fallback asset)' };
  }

  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: 'image',
      invalidate: true,
    });
    return result;
  } catch (err) {
    logger.warn(`Cloudinary destroy error for ${publicId}: ${err.message}`);
    return { result: 'error', message: err.message };
  }
}

module.exports = { cloudinary, uploadToCloudinary, deleteFromCloudinary };

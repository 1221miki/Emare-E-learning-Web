const cloudinary = require("../config/cloudinary");

const LARGE_STREAM_TIMEOUT_MS = 600000; // 10 minutes
const LARGE_STREAM_CHUNK_SIZE = 6000000; // 6MB

const uploadBuffer = (buffer, folder, resourceType = 'auto', timeoutMs = LARGE_STREAM_TIMEOUT_MS) => {
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder,
      resource_type: resourceType === 'video' ? 'video' : (resourceType || 'auto'),
      timeout: timeoutMs,
      chunk_size: resourceType === 'video' ? LARGE_STREAM_CHUNK_SIZE : undefined,
      socket_timeout: timeoutMs,
    };

    let uploadStream;
    let settled = false;

    const safeReject = (error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };

    const safeResolve = (result) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    if (resourceType === 'video') {
      uploadStream = cloudinary.uploader.upload_chunked_stream(
        uploadOptions,
        (error, result) => {
          if (error) {
            safeReject(error);
            return;
          }
          safeResolve(result);
        }
      );
    } else {
      uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) {
            safeReject(error);
            return;
          }
          safeResolve(result);
        }
      );
    }

    if (!uploadStream || typeof uploadStream.on !== 'function' || typeof uploadStream.end !== 'function') {
      safeReject(new Error('Cloudinary upload stream is unavailable for this SDK version.'));
      return;
    }

    uploadStream.on('error', (error) => {
      console.error('Cloudinary upload stream error:', {
        message: error && error.message ? error.message : String(error),
        stack: error && error.stack ? error.stack : null,
        resourceType,
        folder,
        bufferLength: buffer ? buffer.length : 0
      });
      safeReject(error);
    });

    uploadStream.on('finish', () => {
      // Nothing to do here; completion is handled by the callback.
    });

    try {
      uploadStream.end(buffer);
    } catch (error) {
      console.error('Cloudinary upload stream end failed:', {
        message: error && error.message ? error.message : String(error),
        stack: error && error.stack ? error.stack : null
      });
      safeReject(error);
    }
  });
};

const uploadImage = (buffer, folder) => uploadBuffer(buffer, folder, 'image', LARGE_STREAM_TIMEOUT_MS);

module.exports = {
  uploadBuffer,
  uploadImage,
};

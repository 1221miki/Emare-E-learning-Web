const { uploadImage } = require('../services/cloudinaryService');

const mediaFolderMap = {
  course: 'emare_elms/courses',
  instructor: 'emare_elms/instructors',
  student: 'emare_elms/students',
  thumbnail: 'emare_elms/thumbnails',
  certificate: 'emare_elms/certificates',
  logo: 'emare_elms/logos',
  website: 'emare_elms/website',
  other: 'emare_elms/other',
  media: 'emare_elms/media'
};

const getMediaFolder = (type) => {
  if (!type || typeof type !== 'string') return mediaFolderMap.other;
  const normalized = type.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '');
  return mediaFolderMap[normalized] || mediaFolderMap.other;
};

const uploadTestImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image uploaded',
      });
    }

    const result = await uploadImage(req.file.buffer, 'emare_elms/test');

    return res.status(200).json({
      success: true,
      message: 'Image uploaded successfully',
      image: {
        url: result.secure_url,
        publicId: result.public_id,
      },
    });
  } catch (error) {
    console.error('Cloudinary upload error:', error);

    return res.status(500).json({
      success: false,
      message: 'Image upload failed',
    });
  }
};

const uploadMedia = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    const folder = getMediaFolder(req.body.type || req.query.type);
    const result = await uploadImage(req.file.buffer, folder);

    return res.status(200).json({
      success: true,
      message: 'Media uploaded successfully',
      data: {
        url: result.secure_url,
        publicId: result.public_id,
        folder: result.folder,
        format: result.format,
      },
    });
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    return res.status(500).json({
      success: false,
      message: 'Media upload failed',
      error: error.message,
    });
  }
};

module.exports = {
  uploadTestImage,
  uploadMedia,
};

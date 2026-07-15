const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');

// @desc    Upload file to Cloudinary and return URL
// @route   POST /api/upload
// @access  Private
exports.uploadFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file provided' });
        }

        // Determine resource_type based on mimetype
        let resourceType = 'auto';
        if (req.file.mimetype.startsWith('video/')) resourceType = 'video';
        else if (req.file.mimetype === 'application/pdf') resourceType = 'raw';
        
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: 'emare_elms',
                resource_type: resourceType
            },
            (error, result) => {
                if (error) {
                    console.error('Cloudinary Error:', error);
                    return res.status(500).json({ success: false, message: 'Cloudinary upload failed', error: error.message });
                }
                res.status(200).json({
                    success: true,
                    data: {
                        url: result.secure_url,
                        public_id: result.public_id,
                        format: result.format,
                        resource_type: result.resource_type
                    }
                });
            }
        );

        // Pipe the multer memory buffer into the Cloudinary upload stream
        streamifier.createReadStream(req.file.buffer).pipe(uploadStream);

    } catch (err) {
        console.error('Upload Error:', err);
        res.status(500).json({ success: false, message: 'Server upload error' });
    }
};

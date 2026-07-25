const fs = require('fs');
const path = require('path');
const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');

// Helper: Local File Storage Fallback
const saveLocalFallback = (file, req) => {
    try {
        const uploadsDir = path.join(__dirname, '../public/uploads');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const ext = path.extname(file.originalname) || '.png';
        const filename = `file_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
        const filePath = path.join(uploadsDir, filename);

        fs.writeFileSync(filePath, file.buffer);

        const protocol = req.protocol || 'http';
        const host = req.get('host') || 'localhost:5000';
        const fileUrl = `${protocol}://${host}/uploads/${filename}`;

        return {
            url: fileUrl,
            public_id: filename,
            format: ext.replace('.', ''),
            resource_type: file.mimetype.startsWith('video/') ? 'video' : 'image',
            isLocal: true
        };
    } catch (err) {
        console.error('Local fallback upload error:', err);
        // Data URL ultimate fallback
        const base64 = file.buffer.toString('base64');
        const dataUrl = `data:${file.mimetype};base64,${base64}`;
        return {
            url: dataUrl,
            public_id: `data_${Date.now()}`,
            isBase64: true
        };
    }
};

// @desc    Upload file (Cloudinary with Local Disk Fallback)
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

        let uploadFinished = false;

        // Set timeout for Cloudinary response (5 seconds)
        const uploadPromise = new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: 'emare_elms',
                    resource_type: resourceType
                },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            );
            streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
        });

        // Race Cloudinary with 5s timeout
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Cloudinary timeout')), 5000)
        );

        try {
            const result = await Promise.race([uploadPromise, timeoutPromise]);
            return res.status(200).json({
                success: true,
                data: {
                    url: result.secure_url,
                    public_id: result.public_id,
                    format: result.format,
                    resource_type: result.resource_type
                }
            });
        } catch (cloudErr) {
            console.warn('⚠️ Cloudinary upload failed or timed out. Falling back to local storage:', cloudErr.message);
            const localData = saveLocalFallback(req.file, req);
            return res.status(200).json({
                success: true,
                data: localData
            });
        }

    } catch (err) {
        console.error('Upload Error:', err);
        const localData = saveLocalFallback(req.file, req);
        res.status(200).json({ success: true, data: localData });
    }
};

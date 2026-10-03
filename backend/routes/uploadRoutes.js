const router = require('express').Router();
const { protect } = require('../middleware/auth');
const { upload, handleUploadError } = require('../middleware/uploadMiddleware');
const { uploadFile } = require('../controllers/uploadController');

// Using the 'file' field name for multipart form data
router.post('/', protect, async (req, res, next) => {
    try {
        await new Promise((resolve, reject) => {
            upload.single('file')(req, res, (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve();
            });
        });

        await uploadFile(req, res, next);
    } catch (err) {
        console.error('Upload route error:', {
            message: err && err.message ? err.message : String(err),
            stack: err && err.stack ? err.stack : null,
            file: req.file && {
                originalname: req.file.originalname,
                mimetype: req.file.mimetype,
                size: req.file.size
            }
        });

        if (err && err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({
                success: false,
                message: 'Uploaded file is too large for this server.'
            });
        }

        if (err && err.message) {
            return handleUploadError(err, req, res, next);
        }

        return next(err);
    }
});

module.exports = router;

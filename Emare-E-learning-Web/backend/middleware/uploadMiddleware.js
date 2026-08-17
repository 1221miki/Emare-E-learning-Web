const multer = require('multer');

// Configure Multer to use MemoryStorage
// This means the file is kept in memory as a Buffer, rather than written to disk,
// making it extremely fast for piping directly to Cloudinary.
const storage = multer.memoryStorage();

const MAX_UPLOAD_SIZE = Infinity;

const ALLOWED_MIME_TYPES = new Set([
    'image/',
    'video/mp4',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/zip',
    'application/x-zip-compressed',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
    'application/gzip',
    'application/x-tar',
    'text/plain',
    'text/csv',
    'application/json',
    'application/xml',
    'text/xml'
]);

const ALLOWED_FILE_EXTENSIONS = new Set([
    'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tiff',
    'pdf',
    'doc', 'docx',
    'xls', 'xlsx',
    'ppt', 'pptx',
    'zip', 'rar', '7z', 'gz', 'tar',
    'txt', 'csv', 'json', 'xml', 'mp4'
]);

const normalizeMimeType = (mimetype = '') => String(mimetype || '').toLowerCase();
const normalizeFileName = (fileName = '') => String(fileName || '').toLowerCase();

const isAllowedMimeType = (mimetype, fileName = '') => {
    const normalizedMime = normalizeMimeType(mimetype);
    const normalizedName = normalizeFileName(fileName);

    if (!normalizedMime && normalizedName) {
        const ext = normalizedName.split('.').pop();
        return ALLOWED_FILE_EXTENSIONS.has(ext);
    }

    if (normalizedMime.startsWith('image/')) return true;
    if (normalizedMime.startsWith('video/')) return normalizedMime === 'video/mp4';
    if (normalizedMime === 'application/pdf') return true;

    if (ALLOWED_MIME_TYPES.has(normalizedMime)) return true;

    if (normalizedMime === 'application/octet-stream' && normalizedName) {
        const ext = normalizedName.split('.').pop();
        return ALLOWED_FILE_EXTENSIONS.has(ext);
    }

    return false;
};

// File validation filter
const fileFilter = (req, file, cb) => {
    if (isAllowedMimeType(file.mimetype, file.originalname)) {
        cb(null, true);
    } else {
        cb(new Error('Unsupported file format. Please upload an image, PDF, document, archive, or MP4 video.'), false);
    }
};

const upload = multer({
    storage,
    limits: {
        fileSize: MAX_UPLOAD_SIZE
    },
    fileFilter
});

// Gracefully handle oversized uploads
const handleUploadError = (err, req, res, next) => {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
            success: false,
            message: 'Uploaded file is too large. Please upload a smaller file or check your server upload limits.'
        });
    }

    if (err) {
        return res.status(400).json({
            success: false,
            message: err.message || 'Upload failed.'
        });
    }

    return next();
};

module.exports = { upload, handleUploadError, isAllowedMimeType };

const multer = require('multer');
const path   = require('path');
const fs     = require('fs');
const os     = require('os');

// ── Helpers ───────────────────────────────────────────────────────────────────

const normalizeMimeType = (mimetype = '') => String(mimetype || '').toLowerCase();
const normalizeFileName = (fileName  = '') => String(fileName  || '').toLowerCase();

const VIDEO_EXTENSIONS = new Set([
    'mp4', 'mov', 'm4v', 'mkv', 'webm', 'avi', 'wmv', 'flv', 'mpeg', 'mpg', '3gp'
]);

const isVideoFile = (mimetype, fileName = '') => {
    const mime = normalizeMimeType(mimetype);
    if (mime.startsWith('video/')) return true;
    const ext = normalizeFileName(fileName).split('.').pop();
    return VIDEO_EXTENSIONS.has(ext);
};

const ALLOWED_MIME_TYPES = new Set([
    'image/',
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
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
    'zip', 'rar', '7z', 'gz', 'tar',
    'txt', 'csv', 'json', 'xml',
    ...VIDEO_EXTENSIONS
]);

const isAllowedMimeType = (mimetype, fileName = '') => {
    const mime = normalizeMimeType(mimetype);
    const name = normalizeFileName(fileName);

    if (isVideoFile(mime, name)) return true;
    if (mime.startsWith('image/')) return true;
    if (mime === 'application/pdf') return true;
    if (ALLOWED_MIME_TYPES.has(mime)) return true;

    if (!mime && name) {
        const ext = name.split('.').pop();
        return ALLOWED_FILE_EXTENSIONS.has(ext);
    }
    if (mime === 'application/octet-stream' && name) {
        const ext = name.split('.').pop();
        return ALLOWED_FILE_EXTENSIONS.has(ext);
    }
    return false;
};

// ── Storage strategy ──────────────────────────────────────────────────────────
// Videos go to disk (avoids OOM on Render's 512 MB free tier).
// Everything else stays in memory (fast, suitable for small files).

const tempDir = path.join(os.tmpdir(), 'emare-uploads');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

const diskStorage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, tempDir),
    filename: (_req, file, cb) => {
        const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
        const ext = path.extname(file.originalname) || '.mp4';
        cb(null, `video-${unique}${ext}`);
    }
});

const memStorage = multer.memoryStorage();

// Multer picks storage per request: videos → disk, everything else → memory
const storage = {
    _handleFile(req, file, cb) {
        if (isVideoFile(file.mimetype, file.originalname)) {
            diskStorage._handleFile(req, file, cb);
        } else {
            memStorage._handleFile(req, file, cb);
        }
    },
    _removeFile(req, file, cb) {
        if (file.path) {
            fs.unlink(file.path, (err) => cb(err));
        } else {
            memStorage._removeFile(req, file, cb);
        }
    }
};

// ── File filter ───────────────────────────────────────────────────────────────

const fileFilter = (req, file, cb) => {
    if (isAllowedMimeType(file.mimetype, file.originalname)) {
        cb(null, true);
    } else {
        cb(new Error('Unsupported file format. Allowed: images, PDF, documents, archives, and video files.'), false);
    }
};

// ── Multer instance ───────────────────────────────────────────────────────────

const upload = multer({
    storage,
    limits: { fileSize: Infinity },
    fileFilter
});

// ── Error handler ─────────────────────────────────────────────────────────────

const handleUploadError = (err, req, res, next) => {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
            success: false,
            message: 'File too large. Please upload a smaller file.'
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

module.exports = { upload, handleUploadError, isAllowedMimeType, isVideoFile };

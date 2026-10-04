const fs   = require('fs');
const path = require('path');
const crypto = require('crypto');

const UPLOADS_ROOT = path.join(__dirname, '..', 'uploads');
const VIDEOS_DIR   = path.join(UPLOADS_ROOT, 'videos');
const FILES_DIR    = path.join(UPLOADS_ROOT, 'files');

// Ensure directories exist
[UPLOADS_ROOT, VIDEOS_DIR, FILES_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

/**
 * Generate a unique filename to avoid collisions.
 * Pattern: <originalNameWithoutExt>_<8-char-hex>.<ext>
 */
const uniqueName = (fileName) => {
    const ext  = path.extname(fileName);
    const base = path.basename(fileName, ext).replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 80);
    const id   = crypto.randomBytes(4).toString('hex');
    return `${base}_${id}${ext}`;
};

/**
 * Save a video buffer / file path to local storage.
 *
 * @param {Buffer|string} filePayload  Buffer or path to a temp file created by multer
 * @param {string}        fileName     Original file name
 * @param {string}        mimeType     MIME type (informational, not used for storage)
 * @returns {{ success, url, directUrl, storagePath, fileName, size }}
 */
const uploadVideo = async (filePayload, fileName = 'upload.mp4', mimeType = 'video/mp4') => {
    const savedName = uniqueName(fileName);
    const destPath  = path.join(VIDEOS_DIR, savedName);

    if (typeof filePayload === 'string' || (filePayload && typeof filePayload === 'object' && typeof filePayload.path === 'string')) {
        const srcPath = typeof filePayload === 'string' ? filePayload : filePayload.path;
        if (!fs.existsSync(srcPath)) throw new Error(`Source file not found: ${srcPath}`);
        fs.copyFileSync(srcPath, destPath);
    } else if (Buffer.isBuffer(filePayload)) {
        fs.writeFileSync(destPath, filePayload);
    } else {
        throw new Error('Unsupported file payload type for local video upload.');
    }

    const stat = fs.statSync(destPath);
    const storagePath = `videos/${savedName}`;
    const url = `/api/local-storage/${storagePath}`;

    return {
        success: true,
        url,
        embedUrl: url,
        directUrl: url,
        storagePath,
        fileName: savedName,
        size: stat.size
    };
};

/**
 * Save a generic file (PDF, document, etc.) to local storage.
 *
 * @param {Buffer} buffer
 * @param {string} fileName
 * @param {string} mimeType
 * @param {string} folder   Sub-folder inside the files directory (e.g. "courses/pdfs")
 * @returns {{ success, storagePath, url, fileName, size }}
 */
const uploadFileToStorage = async (buffer, fileName = 'document', mimeType = 'application/octet-stream', folder = 'media') => {
    const safeFolder = folder.replace(/[^a-zA-Z0-9_\/\-]/g, '').replace(/^\/+|\/+$/g, '');
    const folderDir  = path.join(FILES_DIR, safeFolder);
    if (!fs.existsSync(folderDir)) fs.mkdirSync(folderDir, { recursive: true });

    const savedName = uniqueName(fileName);
    const destPath  = path.join(folderDir, savedName);
    fs.writeFileSync(destPath, buffer);

    const stat = fs.statSync(destPath);
    const storagePath = `files/${safeFolder}/${savedName}`;
    const url = `/api/local-storage/${storagePath}`;

    return {
        success: true,
        storagePath,
        url,
        cdnUrl: url,
        storageUrl: url,
        fileName: savedName,
        size: stat.size
    };
};

/**
 * Resolve a local storage path to an absolute filesystem path.
 * Returns null if the file does not exist.
 */
const resolveLocalPath = (storagePath) => {
    if (!storagePath) return null;
    // Normalize to forward slashes so regexes work on both Windows and Unix
    const normalized = storagePath.replace(/\\/g, '/');
    const cleaned = normalized.replace(/^\/+/, '').replace(/^files\//, '').replace(/^videos\//, '');

    let candidate;
    if (/^videos\//.test(cleaned) || /^videos\//.test(normalized)) {
        const fileName = cleaned.replace(/^videos\//, '');
        candidate = path.join(VIDEOS_DIR, fileName);
    } else if (/^files\//.test(cleaned) || /^files\//.test(normalized)) {
        const fileName = cleaned.replace(/^files\//, '');
        candidate = path.join(FILES_DIR, fileName);
    } else {
        // Try files first, then videos
        candidate = path.join(FILES_DIR, cleaned);
        if (!fs.existsSync(candidate)) candidate = path.join(VIDEOS_DIR, cleaned);
    }

    return fs.existsSync(candidate) ? candidate : null;
};

module.exports = {
    uploadVideo,
    uploadFileToStorage,
    resolveLocalPath,
    UPLOADS_ROOT,
    VIDEOS_DIR,
    FILES_DIR
};

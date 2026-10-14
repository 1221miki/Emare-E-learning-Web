const fs   = require('fs');
const path = require('path');
const crypto = require('crypto');

const UPLOADS_ROOT = path.join(__dirname, '..', 'uploads');
const VIDEOS_DIR   = path.join(UPLOADS_ROOT, 'videos');
const FILES_DIR    = path.join(UPLOADS_ROOT, 'files');
const PUBLIC_UPLOADS_DIR = path.join(__dirname, '..', 'public', 'uploads');

// Ensure directories exist
[UPLOADS_ROOT, VIDEOS_DIR, FILES_DIR, PUBLIC_UPLOADS_DIR].forEach(dir => {
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
 * Locate a valid fallback playable video on the server.
 * Prioritizes 'Emare Intro.mp4', then any valid MP4/WEBM in public/uploads or videos directory.
 */
const findFallbackVideo = () => {
    const preferred = path.join(PUBLIC_UPLOADS_DIR, 'Emare Intro.mp4');
    if (fs.existsSync(preferred) && fs.statSync(preferred).size > 1000) return preferred;

    try {
        if (fs.existsSync(PUBLIC_UPLOADS_DIR)) {
            const files = fs.readdirSync(PUBLIC_UPLOADS_DIR);
            for (const f of files) {
                if (/\.(mp4|webm|mov|mkv)$/i.test(f)) {
                    const full = path.join(PUBLIC_UPLOADS_DIR, f);
                    if (fs.statSync(full).size > 10000) return full;
                }
            }
        }
    } catch {}

    try {
        if (fs.existsSync(VIDEOS_DIR)) {
            const files = fs.readdirSync(VIDEOS_DIR);
            for (const f of files) {
                if (/\.(mp4|webm|mov|mkv)$/i.test(f)) {
                    const full = path.join(VIDEOS_DIR, f);
                    if (fs.statSync(full).size > 10000) return full;
                }
            }
        }
    } catch {}

    return null;
};

/**
 * Locate a valid fallback PDF document on the server.
 */
const findFallbackPdf = () => {
    try {
        if (fs.existsSync(PUBLIC_UPLOADS_DIR)) {
            const files = fs.readdirSync(PUBLIC_UPLOADS_DIR);
            for (const f of files) {
                if (/\.pdf$/i.test(f)) {
                    const full = path.join(PUBLIC_UPLOADS_DIR, f);
                    if (fs.statSync(full).size > 1000) return full;
                }
            }
        }
    } catch {}

    try {
        if (fs.existsSync(FILES_DIR)) {
            const files = fs.readdirSync(FILES_DIR);
            for (const f of files) {
                if (/\.pdf$/i.test(f)) {
                    const full = path.join(FILES_DIR, f);
                    if (fs.statSync(full).size > 1000) return full;
                }
            }
        }
    } catch {}

    return null;
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
 * If a requested legacy or missing media file is not present on disk,
 * automatically self-heals by seeding a valid local media fallback into the
 * requested destination so video streaming and document downloads never 404.
 */
const resolveLocalPath = (storagePath) => {
    if (!storagePath) return null;
    let decoded = '';
    try {
        decoded = decodeURIComponent(String(storagePath).trim());
    } catch {
        decoded = String(storagePath).trim();
    }
    const normalized = decoded.replace(/\\/g, '/').replace(/^(\.\.[\/\\])+/, '');
    const cleaned = normalized
        .replace(/^\/?(api\/)?(local-storage\/)?/, '')
        .replace(/^\/+/, '');

    const ext = path.extname(cleaned).toLowerCase();
    const isVideo = ['.mp4', '.webm', '.mov', '.mkv', '.avi', '.m4v'].includes(ext) || /^videos\//i.test(cleaned) || /^videos\//i.test(normalized);
    const isPdf = ext === '.pdf' || /^files\//i.test(cleaned) || cleaned.includes('.pdf');
    const baseName = path.basename(cleaned);

    // Candidates to search for existing files
    const candidates = [];
    if (/^videos\//i.test(cleaned)) {
        const vName = cleaned.replace(/^videos\//i, '');
        candidates.push(path.join(VIDEOS_DIR, vName));
        candidates.push(path.join(PUBLIC_UPLOADS_DIR, vName));
    } else if (/^files\//i.test(cleaned)) {
        const fName = cleaned.replace(/^files\//i, '');
        candidates.push(path.join(FILES_DIR, fName));
        candidates.push(path.join(PUBLIC_UPLOADS_DIR, fName));
    } else {
        candidates.push(path.join(VIDEOS_DIR, cleaned));
        candidates.push(path.join(FILES_DIR, cleaned));
        candidates.push(path.join(PUBLIC_UPLOADS_DIR, cleaned));
    }
    // Also check baseName directly in each directory
    candidates.push(path.join(VIDEOS_DIR, baseName));
    candidates.push(path.join(FILES_DIR, baseName));
    candidates.push(path.join(PUBLIC_UPLOADS_DIR, baseName));

    // 1. Direct hit?
    for (const c of candidates) {
        if (fs.existsSync(c)) {
            try {
                const stat = fs.statSync(c);
                if (stat.isFile() && stat.size > 0) return c;
            } catch {}
        }
    }

    // 2. Case-insensitive search across known directories
    const searchDirs = [VIDEOS_DIR, FILES_DIR, PUBLIC_UPLOADS_DIR];
    for (const sDir of searchDirs) {
        try {
            if (!fs.existsSync(sDir)) continue;
            const entries = fs.readdirSync(sDir);
            for (const entry of entries) {
                if (entry.toLowerCase() === baseName.toLowerCase()) {
                    const match = path.join(sDir, entry);
                    if (fs.statSync(match).isFile()) return match;
                }
            }
        } catch {}
    }

    // 3. Self-healing fallback: file is missing from local disk (legacy seed/remote upload)
    if (isVideo) {
        const fallbackVid = findFallbackVideo();
        if (fallbackVid) {
            try {
                const dest = path.join(VIDEOS_DIR, baseName);
                if (!fs.existsSync(dest)) {
                    fs.copyFileSync(fallbackVid, dest);
                    console.log(`[localStorage] Self-healed missing video '${baseName}' from fallback '${path.basename(fallbackVid)}'`);
                }
                return dest;
            } catch (copyErr) {
                console.warn('[localStorage] Failed copying fallback video:', copyErr.message);
                return fallbackVid;
            }
        }
    }

    if (isPdf) {
        const fallbackPdf = findFallbackPdf();
        if (fallbackPdf) {
            try {
                const subPath = cleaned.replace(/^files\//i, '');
                const dest = path.join(FILES_DIR, subPath);
                const destDir = path.dirname(dest);
                if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
                if (!fs.existsSync(dest)) {
                    fs.copyFileSync(fallbackPdf, dest);
                    console.log(`[localStorage] Self-healed missing PDF '${baseName}' from fallback '${path.basename(fallbackPdf)}'`);
                }
                return dest;
            } catch (copyErr) {
                console.warn('[localStorage] Failed copying fallback PDF:', copyErr.message);
                return fallbackPdf;
            }
        }
    }

    return null;
};

module.exports = {
    uploadVideo,
    uploadFileToStorage,
    resolveLocalPath,
    UPLOADS_ROOT,
    VIDEOS_DIR,
    FILES_DIR,
    PUBLIC_UPLOADS_DIR
};

/**
 * localStorageRoutes.js
 *
 * Serves locally stored files (videos, PDFs, documents).
 *
 * Route: GET /api/local-storage/*
 *   /api/local-storage/videos/abc_123.mp4       → backend/uploads/videos/abc_123.mp4
 *   /api/local-storage/files/courses/pdfs/x.pdf → backend/uploads/files/courses/pdfs/x.pdf
 */
const express = require('express');
const path    = require('path');
const fs      = require('fs');
const router  = express.Router();
const { resolveLocalPath, VIDEOS_DIR, FILES_DIR } = require('../services/localStorageService');

// MIME type map for common file types
const MIME_TYPES = {
    '.mp4':  'video/mp4',
    '.webm': 'video/webm',
    '.mov':  'video/quicktime',
    '.m4v':  'video/x-m4v',
    '.mkv':  'video/x-matroska',
    '.avi':  'video/x-msvideo',
    '.wmv':  'video/x-ms-wmv',
    '.flv':  'video/x-flv',
    '.mpeg': 'video/mpeg',
    '.mpg':  'video/mpeg',
    '.3gp':  'video/3gpp',
    '.pdf':  'application/pdf',
    '.png':  'image/png',
    '.jpg':  'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif':  'image/gif',
    '.webp': 'image/webp',
    '.svg':  'image/svg+xml',
    '.txt':  'text/plain',
    '.json': 'application/json',
};

router.get('/*', (req, res) => {
    try {
        const rawPath = req.params[0] || '';
        if (!rawPath) {
            return res.status(400).json({ success: false, message: 'No file path provided.' });
        }

        // Security: prevent path traversal — normalize separators to forward slash
        const normalized = rawPath.replace(/\\/g, '/').replace(/^(\.\.[\/\\])+/, '');
        if (normalized.includes('..')) {
            return res.status(400).json({ success: false, message: 'Invalid file path.' });
        }

        // Resolve the absolute path on disk
        const absPath = resolveLocalPath(normalized);
        if (!absPath) {
            return res.status(404).json({ success: false, message: 'File not found.' });
        }

        // Double-check the resolved path is inside an allowed root
        const uploadsRoot = path.resolve(VIDEOS_DIR, '..');
        const allowedRoots = [
            uploadsRoot,
            path.resolve(VIDEOS_DIR),
            path.resolve(FILES_DIR),
            path.resolve(__dirname, '..', 'public', 'uploads'),
            path.resolve(__dirname, '..', 'public')
        ];
        if (!allowedRoots.some(r => absPath.startsWith(r))) {
            return res.status(403).json({ success: false, message: 'Access denied.' });
        }

        const ext  = path.extname(absPath).toLowerCase();
        const mime = MIME_TYPES[ext] || 'application/octet-stream';
        const fileName = path.basename(absPath);
        const stat = fs.statSync(absPath);
        const fileSize = stat.size;

        const isDownload = req.query.download === '1' || req.query.download === 'true';
        const disposition = isDownload ? 'attachment' : 'inline';
        const rawCustomName = typeof req.query.filename === 'string' ? req.query.filename.trim() : '';
        const outFileName = rawCustomName ? rawCustomName.replace(/[/\\?%*:|"<>]/g, '_') : fileName;

        // Support range requests for video seeking/scrubbing
        const range = req.headers.range;
        if (range && (mime.startsWith('video/') || mime.startsWith('audio/'))) {
            const parts = range.replace(/bytes=/, '').split('-');
            const start = parseInt(parts[0], 10);
            if (isNaN(start) || start >= fileSize) {
                res.status(416);
                res.setHeader('Content-Range', `bytes */${fileSize}`);
                return res.end();
            }
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunkSize = end - start + 1;

            res.status(206);
            res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
            res.setHeader('Accept-Ranges', 'bytes');
            res.setHeader('Content-Length', chunkSize);
            res.setHeader('Content-Type', mime);
            res.setHeader('Content-Disposition', `${disposition}; filename="${encodeURIComponent(outFileName)}"`);
            res.setHeader('Cache-Control', 'public, max-age=86400');

            fs.createReadStream(absPath, { start, end }).pipe(res);
        } else {
            res.setHeader('Content-Type', mime);
            res.setHeader('Content-Disposition', `${disposition}; filename="${encodeURIComponent(outFileName)}"`);
            res.setHeader('Cache-Control', 'public, max-age=86400');
            res.setHeader('Accept-Ranges', 'bytes');
            res.setHeader('Content-Length', fileSize);

            fs.createReadStream(absPath).pipe(res);
        }
    } catch (err) {
        console.error('[localStorage] Error serving file:', err.message);
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: 'File serving error.' });
        }
    }
});

module.exports = router;

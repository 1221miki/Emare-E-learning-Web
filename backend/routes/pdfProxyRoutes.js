/**
 * pdfProxyRoutes.js
 *
 * Serves locally stored PDF files.
 *
 * Route: GET /api/pdf-proxy/*
 *   /api/pdf-proxy/courses/pdfs/notes.pdf → backend/uploads/files/courses/pdfs/notes.pdf
 */
const express = require('express');
const path    = require('path');
const fs      = require('fs');
const router  = express.Router();
const { protect } = require('../middleware/auth');
const { resolveLocalPath } = require('../services/localStorageService');

router.get('/*', protect, async (req, res) => {
    try {
        const rawPath = req.params[0] || '';
        if (!rawPath) {
            return res.status(400).json({ success: false, message: 'No file path provided.' });
        }

        const normalized = rawPath.replace(/\\/g, '/').replace(/^(\.\.[\/\\])+/, '');
        if (normalized.includes('..')) {
            return res.status(400).json({ success: false, message: 'Invalid file path.' });
        }

        const absPath = resolveLocalPath(normalized);
        if (!absPath) {
            return res.status(404).json({ success: false, message: 'PDF file not found.' });
        }

        const fileName = path.basename(absPath);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileName)}"`);
        res.setHeader('Cache-Control', 'private, max-age=3600');

        const stat = fs.statSync(absPath);
        res.setHeader('Content-Length', stat.size);

        fs.createReadStream(absPath).pipe(res);
    } catch (err) {
        console.error('[pdfProxy] Error:', err.message);
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: 'PDF proxy error.' });
        }
    }
});

module.exports = router;

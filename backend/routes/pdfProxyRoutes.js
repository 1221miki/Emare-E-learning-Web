/**
 * pdfProxyRoutes.js
 *
 * Proxies PDF files from Bunny Storage through the backend.
 * This is needed because the Bunny CDN Pull Zone hostname
 * (emare-elms-ict-hub.b-cdn.net) is suspended/not configured.
 * The Storage zone itself works fine via storage.bunnycdn.com.
 *
 * Route: GET /api/pdf-proxy/*
 *
 * Example:
 *   Client requests: GET /api/pdf-proxy/courses/pdfs/notes.pdf
 *   Backend fetches: https://storage.bunnycdn.com/emare-elms-ict-hub/courses/pdfs/notes.pdf
 *   and streams it back to the client.
 *
 * Security: requires authentication (enrolled students only).
 */
const express = require('express');
const https   = require('https');
const http    = require('http');
const router  = express.Router();
const { protect } = require('../middleware/auth');

const STORAGE_API_KEY  = process.env.BUNNY_STORAGE_API_KEY;
const STORAGE_ZONE     = process.env.BUNNY_STORAGE_ZONE_NAME || 'emare-elms-ict-hub';
const CDN_DOMAIN       = process.env.BUNNY_STORAGE_DOMAIN    || 'emare-elms-ict-hub.b-cdn.net';

/**
 * Extract the storage path from either a Bunny CDN URL or a raw path.
 *
 * Supported inputs:
 *   https://emare-elms-ict-hub.b-cdn.net/courses/pdfs/notes.pdf  →  courses/pdfs/notes.pdf
 *   /courses/pdfs/notes.pdf                                       →  courses/pdfs/notes.pdf
 *   courses/pdfs/notes.pdf                                        →  courses/pdfs/notes.pdf
 */
function extractStoragePath(rawPath) {
    // Strip the zone prefix that the storage API returns in paths
    return rawPath.replace(/^\/+/, '').replace(/^emare-elms-ict-hub\//, '');
}

/**
 * GET /api/pdf-proxy/*path
 * Streams a PDF from Bunny Storage to the client.
 */
router.get('/*', protect, async (req, res) => {
    try {
        const rawPath = req.params[0] || '';
        const storagePath = extractStoragePath(rawPath);

        if (!storagePath) {
            return res.status(400).json({ success: false, message: 'No file path provided.' });
        }

        if (!STORAGE_API_KEY) {
            console.error('[pdfProxy] BUNNY_STORAGE_API_KEY not set');
            return res.status(500).json({ success: false, message: 'PDF storage not configured.' });
        }

        const storageUrl = `https://storage.bunnycdn.com/${STORAGE_ZONE}/${storagePath}`;

        // Fetch from Bunny Storage API
        const protocol = storageUrl.startsWith('https') ? https : http;
        const url = new URL(storageUrl);

        const options = {
            hostname: url.hostname,
            path:     url.pathname + url.search,
            method:   'GET',
            headers:  { AccessKey: STORAGE_API_KEY }
        };

        const bunnyReq = protocol.request(options, (bunnyRes) => {
            if (bunnyRes.statusCode === 404) {
                return res.status(404).json({ success: false, message: 'PDF file not found.' });
            }
            if (bunnyRes.statusCode !== 200) {
                return res.status(bunnyRes.statusCode).json({ success: false, message: `Storage returned ${bunnyRes.statusCode}` });
            }

            // Set appropriate headers for PDF download
            const fileName = storagePath.split('/').pop() || 'document.pdf';
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileName)}"`);
            if (bunnyRes.headers['content-length']) {
                res.setHeader('Content-Length', bunnyRes.headers['content-length']);
            }
            // Cache for 1 hour — PDFs don't change often
            res.setHeader('Cache-Control', 'private, max-age=3600');

            bunnyRes.pipe(res);
        });

        bunnyReq.on('error', (err) => {
            console.error('[pdfProxy] Bunny Storage request error:', err.message);
            if (!res.headersSent) {
                res.status(502).json({ success: false, message: 'Failed to fetch PDF from storage.' });
            }
        });

        bunnyReq.end();

    } catch (err) {
        console.error('[pdfProxy] Unexpected error:', err);
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: 'PDF proxy error.' });
        }
    }
});

module.exports = router;

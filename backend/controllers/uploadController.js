const fs = require('fs');
const path = require('path');
const { uploadBuffer } = require('../services/cloudinaryService');
const streamifier = require('streamifier');
const pdfParse = require('pdf-parse');

const getResourceType = (mimetype) => {
    if (!mimetype) return 'auto';
    if (mimetype.startsWith('image/')) return 'image';
    if (mimetype.startsWith('video/')) return 'video';
    if (mimetype === 'application/pdf') return 'raw';
    return 'auto';
};

const getCloudinaryFolder = (targetType, explicitFolder) => {
    const folderMap = {
        course: 'emare_elms/courses',
        instructor: 'emare_elms/instructors',
        student: 'emare_elms/students',
        avatar: 'emare_elms/avatars',
        user: 'emare_elms/avatars',
        profile: 'emare_elms/avatars',
        thumbnail: 'emare_elms/course_thumbnails',
        course_thumbnail: 'emare_elms/course_thumbnails',
        certificate: 'emare_elms/certificates',
        logo: 'emare_elms/logos',
        website: 'emare_elms/website',
        other: 'emare_elms/other',
        media: 'emare_elms/media'
    };

    if (explicitFolder && typeof explicitFolder === 'string') {
        const sanitized = explicitFolder.replace(/[^a-zA-Z0-9_\/-]/g, '').replace(/^\/+|\/+$/g, '');
        if (sanitized) return `emare_elms/${sanitized}`;
    }

    if (!targetType || typeof targetType !== 'string') {
        return folderMap.other;
    }

    const normalized = targetType.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '');
    return folderMap[normalized] || folderMap.other;
};

// Helper: Normalize extracted PDF text and fix missing spaces
const normalizePdfText = (text) => {
    if (!text) return '';

    const stopwords = new Set(['a','an','the','and','or','to','of','in','on','for','with','by','at','from','about','as','is','that','this','it','its','was','are','be','has','have','had','my','your','our','their','its','i','me','you','he','she','we','they']);
    const isMergeable = (parts) => {
        const joined = parts.join('');
        if (parts.some((segment) => stopwords.has(segment))) return false;
        if (joined.length < 6) return false;
        if (!/[aeiouy]/i.test(joined)) return false;
        if (parts.every((segment) => segment.length === 1)) return false;
        return true;
    };

    let normalized = text.replace(/\u00A0/g, ' ');
    normalized = normalized.replace(/\r?\n/g, ' ');

    // Insert spaces before camel-cased words, e.g. "LearningManagement" => "Learning Management"
    normalized = normalized.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
    normalized = normalized.replace(/([A-Z])([A-Z][a-z])/g, '$1 $2');

    // Add spaces between digits and letters
    normalized = normalized.replace(/([0-9])([A-Za-z])/g, '$1 $2');
    normalized = normalized.replace(/([A-Za-z])([0-9])/g, '$1 $2');

    // Merge small broken fragments like "au tom ate".
    normalized = normalized.replace(/\b([a-z]{1,4})\s+([a-z]{1,4})\s+([a-z]{1,4})\s+([a-z]{1,4})\b/gi, (match, a, b, c, d) => {
        if (isMergeable([a, b, c, d])) return `${a}${b}${c}${d}`;
        return match;
    });
    normalized = normalized.replace(/\b([a-z]{1,4})\s+([a-z]{1,4})\s+([a-z]{1,4})\b/gi, (match, a, b, c) => {
        if (isMergeable([a, b, c])) return `${a}${b}${c}`;
        return match;
    });

    normalized = normalized.replace(/\s+/g, ' ').trim();
    return normalized;
};

// Helper: Extract text from PDF buffer
const extractPdfText = async (buffer) => {
    try {
        const data = await pdfParse(buffer);
        const rawText = data.text || '';
        const fixedText = normalizePdfText(rawText);
        return fixedText.slice(0, 18000);
    } catch (err) {
        console.warn('PDF parse failed:', err.message);
        return '';
    }
};


// @desc    Upload file to Cloudinary by category/folder
// @route   POST /api/upload
// @access  Private
exports.uploadFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file provided' });
        }

        const targetType = req.body.targetType || req.query.targetType || 'other';
        const explicitFolder = req.body.folder || req.query.folder;
        const folder = getCloudinaryFolder(targetType, explicitFolder);
        const resourceType = getResourceType(req.file.mimetype);

        let pdfText = '';
        if (req.file.mimetype === 'application/pdf') {
            pdfText = await extractPdfText(req.file.buffer);
        }

        const uploadPromise = uploadBuffer(req.file.buffer, folder, resourceType);
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
                    resource_type: result.resource_type,
                    folder: result.folder,
                    pdfText
                }
            });
        } catch (cloudErr) {
            console.error('Cloudinary upload failed or timed out:', cloudErr.message);
            return res.status(500).json({ success: false, message: 'Cloudinary upload failed. Please try again.' });
        }

    } catch (err) {
        console.error('Upload Error:', err);
        res.status(500).json({ success: false, message: 'Upload failed due to an internal error.' });
    }
};

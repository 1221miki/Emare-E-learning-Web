const fs = require('fs');
const path = require('path');
const fs   = require('fs');
const { uploadBuffer } = require('../services/cloudinaryService');
const { uploadVideo, uploadFileToStorage } = require('../services/bunnyService');
const Media = require('../models/Media');
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
        event: 'emare_elms/events',
        event_thumbnail: 'emare_elms/event_thumbnails',
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

        const isVideoFile = (mimetype, fileName) => {
            if (!mimetype && !fileName) return false;
            const type = String(mimetype || '').toLowerCase();
            if (type.startsWith('video/')) return true;
            if (!fileName) return false;
            return /\.(mp4|mov|m4v|mkv|webm|avi|wmv|flv|mpeg|mpg|3gp|3g2)$/i.test(fileName);
        };

        // Route video uploads to Bunny Stream
        if (isVideoFile(req.file.mimetype, req.file.originalname)) {
            const tempFilePath = req.file.path || null; // disk storage path
            const cleanupTemp = () => {
                if (tempFilePath && fs.existsSync(tempFilePath)) {
                    fs.unlink(tempFilePath, () => {});
                }
            };
            try {
                const fileName = req.file.originalname || 'emare-upload-video.mp4';
                // Use disk path if available (disk storage), otherwise buffer (memory storage)
                const bunnyPayload = req.file.path ? req.file.path : req.file.buffer;
                const bunnyResult = await uploadVideo(bunnyPayload, fileName, req.file.mimetype || 'video/mp4');
                cleanupTemp();

                try {
                    const mediaDoc = new Media({
                        filename: fileName,
                        mimeType: req.file.mimetype || 'video/mp4',
                        source: 'bunny',
                        bunnyType: bunnyResult.bunnyType || 'video',
                        url: bunnyResult.embedUrl || bunnyResult.url || bunnyResult.publicUrl,
                        storagePath: bunnyResult.storagePath,
                        meta: bunnyResult.response || {}
                    });
                    if (req.user && req.user._id) mediaDoc.uploadedBy = req.user._id;
                    await mediaDoc.save();
                    bunnyResult.dbId = mediaDoc._id;
                } catch (saveErr) {
                    console.warn('Warning: could not save media metadata to DB:', saveErr.message || saveErr);
                }

                return res.status(200).json({
                    success: true,
                    data: {
                        // embedUrl is the Bunny Stream iframe embed URL — store this as lesson.videoUrl
                        url: bunnyResult.embedUrl || bunnyResult.url || bunnyResult.publicUrl,
                        embedUrl: bunnyResult.embedUrl,
                        directUrl: bunnyResult.directUrl,
                        storagePath: bunnyResult.storagePath,
                        response: bunnyResult.response,
                        dbId: bunnyResult.dbId
                    }
                });
            } catch (bunnyErr) {
                cleanupTemp();
                const bunnyErrorMessage = bunnyErr?.response?.data?.Message || bunnyErr?.response?.data || bunnyErr?.message || 'Unknown Bunny upload error';
                const clientError = typeof bunnyErrorMessage === 'string' ? bunnyErrorMessage : JSON.stringify(bunnyErrorMessage);
                console.error('Bunny.net video upload failed:', bunnyErr?.response?.data || bunnyErr);
                return res.status(500).json({
                    success: false,
                    message: 'Video upload failed. Please try again.',
                    error: clientError
                });
            }
        }

        // Route PDF uploads to Bunny Storage
        if (req.file.mimetype === 'application/pdf' || /\.pdf$/i.test(req.file.originalname || '')) {
            try {
                const fileName = req.file.originalname || 'document.pdf';
                const folder = 'courses/pdfs';
                const bunnyResult = await uploadFileToStorage(req.file.buffer, fileName, 'application/pdf', folder);

                let pdfText = '';
                try { pdfText = await extractPdfText(req.file.buffer); } catch {}

                try {
                    const mediaDoc = new Media({
                        filename: fileName,
                        mimeType: 'application/pdf',
                        source: 'bunny',
                        bunnyType: 'storage',
                        url: bunnyResult.storageUrl,
                        storagePath: bunnyResult.storagePath,
                        meta: bunnyResult.response || {}
                    });
                    if (req.user && req.user._id) mediaDoc.uploadedBy = req.user._id;
                    await mediaDoc.save();
                } catch (saveErr) {
                    console.warn('Warning: could not save PDF media metadata to DB:', saveErr.message || saveErr);
                }

                return res.status(200).json({
                    success: true,
                    data: {
                        url: bunnyResult.storageUrl,
                        storagePath: bunnyResult.storagePath,
                        pdfText
                    }
                });
            } catch (bunnyErr) {
                console.warn('Bunny Storage PDF upload failed, falling through to Cloudinary:', bunnyErr.message);
                // Fall through to Cloudinary as backup
            }
        }

        // Default: upload to Cloudinary
        const cloudinaryTimeoutMs = resourceType === 'video' ? 180000 : 60000;
        const uploadPromise = uploadBuffer(req.file.buffer, folder, resourceType, cloudinaryTimeoutMs);
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`Cloudinary timeout after ${cloudinaryTimeoutMs}ms`)), cloudinaryTimeoutMs + 1000)
        );

        try {
            const result = await Promise.race([uploadPromise, timeoutPromise]);

            // try saving Cloudinary metadata too (non-blocking)
            try {
                const mediaDoc = new Media({
                    filename: req.file.originalname || path.basename(req.file.path || 'upload'),
                    mimeType: req.file.mimetype,
                    source: 'cloudinary',
                    url: result.secure_url,
                    publicId: result.public_id,
                    meta: {
                        format: result.format,
                        resource_type: result.resource_type,
                        folder: result.folder
                    }
                });
                if (req.user && req.user._id) mediaDoc.uploadedBy = req.user._id;
                await mediaDoc.save();
            } catch (saveErr) {
                console.warn('Warning: could not save cloudinary media metadata to DB:', saveErr.message || saveErr);
            }

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
            console.error('Cloudinary upload failed or timed out:', {
                message: cloudErr && cloudErr.message ? cloudErr.message : String(cloudErr),
                stack: cloudErr && cloudErr.stack ? cloudErr.stack : null,
                resourceType,
                fileName: req.file && req.file.originalname,
                mimeType: req.file && req.file.mimetype,
                size: req.file && req.file.size
            });
            return res.status(500).json({
                success: false,
                message: 'Upload failed. Please try again.',
                error: cloudErr && cloudErr.message ? cloudErr.message : 'Unknown Cloudinary upload error'
            });
        }

    } catch (err) {
        console.error('Upload Error:', {
            message: err && err.message ? err.message : String(err),
            stack: err && err.stack ? err.stack : null,
            file: req.file && {
                originalname: req.file.originalname,
                mimetype: req.file.mimetype,
                size: req.file.size
            }
        });
        res.status(500).json({ success: false, message: 'Upload failed due to an internal error.', error: err && err.message ? err.message : 'Unknown upload error' });
    }
};

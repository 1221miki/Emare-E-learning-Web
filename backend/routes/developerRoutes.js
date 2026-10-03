const express = require('express');
const fs = require('fs');
const path = require('path');
const Developer = require('../models/Developer');
const { protect, authorizeRoles } = require('../middleware/auth');
const { upload, handleUploadError } = require('../middleware/uploadMiddleware');
const { uploadBuffer } = require('../services/cloudinaryService');

// Local disk fallback folder (served by Express at /uploads/developers)
const LOCAL_UPLOAD_DIR = path.join(__dirname, '../public/uploads/developers');

const saveBufferToDisk = (buffer, originalName) => {
    if (!fs.existsSync(LOCAL_UPLOAD_DIR)) {
        fs.mkdirSync(LOCAL_UPLOAD_DIR, { recursive: true });
    }
    const safeExt = (path.extname(originalName || '') || '.jpg').toLowerCase().slice(0, 8);
    const filename = `dev_${Date.now()}_${Math.round(Math.random() * 1e6)}${safeExt}`;
    fs.writeFileSync(path.join(LOCAL_UPLOAD_DIR, filename), buffer);
    return filename;
};

const router = express.Router();

// ── Helpers ────────────────────────────────────────────────
const CLOUDINARY_FOLDER = 'developers';

const parseSkills = (skills) => {
    if (Array.isArray(skills)) return skills.map(s => String(s).trim()).filter(Boolean);
    if (typeof skills === 'string') {
        return skills.split(',').map(s => s.trim()).filter(Boolean);
    }
    return [];
};

const parseExperiences = (experiences) => {
    let list = experiences;
    // When sent via multipart/form-data, arrays arrive as JSON strings
    if (typeof list === 'string') {
        try {
            list = JSON.parse(list);
        } catch {
            list = [];
        }
    }
    if (!Array.isArray(list)) return [];
    return list.map(exp => ({
        role: exp?.role || '',
        company: exp?.company || '',
        duration: exp?.duration || '',
        description: exp?.description || ''
    }));
};

// Builds the update/create payload from either a JSON body or a
// multipart/form-data body (Multer populates req.body with strings).
const buildPayload = async (req) => {
    const body = req.body || {};

    let profilePicture = typeof body.profilePicture === 'string' ? body.profilePicture.trim() : '';

    // If a file was uploaded, push it to Cloudinary. If Cloudinary is not
    // reachable/configured, fall back to permanent local disk storage so the
    // profile picture is always saved and visible on the public page.
    if (req.file && req.file.buffer) {
        try {
            const result = await uploadBuffer(req.file.buffer, CLOUDINARY_FOLDER, 'image');
            profilePicture = result.secure_url;
        } catch (cloudinaryErr) {
            console.warn('Cloudinary upload failed, saving locally instead:', cloudinaryErr.message);
            const filename = saveBufferToDisk(req.file.buffer, req.file.originalname);
            profilePicture = `${req.protocol}://${req.get('host')}/uploads/developers/${filename}`;
        }
    }

    return {
        name: body.name,
        title: body.title,
        profilePicture,
        initials: (body.initials || '').toUpperCase(),
        skills: parseSkills(body.skills),
        summary: body.summary || '',
        experiences: parseExperiences(body.experiences)
    };
};

// ── Routes ─────────────────────────────────────────────────

// @route   GET /api/developers
// @desc    Fetch all developers (public)
// @access  Public
router.get('/', async (req, res, next) => {
    try {
        const developers = await Developer.find().sort({ createdAt: 1 });
        res.status(200).json({ success: true, count: developers.length, data: developers });
    } catch (err) {
        next(err);
    }
});

// @route   GET /api/developers/:id
// @desc    Fetch a single developer by ID (public)
// @access  Public
router.get('/:id', async (req, res, next) => {
    try {
        const developer = await Developer.findById(req.params.id);
        if (!developer) {
            return res.status(404).json({ success: false, message: 'Developer not found' });
        }
        res.status(200).json({ success: true, data: developer });
    } catch (err) {
        if (err.name === 'CastError') {
            return res.status(404).json({ success: false, message: 'Developer not found' });
        }
        next(err);
    }
});

// @route   POST /api/developers
// @desc    Create a developer profile (accepts JSON with image URL OR multipart/form-data with "profilePicture" file)
// @access  Admin only
router.post('/', protect, authorizeRoles('Admin'), upload.single('profilePicture'), handleUploadError, async (req, res, next) => {
    try {
        const payload = await buildPayload(req);

        if (!payload.profilePicture) {
            return res.status(400).json({ success: false, message: 'Profile picture is required (upload a file or provide an image URL)' });
        }

        const developer = await Developer.create(payload);
        res.status(201).json({ success: true, message: 'Developer created successfully', data: developer });
    } catch (err) {
        if (err.name === 'ValidationError') {
            return res.status(400).json({ success: false, message: Object.values(err.errors).map(e => e.message).join(', ') });
        }
        next(err);
    }
});

// @route   PUT /api/developers/:id
// @desc    Update a developer profile and/or replace the photo (JSON or multipart/form-data)
// @access  Admin only
router.put('/:id', protect, authorizeRoles('Admin'), upload.single('profilePicture'), handleUploadError, async (req, res, next) => {
    try {
        const existing = await Developer.findById(req.params.id);
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Developer not found' });
        }

        const payload = await buildPayload(req);

        // Keep current values for any fields not provided in this request
        if (!payload.profilePicture) payload.profilePicture = existing.profilePicture;
        if (!payload.name) payload.name = existing.name;
        if (!payload.title) payload.title = existing.title;
        if (!payload.skills.length) payload.skills = existing.skills;

        const developer = await Developer.findByIdAndUpdate(req.params.id, payload, {
            new: true,
            runValidators: true
        });

        res.status(200).json({ success: true, message: 'Developer updated successfully', data: developer });
    } catch (err) {
        if (err.name === 'ValidationError') {
            return res.status(400).json({ success: false, message: Object.values(err.errors).map(e => e.message).join(', ') });
        }
        if (err.name === 'CastError') {
            return res.status(404).json({ success: false, message: 'Developer not found' });
        }
        next(err);
    }
});

// @route   DELETE /api/developers/:id
// @desc    Delete a developer profile
// @access  Admin only
router.delete('/:id', protect, authorizeRoles('Admin'), async (req, res, next) => {
    try {
        const developer = await Developer.findByIdAndDelete(req.params.id);
        if (!developer) {
            return res.status(404).json({ success: false, message: 'Developer not found' });
        }
        res.status(200).json({ success: true, message: 'Developer deleted successfully', data: {} });
    } catch (err) {
        if (err.name === 'CastError') {
            return res.status(404).json({ success: false, message: 'Developer not found' });
        }
        next(err);
    }
});

module.exports = router;

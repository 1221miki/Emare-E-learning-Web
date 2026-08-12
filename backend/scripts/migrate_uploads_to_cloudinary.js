#!/usr/bin/env node
/**
 * One-time migration script:
 * - Finds User.avatarUrl and Course.thumbnailUrl that point to local /uploads/ files
 * - Uploads image files (jpg/jpeg/png/gif/webp/svg/bmp/tiff) to Cloudinary
 *   into folders: emare_elms/avatars and emare_elms/course_thumbnails
 * - Updates MongoDB documents with the new Cloudinary secure_url
 * - Deletes the local file only after successful upload + DB update
 *
 * IMPORTANT: Does NOT process MP4 or PDF files. Skips videos and PDFs.
 * Usage: set required env vars then run from repo root:
 *   node backend/scripts/migrate_uploads_to_cloudinary.js
 */

const path = require('path');
const fs = require('fs').promises;
const fssync = require('fs');
const mongoose = require('mongoose');
const cloudinary = require('../config/cloudinary');

const User = require('../models/User');
const Course = require('../models/Course');

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.MONGOURL;
if (!MONGO_URI) {
    console.error('ERROR: MONGODB_URI not set. Set MONGODB_URI and re-run the script.');
    process.exit(1);
}

if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.error('ERROR: Cloudinary env vars missing. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.');
    process.exit(1);
}

const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.tiff']);
const SKIP_EXTS = new Set(['.mp4', '.pdf', '.mov', '.avi', '.mkv']);

function isLocalUploadUrl(url) {
    if (!url) return false;
    const u = String(url).trim();
    if (!u) return false;
    if (u.includes('res.cloudinary.com')) return false; // already on Cloudinary
    if (u.startsWith('http://') || u.startsWith('https://')) return false; // external URL
    // Accept paths like '/uploads/xxx', 'uploads/xxx', 'public/uploads/xxx'
    return u.includes('/uploads/') || u.startsWith('uploads/') || u.includes('public/uploads');
}

function getLocalFilePathFromUrl(url) {
    const name = path.basename(url.split('?')[0]);
    return path.join(uploadsDir, name);
}

async function fileExists(p) {
    try {
        await fs.access(p);
        return true;
    } catch (e) {
        return false;
    }
}

async function processUserAvatars() {
    console.log('Scanning users for local avatarUrl entries...');
    const users = await User.find({ avatarUrl: { $exists: true, $ne: '' } }).lean();
    let migrated = 0;
    for (const u of users) {
        const url = u.avatarUrl;
        if (!isLocalUploadUrl(url)) continue;
        const localPath = getLocalFilePathFromUrl(url);
        const ext = path.extname(localPath).toLowerCase();
        if (SKIP_EXTS.has(ext)) {
            console.log(`Skipping (not an image) user ${u._id} -> ${localPath}`);
            continue;
        }
        if (!IMAGE_EXTS.has(ext)) {
            console.log(`Skipping unknown extension for user ${u._id}: ${localPath}`);
            continue;
        }
        if (!await fileExists(localPath)) {
            console.log(`Local file not found for user ${u._id}: ${localPath}`);
            continue;
        }
        try {
            console.log(`Uploading avatar for user ${u._id} -> ${localPath}`);
            const res = await cloudinary.uploader.upload(localPath, { folder: 'emare_elms/avatars', resource_type: 'image' });
            const secure = res.secure_url || res.url;
            if (!secure) throw new Error('Cloudinary returned no secure_url');
            await User.updateOne({ _id: u._id }, { $set: { avatarUrl: secure } });
            // safety: ensure file is within uploadsDir before deleting
            const resolved = path.resolve(localPath);
            if (resolved.startsWith(path.resolve(uploadsDir))) {
                await fs.unlink(resolved);
                console.log(`Deleted local file: ${resolved}`);
            } else {
                console.log(`Refusing to delete outside uploadsDir: ${resolved}`);
            }
            migrated++;
        } catch (err) {
            console.error(`Error migrating avatar for user ${u._id}:`, err.message || err);
        }
    }
    console.log(`User avatars migrated: ${migrated}`);
    return migrated;
}

async function processCourseThumbnails() {
    console.log('Scanning courses for local thumbnailUrl entries...');
    const courses = await Course.find({ thumbnailUrl: { $exists: true, $ne: '' } }).lean();
    let migrated = 0;
    for (const c of courses) {
        const url = c.thumbnailUrl;
        if (!isLocalUploadUrl(url)) continue;
        const localPath = getLocalFilePathFromUrl(url);
        const ext = path.extname(localPath).toLowerCase();
        if (SKIP_EXTS.has(ext)) {
            console.log(`Skipping (not an image) course ${c._id} -> ${localPath}`);
            continue;
        }
        if (!IMAGE_EXTS.has(ext)) {
            console.log(`Skipping unknown extension for course ${c._id}: ${localPath}`);
            continue;
        }
        if (!await fileExists(localPath)) {
            console.log(`Local file not found for course ${c._id}: ${localPath}`);
            continue;
        }
        try {
            console.log(`Uploading thumbnail for course ${c._id} -> ${localPath}`);
            const res = await cloudinary.uploader.upload(localPath, { folder: 'emare_elms/course_thumbnails', resource_type: 'image' });
            const secure = res.secure_url || res.url;
            if (!secure) throw new Error('Cloudinary returned no secure_url');
            await Course.updateOne({ _id: c._id }, { $set: { thumbnailUrl: secure } });
            const resolved = path.resolve(localPath);
            if (resolved.startsWith(path.resolve(uploadsDir))) {
                await fs.unlink(resolved);
                console.log(`Deleted local file: ${resolved}`);
            } else {
                console.log(`Refusing to delete outside uploadsDir: ${resolved}`);
            }
            migrated++;
        } catch (err) {
            console.error(`Error migrating thumbnail for course ${c._id}:`, err.message || err);
        }
    }
    console.log(`Course thumbnails migrated: ${migrated}`);
    return migrated;
}

async function main() {
    console.log('Starting migration script: migrate_uploads_to_cloudinary.js');
    console.log('Uploads dir:', uploadsDir);
    try {
        await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
        console.log('Connected to MongoDB');

        const usersCount = await processUserAvatars();
        const coursesCount = await processCourseThumbnails();

        console.log(`Migration complete. Users: ${usersCount}, Courses: ${coursesCount}`);
    } catch (err) {
        console.error('Migration failed:', err.message || err);
    } finally {
        try { await mongoose.disconnect(); } catch (e) {}
        console.log('Disconnected MongoDB. Exiting.');
    }
}

main();

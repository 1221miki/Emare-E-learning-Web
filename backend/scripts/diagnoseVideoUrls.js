/**
 * DEPRECATED — External video URL diagnostics have been removed.
 * All videos now use local server storage.
 *
 * This script previously resolved external embed URLs to direct MP4
 * playback URLs. It is no longer needed.
 *
 * Run:  node scripts/diagnoseVideoUrls.js (will exit immediately)
 */
const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const Course = require('../models/Course');

(async () => {
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
    const courses = await Course.find({}, { curriculumTree: 1, courseTitle: 1 }).lean();

    const seen = new Map();
    const heads = [];
    for (const c of courses) {
        for (const ch of c.curriculumTree || []) {
            for (const l of ch.lessons || []) {
                if (!l.videoUrl || seen.has(l.videoUrl)) continue;
                seen.set(l.videoUrl, true);
                heads.push({ course: c.courseTitle, url: l.videoUrl });
            }
        }
    }
    console.log(`Found ${heads.length} distinct lesson video URLs\n`);

    for (const h of heads) {
        const isLocal = /\/api\/local-storage\//i.test(h.url);
        const isYouTube = /youtube\.com\/|youtu\.be\//i.test(h.url);
        const type = isLocal ? 'LOCAL' : isYouTube ? 'YOUTUBE' : 'EXTERNAL';
        console.log(`[${type}] ${h.course}: ${h.url}`);
    }

    await mongoose.disconnect();
})().catch(e => { console.error(e.message); process.exit(1); });

/**
 * DEPRECATED — Direct MP4 URL resolution has been removed.
 * All videos now use local server storage and are served via /api/local-storage/.
 *
 * This script previously resolved external embed URLs to direct CDN MP4
 * URLs for checkpoint playback. It is no longer needed.
 *
 * Run:  node scripts/storeDirectVideoUrls.js (will exit immediately)
 */
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb+srv://asamnagiz2_db_user:Ayuman2123%40%23@emareelearning.dxok7bt.mongodb.net/emare?retryWrites=true&w=majority&appName=EmareElearning';

(async () => {
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 25000 });
    const db = mongoose.connection.db;
    const courses = await db.collection('courses').find({}).toArray();
    let updated = 0;

    for (const c of courses) {
        let changed = false;
        for (const ch of c.curriculumTree || []) {
            for (const l of ch.lessons || []) {
                // Clear any legacy directVideoUrl fields
                if (l.directVideoUrl) {
                    delete l.directVideoUrl;
                    changed = true;
                    updated++;
                    console.log(`Cleared directVideoUrl from: ${String(l.lessonTitle).slice(0, 40)}`);
                }
            }
        }
        if (changed) {
            await db.collection('courses').updateOne(
                { _id: c._id },
                { $set: { curriculumTree: c.curriculumTree } }
            );
        }
    }
    console.log(`DONE - ${updated} lesson(s) cleaned`);
    await mongoose.disconnect();
    process.exit(0);
})().catch(e => { console.error('FAILED:', e.code || e.message); process.exit(1); });

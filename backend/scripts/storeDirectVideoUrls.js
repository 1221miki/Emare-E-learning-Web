/**
 * Resolves and STORES a direct MP4 playback URL into every lesson document
 * that has quiz checkpoints. The student player falls back to this stored
 * URL whenever the checkpoint API's live resolution returns null — making
 * checkpoint mode work regardless of backend deployment state.
 *
 * Run:  node scripts/storeDirectVideoUrls.js
 */
const mongoose = require('mongoose');
const axios = require('axios');

const MONGO_URI = 'mongodb+srv://asamnagiz2_db_user:Ayuman2123%40%23@emareelearning.dxok7bt.mongodb.net/emare?retryWrites=true&w=majority&appName=EmareElearning';
const HOST = 'vz-ece4d3e6-807.b-cdn.net';   // verified pull-zone for library 735143
const QUALITIES = ['480p', '360p', '720p', '240p'];
// Bunny hotlink protection rejects Referer-less requests
const HEADERS = { Referer: process.env.FRONTEND_URL || 'http://localhost:5173' };

async function headOk(url) {
    try {
        const r = await axios.head(url, { timeout: 8000, validateStatus: () => true, headers: HEADERS });
        return r.status >= 200 && r.status < 400;
    } catch {
        return false;
    }
}

(async () => {
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 25000 });
    const db = mongoose.connection.db;
    const courses = await db.collection('courses').find({}).toArray();
    let updated = 0;

    for (const c of courses) {
        let changed = false;
        for (const ch of c.curriculumTree || []) {
            for (const l of ch.lessons || []) {
                if (!(l.quizCheckpoints || []).length) continue;
                const g = (String(l.videoUrl || '').match(/mediadelivery\.net\/embed\/(\d+)\/([a-f0-9-]{36})/i) || [])[2];
                if (!g) continue;

                let resolved = null;
                for (const q of QUALITIES) {
                    const u = `https://${HOST}/${g}/play_${q}.mp4`;
                    if (await headOk(u)) { resolved = u; break; }
                }
                if (resolved && l.directVideoUrl !== resolved) {
                    l.directVideoUrl = resolved;
                    changed = true;
                    updated++;
                    console.log(`✓ ${String(c.courseTitle).slice(0, 26)} | ${String(l.lessonTitle).slice(0, 30)} -> ${resolved}`);
                } else if (!resolved) {
                    console.log(`✗ ${String(c.courseTitle).slice(0, 26)} | ${String(l.lessonTitle).slice(0, 30)} -> could not verify (still processing?)`);
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
    console.log(`DONE - ${updated} lesson(s) updated`);
    await mongoose.disconnect();
    process.exit(0);
})().catch(e => { console.error('FAILED:', e.code || e.message); process.exit(1); });

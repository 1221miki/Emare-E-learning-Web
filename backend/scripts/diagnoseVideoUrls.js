const mongoose = require('mongoose');
const axios = require('axios');
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

    for (const h of heads.slice(0, 8)) {
        const m = String(h.url).match(/mediadelivery\.net\/embed\/(\d+)\/([a-f0-9-]{36})/i);
        console.log(`COURSE: ${h.course}`);
        console.log(`  raw: ${h.url}`);
        if (!m) { console.log('  -> NOT a bunny embed (external/direct)\n'); continue; }
        const [, lib, guid] = m;
        // Try both known pull zones at multiple qualities
        for (const host of ['vz-4bc99530-632.b-cdn.net', 'vz-ece4d3e6-807.b-cdn.net']) {
            for (const q of ['play_720p.mp4', 'play_480p.mp4', 'play_360p.mp4']) {
                const u = `https://${host}/${guid}/${q}`;
                let status = '?';
                try {
                    const r = await axios.head(u, { timeout: 8000, validateStatus: () => true });
                    status = r.status;
                } catch (e) { status = 'ERR ' + e.message.slice(0, 40); }
                if (status === 200) console.log(`  OK   ${host} ${q}`);
                else if (String(status).startsWith('ERR')) console.log(`  ${status} ${host} ${q}`);
            }
        }
        console.log('');
    }
    await mongoose.disconnect();
})().catch(e => { console.error(e.message); process.exit(1); });

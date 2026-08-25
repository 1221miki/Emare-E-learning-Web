/**
 * Adds extra video lessons (with in-video quiz checkpoints) to any course
 * that has fewer than 3 lessons, using already-uploaded & processed Bunny
 * Stream videos from library 735143.
 *
 * Run:  node scripts/addLessonsChain.js
 */
const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');

const MONGO_URI = 'mongodb+srv://asamnagiz2_db_user:Ayuman2123%40%23@emareelearning.dxok7bt.mongodb.net/emare?retryWrites=true&w=majority&appName=EmareElearning';

// Unused, fully processed videos (guid -> duration seconds), verified via Bunny API
const SPARE_VIDEOS = [
    { guid: 'e26cbca8-a88b-4843-8257-eb03f05c29d7', dur: 111 },
    { guid: '25b8978b-1e1f-435f-bc9e-e43a4dc0bbf9', dur: 111 },
    { guid: 'a6706106-0735-407d-a8f6-f8e6411f0d9c', dur: 277 },
    { guid: '60542e94-6412-4c21-9a97-a41eee467b97', dur: 103 }
];

const mkQ = (part, n) => ({
    questionText: `Question ${n} about "${part}": which option is correct?`,
    options: [
        'Option A - rewatch this segment to check',
        'Option B - rewatch this segment to check',
        'Option C - rewatch this segment to check',
        'Option D - none of the above'
    ],
    correctAnswerIndex: n % 3
});

const mkCps = (dur) => {
    const ends = [Math.round(dur * 0.25), Math.round(dur * 0.55), Math.round(dur * 0.85)];
    return ends.map((end, i) => ({
        checkpointId: `cp_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 7)}`,
        title: `Part ${i + 1}`,
        startSeconds: i === 0 ? 0 : ends[i - 1],
        timestampSeconds: Math.min(end, dur - 2),
        passingScorePercent: 60,
        questions: [1, 2, 3].map(n => mkQ(`Part ${i + 1}`, n))
    }));
};

(async () => {
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 25000 });
    const db = mongoose.connection.db;
    const courses = await db.collection('courses').find({}).toArray();

    let spareIdx = 0;
    for (const c of courses) {
        const tree = c.curriculumTree || [];
        if (!tree.length) continue;
        const countLessons = () => tree.reduce((n, ch) => n + (ch.lessons || []).length, 0);

        let added = [];
        while (countLessons() < 3 && spareIdx < SPARE_VIDEOS.length) {
            const v = SPARE_VIDEOS[spareIdx++];
            const num = countLessons() + 1;
            const lesson = {
                _id: new ObjectId(),
                lessonTitle: `Lesson ${num} - Video Concept Training`,
                videoUrl: `https://iframe.mediadelivery.net/embed/735143/${v.guid}`,
                durationMinutes: Math.max(1, Math.round(v.dur / 60)),
                isFreePreview: false,
                quizCheckpoints: mkCps(v.dur)
            };
            // append into the LAST chapter
            tree[tree.length - 1].lessons.push(lesson);
            added.push(`${lesson.lessonTitle} (quiz at ${lesson.quizCheckpoints.map(cp => cp.timestampSeconds + 's').join(', ')})`);
        }

        if (added.length) {
            await db.collection('courses').updateOne(
                { _id: c._id },
                { $set: { curriculumTree: tree } }
            );
            console.log(`COURSE "${c.courseTitle}" now has ${countLessons()} lessons:`);
            added.forEach(a => console.log('   +', a));
        } else {
            console.log(`COURSE "${c.courseTitle}" unchanged (${countLessons()} lessons, no spare videos left)`);
        }
    }
    console.log('DONE');
    await mongoose.disconnect();
    process.exit(0);
})().catch(e => { console.error('FAILED:', e.code || e.message); process.exit(1); });

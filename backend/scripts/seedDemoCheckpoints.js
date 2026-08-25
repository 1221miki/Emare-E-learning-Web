const mongoose = require('mongoose');

mongoose.connect('mongodb+srv://asamnagiz2_db_user:Ayuman2123%40%23@emareelearning.dxok7bt.mongodb.net/emare?retryWrites=true&w=majority&appName=EmareElearning').then(async () => {
    const db = mongoose.connection.db;

    // Real video durations from Bunny Stream API (seconds)
    const durations = {
        '8da59e68-22e1-4fbf-93fb-ab974cedec69': 77,
        'cde29097-d4a7-4078-97e5-372e149258e5': 233,
        '96374870-575f-4f44-9135-ac879d9139e0': 650,
        '0fdfadc7-dcb3-4f1d-859c-ccadcbab3845': 77
    };

    const mkQ = (conceptTitle, n) => ({
        questionText: `Question ${n} about "${conceptTitle}": which option is correct?`,
        options: [
            'Option A - rewatch this video segment to check',
            'Option B - rewatch this video segment to check',
            'Option C - rewatch this video segment to check',
            'Option D - none of the above'
        ],
        correctAnswerIndex: n % 3
    });

    const mkCps = (dur) => {
        const ends = [Math.round(dur * 0.25), Math.round(dur * 0.55), Math.round(dur * 0.85)];
        const starts = [0, ends[0], ends[1]];
        return ends.map((end, i) => ({
            checkpointId: `cp_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 7)}`,
            title: `Part ${i + 1}`,
            startSeconds: starts[i],
            timestampSeconds: Math.min(end, dur - 2),
            passingScorePercent: 60,
            questions: [1, 2, 3].map(n => mkQ(`Part ${i + 1}`, n))
        }));
    };

    const courses = await db.collection('courses').find({}).toArray();
    let updatedLessons = 0;
    for (const c of courses) {
        let changed = false;
        const tree = c.curriculumTree || [];
        tree.forEach(ch => (ch.lessons || []).forEach(l => {
            if (!l.videoUrl || (l.quizCheckpoints || []).length > 0) return;
            const m = String(l.videoUrl || '').match(/embed\/(\d+)\/([a-f0-9-]{36})/i);
            if (!m) return;
            const dur = durations[m[2]];
            if (!dur) return;
            l.quizCheckpoints = mkCps(dur);
            changed = true;
            updatedLessons++;
            console.log(String(c.courseTitle).slice(0, 28).padEnd(28), '|', String(l.lessonTitle).slice(0, 30), '-> quiz at', l.quizCheckpoints.map(cp => cp.timestampSeconds + 's').join(', '));
        }));
        if (changed) {
            await db.collection('courses').updateOne({ _id: c._id }, { $set: { curriculumTree: tree } });
        }
    }
    console.log('DONE -', updatedLessons, 'lessons updated');
    await mongoose.disconnect();
}).catch(e => { console.error(e); process.exit(1); });

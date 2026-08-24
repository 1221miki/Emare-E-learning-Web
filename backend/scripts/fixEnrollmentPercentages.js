/* One-off cleanup: reset stale Enrollment.completionPercentage caused by probe */
const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const Course = require('../models/Course');
const LearningProgress = require('../models/LearningProgress');
const Enrollment = require('../models/Enrollment');

(async () => {
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);

    const enrollments = await Enrollment.find({}).lean();
    let fixed = 0;
    for (const en of enrollments) {
        const totalLessons = ((await Course.findById(en.courseRef).select('curriculumTree').lean())?.curriculumTree || [])
            .reduce((s, ch) => s + (ch.lessons?.length || 0), 0);
        const prog = await LearningProgress.findOne({ studentRef: en.studentRef, courseRef: en.courseRef }).lean();
        const completed = (prog?.progressItems || []).filter(i => i.completed).length;
        const correctPct = totalLessons > 0 ? Math.round((completed / totalLessons) * 100) : 0;
        if ((en.completionPercentage ?? 0) !== correctPct) {
            await Enrollment.updateOne({ _id: en._id }, { $set: { completionPercentage: correctPct } });
            fixed++;
            console.log(`fixed enrollment ${en._id}: ${en.completionPercentage}% -> ${correctPct}%`);
        }
    }
    console.log(`Done. ${fixed} enrollment(s) corrected.`);
    await mongoose.disconnect();
})().catch(e => { console.error(e.message); process.exit(1); });

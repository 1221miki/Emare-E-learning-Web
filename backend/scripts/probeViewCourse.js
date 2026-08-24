/* Reproduce the student "View Course" flow through the controllers directly */
const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const Course = require('../models/Course');
const User = require('../models/User');
const LearningProgress = require('../models/LearningProgress');
const progressController = require('../controllers/learningProgressController');

const mockRes = () => {
    const res = {};
    res.statusCode = 200;
    res.body = null;
    res.status = (c) => { res.statusCode = c; return res; };
    res.json = (p) => { res.body = p; return res; };
    return res;
};

(async () => {
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
    console.log('DB connected');

    const student = await User.findOne({ assignedRole: 'Student' }).lean();
    const course = await Course.findOne().lean();
    console.log('student:', student?._id?.toString(), 'course:', course?._id?.toString(), 'title:', course?.courseTitle);

    // 1. getCourseProgress
    let res = mockRes();
    await progressController.getCourseProgress(
        { params: { courseId: course._id.toString() }, user: { id: student._id } },
        res, (e) => { throw e; }
    );
    console.log('getCourseProgress:', res.statusCode, res.body?.success);

    // 2. getLessonRequirementsStatus for each lesson
    for (const ch of (course.curriculumTree || [])) {
        for (const l of (ch.lessons || []).slice(0, 3)) {
            res = mockRes();
            try {
                await progressController.getLessonRequirementsStatus(
                    { params: { courseId: course._id.toString(), lessonId: l._id.toString() }, user: { id: student._id } },
                    res, (e) => { throw e; }
                );
                console.log(`requirements ${l.lessonTitle}:`, res.statusCode, JSON.stringify(res.body?.data || res.body?.message)?.slice(0, 160));
            } catch (err) {
                console.log(`requirements ${l.lessonTitle} CRASHED:`, err.message);
            }
        }
        break;
    }

    // 3. saveLessonProgress completed=true (watch-gate path)
    const firstLesson = course.curriculumTree?.[0]?.lessons?.[0];
    if (firstLesson) {
        res = mockRes();
        try {
            await progressController.saveLessonProgress(
                {
                    params: { courseId: course._id.toString(), lessonId: firstLesson._id.toString() },
                    user: { id: student._id },
                    body: { completed: true, lessonTitle: firstLesson.lessonTitle, currentTime: 10, watchedSeconds: 5, videoDurationSeconds: 0 }
                },
                res, (e) => { throw e; }
            );
            console.log('saveLessonProgress:', res.statusCode, JSON.stringify(res.body?.message || '')?.slice(0, 120));
        } catch (err) {
            console.log('saveLessonProgress CRASHED:', err.message);
        }
    }

    // cleanup any partial progress written by the probe
    await LearningProgress.deleteOne({ studentRef: student._id, courseRef: course._id });

    await mongoose.disconnect();
    console.log('DONE');
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });

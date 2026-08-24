/* Full student journey: watch → quiz pauses → pass → resume → next lesson → certificate */
const assert = require('assert');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { test, before, after } = require('node:test');

const Course = require('../models/Course');
const User = require('../models/User');
const Enrollment = require('../models/Enrollment');
const LearningProgress = require('../models/LearningProgress');
const quizController = require('../controllers/inVideoQuizController');
const progressController = require('../controllers/learningProgressController');

let mongod;
let STUDENT;
let COURSE;
let L1, L2;

const mockRes = () => {
    const res = {};
    res.statusCode = 200;
    res.body = null;
    res.status = (c) => { res.statusCode = c; return res; };
    res.json = (p) => { res.body = p; return res; };
    return res;
};
const next = (e) => { if (e) throw e; };

before(async () => {
    mongod = await MongoMemoryServer.create({ instance: { startupTimeout: 60000 } });
    await mongoose.connect(mongod.getUri(), { dbName: 'test' });

    STUDENT = await User.create({
        fullName: 'Test Student', accountEmail: 'flow@test.com', securedPassword: 'x'.repeat(60),
        assignedRole: 'Student', isEmailVerified: true
    });

    COURSE = await Course.create({
        courseTitle: 'Flow Test Course',
        descriptionText: 'Two-lesson course used to verify the complete student learning flow',
        technicalCategory: 'Web Coding',
        estimatedDurationHours: 1,
        creatorRef: new mongoose.Types.ObjectId(),
        curriculumTree: [
            {
                chapterTitle: 'Chapter 1',
                lessons: [
                    {
                        lessonTitle: 'Lesson 1 (has checkpoints)',
                        videoUrl: 'https://vz-x.b-cdn.net/guid/play_480p.mp4',
                        quizCheckpoints: [
                            { checkpointId: 'cp_1a', title: 'Segment A', timestampSeconds: 60, passingScorePercent: 60,
                              questions: [{ questionText: 'Q1?', options: ['a', 'b'], correctAnswerIndex: 0 }] },
                            { checkpointId: 'cp_1b', title: 'Segment B', timestampSeconds: 300, passingScorePercent: 60,
                              questions: [{ questionText: 'Q2?', options: ['x', 'y'], correctAnswerIndex: 1 }] }
                        ]
                    },
                    { lessonTitle: 'Lesson 2 (plain video)', videoUrl: 'https://vz-x.b-cdn.net/guid2/play_480p.mp4' }
                ]
            }
        ]
    });
    const lessons = COURSE.curriculumTree[0].lessons;
    L1 = lessons[0]; L2 = lessons[1];
    await Enrollment.create({ studentRef: STUDENT._id, courseRef: COURSE._id, completionPercentage: 0 });
});

after(async () => {
    await mongoose.disconnect();
    if (mongod) await mongod.stop();
});

const getCheckpoints = async (lessonId) => {
    const res = mockRes();
    await quizController.getLessonCheckpoints(
        { params: { courseId: COURSE._id.toString(), lessonId }, user: { id: STUDENT._id } }, res, next);
    return res;
};
const submitQuiz = async (lessonId, checkpointId, selectedIndex) => {
    const res = mockRes();
    await quizController.submitCheckpointAttempt(
        { params: { courseId: COURSE._id.toString(), lessonId }, user: { id: STUDENT._id },
          body: { checkpointId, answers: [{ questionIndex: 0, selectedIndex }] } }, res, next);
    return res;
};
const requirements = async (lessonId, watchedSeconds = 0, durationSeconds = 0) => {
    const res = mockRes();
    await progressController.getLessonRequirementsStatus(
        { params: { courseId: COURSE._id.toString(), lessonId }, query: { watchedSeconds, durationSeconds }, user: { id: STUDENT._id } },
        res, next);
    return res.body.data;
};
const markComplete = async (lessonId, watchedSeconds, durationSeconds) => {
    const res = mockRes();
    await progressController.saveLessonProgress(
        { params: { courseId: COURSE._id.toString(), lessonId }, user: { id: STUDENT._id },
          body: { completed: true, currentTime: Math.round(watchedSeconds), watchedSeconds, videoDurationSeconds: durationSeconds } },
        res, next);
    return res;
};

test('STUDENT JOURNEY: Lesson 1 quizzes gate → watch-through gate → auto-unlock Lesson 2 → 100%', async () => {
    // ── Step 1: open Lesson 1 ──
    let r = await getCheckpoints(L1._id.toString());
    assert.strictEqual(r.statusCode, 200);
    assert.strictEqual(r.body.data.checkpoints.length, 2);
    assert.strictEqual(r.body.data.allCheckpointsPassed, false);

    // ── Step 2: checkpoint at 0:60 pauses → student answers WRONG → fails ──
    r = await submitQuiz(L1._id.toString(), 'cp_1a', 1);
    assert.strictEqual(r.body.data.passed, false);

    // Cannot complete lesson while any checkpoint is unpassed
    let req = await requirements(L1._id.toString());
    assert.strictEqual(req.canComplete, false);

    // ── Step 3: retake → correct answer → resumes from paused timestamp ──
    r = await submitQuiz(L1._id.toString(), 'cp_1a', 0);
    assert.strictEqual(r.body.data.passed, true);
    assert.strictEqual(r.body.data.resumeAtSeconds, 60); // exact resume point

    // ── Step 4: second checkpoint at 5:00 → answered correctly first try ──
    r = await submitQuiz(L1._id.toString(), 'cp_1b', 1);
    assert.strictEqual(r.body.data.passed, true);

    // All checkpoints now passed…
    r = await getCheckpoints(L1._id.toString());
    assert.strictEqual(r.body.data.allCheckpointsPassed, true);

    // …but video only half-watched → still cannot complete (watch-through gate)
    req = await requirements(L1._id.toString(), 200, 600);
    assert.strictEqual(req.checkpointsPassed, true);
    assert.strictEqual(req.videoWatchRequired, true);
    assert.strictEqual(req.videoWatched, false);
    assert.strictEqual(req.canComplete, false);

    // Marking complete anyway → rejected with 422
    let res = await markComplete(L1._id.toString(), 200, 600);
    assert.strictEqual(res.statusCode, 422);

    // ── Step 5: student watches to the end → auto-complete succeeds ──
    res = await markComplete(L1._id.toString(), 580, 600);
    assert.strictEqual(res.statusCode, 200);

    // ── Step 6: Lesson 2 opens automatically — no gates, completes freely ──
    req = await requirements(L2._id.toString());
    assert.strictEqual(req.canComplete, true);
    res = await markComplete(L2._id.toString(), 300, 300);
    assert.strictEqual(res.statusCode, 200);

    // ── Step 7: course 100% → certificate eligible ──
    const prog = mockRes();
    await progressController.getCourseProgress(
        { params: { courseId: COURSE._id.toString() }, user: { id: STUDENT._id } }, prog, next);
    assert.strictEqual(prog.body.data.completionPercentage, 100);
});

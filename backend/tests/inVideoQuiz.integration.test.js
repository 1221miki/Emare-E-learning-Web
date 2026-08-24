const assert = require('assert');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { test, before, after } = require('node:test');

const Course = require('../models/Course');
const InVideoQuizAttempt = require('../models/InVideoQuizAttempt');
const controllerModule = require('../controllers/inVideoQuizController');
const {
    getLessonCheckpoints,
    submitCheckpointAttempt
} = require('../controllers/inVideoQuizController');

let mongod;

// ── Mock Express req/res/next helpers ────────────────────────────────────────
const mockRes = () => {
    const res = {};
    res.statusCode = 200;
    res.body = null;
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (payload) => { res.body = payload; return res; };
    return res;
};

const STUDENT_ID = new mongoose.Types.ObjectId();

before(async () => {
    mongod = await MongoMemoryServer.create({ instance: { startupTimeout: 60000 } });
    await mongoose.connect(mongod.getUri(), { dbName: 'test' });

    await Course.create({
        courseTitle: 'Quiz Test Course',
        descriptionText: 'Test course for in-video quiz checkpoints',
        technicalCategory: 'Web Coding',
        estimatedDurationHours: 1,
        creatorRef: new mongoose.Types.ObjectId(),
        curriculumTree: [{
            chapterTitle: 'Chapter 1',
            lessons: [{
                lessonTitle: 'Lesson with checkpoints',
                videoUrl: 'https://iframe.mediadelivery.net/embed/735143/123e4567-e89b-12d3-a456-426614174000',
                quizCheckpoints: [
                    {
                        checkpointId: 'cp_aaa',
                        title: 'Segment 1 quiz',
                        timestampSeconds: 120,
                        passingScorePercent: 60,
                        questions: [
                            { questionText: 'Q1?', options: ['a', 'b', 'c'], correctAnswerIndex: 1 },
                            { questionText: 'Q2?', options: ['x', 'y'], correctAnswerIndex: 0 }
                        ]
                    },
                    {
                        checkpointId: 'cp_bbb',
                        title: 'Segment 2 quiz',
                        timestampSeconds: 600,
                        passingScorePercent: 60,
                        questions: [{ questionText: 'Q3?', options: ['p', 'q'], correctAnswerIndex: 1 }]
                    }
                ]
            }]
        }]
    });
});

after(async () => {
    await mongoose.disconnect();
    if (mongod) await mongod.stop();
});

test('checkpoints are served without leaking correct answers', async () => {
    const course = await Course.findOne();
    const lessonId = course.curriculumTree[0].lessons[0]._id.toString();
    const req = { params: { courseId: course._id.toString(), lessonId }, user: { id: STUDENT_ID } };
    const res = mockRes();
    await getLessonCheckpoints(req, res, (err) => { throw err; });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    const cps = res.body.data.checkpoints;
    assert.strictEqual(cps.length, 2);
    for (const cp of cps) {
        for (const q of cp.questions) {
            assert.strictEqual(q.correctAnswerIndex, undefined);
        }
    }
    assert.strictEqual(res.body.data.attemptStatus.cp_aaa.passed, false);
    assert.strictEqual(res.body.data.allCheckpointsPassed, false);
});

test('submit grades server-side, records attempt, and passes at threshold', async () => {
    const course = await Course.findOne();
    const lessonId = course.curriculumTree[0].lessons[0]._id.toString();

    // Correct answers: Q1 -> index 1, Q2 -> index 0
    let req = {
        params: { courseId: course._id.toString(), lessonId },
        user: { id: STUDENT_ID },
        body: { checkpointId: 'cp_aaa', answers: [{ questionIndex: 0, selectedIndex: 1 }, { questionIndex: 1, selectedIndex: 0 }] }
    };
    let res = mockRes();
    await submitCheckpointAttempt(req, res, (err) => { throw err; });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.data.passed, true);
    assert.strictEqual(res.body.data.scorePercent, 100);
    assert.strictEqual(res.body.data.resumeAtSeconds, 120);

    // Attempt persisted in DB
    const attempts = await InVideoQuizAttempt.find({ studentRef: STUDENT_ID, checkpointId: 'cp_aaa' });
    assert.strictEqual(attempts.length, 1);
    assert.strictEqual(attempts[0].passed, true);
});

test('partial score fails and wrong answers recorded', async () => {
    const course = await Course.findOne();
    const lessonId = course.curriculumTree[0].lessons[0]._id.toString();
    const otherStudent = new mongoose.Types.ObjectId();

    const req = {
        params: { courseId: course._id.toString(), lessonId },
        user: { id: otherStudent },
        body: { checkpointId: 'cp_aaa', answers: [{ questionIndex: 0, selectedIndex: 0 }, { questionIndex: 1, selectedIndex: 0 }] }
    };
    const res = mockRes();
    await submitCheckpointAttempt(req, res, (err) => { throw err; });

    assert.strictEqual(res.body.data.passed, false);
    assert.strictEqual(res.body.data.scorePercent, 50);
    assert.strictEqual(res.body.data.review[0].isCorrect, false);
    assert.strictEqual(res.body.data.review[0].correctAnswerIndex, 1);
});

test('incomplete submissions are rejected — no skipping allowed', async () => {
    const course = await Course.findOne();
    const lessonId = course.curriculumTree[0].lessons[0]._id.toString();

    let req = {
        params: { courseId: course._id.toString(), lessonId },
        user: { id: STUDENT_ID },
        body: { checkpointId: 'cp_bbb', answers: [{ questionIndex: 0, selectedIndex: 1 }] }
    };
    // cp_bbb has only 1 question so answer it correctly first
    let res = mockRes();
    await submitCheckpointAttempt(req, res, (err) => { throw err; });
    assert.strictEqual(res.body.data.passed, true);

    // Now a second submit missing answers entirely is rejected
    req = {
        params: { courseId: course._id.toString(), lessonId },
        user: { id: STUDENT_ID },
        body: { checkpointId: 'cp_aaa', answers: [] }
    };
    res = mockRes();
    await submitCheckpointAttempt(req, res, (err) => { throw err; });
    assert.strictEqual(res.statusCode, 400);
});

test('attempt status reflects passes across both checkpoints', async () => {
    const course = await Course.findOne();
    const lessonId = course.curriculumTree[0].lessons[0]._id.toString();

    const req = { params: { courseId: course._id.toString(), lessonId }, user: { id: STUDENT_ID } };
    const res = mockRes();
    await getLessonCheckpoints(req, res, (err) => { throw err; });

    assert.strictEqual(res.body.data.attemptStatus.cp_aaa.passed, true);
    assert.strictEqual(res.body.data.attemptStatus.cp_bbb.passed, true);
    assert.strictEqual(res.body.data.allCheckpointsPassed, true);
});

test('playback URL resolver normalizes size (480p preferred) and verifies renditions', async () => {
    const axios = require('axios');
    process.env.BUNNY_VIDEO_LIBRARY_ID = '9999';
    process.env.BUNNY_STORAGE_DOMAIN = 'cdn.test.b-cdn.net';

    const { resolveDirectVideoUrl } = require('../controllers/inVideoQuizController');

    const origGet = axios.get;
    axios.get = async (url) => {
        if (url.includes('/videos/')) return { data: { availableResolutions: '240p,360p,480p,720p' } };
        return { data: {} };
    };

    const requested = [];
    controllerModule._setHeadVerifier(async (url) => { requested.push(url); return url.includes('play_480p.mp4'); });

    try {
        const url = await resolveDirectVideoUrl('https://iframe.mediadelivery.net/embed/9999/123e4567-e89b-12d3-a456-426614174009');
        assert.ok(url && url.endsWith('/play_480p.mp4'), `expected normalized 480p URL, got ${url}`);
        assert.ok(url.startsWith('https://cdn.test.b-cdn.net/'), `expected configured CDN host, got ${url}`);
        // 720p must NOT be tried before 480p (size normalization)
        assert.strictEqual(requested[0].includes('720p'), false);
        // Cached second call returns immediately
        const url2 = await resolveDirectVideoUrl('https://iframe.mediadelivery.net/embed/9999/123e4567-e89b-12d3-a456-426614174009');
        assert.strictEqual(url2, url);
    } finally {
        axios.get = origGet;
    }
});

test('lesson completion requires real watch-through of the video', async () => {
    const { checkLessonRequirements } = require('../controllers/learningProgressController');
    const lesson = { _id: new mongoose.Types.ObjectId(), quizCheckpoints: [] };

    // Watched 50% of a known duration → blocked
    let r = await checkLessonRequirements(STUDENT_ID, lesson, { watchedSeconds: 50, videoDurationSeconds: 100 });
    assert.strictEqual(r.videoWatchRequired, true);
    assert.strictEqual(r.videoWatched, false);
    assert.strictEqual(r.videoWatchedPercent, 50);
    assert.strictEqual(r.canComplete, false);

    // Watched 90% → allowed (85% threshold with playback-tick tolerance)
    r = await checkLessonRequirements(STUDENT_ID, lesson, { watchedSeconds: 90, videoDurationSeconds: 100 });
    assert.strictEqual(r.videoWatched, true);
    assert.strictEqual(r.canComplete, true);

    // No duration reported (e.g. iframe-only lesson) → watch gate skipped
    r = await checkLessonRequirements(STUDENT_ID, lesson, {});
    assert.strictEqual(r.videoWatchRequired, false);
    assert.strictEqual(r.canComplete, true);

    // Combined: quizzes passed but video not watched → still blocked
    const lessonWithCp = {
        _id: new mongoose.Types.ObjectId(),
        quizCheckpoints: [{ checkpointId: 'cp_x', timestampSeconds: 10, questions: [{ questionText: 'q?', options: ['a'], correctAnswerIndex: 0 }] }]
    };
    await InVideoQuizAttempt.create({
        studentRef: STUDENT_ID, courseRef: new mongoose.Types.ObjectId(), lessonId: lessonWithCp._id,
        checkpointId: 'cp_x', checkpointIndex: 0,
        answers: [{ questionIndex: 0, selectedIndex: 0, isCorrect: true }],
        scorePercent: 100, correctCount: 1, totalQuestions: 1, passed: true
    });
    r = await checkLessonRequirements(STUDENT_ID, lessonWithCp, { watchedSeconds: 10, videoDurationSeconds: 200 });
    assert.strictEqual(r.checkpointsPassed, true);
    assert.strictEqual(r.videoWatched, false);
    assert.strictEqual(r.canComplete, false); // everything else OK, but not fully watched

    // Now fully watched → complete allowed
    r = await checkLessonRequirements(STUDENT_ID, lessonWithCp, { watchedSeconds: 190, videoDurationSeconds: 200 });
    assert.strictEqual(r.canComplete, true);
});

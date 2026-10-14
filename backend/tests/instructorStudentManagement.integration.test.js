const assert = require('assert');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { test, before, after, beforeEach } = require('node:test');

const User = require('../models/User');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const LearningProgress = require('../models/LearningProgress');
const GradeBook = require('../models/GradeBook');
const Assignment = require('../models/Assignment');
const Submission = require('../models/Submission');
const InVideoQuizAttempt = require('../models/InVideoQuizAttempt');

const { getAllEnrollments } = require('../controllers/enrollmentController');
const { getInstructorCourses } = require('../controllers/courseController');
const { getSubmissionsForCourse } = require('../controllers/gradebookController');

let mongod;

const mockResponse = () => {
    const res = {};
    res.statusCode = 200;
    res.jsonData = null;
    res.status = (code) => {
        res.statusCode = code;
        return res;
    };
    res.json = (data) => {
        res.jsonData = data;
        return res;
    };
    return res;
};

before(async () => {
    mongod = await MongoMemoryServer.create({
        instance: { launchTimeout: 60000 },
    });
    const uri = mongod.getUri();
    await mongoose.connect(uri, { dbName: 'test_instructor_students' });
});

after(async () => {
    await mongoose.disconnect();
    if (mongod) await mongod.stop();
});

beforeEach(async () => {
    await User.deleteMany({});
    await Course.deleteMany({});
    await Enrollment.deleteMany({});
    await LearningProgress.deleteMany({});
    await GradeBook.deleteMany({});
    await Assignment.deleteMany({});
    await Submission.deleteMany({});
    await InVideoQuizAttempt.deleteMany({});
});

test('Requirement 1 & 4: Instructor can view enrollments for their course, forbidden for other courses', async () => {
    const instructor1 = await User.create({
        fullName: 'Instructor One',
        accountEmail: 'inst1@example.com',
        securedPassword: 'Password123!',
        assignedRole: 'Instructor'
    });

    const instructor2 = await User.create({
        fullName: 'Instructor Two',
        accountEmail: 'inst2@example.com',
        securedPassword: 'Password123!',
        assignedRole: 'Instructor'
    });

    const student1 = await User.create({
        fullName: 'Student Alice',
        accountEmail: 'alice@example.com',
        securedPassword: 'Password123!',
        assignedRole: 'Student'
    });

    const course1 = await Course.create({
        courseTitle: 'Fullstack Web Development',
        descriptionText: 'Learn fullstack web development from scratch with hands-on projects.',
        technicalCategory: 'Web Coding',
        creatorRef: instructor1._id,
        price: 100,
        estimatedDurationHours: 20
    });

    const course2 = await Course.create({
        courseTitle: 'Machine Learning Basics',
        descriptionText: 'Introduction to machine learning, neural networks, and deep learning.',
        technicalCategory: 'Artificial Intelligence',
        creatorRef: instructor2._id,
        price: 200,
        estimatedDurationHours: 30
    });

    await Enrollment.create({
        studentRef: student1._id,
        courseRef: course1._id,
        paymentStatus: 'Cleared',
        tuitionClearanceFlag: true,
        completionPercentage: 45
    });

    // 1. Instructor 1 queries their course -> 200 OK with enrolled student
    const req1 = {
        user: { id: instructor1._id.toString(), assignedRole: 'Instructor' },
        query: { courseId: course1._id.toString() }
    };
    const res1 = mockResponse();
    await getAllEnrollments(req1, res1);

    assert.strictEqual(res1.statusCode, 200);
    assert.strictEqual(res1.jsonData.count, 1);
    assert.strictEqual(res1.jsonData.data[0].studentRef.fullName, 'Student Alice');
    assert.strictEqual(res1.jsonData.data[0].courseRef.courseTitle, 'Fullstack Web Development');
    assert.strictEqual(res1.jsonData.data[0].completionPercentage, 45);

    // 2. Instructor 1 tries to query Instructor 2's course -> 403 Forbidden
    const req2 = {
        user: { id: instructor1._id.toString(), assignedRole: 'Instructor' },
        query: { courseId: course2._id.toString() }
    };
    const res2 = mockResponse();
    await getAllEnrollments(req2, res2);

    assert.strictEqual(res2.statusCode, 403);
    assert.strictEqual(res2.jsonData.success, false);
});

test('Requirement 3 & 6: Learning progress and watch time are accurately enriched from real DB records', async () => {
    const instructor = await User.create({
        fullName: 'Prof Smith',
        accountEmail: 'smith@example.com',
        securedPassword: 'Password123!',
        assignedRole: 'Instructor'
    });

    const student = await User.create({
        fullName: 'Bob Learner',
        accountEmail: 'bob@example.com',
        securedPassword: 'Password123!',
        assignedRole: 'Student'
    });

    const course = await Course.create({
        courseTitle: 'Database Systems Architecture',
        descriptionText: 'Deep dive into database engines, transactions, concurrency, and indexing.',
        technicalCategory: 'Databases',
        creatorRef: instructor._id,
        price: 0,
        estimatedDurationHours: 15
    });

    const enrollment = await Enrollment.create({
        studentRef: student._id,
        courseRef: course._id,
        paymentStatus: 'Cleared',
        tuitionClearanceFlag: true,
        completionPercentage: 10
    });

    const lessonId = new mongoose.Types.ObjectId();
    await LearningProgress.create({
        studentRef: student._id,
        courseRef: course._id,
        completionPercentage: 80,
        progressItems: [
            {
                lessonId,
                watchedSeconds: 3600,
                completed: true
            }
        ]
    });

    const req = {
        user: { id: instructor._id.toString(), assignedRole: 'Instructor' },
        query: { courseId: course._id.toString() }
    };
    const res = mockResponse();
    await getAllEnrollments(req, res);

    assert.strictEqual(res.statusCode, 200);
    const enriched = res.jsonData.data[0];
    assert.strictEqual(enriched.completionPercentage, 80);
    assert.strictEqual(enriched.totalWatchMinutes, 60);
    assert(enriched.lastActivityAt);
});

test('Requirement 6 & 7: getInstructorCourses returns accurate totalEnrollments via count', async () => {
    const instructor = await User.create({
        fullName: 'Elena Rostova',
        accountEmail: 'elena@example.com',
        securedPassword: 'Password123!',
        assignedRole: 'Instructor'
    });

    const student1 = await User.create({ fullName: 'S1', accountEmail: 's1@example.com', securedPassword: 'Password123!', assignedRole: 'Student' });
    const student2 = await User.create({ fullName: 'S2', accountEmail: 's2@example.com', securedPassword: 'Password123!', assignedRole: 'Student' });

    const course = await Course.create({
        courseTitle: 'Cloud Architecture & DevOps',
        descriptionText: 'Designing resilient, distributed systems in modern cloud environments.',
        technicalCategory: 'DevOps & CI/CD',
        creatorRef: instructor._id,
        price: 50,
        estimatedDurationHours: 25,
        totalEnrollments: 0 // Old stale value in Course document
    });

    await Enrollment.create({ studentRef: student1._id, courseRef: course._id });
    await Enrollment.create({ studentRef: student2._id, courseRef: course._id });

    const req = { user: { id: instructor._id.toString(), assignedRole: 'Instructor' } };
    const res = mockResponse();
    await getInstructorCourses(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.jsonData.count, 1);
    assert.strictEqual(res.jsonData.data[0].totalEnrollments, 2, 'Should reflect the 2 real enrollments');
});

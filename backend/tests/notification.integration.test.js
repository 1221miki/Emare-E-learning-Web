const assert = require('assert');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { test, before, after, beforeEach } = require('node:test');

const Notification = require('../models/Notification');
const User = require('../models/User');
const {
    getMyNotifications,
    deleteNotification,
    deleteAllNotifications,
    deleteReadNotifications,
    deleteNotifications,
    createNotification,
    broadcastEventNotification
} = require('../controllers/notificationController');

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
    await mongoose.connect(uri, { dbName: 'test_notifications' });
});

after(async () => {
    await mongoose.disconnect();
    if (mongod) await mongod.stop();
});

beforeEach(async () => {
    await Notification.deleteMany({});
    await User.deleteMany({});
});

test('Requirement 1 & 8: Single notification deletion for authenticated user', async () => {
    const userA = new mongoose.Types.ObjectId();
    const notif = await Notification.create({
        recipientRef: userA,
        type: 'assignment',
        title: 'Assignment Due',
        message: 'Your assignment is due tomorrow.'
    });

    const req = { params: { id: notif._id.toString() }, user: { id: userA.toString() } };
    const res = mockResponse();

    await deleteNotification(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.jsonData.success, true);
    assert.strictEqual(res.jsonData.message, 'Notification deleted');

    const found = await Notification.findById(notif._id);
    assert.strictEqual(found, null);
});

test('Requirement 8 & 9: Authorization check - User cannot delete another user\'s notification', async () => {
    const userA = new mongoose.Types.ObjectId();
    const userB = new mongoose.Types.ObjectId();

    const notifA = await Notification.create({
        recipientRef: userA,
        type: 'grade',
        title: 'Quiz Graded',
        message: 'You scored 95%'
    });

    // User B attempts to delete User A's notification
    const req = { params: { id: notifA._id.toString() }, user: { id: userB.toString() } };
    const res = mockResponse();

    await deleteNotification(req, res);

    assert.strictEqual(res.statusCode, 404);
    assert.strictEqual(res.jsonData.success, false);
    assert.match(res.jsonData.message, /not found or unauthorized/i);

    // Ensure User A's notification is still in the database
    const notifStillExists = await Notification.findById(notifA._id);
    assert.notStrictEqual(notifStillExists, null);
    assert.strictEqual(notifStillExists.title, 'Quiz Graded');
});

test('Requirement 2 & 8: Bulk deletion - Clear all notifications for authenticated user', async () => {
    const userA = new mongoose.Types.ObjectId();
    const userB = new mongoose.Types.ObjectId();

    // Create 3 notifications for User A and 2 for User B
    await Notification.create([
        { recipientRef: userA, type: 'assignment', title: 'Task 1', message: 'M1' },
        { recipientRef: userA, type: 'assignment', title: 'Task 2', message: 'M2' },
        { recipientRef: userA, type: 'announcement', title: 'Task 3', message: 'M3' },
        { recipientRef: userB, type: 'system', title: 'UserB Alert', message: 'Keep me' },
        { recipientRef: userB, type: 'grade', title: 'UserB Grade', message: 'Keep me too' }
    ]);

    const req = { user: { id: userA.toString() } };
    const res = mockResponse();

    await deleteAllNotifications(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.jsonData.success, true);
    assert.strictEqual(res.jsonData.deletedCount, 3);

    // Verify User A has 0 notifications
    const userANotifs = await Notification.find({ recipientRef: userA });
    assert.strictEqual(userANotifs.length, 0);

    // Verify User B's notifications remain untouched
    const userBNotifs = await Notification.find({ recipientRef: userB });
    assert.strictEqual(userBNotifs.length, 2);
});

test('Requirement 3: Bulk deletion - Clear read notifications only', async () => {
    const userA = new mongoose.Types.ObjectId();

    await Notification.create([
        { recipientRef: userA, type: 'assignment', title: 'Read 1', message: 'M1', isRead: true },
        { recipientRef: userA, type: 'assignment', title: 'Read 2', message: 'M2', isRead: true },
        { recipientRef: userA, type: 'assignment', title: 'Unread 1', message: 'M3', isRead: false },
        { recipientRef: userA, type: 'quiz', title: 'Unread 2', message: 'M4', isRead: false }
    ]);

    const req = { user: { id: userA.toString() } };
    const res = mockResponse();

    await deleteReadNotifications(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.jsonData.success, true);
    assert.strictEqual(res.jsonData.deletedCount, 2);

    const remaining = await Notification.find({ recipientRef: userA });
    assert.strictEqual(remaining.length, 2);
    assert.strictEqual(remaining.every(n => n.isRead === false), true);
});

test('Requirement 7: Refresh persistence - Deleted notifications do not return on reload', async () => {
    const userA = new mongoose.Types.ObjectId();

    const n1 = await Notification.create({ recipientRef: userA, type: 'quiz', title: 'Quiz 1', message: 'Q1' });
    const n2 = await Notification.create({ recipientRef: userA, type: 'quiz', title: 'Quiz 2', message: 'Q2' });

    // Initial fetch (like first page load)
    let getReq = { user: { id: userA.toString() } };
    let getRes = mockResponse();
    await getMyNotifications(getReq, getRes);
    assert.strictEqual(getRes.jsonData.data.length, 2);

    // User deletes n1
    const delReq = { params: { id: n1._id.toString() }, user: { id: userA.toString() } };
    const delRes = mockResponse();
    await deleteNotification(delReq, delRes);
    assert.strictEqual(delRes.statusCode, 200);

    // Subsequent fetch (like user refreshing the page)
    getRes = mockResponse();
    await getMyNotifications(getReq, getRes);
    assert.strictEqual(getRes.jsonData.data.length, 1);
    assert.strictEqual(getRes.jsonData.data[0]._id.toString(), n2._id.toString());
});

test('Requirement 6: Duplicate notification prevention in createNotification', async () => {
    const userA = new mongoose.Types.ObjectId();
    const eventId = new mongoose.Types.ObjectId();

    // First creation
    const created1 = await createNotification({
        recipientRef: userA,
        type: 'event',
        title: 'Workshop: React 19',
        message: 'Join us live!',
        metadata: { eventId: eventId.toString() }
    });
    assert.notStrictEqual(created1, null);

    // Second creation attempt with same recipient, type, title, and eventId
    const created2 = await createNotification({
        recipientRef: userA,
        type: 'event',
        title: 'Workshop: React 19',
        message: 'Join us live!',
        metadata: { eventId: eventId.toString() }
    });

    assert.notStrictEqual(created2, null);
    assert.strictEqual(created1._id.toString(), created2._id.toString());

    // Verify only 1 document exists in DB
    const count = await Notification.countDocuments({ recipientRef: userA });
    assert.strictEqual(count, 1);
});

test('Requirement 6 & 10: Event broadcast deduplication', async () => {
    const user1 = await User.create({
        fullName: 'Student One',
        accountEmail: 's1@example.com',
        securedPassword: 'password1234',
        isActive: true
    });
    const user2 = await User.create({
        fullName: 'Student Two',
        accountEmail: 's2@example.com',
        securedPassword: 'password1234',
        isActive: true
    });

    const eventId = new mongoose.Types.ObjectId();

    // First broadcast
    await broadcastEventNotification({
        title: 'Tech Summit 2026',
        message: 'Annual conference',
        link: '/events/' + eventId,
        type: 'event',
        eventId: eventId.toString()
    });

    let notifs = await Notification.find({ type: 'event' });
    assert.strictEqual(notifs.length, 2);

    // Second broadcast (same event/title)
    await broadcastEventNotification({
        title: 'Tech Summit 2026',
        message: 'Annual conference',
        link: '/events/' + eventId,
        type: 'event',
        eventId: eventId.toString()
    });

    // Should still only have 2 notifications, no duplicates added
    notifs = await Notification.find({ type: 'event' });
    assert.strictEqual(notifs.length, 2);
});

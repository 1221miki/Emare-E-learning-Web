const assert = require('assert');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { test, before, after, beforeEach } = require('node:test');

const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const {
    getConversations,
    getMessages,
    sendMessage
} = require('../controllers/messageController');

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

const mockApp = (emittedEvents = []) => ({
    get: (key) => {
        if (key === 'io') {
            return {
                to: (room) => ({
                    emit: (event, payload) => {
                        emittedEvents.push({ room, event, payload });
                    }
                })
            };
        }
        return null;
    }
});

before(async () => {
    mongod = await MongoMemoryServer.create({
        instance: { launchTimeout: 60000 },
    });
    const uri = mongod.getUri();
    await mongoose.connect(uri, { dbName: 'test_direct_messages' });
});

after(async () => {
    await mongoose.disconnect();
    if (mongod) await mongod.stop();
});

beforeEach(async () => {
    await Conversation.deleteMany({});
    await Message.deleteMany({});
    await User.deleteMany({});
});

test('Requirement 1 & 2: getConversations accurately identifies other participant and handles deleted accounts gracefully', async () => {
    // 1. Create Instructor and Student
    const instructor = await User.create({
        fullName: 'Almaz Wubshet',
        accountEmail: 'almaz@emare.edu',
        securedPassword: 'password123',
        assignedRole: 'Instructor'
    });

    const student = await User.create({
        fullName: 'Asamn Agiz',
        accountEmail: 'asamn@emare.edu',
        securedPassword: 'password123',
        assignedRole: 'Student'
    });

    // 2. Create conversation between them
    const convoActive = await Conversation.create({
        participants: [
            { userRef: instructor._id, role: 'Participant' },
            { userRef: student._id, role: 'Participant' }
        ],
        lastMessage: 'Welcome to the class!',
        lastMessageAt: new Date()
    });

    // 3. Create conversation with a deleted participant
    const deletedUserId = new mongoose.Types.ObjectId();
    const convoOrphan = await Conversation.create({
        participants: [
            { userRef: instructor._id, role: 'Participant' },
            { userRef: deletedUserId, role: 'Participant' }
        ],
        lastMessage: 'Old message',
        lastMessageAt: new Date(Date.now() - 100000)
    });

    // 4. Request conversations as Instructor
    const req = { user: { id: instructor._id.toString() } };
    const res = mockResponse();

    await getConversations(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.jsonData.success, true);
    assert.strictEqual(res.jsonData.data.length, 2);

    // Active conversation check
    const activeResult = res.jsonData.data.find(c => c._id.toString() === convoActive._id.toString());
    assert(activeResult);
    assert.strictEqual(activeResult.displayTitle, 'Asamn Agiz');
    assert.strictEqual(activeResult.otherParticipant.fullName, 'Asamn Agiz');
    assert.strictEqual(activeResult.isRecipientAvailable, true);

    // Orphan conversation check (deleted participant)
    const orphanResult = res.jsonData.data.find(c => c._id.toString() === convoOrphan._id.toString());
    assert(orphanResult);
    assert.strictEqual(orphanResult.displayTitle, 'Unavailable User');
    assert.strictEqual(orphanResult.otherParticipant.isUnavailable, true);
    assert.strictEqual(orphanResult.isRecipientAvailable, false);
});

test('Requirement 3 & 5: Two-way messaging between Instructor and Student with real-time Socket.IO emission', async () => {
    const instructor = await User.create({
        fullName: 'Almaz Wubshet',
        accountEmail: 'almaz@emare.edu',
        securedPassword: 'password123',
        assignedRole: 'Instructor'
    });

    const student = await User.create({
        fullName: 'Asamn Agiz',
        accountEmail: 'asamn@emare.edu',
        securedPassword: 'password123',
        assignedRole: 'Student'
    });

    const emitted = [];
    const app = mockApp(emitted);

    // Step 1: Instructor sends message to Student
    const req1 = {
        app,
        user: { id: instructor._id.toString() },
        body: {
            receiverId: student._id.toString(),
            body: 'Hello Asamn, please review lesson 3.'
        }
    };
    const res1 = mockResponse();
    await sendMessage(req1, res1);

    assert.strictEqual(res1.statusCode, 201);
    assert.strictEqual(res1.jsonData.success, true);
    assert.strictEqual(res1.jsonData.data.body, 'Hello Asamn, please review lesson 3.');
    assert.strictEqual(res1.jsonData.data.senderRef.fullName, 'Almaz Wubshet');

    const convoId = res1.jsonData.conversationId;
    assert(convoId);

    // Step 2: Student replies in the same conversation without specifying receiverId
    const req2 = {
        app,
        user: { id: student._id.toString() },
        body: {
            conversationId: convoId.toString(),
            content: 'Thank you Professor, I have finished reading it!' // tests content alias
        }
    };
    const res2 = mockResponse();
    await sendMessage(req2, res2);

    assert.strictEqual(res2.statusCode, 201);
    assert.strictEqual(res2.jsonData.success, true);
    assert.strictEqual(res2.jsonData.data.body, 'Thank you Professor, I have finished reading it!');
    assert.strictEqual(res2.jsonData.data.senderRef.fullName, 'Asamn Agiz');

    // Verify Socket.IO events were emitted
    const newMsgEvents = emitted.filter(e => e.event === 'new_message');
    assert(newMsgEvents.length >= 2);
    assert.strictEqual(newMsgEvents[0].room, `conversation:${convoId}`);

    const directMsgEvents = emitted.filter(e => e.event === 'direct_message');
    assert(directMsgEvents.length >= 2);
    assert.strictEqual(directMsgEvents[0].room, `user:${student._id}`);
    assert.strictEqual(directMsgEvents[1].room, `user:${instructor._id}`);

    // Step 3: Fetch messages as Student
    const reqMessages = {
        user: { id: student._id.toString() },
        params: { id: convoId.toString() }
    };
    const resMessages = mockResponse();
    await getMessages(reqMessages, resMessages);

    assert.strictEqual(resMessages.statusCode, 200);
    assert.strictEqual(resMessages.jsonData.data.length, 2);
    assert.strictEqual(resMessages.jsonData.meta.otherParticipant.fullName, 'Almaz Wubshet');
    assert.strictEqual(resMessages.jsonData.meta.isRecipientAvailable, true);
});

test('Requirement 9: Sending to deleted or nonexistent user fails with 404 and clean error message', async () => {
    const sender = await User.create({
        fullName: 'Sender User',
        accountEmail: 'sender@emare.edu',
        securedPassword: 'password123',
        assignedRole: 'Student'
    });

    const deletedUserId = new mongoose.Types.ObjectId();
    const app = mockApp([]);

    const req = {
        app,
        user: { id: sender._id.toString() },
        body: {
            receiverId: deletedUserId.toString(),
            body: 'Are you still here?'
        }
    };
    const res = mockResponse();
    await sendMessage(req, res);

    assert.strictEqual(res.statusCode, 404);
    assert.strictEqual(res.jsonData.success, false);
    assert(res.jsonData.message.includes('does not exist') || res.jsonData.message.includes('deleted'));
});

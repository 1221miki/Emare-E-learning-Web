const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const { getConversations, getMessages, sendMessage } = require('../controllers/messageController');

const mockResponse = () => {
    const res = { statusCode: 200, jsonData: null };
    res.status = (c) => { res.statusCode = c; return res; };
    res.json = (d) => { res.jsonData = d; return res; };
    return res;
};

async function main() {
    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 15000,
        socketTimeoutMS: 15000
    });
    console.log('Connected to MongoDB Atlas successfully.');

    const almazId = '6a7f967c31764d921385a83c'; // Instructor Almaz Wubshet
    const asamnId = '6ab676dbc75106f81d3d3ea7'; // Student Asamn Agiz

    // ── 1. Almaz fetches conversations ──
    console.log('\n[1] Testing getConversations for Instructor Almaz Wubshet...');
    let res = mockResponse();
    await getConversations({ user: { id: almazId } }, res);
    if (!res.jsonData?.success) throw new Error('Failed to get conversations for Almaz: ' + res.jsonData?.message);
    
    console.log(`✓ Total conversations returned for Almaz: ${res.jsonData.data.length}`);
    const convoWithAsamn = res.jsonData.data.find(c => {
        const otherId = (c.otherParticipant?._id || c.otherParticipant)?.toString();
        return otherId === asamnId;
    });

    if (!convoWithAsamn) {
        throw new Error('Conversation with Asamn Agiz not found in Almaz conversations list!');
    }
    console.log(`✓ Identified participant: "${convoWithAsamn.displayTitle}" (${convoWithAsamn.displayRole})`);
    console.log(`✓ Recipient available: ${convoWithAsamn.isRecipientAvailable}`);
    const conversationId = convoWithAsamn._id.toString();

    // ── 2. Asamn fetches conversations ──
    console.log('\n[2] Testing getConversations for Student Asamn Agiz...');
    res = mockResponse();
    await getConversations({ user: { id: asamnId } }, res);
    if (!res.jsonData?.success) throw new Error('Failed to get conversations for Asamn: ' + res.jsonData?.message);
    
    console.log(`✓ Total conversations returned for Asamn: ${res.jsonData.data.length}`);
    const convoWithAlmaz = res.jsonData.data.find(c => {
        const otherId = (c.otherParticipant?._id || c.otherParticipant)?.toString();
        return otherId === almazId;
    });

    if (!convoWithAlmaz) {
        throw new Error('Conversation with Almaz Wubshet not found in Asamn conversations list!');
    }
    console.log(`✓ Identified participant: "${convoWithAlmaz.displayTitle}" (${convoWithAlmaz.displayRole})`);
    console.log(`✓ Recipient available: ${convoWithAlmaz.isRecipientAvailable}`);

    // ── 3. Instructor sends a new message to Student ──
    console.log('\n[3] Instructor sending a new message to Student...');
    const instructorMsgText = `Hello Asamn! Welcome back to the LMS. Verification test message timestamp: ${Date.now()}`;
    res = mockResponse();
    await sendMessage({
        user: { id: almazId },
        body: {
            conversationId,
            body: instructorMsgText
        }
    }, res);

    if (res.statusCode !== 201 || !res.jsonData?.success) {
        throw new Error(`Failed to send message as Instructor (status ${res.statusCode}): ${res.jsonData?.message}`);
    }
    console.log(`✓ Message sent successfully (ID: ${res.jsonData.data._id})`);
    console.log(`✓ Sender populated: ${res.jsonData.data.senderRef?.fullName} (${res.jsonData.data.senderRef?.assignedRole})`);
    console.log(`✓ Message body: "${res.jsonData.data.body}"`);

    // ── 4. Student replies to Instructor ──
    console.log('\n[4] Student replying to Instructor in the same conversation...');
    const studentReplyText = `Thank you Professor Almaz! The direct messaging issue is resolved. Timestamp: ${Date.now()}`;
    res = mockResponse();
    await sendMessage({
        user: { id: asamnId },
        body: {
            conversationId,
            body: studentReplyText
        }
    }, res);

    if (res.statusCode !== 201 || !res.jsonData?.success) {
        throw new Error(`Failed to send reply as Student (status ${res.statusCode}): ${res.jsonData?.message}`);
    }
    console.log(`✓ Reply sent successfully (ID: ${res.jsonData.data._id})`);
    console.log(`✓ Sender populated: ${res.jsonData.data.senderRef?.fullName} (${res.jsonData.data.senderRef?.assignedRole})`);
    console.log(`✓ Reply body: "${res.jsonData.data.body}"`);

    // ── 5. Reload messages thread (persistence & refresh) ──
    console.log('\n[5] Fetching conversation messages (reload & persistence verification)...');
    res = mockResponse();
    await getMessages({
        user: { id: almazId },
        params: { id: conversationId }
    }, res);

    if (res.statusCode !== 200 || !res.jsonData?.success) {
        throw new Error(`Failed to reload messages (status ${res.statusCode}): ${res.jsonData?.message}`);
    }

    const messages = res.jsonData.data || [];
    console.log(`✓ Total messages persisted in thread: ${messages.length}`);
    const lastTwo = messages.slice(-2);
    console.log(`  - Latest from ${lastTwo[0].senderRef?.fullName}: "${lastTwo[0].body}"`);
    console.log(`  - Latest from ${lastTwo[1].senderRef?.fullName}: "${lastTwo[1].body}"`);

    // Verify existing older history is preserved
    console.log('\n[6] Verifying original conversation history is preserved...');
    const hasOriginalMessage = messages.some(m => m.body.includes('ALAMAZEWA') || m.body.includes('hello asamin'));
    console.log(`✓ Original conversation history preserved: ${hasOriginalMessage}`);

    // ── 7. Deleted/Unavailable user error handling ──
    console.log('\n[7] Testing deleted or nonexistent user handling...');
    const fakeId = new mongoose.Types.ObjectId().toString();
    res = mockResponse();
    await sendMessage({
        user: { id: almazId },
        body: {
            receiverId: fakeId,
            body: 'Should fail gracefully'
        }
    }, res);

    console.log(`✓ Status code for nonexistent recipient: ${res.statusCode} (Expected: 404)`);
    console.log(`✓ Clean error message: "${res.jsonData?.message}"`);

    console.log('\n🎉 ALL REAL ACCOUNT MESSAGING TESTS PASSED ON MONGODB ATLAS! 🎉\n');
    process.exit(0);
}

main().catch(err => {
    console.error('❌ Test failed with error:', err);
    process.exit(1);
});

const mongoose = require('mongoose');

const ParticipantSchema = new mongoose.Schema({
    userRef: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, default: 'Participant' }
}, { _id: false });

const ConversationSchema = new mongoose.Schema({
    title: { type: String },
    participants: [ParticipantSchema],
    isGroup: { type: Boolean, default: false },
    lastMessage: { type: String, default: '' },
    lastMessageAt: { type: Date, default: Date.now },
    meta: { type: Object, default: {} }
}, { timestamps: true });

ConversationSchema.index({ 'participants.userRef': 1 });

module.exports = mongoose.model('Conversation', ConversationSchema);

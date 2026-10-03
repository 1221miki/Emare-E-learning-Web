const mongoose = require('mongoose');

const ReviewLikeSchema = new mongoose.Schema({
    reviewRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Review', required: true },
    userRef: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

ReviewLikeSchema.index({ reviewRef: 1, userRef: 1 }, { unique: true });

module.exports = mongoose.model('ReviewLike', ReviewLikeSchema);

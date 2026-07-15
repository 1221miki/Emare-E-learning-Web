const mongoose = require('mongoose');

const WishlistSchema = new mongoose.Schema({
    userRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    courseRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    }
}, {
    timestamps: { createdAt: 'addedAt' }
});

// A user can only wishlist a course once
WishlistSchema.index({ userRef: 1, courseRef: 1 }, { unique: true });

module.exports = mongoose.model('Wishlist', WishlistSchema);

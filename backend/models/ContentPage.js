const mongoose = require('mongoose');

const contentPageSchema = new mongoose.Schema({
    pageKey: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    title: {
        type: String,
        default: ''
    },
    content: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('ContentPage', contentPageSchema);

const mongoose = require('mongoose');

const calendarEventSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    category: {
        type: String,
        required: true,
        enum: ['academic', 'exam', 'assignment', 'holiday', 'training', 'event']
    },
    description: { type: String, default: '' },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    location: { type: String, default: '' },
    isAllDay: { type: Boolean, default: false },
    color: { type: String, default: '#2563eb' },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { timestamps: true });

calendarEventSchema.index({ startDate: 1, category: 1 });

module.exports = mongoose.model('CalendarEvent', calendarEventSchema);

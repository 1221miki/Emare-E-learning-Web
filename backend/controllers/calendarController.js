const CalendarEvent = require('../models/CalendarEvent');

exports.getCalendarEvents = async (req, res) => {
    try {
        const { category, from, to } = req.query;
        const query = {};

        if (category) query.category = category;
        if (from || to) {
            query.startDate = {};
            if (from) query.startDate.$gte = new Date(from);
            if (to) query.startDate.$lte = new Date(to);
        }

        const events = await CalendarEvent.find(query).populate('createdBy', 'fullName accountEmail').sort({ startDate: 1 });
        res.status(200).json({ success: true, count: events.length, data: events });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to load calendar events.' });
    }
};

exports.createCalendarEvent = async (req, res) => {
    try {
        const event = await CalendarEvent.create({
            ...req.body,
            createdBy: req.user?.id
        });
        res.status(201).json({ success: true, data: event });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to create calendar event.' });
    }
};

exports.updateCalendarEvent = async (req, res) => {
    try {
        const event = await CalendarEvent.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!event) return res.status(404).json({ success: false, message: 'Calendar event not found.' });
        res.status(200).json({ success: true, data: event });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to update calendar event.' });
    }
};

exports.deleteCalendarEvent = async (req, res) => {
    try {
        const event = await CalendarEvent.findByIdAndDelete(req.params.id);
        if (!event) return res.status(404).json({ success: false, message: 'Calendar event not found.' });
        res.status(200).json({ success: true, message: 'Calendar event deleted.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to delete calendar event.' });
    }
};

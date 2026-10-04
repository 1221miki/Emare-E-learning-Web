const ContentPage = require('../models/ContentPage');

const defaultContent = {
    home: {
        heroTitle: 'Learn with confidence',
        heroSubtitle: 'Build practical digital skills with expert-led courses.',
        stats: ['Expert-led training', 'Flexible learning', 'Career growth']
    },
    about: {
        headline: 'About Emare',
        body: 'We help learners and professionals grow through practical and modern education.'
    },
    faq: {
        items: [
            { question: 'How do I enroll?', answer: 'Create an account and choose a course to begin.' }
        ]
    },
    contact: {
        email: 'support@emareicthub.com',
        phone: '+251 900 000 000',
        address: 'Addis Ababa, Ethiopia'
    },
    privacy: {
        body: 'Your privacy is important to us. We protect personal information and use it only for learning services.'
    },
    terms: {
        body: 'By using our platform, you agree to follow the rules and policies outlined here.'
    },
    banners: {
        items: [
            { title: 'New courses added weekly', subtitle: 'Explore current programs and start learning today.' }
        ]
    },
    testimonials: {
        items: [
            { name: 'Amina', role: 'Student', quote: 'The experience was excellent and easy to follow.' }
        ]
    },
    news: {
        items: [
            { title: 'Platform update', body: 'New learning experiences and feature improvements are now live.' }
        ]
    },
    blogs: {
        items: [
            { title: 'Why online learning works', body: 'Flexible access and structured support make learning more effective.' }
        ]
    }
};

const ensurePage = async (pageKey) => {
    const existing = await ContentPage.findOne({ pageKey });
    if (existing) return existing;

    const seed = defaultContent[pageKey] || { body: '' };
    return ContentPage.create({ pageKey, title: pageKey, content: seed });
};

exports.getContentPage = async (req, res) => {
    try {
        const page = await ensurePage(req.params.pageKey || 'home');
        res.status(200).json({ success: true, data: page });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getAllContent = async (req, res) => {
    try {
        const pages = await ContentPage.find().sort('pageKey');
        res.status(200).json({ success: true, data: pages });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.updateContentPage = async (req, res) => {
    try {
        const pageKey = req.params.pageKey;
        const payload = req.body;
        const page = await ContentPage.findOneAndUpdate(
            { pageKey },
            { $set: { title: payload.title || pageKey, content: payload.content ?? payload, updatedBy: req.user.id } },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        res.status(200).json({ success: true, data: page });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

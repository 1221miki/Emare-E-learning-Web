const ContentPage = require('../models/ContentPage');

const defaultContent = {
    home: {
        heroTitle: 'Welcome to Emare ICT Hub',
        heroSubtitle: 'Master In-Demand Tech Skills, Build Your Future, and Become Job Ready.',
        heroBadge: '🎓 Trusted by 2,500+ learners across Ethiopia',
        stats: ['Expert-led training', 'Flexible learning', 'Career growth', 'Practical Projects'],
        isPublished: true
    },
    about: {
        headline: 'Digital Innovation and System Development Center',
        body: 'Emare ICT Hub is designed to become a leading platform for digital skills development, technology entrepreneurship, and innovation in Debre Birhan City. This center offers a comprehensive ecosystem for tech growth, providing accessible digital tools, training, mentorship, and collaboration opportunities to local tech professionals, startups, and businesses.',
        mission: 'Empowering young innovators, creating job opportunities through digital literacy, and delivering cutting-edge software solutions.',
        isPublished: true
    },
    faq: {
        items: [
            { id: 'faq_1', question: 'How do I enroll in a course?', answer: 'Create an account, browse our catalog, and click "Enroll Now".', isPublished: true },
            { id: 'faq_2', question: 'Are there free courses available?', answer: 'Yes! We offer several free courses across various categories.', isPublished: true },
            { id: 'faq_3', question: 'Do I receive a certificate?', answer: 'Absolutely. Upon successful completion, you receive a digital certificate.', isPublished: true },
            { id: 'faq_4', question: 'Can I stream course videos online?', answer: 'Yes, all enrolled courses offer high-quality online streaming with accompanying resources.', isPublished: true }
        ]
    },
    contact: {
        email: 'info@emareicthub.com',
        secondaryEmail: 'emareicthub@gmail.com',
        phone: '+251 914 362 720',
        secondaryPhone: '+251 905 050 698',
        address: 'Debre Berhan, Ethiopia',
        openingHours: '08:30 AM - 18:00 PM',
        isPublished: true
    },
    privacy: {
        lastUpdated: 'October 2023',
        body: `1. Information We Collect
We collect information you provide directly to us, such as when you create or modify your account, request on-demand services, contact customer support, or otherwise communicate with us.

2. How We Use Your Information
We may use the information we collect about you to: Provide, maintain, and improve our Services; Process transactions and send related information; Send you technical notices, updates, security alerts, and support and administrative messages.

3. Sharing of Information
We do not share your personal information with third parties except as described in this policy, such as with vendors, consultants, and other service providers who need access to such information to carry out work on our behalf.

4. Security
We take reasonable measures to help protect information about you from loss, theft, misuse and unauthorized access, disclosure, alteration and destruction.`,
        isPublished: true
    },
    terms: {
        lastUpdated: 'October 2023',
        body: `1. Acceptance of Terms
By accessing and using Emare ICT Hub, you accept and agree to be bound by the terms and provision of this agreement.

2. User Accounts
When you create an account with us, you must provide us information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our Service.

3. Course Enrollment and Access
When you enroll in a course, you get a license from us to view it via the Emare services and no other use. Don't try to transfer or resell courses in any way.

4. Content and Behavior Rules
You can only use Emare for lawful purposes. You're responsible for all the content that you post on our platform. You should keep the reviews, questions, posts, courses and other content you upload in line with our trust and safety guidelines.`,
        isPublished: true
    },
    banners: {
        items: [
            { id: 'banner_1', title: 'New courses added weekly', subtitle: 'Explore current programs and start learning today.', badge: 'UPDATE', link: '/courses', isPublished: true }
        ]
    },
    testimonials: {
        items: [
            { id: 'test_1', name: 'Amina Mohammed', role: 'Full Stack Student', quote: 'The courses and practical mentor support at Emare completely transformed my technical abilities. Highly recommended!', rating: 5, isPublished: true },
            { id: 'test_2', name: 'Dawit Abebe', role: 'Cloud Engineer Trainee', quote: 'Hands-on projects and industry-relevant syllabus helped me land my first junior developer role.', rating: 5, isPublished: true }
        ]
    },
    news: {
        items: [
            { id: 'news_1', title: 'Emare Platform 2.0 Live', body: 'New learning experiences, live sessions, interactive coding workspace, and performance tracking are now live.', tag: 'Platform Update', date: '2026-10-15', isPublished: true }
        ]
    },
    blogs: {
        items: [
            { id: 'blog_1', title: 'Why Online Tech Learning Works in Ethiopia', body: 'Flexible access to quality mentorship and structured project-based curriculums bridge the digital skills gap effectively.', author: 'Emare Team', tag: 'Education', readTime: '4 min read', date: '2026-10-10', isPublished: true }
        ]
    }
};

const ensurePage = async (pageKey) => {
    let existing = await ContentPage.findOne({ pageKey });
    if (existing) {
        if (!existing.content || (typeof existing.content === 'object' && Object.keys(existing.content).length === 0)) {
            existing.content = defaultContent[pageKey] || { body: '' };
            existing.markModified('content');
            await existing.save();
        }
        return existing;
    }

    const seed = defaultContent[pageKey] || { body: '' };
    return ContentPage.create({
        pageKey,
        title: pageKey.charAt(0).toUpperCase() + pageKey.slice(1) + ' Content',
        content: seed
    });
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
        const validKeys = ['home', 'about', 'faq', 'contact', 'privacy', 'terms', 'banners', 'testimonials', 'news', 'blogs'];
        await Promise.all(validKeys.map((k) => ensurePage(k)));
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
        const updateData = {
            title: payload.title || pageKey,
            content: payload.content !== undefined ? payload.content : payload,
            updatedBy: req.user?.id
        };

        const page = await ContentPage.findOneAndUpdate(
            { pageKey },
            { $set: updateData },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        res.status(200).json({ success: true, data: page });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Item-level CRUD: Add item to page content.items
exports.addItem = async (req, res) => {
    try {
        const pageKey = req.params.pageKey;
        const page = await ensurePage(pageKey);

        let content = page.content || {};
        if (typeof content !== 'object' || Array.isArray(content)) {
            content = { items: [] };
        } else if (!Array.isArray(content.items)) {
            content.items = [];
        }

        const newItem = {
            id: req.body.id || `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            ...req.body,
            isPublished: req.body.isPublished !== undefined ? Boolean(req.body.isPublished) : true,
            createdAt: new Date().toISOString()
        };

        content.items.push(newItem);
        page.content = content;
        page.updatedBy = req.user?.id;
        page.markModified('content');
        await page.save();

        res.status(201).json({ success: true, data: page, item: newItem });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Item-level CRUD: Update an item in page content.items
exports.updateItem = async (req, res) => {
    try {
        const { pageKey, itemId } = req.params;
        const page = await ensurePage(pageKey);

        let content = page.content || {};
        if (!Array.isArray(content.items)) {
            return res.status(404).json({ success: false, message: 'No items array found for this page' });
        }

        const index = content.items.findIndex((i) => i.id === itemId || i._id?.toString() === itemId);
        if (index === -1) {
            return res.status(404).json({ success: false, message: 'Item not found' });
        }

        content.items[index] = {
            ...content.items[index],
            ...req.body,
            id: content.items[index].id || itemId,
            updatedAt: new Date().toISOString()
        };

        page.content = content;
        page.updatedBy = req.user?.id;
        page.markModified('content');
        await page.save();

        res.status(200).json({ success: true, data: page, item: content.items[index] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Item-level CRUD: Delete an item from page content.items
exports.deleteItem = async (req, res) => {
    try {
        const { pageKey, itemId } = req.params;
        const page = await ensurePage(pageKey);

        let content = page.content || {};
        if (!Array.isArray(content.items)) {
            return res.status(404).json({ success: false, message: 'No items array found for this page' });
        }

        const initialLength = content.items.length;
        content.items = content.items.filter((i) => i.id !== itemId && i._id?.toString() !== itemId);

        if (content.items.length === initialLength) {
            return res.status(404).json({ success: false, message: 'Item not found' });
        }

        page.content = content;
        page.updatedBy = req.user?.id;
        page.markModified('content');
        await page.save();

        res.status(200).json({ success: true, data: page, message: 'Item deleted successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Item-level CRUD: Toggle publish status of an item
exports.togglePublishItem = async (req, res) => {
    try {
        const { pageKey, itemId } = req.params;
        const page = await ensurePage(pageKey);

        let content = page.content || {};
        if (!Array.isArray(content.items)) {
            return res.status(404).json({ success: false, message: 'No items array found for this page' });
        }

        const index = content.items.findIndex((i) => i.id === itemId || i._id?.toString() === itemId);
        if (index === -1) {
            return res.status(404).json({ success: false, message: 'Item not found' });
        }

        content.items[index].isPublished = !content.items[index].isPublished;

        page.content = content;
        page.updatedBy = req.user?.id;
        page.markModified('content');
        await page.save();

        res.status(200).json({
            success: true,
            data: page,
            item: content.items[index],
            isPublished: content.items[index].isPublished
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

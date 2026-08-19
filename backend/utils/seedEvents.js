const Event = require('../models/Event');
const User = require('../models/User');

const inDays = (offset, hour = 15) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    d.setHours(hour, 0, 0, 0);
    return d;
};

const SEED_EVENTS = [
    {
        slug: 'emare-digital-mastery',
        title: 'Emare Digital Mastery & Live Stream',
        tagline: 'Content, Money & The Emare Advantage',
        eventType: 'Hybrid',
        venue: 'Emare Live Hub',
        city: 'Addis Ababa, Ethiopia',
        streamUrl: 'https://emarehub.com/live',
        startDate: inDays(12),
        startTime: '15:00',
        endTime: '18:30',
        timeLabel: '15:00 – 18:30',
        price: 'FREE',
        currency: 'ETB',
        totalSlots: 120,
        image: '/images/education-hero.jpg',
        gallery: ['/images/hero-students.png', '/images/contact.jpg'],
        description: [
            'Join us for a power-packed live session where we break down how to turn your passion into a full-time income. We will walk you through content creation strategies that actually work, proven monetization models, and a first-ever exclusive walkthrough of the Emare platform tools built to help creators grow faster.',
            'Expect live demos, real case studies from top Ethiopian creators, Q&A time, and insider frameworks you can apply the very next day.'
        ],
        speaker: {
            name: 'Meron Alemu',
            role: 'Content Strategy Lead · Emare',
            avatar: '/images/hero-students.png',
            bio: 'Meron has helped 40+ creators launch monetized channels across Ethiopia.'
        },
        status: 'APPROVED',
        isFeatured: true
    },
    {
        slug: 'content-creation-bootcamp',
        title: 'Content Creation Bootcamp',
        tagline: 'From zero to a publishing system',
        eventType: 'Physical',
        venue: 'Emare Live Hub, Debre Birhan',
        city: 'Debre Birhan, Ethiopia',
        streamUrl: '',
        startDate: inDays(19, 10),
        startTime: '10:00',
        endTime: '16:00',
        timeLabel: '10:00 – 16:00',
        price: 'FREE',
        currency: 'ETB',
        totalSlots: 80,
        image: '/images/hero-students.png',
        gallery: [],
        description: [
            'A hands-on bootcamp that takes you from a blank page to a consistent publishing system.'
        ],
        speaker: {
            name: 'Biruk Tadesse',
            role: 'Video Production Lead · Emare',
            avatar: '/images/contact.jpg',
            bio: 'Biruk directs short-form video for local creators.'
        },
        status: 'APPROVED'
    },
    {
        slug: 'ai-tools-for-creators',
        title: 'AI Tools for Creators',
        tagline: 'Automate, edit and scale with AI',
        eventType: 'Online',
        venue: '',
        city: '',
        streamUrl: 'https://emarehub.com/live/ai-creators',
        startDate: inDays(25, 15),
        startTime: '15:00',
        endTime: '17:00',
        timeLabel: '15:00 – 17:00',
        price: 'FREE',
        currency: 'ETB',
        totalSlots: 200,
        image: '/images/contact.jpg',
        gallery: [],
        description: [
            'Hands-on walkthrough of the AI editing and automation tools that save creators hours every week.'
        ],
        speaker: {
            name: 'Sara Mekonnen',
            role: 'AI Workflow Specialist · Emare',
            avatar: '/images/perfectEmarelogo.jpg',
            bio: 'Sara automates content pipelines for Ethiopian brands.'
        },
        status: 'APPROVED'
    },
    {
        slug: 'freelancing-mastery',
        title: 'Freelancing Mastery',
        tagline: 'Earn in USD from anywhere',
        eventType: 'Hybrid',
        venue: 'Emare Live Hub, Hawassa',
        city: 'Hawassa, Ethiopia',
        streamUrl: 'https://emarehub.com/live/freelancing',
        startDate: inDays(32, 15),
        startTime: '15:00',
        endTime: '18:30',
        timeLabel: '15:00 – 18:30',
        price: 'FREE',
        currency: 'ETB',
        totalSlots: 90,
        image: '/images/perfectEmarelogo.jpg',
        gallery: [],
        description: [
            'A practical masterclass on building a remote freelancing career from Ethiopia.'
        ],
        speaker: {
            name: 'Dawit Haile',
            role: 'Freelance Mentor · Emare',
            avatar: '/images/perfectEmarelogo.jpg',
            bio: 'Dawit has earned consistently on international marketplaces for 6 years.'
        },
        status: 'APPROVED'
    },
    {
        slug: 'pricing-your-creative-work',
        title: 'Pricing Your Creative Work',
        tagline: 'Stop undercharging for your talent',
        eventType: 'Online',
        venue: '',
        city: '',
        streamUrl: 'https://emarehub.com/live/pricing',
        startDate: inDays(9, 18),
        startTime: '18:00',
        endTime: '20:00',
        timeLabel: '18:00 – 20:00',
        price: 'FREE',
        currency: 'ETB',
        totalSlots: 150,
        image: '/images/education-hero.jpg',
        gallery: [],
        description: [
            'Learn a repeatable framework for pricing design, video and content services in Ethiopia and beyond.'
        ],
        speaker: {
            name: 'Hana Girma',
            role: 'Brand Strategist · Emare',
            avatar: '/images/contact.jpg',
            bio: 'Hana helps freelancers package and price their services.'
        },
        status: 'PENDING_REVIEW'
    },
    {
        slug: 'digital-storytelling-workshop',
        title: 'Digital Storytelling Workshop',
        tagline: 'Stories that move audiences',
        eventType: 'Physical',
        venue: '',
        city: 'Addis Ababa, Ethiopia',
        streamUrl: '',
        startDate: inDays(4, 9),
        startTime: '09:00',
        endTime: '08:00',
        timeLabel: '09:00 – 08:00',
        price: 'FREE',
        currency: 'ETB',
        totalSlots: 0,
        image: '',
        gallery: [],
        description: [],
        speaker: { name: '', role: '', avatar: '', bio: '' },
        status: 'PENDING_REVIEW'
    },
    {
        slug: 'social-media-growth-lab',
        title: 'Social Media Growth Lab',
        tagline: 'Turn followers into clients',
        eventType: 'Hybrid',
        venue: 'Emare Live Hub',
        city: 'Bahir Dar, Ethiopia',
        streamUrl: 'https://emarehub.com/live/social-lab',
        startDate: inDays(6, 15),
        startTime: '15:00',
        endTime: '17:30',
        timeLabel: '15:00 – 17:30',
        price: 'FREE',
        currency: 'ETB',
        totalSlots: 60,
        image: '/images/hero-students.png',
        gallery: [],
        description: [
            'A practical lab session covering content cadence, hooks and audience growth.'
        ],
        speaker: {
            name: 'Yonas Alemu',
            role: 'Growth Consultant · Emare',
            avatar: '/images/contact.jpg',
            bio: 'Yonas has scaled 20+ Ethiopian brand pages.'
        },
        status: 'REJECTED',
        reviewNote: 'Cover image is missing and the capacity is set to zero. Please upload a high-resolution banner and set a seat limit before resubmitting.'
    },
    {
        slug: 'portfolio-building-clinic',
        title: 'Portfolio Building Clinic',
        tagline: 'Your best projects, beautifully presented',
        eventType: 'Online',
        venue: '',
        city: '',
        streamUrl: 'https://emarehub.com/live/portfolio',
        startDate: inDays(40, 15),
        startTime: '15:00',
        endTime: '16:30',
        timeLabel: '15:00 – 16:30',
        price: 'FREE',
        currency: 'ETB',
        totalSlots: 120,
        image: '/images/contact.jpg',
        gallery: [],
        description: [
            'Drafting and polishing a professional portfolio for creative and tech roles.'
        ],
        speaker: {
            name: 'Selam Tesfaye',
            role: 'Career Coach · Emare',
            avatar: '/images/hero-students.png',
            bio: 'Selam mentors early-career creatives in Addis Ababa.'
        },
        status: 'DRAFT'
    }
];

/**
 * Idempotent seed — upserts by slug so it is safe to run on every boot.
 * Attaches the first active Instructor (falling back to an Admin) as submittedBy.
 */
const seedEvents = async () => {
    const instructor =
        (await User.findOne({ assignedRole: 'Instructor', isActive: true }).select('_id').lean()) ||
        (await User.findOne({ assignedRole: 'Admin', isActive: true }).select('_id').lean());

    let inserted = 0;
    for (const seed of SEED_EVENTS) {
        const existing = await Event.findOne({ slug: seed.slug }).select('_id');
        const submittedBy = seed.submittedBy || instructor?._id;
        // eslint-disable-next-line no-await-in-loop
        await Event.updateOne(
            { slug: seed.slug },
            { $setOnInsert: { ...seed, submittedBy } },
            { upsert: true }
        );
        if (!existing) inserted += 1;
    }
    if (inserted > 0) {
        console.log(`🌱 Event seed: inserted ${inserted} event(s) into the moderation pipeline.`);
    }
};

module.exports = seedEvents;

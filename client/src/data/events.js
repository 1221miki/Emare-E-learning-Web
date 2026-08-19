const pad = (n) => String(n).padStart(2, '0');

const inDays = (offset, hour = 15) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    d.setHours(hour, 0, 0, 0);
    return d;
};

export const events = [
    {
        id: 'emare-digital-mastery',
        title: 'Emare Digital Mastery & Live Stream',
        tagline: 'Content, Money & The Emare Advantage',
        featured: true,
        date: inDays(12),
        time: '15:00 – 18:30',
        location: 'Emare Live Hub / Online',
        city: 'Addis Ababa, Ethiopia',
        price: 'FREE',
        slotsLeft: 52,
        totalSlots: 120,
        image: '/images/education-hero.jpg',
        description: [
            'Join us for a power-packed live session where we break down how to turn your passion into a full-time income. We will walk you through content creation strategies that actually work, proven monetization models, and a first-ever exclusive walkthrough of the Emare platform tools built to help creators grow faster.',
            'Expect live demos, real case studies from top Ethiopian creators, Q&A time, and insider frameworks you can apply the very next day. Whether you are starting from zero or scaling an existing audience, this session is designed to move the needle.',
        ],
        speaker: {
            name: 'Meron Alemu',
            role: 'Content Strategy Lead · Emare',
            avatar: '/images/hero-students.png',
            bio: 'Meron has helped 40+ creators launch monetized channels across Ethiopia, specialising in growth strategy, audience building and platform monetisation.',
        },
    },
    {
        id: 'content-creation-bootcamp',
        title: 'Content Creation Bootcamp',
        tagline: 'From zero to a publishing system',
        date: inDays(19, 10),
        time: '10:00 – 16:00',
        location: 'Emare Live Hub, Debre Birhan',
        city: 'Debre Birhan, Ethiopia',
        price: 'FREE',
        slotsLeft: 31,
        totalSlots: 80,
        image: '/images/hero-students.png',
        description: [
            'A hands-on bootcamp that takes you from a blank page to a consistent publishing system. You will build a content calendar, shoot your first batch of videos and publish them to a real audience by the end of the day.',
            'Bring your phone or laptop — we provide the lighting, the scripts and the momentum. Limited to 80 seats so every participant gets personal feedback.',
        ],
        speaker: {
            name: 'Biruk Tadesse',
            role: 'Video Production Lead · Emare',
            avatar: '/images/contact.jpg',
            bio: 'Biruk directs short-form video for local creators and teaches practical, gear-light production techniques that anyone can apply.',
        },
    },
    {
        id: 'ai-tools-for-creators',
        title: 'AI Tools for Creators',
        tagline: 'Work 10x faster with AI',
        date: inDays(26, 15),
        time: '15:00 – 17:30',
        location: 'Online · Live Stream',
        city: 'Online',
        price: 'FREE',
        slotsLeft: 68,
        totalSlots: 150,
        image: '/images/education-hero.jpg',
        description: [
            'Discover the AI toolkit used by professional creators — scriptwriting assistants, automated editing pipelines, thumbnail generators and repurposing bots that turn one video into twenty posts.',
            'A fully online session with live walkthroughs and prompt templates you can copy and use immediately.',
        ],
        speaker: {
            name: 'Sara Hailu',
            role: 'AI Product Trainer · Emare',
            avatar: '/images/perfectEmarelogo.jpg',
            bio: 'Sara trains teams across East Africa on practical AI workflows and has built automated content pipelines for media houses.',
        },
    },
    {
        id: 'freelancing-mastery',
        title: 'Freelancing Mastery',
        tagline: 'Land your first international client',
        date: inDays(33, 10),
        time: '10:00 – 13:00',
        location: 'Emare Live Hub / Online',
        city: 'Addis Ababa, Ethiopia',
        price: 'FREE',
        slotsLeft: 45,
        totalSlots: 100,
        image: '/images/contact.jpg',
        description: [
            'A focused masterclass on moving from local gigs to international clients. Covering profiles that convert, pricing strategies, negotiation scripts and the platforms that pay Ethiopian freelancers reliably.',
            'Includes a live review of real freelancer profiles and a downloadable proposal template.',
        ],
        speaker: {
            name: 'Dawit Bekele',
            role: 'Freelance Mentor · Emare',
            avatar: '/images/perfectEmarelogo.jpg',
            bio: 'Dawit has earned consistently on international marketplaces for 6 years and now mentors new freelancers through Emare.',
        },
    },
];

export const eventGallery = [
    { src: '/images/hero-students.png', label: 'Live class session' },
    { src: '/images/education-hero.jpg', label: 'Onboarding workshop' },
    { src: '/images/contact.jpg', label: 'Community meetup' },
    { src: '/images/perfectEmarelogo.jpg', label: 'Awards ceremony' },
    { src: '/images/home.avif', label: 'Masterclass panel' },
];

export const getEventById = (id) => events.find((e) => e.id === id);

export const formatISODate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const formatLongDate = (d) =>
    d.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' });

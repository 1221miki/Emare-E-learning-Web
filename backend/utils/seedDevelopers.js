const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../.env'), override: true });

// One-time migration script: seeds the hardcoded "Emare Developers" data that
// previously lived in client/src/pages/DevelopersPage.jsx into MongoDB.
//
// Usage:
//   node utils/seedDevelopers.js          → inserts only missing developers
//   node utils/seedDevelopers.js --force  → wipes and re-seeds all developers
const Developer = require('../models/Developer');
const connectDB = require('../config/db');

const DEVELOPERS = [
    {
        name: 'Fawaz Bekele',
        title: 'Full Stack Developer',
        initials: 'FB',
        skills: ['Angular', '.NET', 'HTML/CSS', 'PHP', 'Bootstrap', 'MySQL', 'Node.js', 'GitHub'],
        summary: 'Experienced developer with a strong background in Angular and .NET, delivering robust enterprise solutions and maintaining collaborative code practices.',
        experiences: [
            { role: 'Software Developer', company: 'Ethiopian Commodity Exchange', duration: 'June 2023 - Feb 2024', description: 'Developed web apps with Angular and .NET. Optimized SQL queries for data management. Used GitHub for version control and documented features for future use.' },
            { role: 'Application Developer', company: 'Lion International Bank', duration: 'Apr 2024 - Present', description: 'Built full-stack apps with Angular, .NET and SQL Server. Integrated APIs, used Docker and Kubernetes for deployment, and collaborated on GitHub for code reviews.' }
        ]
    },
    {
        name: 'Solomon Legesse',
        title: 'Full Stack Developer',
        initials: 'SL',
        skills: ['Node.js', 'React', 'PHP/Laravel', 'Python/Flask', 'Springboot', 'Angular', 'GitHub'],
        summary: 'A versatile backend and frontend engineer focused on building scalable systems using modern JavaScript and Python frameworks.',
        experiences: [
            { role: 'ALX Software Engineering Program', company: 'ALX', duration: 'Feb 2022 - Jan 2023', description: 'Completed a 12-month intensive program in backend development with Python and Django. Built multiple projects, gained hands-on experience, and used Git for version control.' },
            { role: 'MERN Stack Training', company: 'Yeneta IT', duration: 'Mar 2024 - Aug 2024', description: 'Participated in a hands-on MERN Stack training program, working on real-world projects with MongoDB, Express.js, React, and Node.js.' },
            { role: 'Freelance Web Developer', company: 'Independent', duration: 'Sep 2024 - Present', description: 'Designed and deployed modern websites for clients using clean UI and efficient backend services. Delivered tailored solutions with a strong focus on functionality.' }
        ]
    },
    {
        name: 'Natawal Zeithu',
        title: 'Full Stack Developer / IT Professional',
        initials: 'NZ',
        skills: ['Node.js', 'React', 'PHP', 'Flutter', 'WordPress', 'SEO', 'MySQL', 'MongoDB', 'Cybersecurity', 'GitHub'],
        summary: 'A developer and IT professional with experience delivering secure web applications, managing infrastructure, and leading digital transformation initiatives.',
        experiences: [
            { role: 'IT Director', company: 'Allure Communication', duration: 'Dec 2022 - Present', description: 'Led IT strategy, optimized software and hardware infrastructure, and supported the development of applications like "Enat" and "Mistrir" for digital health and tracking.' },
            { role: 'Full Stack Developer', company: 'Primeco Technologies PLC', duration: 'Sep 2024 - Present', description: 'Developed EthioEinstein, a gaming marketplace platform. Built reusable deliverables with Node.js, React, and API integrations.' },
            { role: 'Full Stack Development Lecturer', company: 'Gobeze Training Center', duration: 'Aug 2023 - Present', description: 'Created course materials and delivered comprehensive instruction in full stack development to help students succeed in software careers.' },
            { role: 'Mobile Application Developer', company: 'Engida Travel and Technology', duration: 'Mar 2021 - May 2022', description: 'Enhanced user experiences through innovative app features and collaborative code review practices.' }
        ]
    },
    {
        name: 'Filiget Shewa',
        title: 'Full Stack Developer',
        initials: 'FS',
        skills: ['Go', 'Angular', 'Node.js', 'React', 'MySQL', 'MongoDB', 'Postgres', 'HTML/CSS', 'Java', 'Springboot', 'GitHub'],
        summary: 'Front-to-back software engineer experienced in building scalable web systems with modern backend frameworks, cloud infrastructure, and responsive UI design.',
        experiences: [
            { role: 'Application Developer Trainee', company: 'DAN Energy', duration: 'Dec 2022 - Jan 2023', description: 'Gained experience in application development, working with Node.js and Express. Built a knowledge-sharing environment and learned professional software delivery standards.' },
            { role: 'Full Stack Developer', company: 'Ethiopian Commodity Exchange (ECC)', duration: 'Jun 2023 - Feb 2024', description: 'Delivered web applications using .NET and Angular. Worked closely with cross-functional teams to build high-quality products and ensured cross-browser compatibility.' },
            { role: 'Full Stack Developer', company: 'Two Capital', duration: 'Feb 2024 - Present', description: 'Developed backend systems with Go and Node.js. Used containers and cloud deployments to improve application performance and reliability.' }
        ]
    },
    {
        name: 'Samuel B',
        title: 'Mobile & Web App Developer',
        initials: 'SB',
        skills: ['Node.js', 'React', 'Angular', 'Flutter', '.NET', 'Python', 'MySQL', 'MongoDB', 'Postgres'],
        summary: 'Application developer focused on building mobile and web experiences with modern cross-platform frameworks and backend services.',
        experiences: [
            { role: 'Full-Stack Developer', company: 'Taptopion.com', duration: 'Aug 2024 - Nov 2024', description: 'Developed new features for a system frontend and backend. Worked across React and Go backend components.' },
            { role: 'Software Developer and System Admin', company: 'Unity University', duration: 'Jul 2023 - Jun 2024', description: 'Maintained WordPress sites, managed asset servers, and supported technical operations for student platforms.' },
            { role: 'Software Developer', company: 'Center for Adolescent Girls Health', duration: 'Feb 2024 - Present', description: 'Designed and implemented user-friendly applications on WordPress and React, focused on quality control and UX testing.' },
            { role: 'Guideline For Midwives Flutter Application', company: 'Freelance', duration: 'Aug 2023 - Sept 2023', description: 'Built a Midwives Guide application using Flutter and React, focusing on usability and user-centered design.' }
        ]
    },
    {
        name: 'Robel Alemayehu',
        title: 'Full Stack Developer',
        initials: 'RA',
        skills: ['Android/Kotlin', 'Python/Django', 'JavaScript', 'PHP', 'HTML/CSS', 'Cloud (GCP, AWS)', 'SQL', 'Postgres', 'MongoDB', 'Linux Desktop App', 'GitHub'],
        summary: 'Developer specializing in full stack and cloud solutions with experience across mobile, web, and desktop platforms.',
        experiences: [
            { role: 'Health Management Web Application', company: 'Freelance', duration: 'May 2023 - Oct 2023', description: 'Developed a healthcare management system with React and .NET for clinic operations.' },
            { role: 'E-Commerce Web Application', company: 'Freelance', duration: 'Aug 2023 - Sept 2023', description: 'Built a customer-facing ecommerce application with React and .NET, implementing product flows and checkout logic.' },
            { role: 'Software Developer', company: 'Prime Technologies PLC', duration: 'Feb 2024 - Present', description: 'Connected users with tailored services through a modern marketplace platform using React, Node.js, and cloud services.' }
        ]
    }
];

const seedDevelopers = async () => {
    const force = process.argv.includes('--force');

    await connectDB();

    if (force) {
        const { deletedCount } = await Developer.deleteMany({});
        console.log(`🗑️  Force mode: removed ${deletedCount} existing developer(s).`);
    }

    let inserted = 0;
    for (const dev of DEVELOPERS) {
        const exists = await Developer.findOne({ name: dev.name });
        if (exists) {
            console.log(`⏭️  Skipped (already exists): ${dev.name}`);
            continue;
        }
        await Developer.create(dev);
        inserted++;
        console.log(`✅ Seeded: ${dev.name}`);
    }

    const total = await Developer.countDocuments();
    console.log(`\n🎉 Done. Inserted ${inserted} developer(s). Total developers in DB: ${total}`);

    await mongoose.connection.close();
};

seedDevelopers().catch(err => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
});

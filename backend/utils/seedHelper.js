const User = require('../models/User');
const Course = require('../models/Course');
const Category = require('../models/Category');

const categoryCoursesData = [
    {
        categoryName: 'Artificial Intelligence',
        categoryIcon: '🤖',
        categoryDescription: 'Machine Learning, Deep Learning, NLP, and Generative AI.',
        technicalCategory: 'Artificial Intelligence',
        courseTitle: 'Artificial Intelligence & Machine Learning Fundamentals',
        subtitle: 'Comprehensive intro to AI, Machine Learning, and Deep Learning',
        descriptionText: 'Master the core concepts of Artificial Intelligence, from foundational AI principles and machine learning algorithms to deep neural network basics. Hands-on video tutorials and reading notes included.',
        level: 'Beginner',
        estimatedDurationHours: 15,
        price: 150,
        publicationState: 'Published',
        chapters: [
            {
                chapterTitle: 'Module 1: AI Essentials & Deep Learning',
                lessons: [
                    {
                        lessonTitle: 'AI for Everyone',
                        videoUrl: 'https://www.youtube.com/watch?v=JMUxmLyrhSk',
                        notesPdfUrl: 'https://drive.google.com/file/d/1AI_Intro_Basics_Notes/view',
                        durationMinutes: 20,
                        isFreePreview: true
                    },
                    {
                        lessonTitle: 'Machine Learning Basics',
                        videoUrl: 'https://www.youtube.com/watch?v=i_LwzRVP7bg',
                        notesPdfUrl: 'https://drive.google.com/file/d/2ML_Fundamentals_Notes/view',
                        durationMinutes: 30,
                        isFreePreview: false
                    },
                    {
                        lessonTitle: 'Deep Learning Fundamentals',
                        videoUrl: 'https://www.youtube.com/watch?v=VyWAvY2CF9c',
                        notesPdfUrl: 'https://drive.google.com/file/d/3DeepLearning_Guide/view',
                        durationMinutes: 45,
                        isFreePreview: false
                    }
                ]
            }
        ]
    },
    {
        categoryName: 'Business & Management',
        categoryIcon: '📊',
        categoryDescription: 'Project management, organizational principles, and strategic business leadership.',
        technicalCategory: 'Business & Management',
        courseTitle: 'Business & Management Fundamentals',
        subtitle: 'Essential principles of project management, organizational behavior, and business strategy',
        descriptionText: 'Gain essential knowledge in business management. Learn project management methodologies, core management principles, and modern business strategy execution.',
        level: 'Beginner',
        estimatedDurationHours: 12,
        price: 120,
        publicationState: 'Published',
        chapters: [
            {
                chapterTitle: 'Module 1: Management & Business Strategy',
                lessons: [
                    {
                        lessonTitle: 'Project Management Fundamentals',
                        videoUrl: 'https://www.youtube.com/watch?v=d_HscB9X_mg',
                        notesPdfUrl: 'https://drive.google.com/file/d/1Project_Management_Basics/view',
                        durationMinutes: 20,
                        isFreePreview: true
                    },
                    {
                        lessonTitle: 'Principles of Management',
                        videoUrl: 'https://www.youtube.com/watch?v=13_fV-ZlPsc',
                        notesPdfUrl: 'https://drive.google.com/file/d/2Management_Principles/view',
                        durationMinutes: 30,
                        isFreePreview: false
                    },
                    {
                        lessonTitle: 'Business Strategy Basics',
                        videoUrl: 'https://www.youtube.com/watch?v=7u3S2_E4M5A',
                        notesPdfUrl: 'https://drive.google.com/file/d/3Business_Strategy_Guide/view',
                        durationMinutes: 35,
                        isFreePreview: false
                    }
                ]
            }
        ]
    },
    {
        categoryName: 'Cloud Computing',
        categoryIcon: '☁️',
        categoryDescription: 'Cloud platforms, AWS certification prep, and Azure cloud solutions.',
        technicalCategory: 'Cloud Computing',
        courseTitle: 'Cloud Computing & AWS Architecture',
        subtitle: 'Learn cloud computing fundamentals, AWS Practitioner topics, and Microsoft Azure',
        descriptionText: 'Understand cloud computing architecture and service models. Covers general cloud concepts, AWS Certified Cloud Practitioner prep, and Azure fundamentals.',
        level: 'Beginner',
        estimatedDurationHours: 18,
        price: 180,
        publicationState: 'Published',
        chapters: [
            {
                chapterTitle: 'Module 1: Cloud Architecture & Services',
                lessons: [
                    {
                        lessonTitle: 'Cloud Computing Basics',
                        videoUrl: 'https://www.youtube.com/watch?v=2LaAJq1lB4U',
                        notesPdfUrl: 'https://drive.google.com/file/d/1Cloud_Essentials_Notes/view',
                        durationMinutes: 25,
                        isFreePreview: true
                    },
                    {
                        lessonTitle: 'AWS Certified Cloud Practitioner',
                        videoUrl: 'https://www.youtube.com/watch?v=3hLmDS179YE',
                        notesPdfUrl: 'https://drive.google.com/file/d/2AWS_Practitioner_Guide/view',
                        durationMinutes: 60,
                        isFreePreview: false
                    },
                    {
                        lessonTitle: 'Introduction to Azure',
                        videoUrl: 'https://www.youtube.com/watch?v=NKEFWyqJxa4',
                        notesPdfUrl: 'https://drive.google.com/file/d/3Azure_Basics_Cheatsheet/view',
                        durationMinutes: 35,
                        isFreePreview: false
                    }
                ]
            }
        ]
    },
    {
        categoryName: 'Cybersecurity',
        categoryIcon: '🔒',
        categoryDescription: 'Ethical hacking, penetration testing, and network security fundamentals.',
        technicalCategory: 'Cybersecurity',
        courseTitle: 'Cybersecurity & Ethical Hacking Essentials',
        subtitle: 'Comprehensive introduction to cybersecurity, ethical hacking, and network defense',
        descriptionText: 'Protect networks and systems from digital threats. Covers cybersecurity basics, ethical hacking concepts, and network security protocols for beginners.',
        level: 'Beginner',
        estimatedDurationHours: 20,
        price: 160,
        publicationState: 'Published',
        chapters: [
            {
                chapterTitle: 'Module 1: Cybersecurity & Network Defense',
                lessons: [
                    {
                        lessonTitle: 'Cyber Security Course for Beginners',
                        videoUrl: 'https://www.youtube.com/watch?v=z5nc9MDbvkw',
                        notesPdfUrl: 'https://drive.google.com/file/d/1CyberSecurity_Intro/view',
                        durationMinutes: 30,
                        isFreePreview: true
                    },
                    {
                        lessonTitle: 'Ethical Hacking Full Course',
                        videoUrl: 'https://www.youtube.com/watch?v=3Kq1MIfTWCE',
                        notesPdfUrl: 'https://drive.google.com/file/d/2Ethical_Hacking_Notes/view',
                        durationMinutes: 90,
                        isFreePreview: false
                    },
                    {
                        lessonTitle: 'Network Security Basics',
                        videoUrl: 'https://www.youtube.com/watch?v=U_P23uqU4CA',
                        notesPdfUrl: 'https://drive.google.com/file/d/3Network_Security_Guide/view',
                        durationMinutes: 25,
                        isFreePreview: false
                    }
                ]
            }
        ]
    },
    {
        categoryName: 'Data Science',
        categoryIcon: '📈',
        categoryDescription: 'Data analysis, Python data science libraries, and Pandas data processing.',
        technicalCategory: 'Data Science',
        courseTitle: 'Data Science & Python Analytics',
        subtitle: 'Master data analysis with Python, Pandas, and data science methodologies',
        descriptionText: 'Learn to extract insights from raw data. Covers basic data science concepts, Python programming for analytics, and working with Pandas DataFrames.',
        level: 'Beginner',
        estimatedDurationHours: 16,
        price: 140,
        publicationState: 'Published',
        chapters: [
            {
                chapterTitle: 'Module 1: Data Analytics & Python',
                lessons: [
                    {
                        lessonTitle: 'Data Science for Beginners',
                        videoUrl: 'https://www.youtube.com/watch?v=-ETQ97mXXF0',
                        notesPdfUrl: 'https://drive.google.com/file/d/1DataScience_Fundamentals/view',
                        durationMinutes: 25,
                        isFreePreview: true
                    },
                    {
                        lessonTitle: 'Python for Data Science',
                        videoUrl: 'https://www.youtube.com/watch?v=LHBE6Q9XlzI',
                        notesPdfUrl: 'https://drive.google.com/file/d/2Python_For_DataScience/view',
                        durationMinutes: 45,
                        isFreePreview: false
                    },
                    {
                        lessonTitle: 'Data Analysis with Pandas & Python',
                        videoUrl: 'https://www.youtube.com/watch?v=r-uOLxNrNk8',
                        notesPdfUrl: 'https://drive.google.com/file/d/3Pandas_Cheatsheet/view',
                        durationMinutes: 50,
                        isFreePreview: false
                    }
                ]
            }
        ]
    },
    {
        categoryName: 'Databases',
        categoryIcon: '🗄️',
        categoryDescription: 'Database design, SQL querying, and NoSQL MongoDB management.',
        technicalCategory: 'Databases',
        courseTitle: 'SQL & MongoDB Complete Guide',
        subtitle: 'Complete database course covering SQL queries, MongoDB NoSQL, and database design',
        descriptionText: 'Master relational and non-relational database management. Learn schema design, complex SQL queries, and MongoDB CRUD operations.',
        level: 'Beginner',
        estimatedDurationHours: 18,
        price: 110,
        publicationState: 'Published',
        chapters: [
            {
                chapterTitle: 'Module 1: Relational SQL & MongoDB NoSQL',
                lessons: [
                    {
                        lessonTitle: 'Database Design Course',
                        videoUrl: 'https://www.youtube.com/watch?v=ztHopE5Wnpc',
                        notesPdfUrl: 'https://drive.google.com/file/d/1Database_Design_Notes/view',
                        durationMinutes: 30,
                        isFreePreview: true
                    },
                    {
                        lessonTitle: 'SQL Tutorial - Full Course',
                        videoUrl: 'https://www.youtube.com/watch?v=HXV3zeQKqGY',
                        notesPdfUrl: 'https://drive.google.com/file/d/2SQL_Commands_Cheatsheet/view',
                        durationMinutes: 60,
                        isFreePreview: false
                    },
                    {
                        lessonTitle: 'MongoDB Complete Tutorial',
                        videoUrl: 'https://www.youtube.com/watch?v=c2M-rlkkT5o',
                        notesPdfUrl: 'https://drive.google.com/file/d/3MongoDB_Guide/view',
                        durationMinutes: 40,
                        isFreePreview: false
                    }
                ]
            }
        ]
    },
    {
        categoryName: 'DevOps & CI/CD',
        categoryIcon: '🚀',
        categoryDescription: 'DevOps principles, Docker containers, and GitLab CI/CD automation.',
        technicalCategory: 'DevOps & CI/CD',
        courseTitle: 'DevOps, Docker & CI/CD Pipelines',
        subtitle: 'Master modern DevOps practices, Docker containerization, and GitLab CI/CD',
        descriptionText: 'Automate software delivery pipelines. Covers DevOps basics, container management with Docker, and CI/CD automation with GitLab.',
        level: 'Beginner',
        estimatedDurationHours: 15,
        price: 150,
        publicationState: 'Published',
        chapters: [
            {
                chapterTitle: 'Module 1: DevOps & Automation',
                lessons: [
                    {
                        lessonTitle: 'DevOps Beginners Course',
                        videoUrl: 'https://www.youtube.com/watch?v=hQcFE0RD0cQ',
                        notesPdfUrl: 'https://drive.google.com/file/d/1DevOps_Introduction/view',
                        durationMinutes: 30,
                        isFreePreview: true
                    },
                    {
                        lessonTitle: 'Docker Tutorial for Beginners',
                        videoUrl: 'https://www.youtube.com/watch?v=17482_K-GGE',
                        notesPdfUrl: 'https://drive.google.com/file/d/2Docker_Cheatsheet/view',
                        durationMinutes: 45,
                        isFreePreview: false
                    },
                    {
                        lessonTitle: 'Git Lab & CI/CD Pipeline Basics',
                        videoUrl: 'https://www.youtube.com/watch?v=6YZvp2GwT0A',
                        notesPdfUrl: 'https://drive.google.com/file/d/3CICD_Pipelines_Guide/view',
                        durationMinutes: 35,
                        isFreePreview: false
                    }
                ]
            }
        ]
    },
    {
        categoryName: 'Graphic Design',
        categoryIcon: '🎨',
        categoryDescription: 'Graphic design principles, UI/UX essentials, and Adobe Photoshop.',
        technicalCategory: 'Graphic Design',
        courseTitle: 'Graphic Design & UI/UX Essentials',
        subtitle: 'Learn graphic design fundamentals, UI/UX principles, and Photoshop',
        descriptionText: 'Unleash your visual creativity. Covers graphic design fundamentals, essential UI/UX workflow, and hands-on Adobe Photoshop photo editing.',
        level: 'Beginner',
        estimatedDurationHours: 14,
        price: 130,
        publicationState: 'Published',
        chapters: [
            {
                chapterTitle: 'Module 1: Visual Design & Prototyping',
                lessons: [
                    {
                        lessonTitle: 'Graphic Design Basics',
                        videoUrl: 'https://www.youtube.com/watch?v=dFSia1LZI4Y',
                        notesPdfUrl: 'https://drive.google.com/file/d/1GraphicDesign_Principles/view',
                        durationMinutes: 20,
                        isFreePreview: true
                    },
                    {
                        lessonTitle: 'UI/UX Design Essentials',
                        videoUrl: 'https://www.youtube.com/watch?v=Sn2434J64r8',
                        notesPdfUrl: 'https://drive.google.com/file/d/2UIUX_Design_Basics/view',
                        durationMinutes: 40,
                        isFreePreview: false
                    },
                    {
                        lessonTitle: 'Photoshop Tutorial for Beginners',
                        videoUrl: 'https://www.youtube.com/watch?v=3q3FV65ZrUs',
                        notesPdfUrl: 'https://drive.google.com/file/d/3Photoshop_Shortcuts/view',
                        durationMinutes: 50,
                        isFreePreview: false
                    }
                ]
            }
        ]
    }
];

const seedCategoryCoursesHelper = async () => {
    try {
        let instructor = await User.findOne({ assignedRole: 'Instructor' });
        if (!instructor) {
            instructor = await User.create({
                fullName: 'Demo Instructor',
                accountEmail: 'instructor@emare.com',
                securedPassword: 'instructor12345',
                assignedRole: 'Instructor',
                isActive: true
            });
        }

        for (const item of categoryCoursesData) {
            let category = await Category.findOne({ name: item.categoryName });
            if (!category) {
                category = await Category.create({
                    name: item.categoryName,
                    icon: item.categoryIcon,
                    description: item.categoryDescription
                });
            }

            let course = await Course.findOne({ courseTitle: item.courseTitle });

            const coursePayload = {
                courseTitle: item.courseTitle,
                subtitle: item.subtitle,
                descriptionText: item.descriptionText,
                technicalCategory: item.technicalCategory,
                level: item.level,
                estimatedDurationHours: item.estimatedDurationHours,
                price: item.price,
                publicationState: item.publicationState,
                creatorRef: instructor._id,
                assignedInstructorRef: instructor._id,
                curriculumTree: item.chapters.map(ch => ({
                    chapterTitle: ch.chapterTitle,
                    lessons: ch.lessons.map(l => ({
                        lessonTitle: l.lessonTitle,
                        videoUrl: l.videoUrl,
                        durationMinutes: l.durationMinutes,
                        isFreePreview: l.isFreePreview,
                        notesPdfUrl: l.notesPdfUrl,
                        resourceLink: l.notesPdfUrl
                    }))
                }))
            };

            if (course) {
                await Course.updateOne({ _id: course._id }, { $set: coursePayload });
            } else {
                await Course.create(coursePayload);
            }

            const count = await Course.countDocuments({ technicalCategory: item.technicalCategory });
            await Category.updateOne({ _id: category._id }, { $set: { courseCount: count } });
        }
        console.log('✅ All 8 Category courses seeded/updated in database with exact 24 PDF Drive links!');
    } catch (err) {
        console.warn(`⚠️ Error seeding category courses helper: ${err.message}`);
    }
};

module.exports = { seedCategoryCoursesHelper, categoryCoursesData };

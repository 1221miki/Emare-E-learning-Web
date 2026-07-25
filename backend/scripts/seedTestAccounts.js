require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

const testUsers = [
    {
        fullName: 'Test Admin',
        accountEmail: 'admin@emare.com',
        securedPassword: 'admin12345',
        assignedRole: 'Admin',
        isActive: true
    },
    {
        fullName: 'Test Student',
        accountEmail: 'student@emare.com',
        securedPassword: 'student12345',
        assignedRole: 'Student',
        isActive: true
    },
    {
        fullName: 'Test Instructor',
        accountEmail: 'instructor@emare.com',
        securedPassword: 'instructor12345',
        assignedRole: 'Instructor',
        isActive: true,
        professionalTitle: 'Test Instructor Title'
    },
    {
        fullName: 'Design Mentor',
        accountEmail: 'instructor2@emare.com',
        securedPassword: 'instructor22345',
        assignedRole: 'Instructor',
        isActive: true,
        professionalTitle: 'Creative Design Instructor'
    }
];

const seedUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/emare-elms');
        console.log('MongoDB connected.');

        for (const userData of testUsers) {
            let user = await User.findOne({ accountEmail: userData.accountEmail });
            if (user) {
                console.log(`User already exists: ${userData.accountEmail}. Updating password...`);
                user.securedPassword = userData.securedPassword;
                await user.save();
                console.log(`Updated password for ${userData.accountEmail}.`);
            } else {
                await User.create(userData);
                console.log(`Created user successfully: ${userData.accountEmail}`);
            }
        }

        const instructor = await User.findOne({ accountEmail: 'instructor@emare.com' });
        const instructor2 = await User.findOne({ accountEmail: 'instructor2@emare.com' });

        const instructorUpdates = [
            {
                user: instructor,
                biography: 'A passionate instructor with hands-on experience teaching web development, design, and e-learning best practices.',
                qualifications: ['MSc in Computer Science', 'Certified Web Developer', 'Instructional Design Professional'],
                workExperience: ['5 years teaching online programming courses', '3 years as a senior frontend developer at a tech startup'],
                teachingLanguages: ['English', 'Amharic'],
                socialMediaLinks: {
                    linkedin: 'https://www.linkedin.com/in/demo-instructor',
                    twitter: 'https://twitter.com/demo_instructor',
                    website: 'https://demo-instructor.example.com'
                }
            },
            {
                user: instructor2,
                biography: 'A design mentor who helps learners build high-quality user interfaces and creative product experiences.',
                qualifications: ['BDes in Interaction Design', 'Certified UX Specialist'],
                workExperience: ['4 years as a UX designer', '2 years designing e-learning experiences for startups'],
                teachingLanguages: ['English'],
                socialMediaLinks: {
                    linkedin: 'https://www.linkedin.com/in/design-mentor',
                    twitter: 'https://twitter.com/design_mentor',
                    website: 'https://design-mentor.example.com'
                }
            }
        ];

        for (const update of instructorUpdates) {
            if (update.user) {
                await User.findByIdAndUpdate(update.user._id, {
                    biography: update.biography,
                    qualifications: update.qualifications,
                    workExperience: update.workExperience,
                    teachingLanguages: update.teachingLanguages,
                    socialMediaLinks: update.socialMediaLinks
                }, { new: true, runValidators: true });
            }
        }
        console.log('Updated sample instructor profile details.');

        const Course = require('../models/Course');
        const sampleCourses = [
            {
                courseTitle: 'Modern Web Development with React',
                subtitle: 'Build responsive web apps with React, hooks, and modern frontend tooling.',
                descriptionText: 'Learn how to create production-ready web applications using React, component-driven design, and real-world workflows. This course covers modern React fundamentals, state management, API integration, and project deployment.',
                technicalCategory: 'Web Coding',
                language: 'English',
                level: 'Beginner',
                requirements: ['Basic HTML/CSS knowledge', 'Interest in frontend development'],
                learningObjectives: ['Create React components', 'Manage state with hooks', 'Build responsive UIs', 'Connect to REST APIs'],
                tags: ['React', 'JavaScript', 'Frontend', 'Web Development'],
                estimatedDurationHours: 12,
                price: 49,
                thumbnailUrl: 'https://example.com/thumbnails/react-course.jpg',
                previewVideoUrl: 'https://example.com/previews/react-intro.mp4',
                totalEnrollments: 120,
                averageRating: 4.8,
                totalReviews: 35,
                publicationState: 'Active',
                creator: instructor,
                curriculumTree: [
                    {
                        chapterTitle: 'Getting Started with React',
                        lessons: [
                            { lessonTitle: 'React Introduction', videoUrl: 'https://example.com/videos/react-intro.mp4', durationMinutes: 12, isFreePreview: true },
                            { lessonTitle: 'JSX and Components', videoUrl: 'https://example.com/videos/jsx-components.mp4', durationMinutes: 18, isFreePreview: false },
                            { lessonTitle: 'State and Props', videoUrl: 'https://example.com/videos/state-props.mp4', durationMinutes: 22, isFreePreview: false }
                        ]
                    },
                    {
                        chapterTitle: 'Building a Real App',
                        lessons: [
                            { lessonTitle: 'Fetching Data from APIs', videoUrl: 'https://example.com/videos/api-fetching.mp4', durationMinutes: 20, isFreePreview: false },
                            { lessonTitle: 'Routing with React Router', videoUrl: 'https://example.com/videos/react-router.mp4', durationMinutes: 16, isFreePreview: false },
                            { lessonTitle: 'Deploying Your App', videoUrl: 'https://example.com/videos/deploy-app.mp4', durationMinutes: 14, isFreePreview: false }
                        ]
                    }
                ]
            },
            {
                courseTitle: 'Responsive UI Design with Figma',
                subtitle: 'Design beautiful, responsive user interfaces and handoff with Figma.',
                descriptionText: 'Master Figma to design responsive interfaces, work with auto-layout, and produce professional UI prototypes. This course is ideal for students who want to take their design skills to the next level.',
                technicalCategory: 'Creative Media',
                language: 'English',
                level: 'Intermediate',
                requirements: ['Basic UI/UX knowledge', 'Familiarity with design tools'],
                learningObjectives: ['Use Figma auto-layout', 'Create reusable design systems', 'Prototype interactive layouts', 'Prepare assets for developers'],
                tags: ['Figma', 'UI Design', 'Design Systems', 'Responsive Design'],
                estimatedDurationHours: 8,
                price: 29,
                thumbnailUrl: 'https://example.com/thumbnails/figma-course.jpg',
                previewVideoUrl: 'https://example.com/previews/figma-intro.mp4',
                totalEnrollments: 78,
                averageRating: 4.6,
                totalReviews: 18,
                publicationState: 'Active',
                creator: instructor2,
                curriculumTree: [
                    {
                        chapterTitle: 'Figma Fundamentals',
                        lessons: [
                            { lessonTitle: 'Figma Interface Tour', videoUrl: 'https://example.com/videos/figma-tour.mp4', durationMinutes: 14, isFreePreview: true },
                            { lessonTitle: 'Shapes, Frames, and Constraints', videoUrl: 'https://example.com/videos/figma-constraints.mp4', durationMinutes: 19, isFreePreview: false }
                        ]
                    },
                    {
                        chapterTitle: 'Advanced Prototyping',
                        lessons: [
                            { lessonTitle: 'Interactive Components', videoUrl: 'https://example.com/videos/interactive-components.mp4', durationMinutes: 21, isFreePreview: false },
                            { lessonTitle: 'Responsive Design Techniques', videoUrl: 'https://example.com/videos/responsive-design.mp4', durationMinutes: 17, isFreePreview: false }
                        ]
                    }
                ]
            },
            {
                courseTitle: 'Cybersecurity Fundamentals for Beginners',
                subtitle: 'Protect systems and data with core cybersecurity principles.',
                descriptionText: 'Begin your cybersecurity journey with practical lessons on network protection, threat awareness, and safe online behavior. This course covers essential tools and strategies for defending web applications and user data.',
                technicalCategory: 'Cyber Security',
                language: 'English',
                level: 'Beginner',
                requirements: ['Basic computer literacy', 'Curiosity about security'],
                learningObjectives: ['Understand security concepts', 'Recognize common threats', 'Apply best practices for safe computing', 'Use simple monitoring tools'],
                tags: ['Cybersecurity', 'Network Security', 'Ethical Hacking', 'Information Security'],
                estimatedDurationHours: 10,
                price: 39,
                thumbnailUrl: 'https://example.com/thumbnails/cybersecurity-course.jpg',
                previewVideoUrl: 'https://example.com/previews/cybersecurity-intro.mp4',
                totalEnrollments: 90,
                averageRating: 4.7,
                totalReviews: 22,
                publicationState: 'Active',
                creator: instructor2,
                curriculumTree: [
                    {
                        chapterTitle: 'Security Basics',
                        lessons: [
                            { lessonTitle: 'Introduction to Cybersecurity', videoUrl: 'https://example.com/videos/security-intro.mp4', durationMinutes: 15, isFreePreview: true },
                            { lessonTitle: 'Threat Types and Attack Vectors', videoUrl: 'https://example.com/videos/threats.mp4', durationMinutes: 20, isFreePreview: false }
                        ]
                    },
                    {
                        chapterTitle: 'Protecting Systems',
                        lessons: [
                            { lessonTitle: 'Secure Password Practices', videoUrl: 'https://example.com/videos/passwords.mp4', durationMinutes: 16, isFreePreview: false },
                            { lessonTitle: 'Network Defense Fundamentals', videoUrl: 'https://example.com/videos/network-defense.mp4', durationMinutes: 18, isFreePreview: false }
                        ]
                    }
                ]
            },
            {
                courseTitle: 'Data Science with Python Essentials',
                subtitle: 'Use Python to analyze data, build models, and visualize insights.',
                descriptionText: 'This course introduces Python tools for data cleaning, visualization, and model building. Students will learn how to work with pandas, matplotlib, and scikit-learn to generate insights from real datasets.',
                technicalCategory: 'Data Science',
                language: 'English',
                level: 'Intermediate',
                requirements: ['Basic Python knowledge', 'Interest in data analysis'],
                learningObjectives: ['Work with pandas', 'Create charts in Python', 'Build simple predictive models', 'Interpret data results'],
                tags: ['Python', 'Data Science', 'Machine Learning', 'Analytics'],
                estimatedDurationHours: 14,
                price: 59,
                thumbnailUrl: 'https://example.com/thumbnails/data-science-course.jpg',
                previewVideoUrl: 'https://example.com/previews/data-science-intro.mp4',
                totalEnrollments: 65,
                averageRating: 4.5,
                totalReviews: 12,
                publicationState: 'Active',
                creator: instructor,
                curriculumTree: [
                    {
                        chapterTitle: 'Python for Data',
                        lessons: [
                            { lessonTitle: 'Data Wrangling with pandas', videoUrl: 'https://example.com/videos/pandas.mp4', durationMinutes: 24, isFreePreview: true },
                            { lessonTitle: 'Visualizing Data with Matplotlib', videoUrl: 'https://example.com/videos/matplotlib.mp4', durationMinutes: 22, isFreePreview: false }
                        ]
                    },
                    {
                        chapterTitle: 'Introductory Models',
                        lessons: [
                            { lessonTitle: 'Linear Regression Basics', videoUrl: 'https://example.com/videos/linear-regression.mp4', durationMinutes: 20, isFreePreview: false },
                            { lessonTitle: 'Evaluating Model Performance', videoUrl: 'https://example.com/videos/model-evaluation.mp4', durationMinutes: 18, isFreePreview: false }
                        ]
                    }
                ]
            },
            {
                courseTitle: 'Mobile App Development with Flutter',
                subtitle: 'Create beautiful cross-platform mobile apps using Flutter.',
                descriptionText: 'Learn how to build fast and attractive mobile applications with Flutter. This course covers widgets, state management, layout, and deployment for both Android and iOS.',
                technicalCategory: 'Mobile Development',
                language: 'English',
                level: 'Beginner',
                requirements: ['Basic programming skills', 'Desire to build mobile apps'],
                learningObjectives: ['Understand Flutter widgets', 'Handle app state', 'Create responsive layouts', 'Deploy Flutter apps'],
                tags: ['Flutter', 'Mobile Development', 'Dart', 'App Design'],
                estimatedDurationHours: 11,
                price: 45,
                thumbnailUrl: 'https://example.com/thumbnails/flutter-course.jpg',
                previewVideoUrl: 'https://example.com/previews/flutter-intro.mp4',
                totalEnrollments: 82,
                averageRating: 4.6,
                totalReviews: 20,
                publicationState: 'Active',
                creator: instructor,
                curriculumTree: [
                    {
                        chapterTitle: 'Flutter Basics',
                        lessons: [
                            { lessonTitle: 'Getting Started with Dart', videoUrl: 'https://example.com/videos/dart-basics.mp4', durationMinutes: 18, isFreePreview: true },
                            { lessonTitle: 'Flutter Layouts and Widgets', videoUrl: 'https://example.com/videos/flutter-widgets.mp4', durationMinutes: 20, isFreePreview: false }
                        ]
                    },
                    {
                        chapterTitle: 'App Building',
                        lessons: [
                            { lessonTitle: 'State Management in Flutter', videoUrl: 'https://example.com/videos/flutter-state.mp4', durationMinutes: 19, isFreePreview: false },
                            { lessonTitle: 'Publishing to App Stores', videoUrl: 'https://example.com/videos/flutter-deploy.mp4', durationMinutes: 15, isFreePreview: false }
                        ]
                    }
                ]
            }
        ];

        for (const courseData of sampleCourses) {
            const existingCourse = await Course.findOne({ courseTitle: courseData.courseTitle });
            if (!existingCourse) {
                const creatorRef = courseData.creatorRef || (courseData.creator === instructor ? instructor._id : (courseData.creator === instructor2 ? instructor2._id : null));
                const payload = { ...courseData, creatorRef };
                delete payload.creator;
                await Course.create(payload);
                console.log(`Created sample course: ${courseData.courseTitle}`);
            } else {
                console.log(`Sample course already exists: ${courseData.courseTitle}`);
            }
        }

        console.log('Test accounts and sample courses seeded successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Error seeding test users:', err);
        process.exit(1);
    }
};

seedUsers();

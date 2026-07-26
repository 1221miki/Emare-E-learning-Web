require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const Course = require('../models/Course');
const Category = require('../models/Category');
const Review = require('../models/Review');

// ─── INSTRUCTORS ──────────────────────────────────────────────────────────────
const instructorsData = [
    {
        fullName: 'Ayires Zebene',
        accountEmail: 'ayires.zebene@emare.edu.et',
        securedPassword: 'Instructor123!',
        assignedRole: 'Instructor',
        biography: 'Senior Full Stack Developer with 8+ years of experience building scalable web applications. Passionate about teaching modern web technologies to Ethiopian developers.',
        qualifications: ['BSc Computer Science – Addis Ababa University', 'Meta Full Stack Developer Certificate', 'AWS Certified Developer'],
        workExperience: ['Lead Developer at TechEth PLC (5 years)', 'Full Stack Engineer at EthioTelecom (3 years)'],
        teachingLanguages: ['English', 'Amharic'],
        country: 'Ethiopia', city: 'Debre Birhan', occupation: 'Senior Developer',
        socialMediaLinks: { linkedin: 'https://linkedin.com/in/ayires', github: 'https://github.com/ayires' },
        isActive: true
    },
    {
        fullName: 'Dr. Samuel Tesfaye',
        accountEmail: 'samuel.tesfaye@emare.edu.et',
        securedPassword: 'Instructor123!',
        assignedRole: 'Instructor',
        biography: 'AI & Data Science researcher with a PhD from Addis Ababa University. Specializes in Machine Learning, Deep Learning, and Natural Language Processing for African languages.',
        qualifications: ['PhD Artificial Intelligence – AAU', 'Google ML Engineer Certificate', 'Microsoft Azure AI Fundamentals'],
        workExperience: ['AI Research Lead at iCog Labs (4 years)', 'Data Scientist at Ethiopian Airlines (2 years)'],
        teachingLanguages: ['English', 'Amharic'],
        country: 'Ethiopia', city: 'Addis Ababa', occupation: 'AI Researcher',
        isActive: true
    },
    {
        fullName: 'Eng. Bethelhem Haile',
        accountEmail: 'bethelhem.haile@emare.edu.et',
        securedPassword: 'Instructor123!',
        assignedRole: 'Instructor',
        biography: 'Mobile & Cloud Engineering specialist with experience in Flutter, React Native, and AWS. Mentor at Emare ICT Hub and Google Developer Expert candidate.',
        qualifications: ['MSc Software Engineering – Bahir Dar University', 'Google Flutter Developer Certification', 'AWS Solutions Architect Associate'],
        workExperience: ['Mobile Lead at Gebeya Inc. (3 years)', 'Flutter Developer (Freelance – 4 years)'],
        teachingLanguages: ['English', 'Amharic', 'Afaan Oromo'],
        country: 'Ethiopia', city: 'Debre Birhan', occupation: 'Mobile Engineer',
        isActive: true
    },
    {
        fullName: 'Mr. Dawit Bekele',
        accountEmail: 'dawit.bekele@emare.edu.et',
        securedPassword: 'Instructor123!',
        assignedRole: 'Instructor',
        biography: 'Cybersecurity expert and ethical hacker with CEH and OSCP certifications. Protects Ethiopian enterprises from cyber threats and educates the next generation of security professionals.',
        qualifications: ['BSc Information Systems – Jimma University', 'Certified Ethical Hacker (CEH)', 'OSCP – Offensive Security'],
        workExperience: ['Cybersecurity Consultant at CBE (Commercial Bank of Ethiopia)', 'Penetration Tester (3 years)'],
        teachingLanguages: ['English', 'Amharic'],
        country: 'Ethiopia', city: 'Addis Ababa', occupation: 'Cybersecurity Consultant',
        isActive: true
    },
    {
        fullName: 'Ms. Kalkidan Mekuria',
        accountEmail: 'kalkidan.mekuria@emare.edu.et',
        securedPassword: 'Instructor123!',
        assignedRole: 'Instructor',
        biography: 'Award-winning UI/UX Designer and brand strategist. Alumna of Stanford d.school design thinking program. Passionate about creating accessible, beautiful digital experiences for Africa.',
        qualifications: ['BSc Industrial Design – AAiT', 'Google UX Design Professional Certificate', 'Stanford d.school Design Thinking'],
        workExperience: ['Lead UX Designer at Safaricom Ethiopia', 'Product Designer at Kifiya Financial Technology (3 years)'],
        teachingLanguages: ['English', 'Amharic'],
        country: 'Ethiopia', city: 'Addis Ababa', occupation: 'Senior UX Designer',
        isActive: true
    }
];

// ─── CATEGORIES ───────────────────────────────────────────────────────────────
const categoriesData = [
    { name: 'Web Development', icon: '🌐', description: 'Frontend, Backend, and Full Stack web development courses.' },
    { name: 'Full Stack MERN', icon: '🚀', description: 'Complete MERN stack development from zero to hero.' },
    { name: 'UI/UX Design', icon: '🎨', description: 'User Interface and User Experience design with modern tools.' },
    { name: 'Data Science', icon: '📊', description: 'Data analysis, visualization, and machine learning fundamentals.' },
    { name: 'Artificial Intelligence', icon: '🤖', description: 'Machine Learning, Deep Learning, NLP, and Generative AI.' },
    { name: 'Cyber Security', icon: '🔒', description: 'Ethical hacking, penetration testing, and network security.' },
    { name: 'Mobile Development', icon: '📱', description: 'Flutter, React Native, and cross-platform mobile app development.' },
    { name: 'Programming Languages', icon: '💻', description: 'Core programming language fundamentals: Python, Java, C++.' },
    { name: 'Cloud & DevOps', icon: '☁️', description: 'Docker, Kubernetes, AWS, CI/CD pipelines, and more.' },
    { name: 'Database Engineering', icon: '🗄️', description: 'SQL, NoSQL, database design, and performance optimization.' },
    { name: 'Digital Marketing', icon: '📣', description: 'SEO, social media, content marketing, and Google Ads.' },
    { name: 'Graphic Design', icon: '🖌️', description: 'Photoshop, Illustrator, branding, and logo design.' },
    { name: 'Office Productivity', icon: '📋', description: 'Microsoft Office, Google Workspace, and productivity tools.' },
    { name: 'Soft Skills', icon: '🤝', description: 'Communication, leadership, interview prep, and CV writing.' }
];

// ─── COURSES DATA ─────────────────────────────────────────────────────────────
// This will be built dynamically after instructors are created
const buildCoursesData = (instructors) => {
    const ayires = instructors[0];
    const samuel = instructors[1];
    const bethelhem = instructors[2];
    const dawit = instructors[3];
    const kalkidan = instructors[4];

    const makeCurriculum = (chapters) => chapters.map(ch => ({
        chapterTitle: ch.title,
        lessons: ch.lessons.map((l, i) => ({
            lessonTitle: l,
            videoUrl: `https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4`,
            durationMinutes: Math.floor(Math.random() * 25) + 10,
            isFreePreview: i === 0
        }))
    }));

    return [
        // ─── WEB DEVELOPMENT ────────────────────────────────────────────
        {
            courseTitle: 'HTML5 & CSS3 Complete Bootcamp',
            subtitle: 'Build stunning websites from scratch with HTML5 and CSS3',
            descriptionText: 'Master the foundations of web development with HTML5 and CSS3. This comprehensive course covers everything from basic tags to advanced CSS animations, flexbox, grid, and responsive design. By the end, you will have built 5 real-world projects including a portfolio website.',
            technicalCategory: 'Web Coding',
            language: 'English',
            level: 'Beginner',
            estimatedDurationHours: 28,
            price: 0,
            averageRating: 4.8, totalReviews: 342, totalEnrollments: 1240,
            publicationState: 'Active',
            requirements: ['No prior coding experience needed', 'A computer with internet access', 'Enthusiasm to learn!'],
            learningObjectives: ['Build fully responsive websites', 'Use HTML5 semantic elements', 'Master CSS Flexbox and Grid', 'Create CSS animations and transitions', 'Apply mobile-first design principles'],
            tags: ['HTML', 'CSS', 'Responsive Design', 'Web Development', 'Frontend'],
            creatorRef: ayires._id,
            curriculumTree: makeCurriculum([
                { title: 'Introduction to HTML5', lessons: ['What is HTML?', 'HTML Document Structure', 'Headings, Paragraphs & Text', 'Links and Images', 'Lists and Tables'] },
                { title: 'HTML5 Semantic Elements', lessons: ['Header, Nav, Main, Footer', 'Article, Section, Aside', 'HTML5 Forms', 'Input Types & Validation', 'Audio & Video Embedding'] },
                { title: 'CSS3 Fundamentals', lessons: ['CSS Selectors', 'Box Model', 'Colors and Typography', 'Background Properties', 'CSS Units'] },
                { title: 'CSS Layout Mastery', lessons: ['Flexbox Deep Dive', 'CSS Grid System', 'Positioning', 'Responsive Design', 'Media Queries'] },
                { title: 'CSS Animations', lessons: ['Transitions', 'Keyframe Animations', 'Transform Properties', 'CSS Variables', 'Final Portfolio Project'] }
            ])
        },
        {
            courseTitle: 'JavaScript Mastery: ES6+ Modern JavaScript',
            subtitle: 'Go from JavaScript beginner to advanced in one complete course',
            descriptionText: 'The most comprehensive JavaScript course on the platform. Learn modern ES6+ syntax, DOM manipulation, asynchronous JavaScript with Promises and async/await, and real-world project building. You will build 10 JavaScript projects including a weather app, a quiz app, and a budget tracker.',
            technicalCategory: 'Web Coding',
            language: 'English',
            level: 'Intermediate',
            estimatedDurationHours: 52,
            price: 1200,
            averageRating: 4.9, totalReviews: 521, totalEnrollments: 2100,
            publicationState: 'Active',
            requirements: ['Basic HTML & CSS knowledge', 'Any code editor (VS Code recommended)'],
            learningObjectives: ['Master ES6+ syntax', 'Manipulate the DOM confidently', 'Work with APIs and JSON', 'Understand async programming', 'Build real JavaScript projects'],
            tags: ['JavaScript', 'ES6', 'DOM', 'Async', 'Frontend'],
            creatorRef: ayires._id,
            curriculumTree: makeCurriculum([
                { title: 'JavaScript Fundamentals', lessons: ['Variables: var, let, const', 'Data Types & Operators', 'Control Flow & Loops', 'Functions & Scope', 'Arrays & Objects'] },
                { title: 'ES6+ Modern JavaScript', lessons: ['Arrow Functions', 'Destructuring', 'Template Literals', 'Spread & Rest Operators', 'Modules: Import/Export'] },
                { title: 'DOM Manipulation', lessons: ['Selecting Elements', 'Event Listeners', 'Creating & Modifying DOM', 'Local Storage', 'Project: To-Do App'] },
                { title: 'Asynchronous JavaScript', lessons: ['Callbacks', 'Promises', 'Async/Await', 'Fetch API', 'Error Handling'] },
                { title: 'Projects', lessons: ['Weather App', 'Quiz App', 'Budget Tracker', 'Movie Search App', 'Portfolio Final Project'] }
            ])
        },
        {
            courseTitle: 'React.js Complete Developer Course',
            subtitle: 'Build modern, reactive UI applications with React 18',
            descriptionText: 'Master React.js from the ground up. Learn components, props, state management with useState and useReducer, side effects with useEffect, React Router for navigation, Context API, and integrate with REST APIs. Build 6 full React projects including a social media feed, e-commerce frontend, and a dashboard.',
            technicalCategory: 'Web Coding',
            language: 'English',
            level: 'Intermediate',
            estimatedDurationHours: 45,
            price: 1500,
            averageRating: 4.9, totalReviews: 408, totalEnrollments: 1820,
            publicationState: 'Active',
            requirements: ['Strong JavaScript & ES6+ knowledge', 'Basic HTML & CSS', 'Node.js installed'],
            learningObjectives: ['Build reusable React components', 'Manage state with hooks', 'Navigate with React Router', 'Connect to REST APIs', 'Deploy React apps to Vercel'],
            tags: ['React', 'JavaScript', 'Hooks', 'SPA', 'Frontend'],
            creatorRef: ayires._id,
            curriculumTree: makeCurriculum([
                { title: 'React Foundations', lessons: ['What is React?', 'JSX Syntax', 'Components & Props', 'State with useState', 'Conditional Rendering'] },
                { title: 'React Hooks Deep Dive', lessons: ['useEffect Hook', 'useContext Hook', 'useReducer Hook', 'Custom Hooks', 'useMemo & useCallback'] },
                { title: 'React Router', lessons: ['Setting Up Router', 'Dynamic Routes', 'Nested Routes', 'Protected Routes', 'Navigation Guards'] },
                { title: 'API Integration', lessons: ['Axios vs Fetch', 'Loading & Error States', 'Authentication with JWT', 'Pagination', 'Search & Filter'] },
                { title: 'Projects', lessons: ['Social Feed UI', 'E-Commerce Frontend', 'Admin Dashboard', 'Chat App UI', 'Final Capstone'] }
            ])
        },
        {
            courseTitle: 'Node.js & Express.js Backend Development',
            subtitle: 'Build scalable REST APIs and server-side applications with Node.js',
            descriptionText: 'Learn backend web development with Node.js and Express.js. Build RESTful APIs, connect to MongoDB, implement JWT authentication, handle file uploads, and deploy to production servers. Real-world project: build a full e-commerce backend from scratch.',
            technicalCategory: 'Web Coding',
            language: 'English',
            level: 'Intermediate',
            estimatedDurationHours: 38,
            price: 1400,
            averageRating: 4.8, totalReviews: 295, totalEnrollments: 1350,
            publicationState: 'Active',
            requirements: ['Solid JavaScript knowledge', 'Familiarity with the command line', 'Node.js installed'],
            learningObjectives: ['Build RESTful APIs from scratch', 'Connect Node.js to MongoDB', 'Implement JWT authentication', 'Handle file uploads', 'Deploy Node apps to cloud'],
            tags: ['Node.js', 'Express.js', 'REST API', 'Backend', 'MongoDB'],
            creatorRef: ayires._id,
            curriculumTree: makeCurriculum([
                { title: 'Node.js Core', lessons: ['Node.js Architecture', 'Modules & NPM', 'File System (fs)', 'Events & Streams', 'HTTP Module'] },
                { title: 'Express.js', lessons: ['Setup & Routing', 'Middleware', 'Request & Response', 'Error Handling', 'Template Engines'] },
                { title: 'Database Integration', lessons: ['MongoDB & Mongoose', 'CRUD Operations', 'Schema Design', 'Validation', 'Aggregation'] },
                { title: 'Authentication', lessons: ['JWT Tokens', 'bcrypt Password Hashing', 'Protected Routes', 'Role-Based Access', 'Refresh Tokens'] },
                { title: 'Production Ready', lessons: ['File Uploads with Multer', 'Email with Nodemailer', 'Environment Variables', 'Rate Limiting', 'Deployment on Render'] }
            ])
        },

        // ─── FULL STACK MERN ─────────────────────────────────────────────
        {
            courseTitle: 'Full Stack MERN Development Masterclass',
            subtitle: 'Build complete web applications with MongoDB, Express, React, Node.js',
            descriptionText: 'The ultimate Full Stack MERN course. Go from zero to building complete, production-ready web applications. This course covers the entire stack: HTML/CSS, JavaScript, React frontend, Node/Express backend, MongoDB database, Redux state management, JWT authentication, Cloudinary image uploads, payment integration with Chapa, and deployment to cloud platforms.',
            technicalCategory: 'Web Coding',
            language: 'English',
            level: 'Advanced',
            estimatedDurationHours: 80,
            price: 2500,
            averageRating: 5.0, totalReviews: 612, totalEnrollments: 2850,
            publicationState: 'Active',
            requirements: ['Basic JavaScript knowledge', 'Willingness to commit 3-4 hours/day', 'Any operating system'],
            learningObjectives: ['Build full stack apps from scratch', 'Master React + Redux', 'Design scalable REST APIs', 'Integrate payment systems', 'Deploy to production'],
            tags: ['MERN', 'Full Stack', 'React', 'Node', 'MongoDB', 'Redux'],
            creatorRef: ayires._id,
            curriculumTree: makeCurriculum([
                { title: 'Web Foundations', lessons: ['HTML5 Essentials', 'CSS3 & Flexbox', 'JavaScript ES6+', 'Git & GitHub', 'VS Code Setup'] },
                { title: 'React Frontend', lessons: ['Component Architecture', 'Hooks & State', 'React Router', 'Redux Toolkit', 'Axios Integration'] },
                { title: 'Node & Express Backend', lessons: ['REST API Design', 'MongoDB & Mongoose', 'JWT Auth', 'Middleware', 'File Uploads'] },
                { title: 'Advanced Features', lessons: ['Socket.IO Chat', 'Cloudinary Images', 'Chapa Payment Gateway', 'Email Notifications', 'Admin Dashboard'] },
                { title: 'Deployment & Capstone', lessons: ['Docker Basics', 'Deploy to Render & Vercel', 'CI/CD with GitHub Actions', 'Capstone: E-Commerce Platform', 'Career Guidance'] }
            ])
        },

        // ─── UI/UX DESIGN ────────────────────────────────────────────────
        {
            courseTitle: 'UI/UX Design Complete Course: Figma to Launch',
            subtitle: 'Design beautiful, user-centered digital products from research to prototype',
            descriptionText: 'Master UI/UX design from fundamentals to advanced prototyping. Learn design principles, color theory, typography, user research, wireframing, and full prototyping in Figma. You will build a complete professional portfolio with 4 real case studies that will get you hired as a UX designer.',
            technicalCategory: 'Creative Media',
            language: 'English',
            level: 'Beginner',
            estimatedDurationHours: 40,
            price: 1800,
            averageRating: 4.9, totalReviews: 478, totalEnrollments: 2200,
            publicationState: 'Active',
            requirements: ['No design experience needed', 'Figma (free account)', 'A creative mindset'],
            learningObjectives: ['Master Figma from beginner to expert', 'Conduct user research and interviews', 'Create wireframes and prototypes', 'Design complete design systems', 'Build a job-ready design portfolio'],
            tags: ['UI/UX', 'Figma', 'Design', 'Prototyping', 'User Research'],
            creatorRef: kalkidan._id,
            curriculumTree: makeCurriculum([
                { title: 'Design Foundations', lessons: ['Design Thinking', 'Color Theory', 'Typography Mastery', 'Visual Hierarchy', 'Gestalt Principles'] },
                { title: 'User Research', lessons: ['User Interviews', 'Surveys & Analytics', 'Persona Creation', 'User Journey Mapping', 'Competitive Analysis'] },
                { title: 'Figma Mastery', lessons: ['Figma Interface', 'Components & Variants', 'Auto Layout', 'Design Systems', 'Plugins & Resources'] },
                { title: 'Wireframing & Prototyping', lessons: ['Low-Fi Wireframes', 'High-Fi Mockups', 'Interactive Prototypes', 'Usability Testing', 'Handoff to Dev'] },
                { title: 'Portfolio Projects', lessons: ['Mobile App Redesign', 'E-Commerce UX', 'Dashboard Design', 'Branding Case Study', 'Portfolio Presentation'] }
            ])
        },

        // ─── DATA SCIENCE ────────────────────────────────────────────────
        {
            courseTitle: 'Data Science with Python: Complete Bootcamp',
            subtitle: 'Master data analysis, visualization, and machine learning with Python',
            descriptionText: 'Become a data scientist with this hands-on Python course. Learn NumPy, Pandas, Matplotlib, Seaborn, SQL, and dive into Machine Learning with Scikit-Learn. Work on real Ethiopian datasets including telecom churn analysis, agricultural yield prediction, and financial fraud detection.',
            technicalCategory: 'Data Science',
            language: 'English',
            level: 'Intermediate',
            estimatedDurationHours: 55,
            price: 2000,
            averageRating: 4.8, totalReviews: 389, totalEnrollments: 1680,
            publicationState: 'Active',
            requirements: ['Basic Python knowledge helpful but not required', 'Math comfort (high school level)', 'Google Colab (free)'],
            learningObjectives: ['Analyze real datasets with Pandas', 'Create stunning visualizations', 'Build ML models with Scikit-Learn', 'Work with SQL databases', 'Deploy a data science project'],
            tags: ['Python', 'Data Science', 'Pandas', 'Machine Learning', 'Data Analysis'],
            creatorRef: samuel._id,
            curriculumTree: makeCurriculum([
                { title: 'Python for Data Science', lessons: ['Python Basics', 'NumPy Arrays', 'Pandas DataFrames', 'Data Cleaning', 'Working with Files'] },
                { title: 'Data Visualization', lessons: ['Matplotlib', 'Seaborn', 'Plotly (Interactive)', 'Power BI Integration', 'Storytelling with Data'] },
                { title: 'SQL for Data Scientists', lessons: ['SQL Basics', 'Joins & Aggregations', 'Window Functions', 'SQLite with Python', 'Data Extraction Pipelines'] },
                { title: 'Machine Learning', lessons: ['Supervised Learning', 'Classification Models', 'Regression Models', 'Model Evaluation', 'Hyperparameter Tuning'] },
                { title: 'Capstone Projects', lessons: ['Telecom Churn Analysis', 'Crop Yield Prediction', 'Financial Fraud Detection', 'Dashboard with Streamlit', 'Project Presentation'] }
            ])
        },

        // ─── ARTIFICIAL INTELLIGENCE ────────────────────────────────────
        {
            courseTitle: 'Artificial Intelligence & Machine Learning A-Z',
            subtitle: 'From Python basics to building your own AI systems',
            descriptionText: 'The most comprehensive AI and Machine Learning course at Emare ELMS. Covering Deep Learning, TensorFlow, PyTorch, Natural Language Processing, Computer Vision, and Generative AI. Learn to build real AI systems including an image classifier, chatbot, and recommendation engine.',
            technicalCategory: 'Artificial Intelligence',
            language: 'English',
            level: 'Advanced',
            estimatedDurationHours: 72,
            price: 2800,
            averageRating: 4.9, totalReviews: 521, totalEnrollments: 1950,
            publicationState: 'Active',
            requirements: ['Python programming (intermediate)', 'Linear algebra basics', 'Calculus fundamentals'],
            learningObjectives: ['Build deep learning models', 'Work with TensorFlow and PyTorch', 'Build NLP applications', 'Create computer vision systems', 'Understand generative AI'],
            tags: ['AI', 'Machine Learning', 'Deep Learning', 'TensorFlow', 'NLP'],
            creatorRef: samuel._id,
            curriculumTree: makeCurriculum([
                { title: 'Machine Learning Foundations', lessons: ['ML Workflow', 'Feature Engineering', 'Decision Trees', 'Random Forest', 'SVM'] },
                { title: 'Deep Learning with TensorFlow', lessons: ['Neural Networks Basics', 'TensorFlow & Keras', 'CNNs for Images', 'RNNs for Sequences', 'Transfer Learning'] },
                { title: 'Natural Language Processing', lessons: ['Text Preprocessing', 'Word Embeddings', 'Transformers & BERT', 'Sentiment Analysis', 'Language Translation'] },
                { title: 'Computer Vision', lessons: ['Image Classification', 'Object Detection', 'YOLO Architecture', 'Face Recognition', 'OpenCV Projects'] },
                { title: 'Generative AI', lessons: ['GANs Introduction', 'Prompt Engineering', 'LangChain Basics', 'Building AI Chatbots', 'AI Applications in Ethiopia'] }
            ])
        },

        // ─── CYBER SECURITY ──────────────────────────────────────────────
        {
            courseTitle: 'Ethical Hacking & Cybersecurity Complete Course',
            subtitle: 'Learn penetration testing, ethical hacking, and network security',
            descriptionText: 'Master cybersecurity from fundamentals to advanced penetration testing. Learn networking, Linux, ethical hacking methodologies, Kali Linux tools, web application security (OWASP Top 10), network security, cryptography, and digital forensics. Includes hands-on labs with safe practice environments.',
            technicalCategory: 'Cyber Security',
            language: 'English',
            level: 'Intermediate',
            estimatedDurationHours: 60,
            price: 2200,
            averageRating: 4.9, totalReviews: 312, totalEnrollments: 1420,
            publicationState: 'Active',
            requirements: ['Basic networking knowledge', 'Linux familiarity helpful', 'VirtualBox installed (free)'],
            learningObjectives: ['Understand cybersecurity concepts', 'Conduct penetration testing legally', 'Use Kali Linux tools', 'Secure web applications against OWASP threats', 'Perform digital forensics'],
            tags: ['Cybersecurity', 'Ethical Hacking', 'Kali Linux', 'Penetration Testing', 'OWASP'],
            creatorRef: dawit._id,
            curriculumTree: makeCurriculum([
                { title: 'Networking Foundations', lessons: ['TCP/IP Model', 'Protocols & Ports', 'Subnetting', 'Wireshark Basics', 'Network Scanning with Nmap'] },
                { title: 'Linux for Hackers', lessons: ['Linux Command Line', 'File System & Permissions', 'Bash Scripting', 'Service Management', 'Kali Linux Setup'] },
                { title: 'Ethical Hacking Methodology', lessons: ['Reconnaissance', 'Scanning & Enumeration', 'Exploitation', 'Post-Exploitation', 'Reporting'] },
                { title: 'Web Application Security', lessons: ['OWASP Top 10', 'SQL Injection', 'XSS Attacks', 'Burp Suite', 'CSRF & Authentication Flaws'] },
                { title: 'Advanced Topics', lessons: ['Cryptography', 'Password Cracking', 'Social Engineering', 'Digital Forensics', 'Setting up a Security Lab'] }
            ])
        },

        // ─── MOBILE DEVELOPMENT ──────────────────────────────────────────
        {
            courseTitle: 'Flutter & Dart Mobile Development Bootcamp',
            subtitle: 'Build beautiful iOS and Android apps with Flutter',
            descriptionText: 'Learn to build cross-platform mobile applications with Flutter and Dart. From Dart language basics to building production-ready apps with Firebase authentication, Firestore database, local storage, push notifications, REST API integration, and deployment to both Google Play Store and Apple App Store.',
            technicalCategory: 'Mobile Development',
            language: 'English',
            level: 'Beginner',
            estimatedDurationHours: 48,
            price: 1900,
            averageRating: 4.8, totalReviews: 276, totalEnrollments: 1100,
            publicationState: 'Active',
            requirements: ['No prior mobile dev experience needed', 'Android Studio or VS Code', 'A smartphone for testing (optional)'],
            learningObjectives: ['Master Dart programming language', 'Build beautiful Flutter UIs', 'Integrate Firebase services', 'Deploy apps to Play Store', 'Handle state with Provider & Riverpod'],
            tags: ['Flutter', 'Dart', 'Mobile', 'Firebase', 'iOS', 'Android'],
            creatorRef: bethelhem._id,
            curriculumTree: makeCurriculum([
                { title: 'Dart Language Mastery', lessons: ['Dart Variables & Types', 'Functions & OOP', 'Null Safety', 'Async/Await in Dart', 'Dart Collections'] },
                { title: 'Flutter UI Development', lessons: ['Widgets Deep Dive', 'Layouts & Styling', 'Navigation & Routes', 'Animations', 'Responsive Design'] },
                { title: 'State Management', lessons: ['setState & InheritedWidget', 'Provider Pattern', 'Riverpod', 'BLoC Architecture', 'GetX'] },
                { title: 'Firebase Integration', lessons: ['Firebase Auth', 'Firestore Database', 'Cloud Storage', 'Push Notifications', 'Analytics'] },
                { title: 'Deployment & Projects', lessons: ['REST API Integration', 'Local Storage', 'Play Store Deployment', 'App Store Deployment', 'Capstone: Delivery App'] }
            ])
        },

        // ─── CLOUD & DEVOPS ──────────────────────────────────────────────
        {
            courseTitle: 'Cloud Computing & DevOps Engineering',
            subtitle: 'Master Docker, Kubernetes, AWS, and CI/CD pipelines',
            descriptionText: 'Master modern cloud and DevOps practices. Learn Linux administration, Git workflows, Docker containerization, Kubernetes orchestration, AWS core services (EC2, S3, RDS, Lambda), CI/CD with GitHub Actions, Nginx reverse proxy, and system monitoring. Build a complete DevOps pipeline for a real project.',
            technicalCategory: 'Cloud Computing',
            language: 'English',
            level: 'Advanced',
            estimatedDurationHours: 58,
            price: 2400,
            averageRating: 4.7, totalReviews: 198, totalEnrollments: 820,
            publicationState: 'Active',
            requirements: ['Basic Linux command line', 'Understanding of web applications', 'AWS Free Tier account'],
            learningObjectives: ['Administer Linux servers', 'Containerize apps with Docker', 'Orchestrate with Kubernetes', 'Deploy to AWS', 'Build CI/CD pipelines'],
            tags: ['DevOps', 'Docker', 'Kubernetes', 'AWS', 'CI/CD', 'Cloud'],
            creatorRef: bethelhem._id,
            curriculumTree: makeCurriculum([
                { title: 'Linux & Shell Scripting', lessons: ['Linux Administration', 'Shell Scripting', 'User Management', 'Cron Jobs', 'System Monitoring'] },
                { title: 'Docker & Containers', lessons: ['Docker Architecture', 'Images & Containers', 'Dockerfile', 'Docker Compose', 'Container Networking'] },
                { title: 'Kubernetes', lessons: ['K8s Architecture', 'Pods & Deployments', 'Services & Ingress', 'ConfigMaps & Secrets', 'Helm Charts'] },
                { title: 'AWS Core Services', lessons: ['EC2 & VPC', 'S3 & CloudFront', 'RDS & DynamoDB', 'Lambda & API Gateway', 'IAM & Security'] },
                { title: 'CI/CD Pipelines', lessons: ['GitHub Actions', 'Automated Testing', 'Docker in CI/CD', 'Deployment Strategies', 'Monitoring with Grafana'] }
            ])
        },

        // ─── DIGITAL MARKETING ───────────────────────────────────────────
        {
            courseTitle: 'Digital Marketing Complete Course 2026',
            subtitle: 'SEO, Social Media, Google Ads, Content Marketing & Analytics',
            descriptionText: 'Master digital marketing from strategy to execution. Learn SEO optimization, social media marketing, content marketing, email campaigns, Google Analytics 4, Facebook Ads Manager, and Google Ads. Build complete marketing campaigns for Ethiopian businesses and NGOs.',
            technicalCategory: 'Business & Marketing',
            language: 'Amharic',
            level: 'Beginner',
            estimatedDurationHours: 32,
            price: 1100,
            averageRating: 4.6, totalReviews: 245, totalEnrollments: 980,
            publicationState: 'Active',
            requirements: ['No prior marketing experience', 'A smartphone or laptop', 'Curiosity and creativity'],
            learningObjectives: ['Rank websites on Google with SEO', 'Run profitable Facebook & Google Ads', 'Build an engaged social media following', 'Create email marketing campaigns', 'Read analytics data to make decisions'],
            tags: ['Digital Marketing', 'SEO', 'Social Media', 'Google Ads', 'Analytics'],
            creatorRef: kalkidan._id,
            curriculumTree: makeCurriculum([
                { title: 'Digital Marketing Foundations', lessons: ['What is Digital Marketing?', 'Target Audience Research', 'Marketing Funnel', 'Brand Identity', 'Competitor Analysis'] },
                { title: 'SEO Mastery', lessons: ['On-Page SEO', 'Off-Page SEO & Link Building', 'Keyword Research', 'Technical SEO', 'Google Search Console'] },
                { title: 'Paid Advertising', lessons: ['Google Ads Campaign Setup', 'Facebook Ads Manager', 'Instagram Ads', 'Retargeting Campaigns', 'Ad Budget Optimization'] },
                { title: 'Content & Email Marketing', lessons: ['Content Strategy', 'Blog Writing for SEO', 'Email List Building', 'Mailchimp Campaigns', 'Video Marketing'] },
                { title: 'Analytics & Strategy', lessons: ['Google Analytics 4', 'Data-Driven Decisions', 'A/B Testing', 'Reporting & Dashboards', 'Final Campaign Project'] }
            ])
        },

        // ─── PROGRAMMING LANGUAGES ───────────────────────────────────────
        {
            courseTitle: 'Python Programming: Zero to Hero',
            subtitle: 'Master Python 3 for automation, web, data science, and AI',
            descriptionText: 'The most beginner-friendly Python course in Ethiopia. Learn Python from scratch — variables, control flow, functions, OOP, file handling, web scraping, automation, and introduction to data science with Pandas. Perfect for students switching careers or learning their first programming language.',
            technicalCategory: 'Web Coding',
            language: 'Amharic',
            level: 'Beginner',
            estimatedDurationHours: 35,
            price: 0,
            averageRating: 4.8, totalReviews: 567, totalEnrollments: 3100,
            publicationState: 'Active',
            requirements: ['No programming experience needed', 'Python installed (free)', 'Eagerness to solve problems'],
            learningObjectives: ['Write Python programs confidently', 'Use Python for automation', 'Work with files and APIs', 'Understand OOP principles', 'Build a complete Python project'],
            tags: ['Python', 'Programming', 'Beginner', 'Automation', 'OOP'],
            creatorRef: samuel._id,
            curriculumTree: makeCurriculum([
                { title: 'Python Basics', lessons: ['Python Setup', 'Variables & Data Types', 'Operators', 'Conditional Statements', 'Loops'] },
                { title: 'Functions & Modules', lessons: ['Defining Functions', 'Parameters & Return Values', 'Lambda Functions', 'Built-in Modules', 'Creating Packages'] },
                { title: 'Data Structures', lessons: ['Lists & Tuples', 'Dictionaries & Sets', 'List Comprehensions', 'File Handling', 'JSON Data'] },
                { title: 'Object-Oriented Python', lessons: ['Classes & Objects', 'Inheritance', 'Encapsulation', 'Polymorphism', 'Magic Methods'] },
                { title: 'Projects', lessons: ['Calculator App', 'Web Scraper', 'Task Automation Script', 'Simple API Client', 'Capstone: Student Grade System'] }
            ])
        },

        // ─── SOFT SKILLS ─────────────────────────────────────────────────
        {
            courseTitle: 'Career Readiness: Interview Prep & CV Writing',
            subtitle: 'Land your dream tech job with proven interview strategies',
            descriptionText: 'Prepare for the Ethiopian and global tech job market. This course covers professional CV and portfolio building, LinkedIn optimization, technical interview preparation (DSA basics, system design), behavioral interviews, salary negotiation, and freelancing on global platforms like Upwork and Fiverr.',
            technicalCategory: 'Business & Marketing',
            language: 'English',
            level: 'Beginner',
            estimatedDurationHours: 18,
            price: 0,
            averageRating: 4.7, totalReviews: 423, totalEnrollments: 2400,
            publicationState: 'Active',
            requirements: ['Completing at least one technical course is helpful', 'Open mind and willingness to practice'],
            learningObjectives: ['Write an ATS-friendly CV', 'Build a professional LinkedIn profile', 'Ace technical interviews', 'Negotiate your salary confidently', 'Start freelancing online'],
            tags: ['Career', 'Interview', 'CV Writing', 'Soft Skills', 'LinkedIn'],
            creatorRef: kalkidan._id,
            curriculumTree: makeCurriculum([
                { title: 'Personal Branding', lessons: ['Defining Your Tech Niche', 'Building a Portfolio', 'GitHub Profile Optimization', 'LinkedIn Profile', 'Personal Website'] },
                { title: 'CV & Application', lessons: ['ATS-Optimized CV', 'Cover Letter Writing', 'Job Application Strategy', 'Portfolio Presentation', 'References'] },
                { title: 'Interview Preparation', lessons: ['Technical Interview Types', 'DSA for Interviews', 'System Design Basics', 'Behavioral Questions (STAR)', 'Mock Interview Practice'] },
                { title: 'Salary & Negotiation', lessons: ['Understanding Compensation', 'Negotiation Tactics', 'Offer Evaluation', 'Benefits & Perks', 'Remote Work Opportunities'] },
                { title: 'Freelancing', lessons: ['Upwork Profile Setup', 'Fiverr Gig Creation', 'Proposal Writing', 'Client Communication', 'Managing Projects Online'] }
            ])
        }
    ];
};

// ─── REVIEWS DATA ─────────────────────────────────────────────────────────────
const reviewComments = [
    'This course completely changed how I think about coding. The instructor explains everything so clearly!',
    'Best investment I have made in my career. Got a job offer 2 months after completing this course.',
    'Incredibly practical. Every lesson had real code that I could use immediately in my projects.',
    'The Ethiopian context examples made it so much easier to understand. Highly recommend!',
    'I tried many platforms but Emare ELMS content quality is on another level. 5 stars!',
    'Very well structured course. The projects really helped me build a strong portfolio.',
    'The instructor is patient and explains complex concepts in simple terms. Loved it!',
    'Perfect for beginners. I started with zero knowledge and can now build full web apps.',
    'The support from the instructor in the discussion board was exceptional. Very responsive!',
    'Completed this in 3 weeks while working full time. The bite-sized lessons made it manageable.'
];

// ─── MAIN SEED FUNCTION ───────────────────────────────────────────────────────
const seedDatabase = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/emare-elms';
        await mongoose.connect(mongoUri);
        console.log('\n🔗 MongoDB connected successfully.\n');

        // Clear existing seed data (keep admin)
        console.log('🗑️  Clearing existing courses, categories, and instructor accounts...');
        await Course.deleteMany({});
        await Category.deleteMany({});
        await Review.deleteMany({});
        await User.deleteMany({ assignedRole: { $in: ['Instructor', 'Student'] } });
        console.log('   ✅ Cleared.\n');

        // ── 1. Create Instructors ──────────────────────────────────────
        console.log('👨‍🏫 Creating instructor accounts...');
        const instructors = [];
        for (const data of instructorsData) {
            const instructor = await User.create(data);
            instructors.push(instructor);
            console.log(`   ✅ Created instructor: ${instructor.fullName} (${instructor.accountEmail})`);
        }

        // ── 2. Create Sample Students ──────────────────────────────────
        console.log('\n🎓 Creating sample student accounts...');
        const studentsData = [
            { fullName: 'Abeba Tsehay', accountEmail: 'abeba.tsehay@student.emare.et', securedPassword: 'Student123!', assignedRole: 'Student', country: 'Ethiopia', city: 'Debre Birhan', gamificationPoints: 1250, level: 5 },
            { fullName: 'Yonas Kebede', accountEmail: 'yonas.kebede@student.emare.et', securedPassword: 'Student123!', assignedRole: 'Student', country: 'Ethiopia', city: 'Addis Ababa', gamificationPoints: 830, level: 3 },
            { fullName: 'Hiwot Girma', accountEmail: 'hiwot.girma@student.emare.et', securedPassword: 'Student123!', assignedRole: 'Student', country: 'Ethiopia', city: 'Bahir Dar', gamificationPoints: 2100, level: 8 },
            { fullName: 'Bereket Alemu', accountEmail: 'bereket.alemu@student.emare.et', securedPassword: 'Student123!', assignedRole: 'Student', country: 'Ethiopia', city: 'Hawassa', gamificationPoints: 560, level: 2 },
            { fullName: 'Selamawit Tadesse', accountEmail: 'selamawit.t@student.emare.et', securedPassword: 'Student123!', assignedRole: 'Student', country: 'Ethiopia', city: 'Debre Birhan', gamificationPoints: 1800, level: 7 }
        ];
        const students = [];
        for (const data of studentsData) {
            const student = await User.create(data);
            students.push(student);
            console.log(`   ✅ Created student: ${student.fullName}`);
        }

        // ── 3. Create Categories ───────────────────────────────────────
        console.log('\n📂 Creating course categories...');
        const categories = [];
        for (const data of categoriesData) {
            const cat = await Category.create(data);
            categories.push(cat);
            console.log(`   ✅ Category: ${cat.icon} ${cat.name}`);
        }

        // ── 4. Create Courses ──────────────────────────────────────────
        console.log('\n📚 Creating courses...');
        const coursesData = buildCoursesData(instructors);
        const courses = [];
        for (const data of coursesData) {
            const course = await Course.create(data);
            courses.push(course);
            console.log(`   ✅ Course: "${course.courseTitle}" by instructor (${course.creatorRef})`);
        }

        // ── 5. Create Sample Reviews ───────────────────────────────────
        console.log('\n⭐ Creating sample reviews...');
        let reviewCount = 0;
        for (const course of courses.slice(0, 8)) {
            for (let i = 0; i < 3; i++) {
                const student = students[i % students.length];
                await Review.create({
                    courseRef: course._id,
                    studentRef: student._id,
                    rating: [4, 5, 5][i],
                    reviewText: reviewComments[(reviewCount + i) % reviewComments.length]
                });
                reviewCount++;
            }
        }
        console.log(`   ✅ Created ${reviewCount} reviews.`);

        // ─── SUMMARY ──────────────────────────────────────────────────
        console.log('\n' + '='.repeat(60));
        console.log('🎉  DATABASE SEEDED SUCCESSFULLY!');
        console.log('='.repeat(60));
        console.log(`\n📊 Summary:`);
        console.log(`   👨‍🏫 Instructors created : ${instructors.length}`);
        console.log(`   🎓 Students created    : ${students.length}`);
        console.log(`   📂 Categories created  : ${categories.length}`);
        console.log(`   📚 Courses created     : ${courses.length}`);
        console.log(`   ⭐ Reviews created     : ${reviewCount}`);

        console.log('\n📋 Instructor Login Credentials:');
        instructors.forEach(inst => {
            console.log(`   ${inst.fullName}: ${inst.accountEmail} / Instructor123!`);
        });

        console.log('\n📋 Student Login Credentials:');
        students.forEach(st => {
            console.log(`   ${st.fullName}: ${st.accountEmail} / Student123!`);
        });

        console.log('\n🔐 Admin Credentials:');
        console.log('   admin@emare.edu.et / SecurePassword123!\n');
        console.log('='.repeat(60));

        process.exit(0);
    } catch (err) {
        console.error('\n❌ Seeding failed:', err.message);
        if (err.errors) {
            Object.values(err.errors).forEach(e => console.error('   -', e.message));
        }
        process.exit(1);
    }
};

seedDatabase();

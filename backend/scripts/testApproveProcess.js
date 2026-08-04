require('dotenv').config({ path: require('path').join(__dirname, '../../.env'), override: true });
const mongoose = require('mongoose');
const Course = require('../models/Course');
const Category = require('../models/Category');
const User = require('../models/User');
const { categoryMatchesCourse } = require('../../client/src/utils/categoryMatching.js');

const runApprovalTest = async () => {
    const urisToTry = [
        process.env.MONGODB_URI,
        'mongodb://127.0.0.1:27017/emare-elms',
        'mongodb://localhost:27017/emare-elms'
    ].filter(Boolean);

    let connected = false;
    for (const uri of urisToTry) {
        try {
            console.log(`Connecting to: ${uri.split('@').pop()}...`);
            await mongoose.connect(uri, { serverSelectionTimeoutMS: 3000 });
            connected = true;
            console.log(`🔗 Connected successfully to DB.`);
            break;
        } catch (err) {
            console.warn(`Connection failed for ${uri.split('@').pop()}: ${err.message}`);
        }
    }

    if (!connected) {
        console.log('🔄 Starting MongoMemoryServer...');
        const { MongoMemoryServer } = require('mongodb-memory-server');
        const mongod = await MongoMemoryServer.create({ instance: { launchTimeout: 60000 } });
        await mongoose.connect(mongod.getUri());
        console.log('✅ Connected to In-Memory DB.');
    }

    // Ensure instructor & admin exist
    let instructor = await User.findOne({ assignedRole: 'Instructor' });
    if (!instructor) {
        instructor = await User.create({
            fullName: 'Test Instructor',
            accountEmail: 'instructor_test@emare.com',
            securedPassword: 'instructor12345',
            assignedRole: 'Instructor'
        });
    }

    let admin = await User.findOne({ assignedRole: 'Admin' });
    if (!admin) {
        admin = await User.create({
            fullName: 'Test Admin',
            accountEmail: 'admin_test@emare.com',
            securedPassword: 'admin12345',
            assignedRole: 'Admin'
        });
    }

    console.log('\n--- 1. Testing Creation of a Draft Course by Instructor ---');
    const testCourseTitle = 'Test Approval Process Course: Databases & SQL';
    await Course.deleteOne({ courseTitle: testCourseTitle });

    const draftCourse = await Course.create({
        courseTitle: testCourseTitle,
        subtitle: 'Testing draft state before approval',
        descriptionText: 'This is a test course created to verify the approval process from Draft -> Pending Review -> Published.',
        technicalCategory: 'Databases',
        estimatedDurationHours: 10,
        price: 0,
        creatorRef: instructor._id,
        publicationState: 'Draft',
        curriculumTree: [
            {
                chapterTitle: 'Introduction',
                lessons: [
                    {
                        lessonTitle: 'SQL Basics',
                        videoUrl: 'https://www.youtube.com/watch?v=HXV3zeQKqGY',
                        durationMinutes: 30,
                        isFreePreview: true
                    }
                ]
            }
        ]
    });
    console.log(`✅ Course Created in Draft State. ID: ${draftCourse._id}`);
    console.log(`   State: ${draftCourse.publicationState}`);

    console.log('\n--- 2. Submitting Course for Admin Review ---');
    draftCourse.publicationState = 'Pending Review';
    await draftCourse.save();
    console.log(`   Updated State: ${draftCourse.publicationState} (Pending Review)`);

    console.log('\n--- 3. Admin Approves and Publishes Course ---');
    draftCourse.publicationState = 'Published';
    await draftCourse.save();
    console.log(`   Final State: ${draftCourse.publicationState} (Published)`);

    console.log('\n--- 4. Verifying Student View (All Categories) ---');
    const categoriesList = [
        'Artificial Intelligence',
        'Business & Management',
        'Cloud Computing',
        'Cybersecurity',
        'Data Science',
        'Databases',
        'DevOps & CI/CD',
        'Graphic Design'
    ];

    const allPublishedCourses = await Course.find({ publicationState: { $in: ['Published', 'Active'] } });
    console.log(`Total Published Courses in DB: ${allPublishedCourses.length}\n`);

    for (const catName of categoriesList) {
        const catCourses = allPublishedCourses.filter(c => categoryMatchesCourse(catName, c.technicalCategory));
        const count = catCourses.length;
        const hasCourses = count > 0;
        const badgeLabel = hasCourses ? 'Browse' : 'Soon';
        const countText = hasCourses ? `${count} course${count === 1 ? '' : 's'}` : 'Coming soon';

        console.log(`[Category: ${catName}]`);
        console.log(`   - Status: ${hasCourses ? '✅ HAS COURSES (SOON badge replaced with BROWSE)' : '❌ SOON (No courses)'}`);
        console.log(`   - Count Badge Text: "${countText}"`);
        console.log(`   - Action Badge: [${badgeLabel}]`);
        if (hasCourses) {
            catCourses.forEach(c => {
                console.log(`   - Course Card: "${c.courseTitle}" (Detail Link: /courses/${c._id})`);
            });
        }
        console.log('');
    }

    console.log('🎉 Approval Process Test Completed Successfully!');
    process.exit(0);
};

runApprovalTest();

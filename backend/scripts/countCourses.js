const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Course = require('../models/Course');
const Category = require('../models/Category');

async function countCourses() {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/emare-elms';
        await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 3000 }).catch(async () => {
            console.log('Connecting to local fallback mongo...');
            await mongoose.connect('mongodb://127.0.0.1:27017/emare-elms');
        });

        const totalCourses = await Course.countDocuments();
        const courses = await Course.find({}).select('courseTitle technicalCategory publicationState level price curriculumTree').lean();
        const categories = await Category.find({}).select('name categoryName courseCount').lean();

        console.log('\n====================================================');
        console.log(`📊 TOTAL COURSES PRESENT IN DATABASE: ${totalCourses}`);
        console.log('====================================================\n');

        courses.forEach((c, idx) => {
            const lessonCount = (c.curriculumTree || []).reduce((sum, ch) => sum + (ch.lessons?.length || 0), 0);
            console.log(`${idx + 1}. [${c.technicalCategory}] ${c.courseTitle}`);
            console.log(`   - State: ${c.publicationState} | Level: ${c.level} | Price: ${c.price} ETB | Lessons: ${lessonCount}`);
        });

        console.log('\n====================================================');
        console.log(`📁 CATEGORIES BREAKDOWN (${categories.length} Categories):`);
        console.log('====================================================');
        categories.forEach((cat, idx) => {
            const catName = cat.name || cat.categoryName;
            const matchingCount = courses.filter(c => c.technicalCategory === catName).length;
            console.log(`${idx + 1}. ${catName}: ${matchingCount} Course(s) [Database count: ${cat.courseCount || 0}]`);
        });

        await mongoose.disconnect();
    } catch (err) {
        console.error('Error counting courses:', err.message);
        process.exit(1);
    }
}

countCourses();

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env'), override: true });
dotenv.config({ path: path.join(__dirname, '../.env'), override: true });
const Course = require('../models/Course');

const pricesMap = {
    'Graphic Design & UI/UX Essentials': 130,
    'DevOps, Docker & CI/CD Pipelines': 190,
    'SQL & MongoDB Complete Guide': 110,
    'Data Science & Python Analytics': 140,
    'Cybersecurity & Ethical Hacking Essentials': 160,
    'Cloud Computing & AWS Architecture': 180,
    'Business & Management Fundamentals': 120,
    'Artificial Intelligence & Machine Learning Fundamentals': 150
};

const defaultPrices = [120, 130, 140, 150, 160, 170, 180, 190, 200];

const updatePrices = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/emare-elms';
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB.');

        const courses = await Course.find({});
        console.log(`Found ${courses.length} courses to update.`);

        let updatedCount = 0;
        for (let i = 0; i < courses.length; i++) {
            const course = courses[i];
            const newPrice = pricesMap[course.courseTitle] || defaultPrices[i % defaultPrices.length];
            course.price = newPrice;
            await course.save();
            console.log(`Updated course "${course.courseTitle}" price to ${newPrice} ETB.`);
            updatedCount++;
        }

        console.log(`✅ Successfully updated ${updatedCount} courses with prices between 100 ETB and 200 ETB!`);
        process.exit(0);
    } catch (err) {
        console.error('Error updating course prices:', err);
        process.exit(1);
    }
};

updatePrices();

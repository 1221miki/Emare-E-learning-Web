/**
 * Script to check which courses have thumbnails and which don't
 * Run with: node backend/scripts/check-thumbnails.js
 */

const mongoose = require('mongoose');
require('dotenv').config();
const Course = require('../models/Course');

async function checkThumbnails() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✓ Connected to MongoDB');

        // Get all courses
        const courses = await Course.find({})
            .select('courseTitle thumbnailUrl publicationState creationTimestamp')
            .lean();

        console.log('\n' + '='.repeat(80));
        console.log('COURSE THUMBNAIL STATUS REPORT');
        console.log('='.repeat(80) + '\n');

        // Categorize courses
        const withThumbnails = courses.filter(c => c.thumbnailUrl && c.thumbnailUrl.trim());
        const withoutThumbnails = courses.filter(c => !c.thumbnailUrl || !c.thumbnailUrl.trim());
        const published = courses.filter(c => ['Published', 'Active'].includes(c.publicationState));
        const publishedWithThumbnails = published.filter(c => c.thumbnailUrl && c.thumbnailUrl.trim());

        // Print summary
        console.log(`Total Courses: ${courses.length}`);
        console.log(`  ✓ With Thumbnails: ${withThumbnails.length}`);
        console.log(`  ✗ Without Thumbnails: ${withoutThumbnails.length}`);
        console.log(`  📋 Published/Active: ${published.length}`);
        console.log(`  📋 Published WITH Thumbnails: ${publishedWithThumbnails.length}\n`);

        // List courses without thumbnails
        if (withoutThumbnails.length > 0) {
            console.log('COURSES NEEDING THUMBNAILS:');
            console.log('-'.repeat(80));
            withoutThumbnails.forEach((c, idx) => {
                console.log(`${idx + 1}. ${c.courseTitle}`);
                console.log(`   State: ${c.publicationState}`);
                console.log(`   ID: ${c._id}`);
            });
            console.log();
        }

        // List published courses without thumbnails
        const publishedWithoutThumbnails = published.filter(c => !c.thumbnailUrl || !c.thumbnailUrl.trim());
        if (publishedWithoutThumbnails.length > 0) {
            console.log('🚨 PUBLISHED COURSES WITHOUT THUMBNAILS (Should be visible):');
            console.log('-'.repeat(80));
            publishedWithoutThumbnails.forEach((c, idx) => {
                console.log(`${idx + 1}. ${c.courseTitle} (ID: ${c._id})`);
            });
            console.log();
        }

        // Sample courses with thumbnails
        if (withThumbnails.length > 0) {
            console.log('SAMPLE COURSES WITH THUMBNAILS:');
            console.log('-'.repeat(80));
            withThumbnails.slice(0, 3).forEach((c, idx) => {
                console.log(`${idx + 1}. ${c.courseTitle}`);
                console.log(`   Thumbnail: ${c.thumbnailUrl.substring(0, 60)}...`);
                console.log(`   State: ${c.publicationState}`);
            });
        }

        console.log('\n' + '='.repeat(80));
        console.log('END OF REPORT');
        console.log('='.repeat(80) + '\n');

        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
}

checkThumbnails();

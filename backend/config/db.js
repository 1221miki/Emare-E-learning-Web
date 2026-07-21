const mongoose = require('mongoose');
const dns = require('dns');

try {
    dns.setDefaultResultOrder('ipv4first');
    dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

const connectDB = async () => {
    const configuredUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/emare-elms';

    try {
        // First, try connecting to the configured MongoDB URI
        const conn = await mongoose.connect(configuredUri);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (err) {
        console.warn(`⚠️  Could not connect to configured MongoDB (${err.message})`);
        console.log('🔄 Starting In-Memory MongoDB for development...');

        try {
            // Fallback: use mongodb-memory-server for local development
            const { MongoMemoryServer } = require('mongodb-memory-server');
            const mongod = await MongoMemoryServer.create({
                instance: {
                    launchTimeout: 60000, // 60 seconds for slow cold starts
                },
            });
            const memoryUri = mongod.getUri();

            const conn = await mongoose.connect(memoryUri);
            console.log(`✅ In-Memory MongoDB Connected: ${conn.connection.host}`);
            console.log('ℹ️  Note: Data will not persist after server restart.');

            // Seed default users for development
            await seedDefaultData();
        } catch (memErr) {
            console.error(`❌ Failed to start In-Memory MongoDB: ${memErr.message}`);
            process.exit(1);
        }
    }
};

// Seed some default data so the app is usable out of the box
async function seedDefaultData() {
    try {
        const User = require('../models/User');

        // Create default admin user
        const existingAdmin = await User.findOne({ accountEmail: 'admin@emare.com' });
        if (!existingAdmin) {
            await User.create({
                fullName: 'Admin User',
                accountEmail: 'admin@emare.com',
                securedPassword: 'admin12345',
                assignedRole: 'Admin',
            });
            console.log('👤 Default admin created: admin@emare.com / admin12345');
        }

        // Create default student user
        const existingStudent = await User.findOne({ accountEmail: 'student@emare.com' });
        if (!existingStudent) {
            await User.create({
                fullName: 'Demo Student',
                accountEmail: 'student@emare.com',
                securedPassword: 'student12345',
                assignedRole: 'Student',
            });
            console.log('👤 Default student created: student@emare.com / student12345');
        }

        // Create default instructor user
        const existingInstructor = await User.findOne({ accountEmail: 'instructor@emare.com' });
        if (!existingInstructor) {
            await User.create({
                fullName: 'Demo Instructor',
                accountEmail: 'instructor@emare.com',
                securedPassword: 'instructor12345',
                assignedRole: 'Instructor',
            });
            console.log('👤 Default instructor created: instructor@emare.com / instructor12345');
        }

        console.log('✅ Default data seeded successfully.');
    } catch (seedErr) {
        console.warn(`⚠️  Could not seed default data: ${seedErr.message}`);
    }
}

module.exports = connectDB;

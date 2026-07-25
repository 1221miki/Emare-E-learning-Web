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

        console.log('Test accounts seeded successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Error seeding test users:', err);
        process.exit(1);
    }
};

seedUsers();

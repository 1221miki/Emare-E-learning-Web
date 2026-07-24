require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

const seedAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/emare-elms');
        console.log('MongoDB connected.');

        const adminEmail = 'admin@emare.edu.et';
        let admin = await User.findOne({ accountEmail: adminEmail });

        if (admin) {
            console.log(`Admin user already exists: ${adminEmail}`);
        } else {
            admin = await User.create({
                fullName: 'Emare Master Admin',
                accountEmail: adminEmail,
                securedPassword: 'SecurePassword123!',
                assignedRole: 'Admin',
                isActive: true
            });
            console.log(`Created admin user successfully.`);
            console.log(`Email: ${adminEmail}`);
            console.log(`Password: SecurePassword123!`);
        }

        process.exit(0);
    } catch (err) {
        console.error('Error seeding admin:', err);
        process.exit(1);
    }
};

seedAdmin();

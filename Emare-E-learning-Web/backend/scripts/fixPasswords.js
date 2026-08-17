require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

const fixPasswords = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected');

        // Only the Master Admin account is a seeded default account.
        // Demo accounts (admin@emare.com, student@emare.com, instructor@emare.com)
        // have been removed from seeding — do not reset them here.
        const accounts = [
            { email: 'ayireszebene8877@gmail.com', password: 'Admin@Emare2026!' }
        ];

        for (const { email, password } of accounts) {
            const user = await User.findOne({ accountEmail: email }).select('+securedPassword');
            if (user) {
                user.securedPassword = password;
                user.markModified('securedPassword'); // Force Mongoose to trigger pre-save hook
                await user.save();
                console.log(`Password reset and forcibly hashed for ${email}`);
            } else {
                console.log(`Account not found: ${email}`);
            }
        }
        
        console.log('Done!');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

fixPasswords();

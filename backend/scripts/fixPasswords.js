require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

const fixPasswords = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected');
        
        const emails = ['admin@emare.com', 'student@emare.com', 'instructor@emare.com'];
        const passwords = ['admin12345', 'student12345', 'instructor12345'];
        
        for (let i = 0; i < emails.length; i++) {
            const user = await User.findOne({ accountEmail: emails[i] }).select('+securedPassword');
            if (user) {
                user.securedPassword = passwords[i];
                user.markModified('securedPassword'); // Force Mongoose to trigger pre-save hook
                await user.save();
                console.log(`Password reset and forcibly hashed for ${emails[i]}`);
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

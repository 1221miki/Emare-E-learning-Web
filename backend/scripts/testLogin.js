require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

const testLogin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        
        const accounts = [
            { email: 'admin@emare.com', pass: 'admin12345' },
            { email: 'student@emare.com', pass: 'student12345' },
            { email: 'instructor@emare.com', pass: 'instructor12345' }
        ];

        for (const acc of accounts) {
            const user = await User.findOne({ accountEmail: acc.email }).select('+securedPassword');
            if (!user) {
                console.log(`User not found: ${acc.email}`);
                continue;
            }
            const match = await user.comparePassword(acc.pass);
            console.log(`Email: ${acc.email} | Tested Pass: ${acc.pass} | Match: ${match}`);
        }
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

testLogin();

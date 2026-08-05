require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

const checkUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected');
        
        const users = await User.find({}).select('+securedPassword');
        console.log('Total users found:', users.length);
        
        users.forEach(u => {
            console.log(`Email: "${u.accountEmail}", Role: "${u.assignedRole}", Active: ${u.isActive}, PasswordHashLength: ${u.securedPassword ? u.securedPassword.length : 0}`);
        });
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

checkUsers();

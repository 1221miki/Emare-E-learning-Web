const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: [true, 'Full name is required'],
        trim: true,
        maxlength: [100, 'Name cannot exceed 100 characters']
    },
    accountEmail: {
        type: String,
        required: [true, 'Email address is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address']
    },
    securedPassword: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [8, 'Password must be at least 8 characters long'],
        select: false // Prevents password leaking in routine queries
    },
    assignedRole: {
        type: String,
        enum: ['Student', 'Instructor', 'Admin'],
        default: 'Student'
    },
    avatarUrl: {
        type: String,
        default: ''
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastLoginTimestamp: {
        type: Date
    },
    // Gamification Engine Fields
    gamificationPoints: {
        type: Number,
        default: 0
    },
    level: {
        type: Number,
        default: 1
    },
    earnedBadges: {
        type: [String],
        default: []
    },
    // Instructor Specific Fields
    biography: {
        type: String,
        trim: true,
        maxlength: [1000, 'Biography cannot exceed 1000 characters']
    },
    qualifications: {
        type: [String],
        default: []
    },
    workExperience: {
        type: [String],
        default: []
    },
    teachingLanguages: {
        type: [String],
        default: []
    },
    socialMediaLinks: {
        linkedin: { type: String, trim: true },
        twitter: { type: String, trim: true },
        website: { type: String, trim: true },
        youtube: { type: String, trim: true }
    },
    contactPhone: {
        type: String,
        trim: true
    },
    // Extended Personal Information Fields
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    username: { type: String, trim: true },
    gender: { type: String, enum: ['Male', 'Female', 'Non-binary', 'Prefer not to say', ''], default: '' },
    dateOfBirth: { type: Date },
    country: { type: String, trim: true },
    city: { type: String, trim: true },
    address: { type: String, trim: true },
    occupation: { type: String, trim: true },
    company: { type: String, trim: true },
    githubUrl: { type: String, trim: true },
    
    // Account Settings & Preferences
    twoFactorEnabled: { type: Boolean, default: false },
    preferredLanguage: { type: String, default: 'English' },
    timeZone: { type: String, default: 'UTC+3 (East Africa Time)' },
    notificationPreferences: {
        emailAlerts: { type: Boolean, default: true },
        courseUpdates: { type: Boolean, default: true },
        promotions: { type: Boolean, default: false }
    },
    isPublicProfile: { type: Boolean, default: true }
}, {
    timestamps: { createdAt: 'creationTimestamp', updatedAt: 'updatedAt' }
});

// Pre-save hook to automatically hash passwords before database storage
UserSchema.pre('save', async function (next) {
    if (!this.isModified('securedPassword')) return next();
    try {
        const salt = await bcrypt.genSalt(10); // As per NFR-S1
        this.securedPassword = await bcrypt.hash(this.securedPassword, salt);
        next();
    } catch (err) {
        next(err);
    }
});

// Instance method to compare incoming login passwords securely
UserSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.securedPassword);
};

module.exports = mongoose.model('User', UserSchema);

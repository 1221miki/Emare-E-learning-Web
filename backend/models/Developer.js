const mongoose = require('mongoose');

const ExperienceSchema = new mongoose.Schema({
    role: { type: String, trim: true, default: '' },
    company: { type: String, trim: true, default: '' },
    duration: { type: String, trim: true, default: '' },
    description: { type: String, trim: true, default: '' }
}, { _id: true });

const DeveloperSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Developer name is required'],
        trim: true
    },
    title: {
        type: String,
        required: [true, 'Developer title is required'],
        trim: true
    },
    // Image URL string (Cloudinary asset URL or any external image URL).
    // Populated either directly via the API payload or by uploading a file
    // through the POST/PUT endpoints (multipart/form-data, field "profilePicture").
    profilePicture: {
        type: String,
        required: [true, 'Profile picture is required'],
        trim: true
    },
    // Optional fallback shown when the image fails to load.
    initials: {
        type: String,
        trim: true,
        uppercase: true,
        maxlength: [4, 'Initials must be 4 characters or less'],
        default: ''
    },
    skills: {
        type: [String],
        required: [true, 'At least one skill is required'],
        validate: {
            validator: (v) => Array.isArray(v) && v.length > 0,
            message: 'At least one skill is required'
        }
    },
    summary: {
        type: String,
        trim: true,
        default: ''
    },
    experiences: {
        type: [ExperienceSchema],
        default: []
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Developer', DeveloperSchema);

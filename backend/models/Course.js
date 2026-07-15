const mongoose = require('mongoose');

const LessonSchema = new mongoose.Schema({
    lessonTitle: {
        type: String,
        required: true,
        trim: true
    },
    videoUrl: {
        type: String, // Cloudinary or secure CDN link
        required: true
    },
    durationMinutes: {
        type: Number,
        default: 0
    },
    isFreePreview: {
        type: Boolean,
        default: false
    }
});

const ChapterSchema = new mongoose.Schema({
    chapterTitle: {
        type: String,
        required: true,
        trim: true
    },
    lessons: [LessonSchema]
});

const CourseSchema = new mongoose.Schema({
    courseTitle: {
        type: String,
        required: [true, 'Course title is required'],
        unique: true,
        trim: true,
        minlength: [5, 'Title must be at least 5 characters'],
        maxlength: [150, 'Title cannot exceed 150 characters']
    },
    subtitle: {
        type: String,
        trim: true,
        maxlength: [200, 'Subtitle cannot exceed 200 characters']
    },
    descriptionText: {
        type: String,
        required: true,
        minlength: [20, 'Description must be at least 20 characters']
    },
    technicalCategory: {
        type: String,
        enum: [
            'Web Coding',
            'Creative Media',
            'Robotics Hardware',
            'Network Engineering',
            'Mobile Development',
            'Data Science',
            'Cyber Security',
            'Cloud Computing',
            'Artificial Intelligence',
            'Business & Marketing'
        ],
        required: true
    },
    language: {
        type: String,
        enum: ['English', 'Amharic', 'Afaan Oromo'],
        default: 'English'
    },
    level: {
        type: String,
        enum: ['Beginner', 'Intermediate', 'Advanced'],
        default: 'Beginner'
    },
    requirements: {
        type: [String],
        default: []
    },
    learningObjectives: {
        type: [String],
        default: []
    },
    tags: {
        type: [String],
        default: []
    },
    creatorRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    curriculumTree: [ChapterSchema],
    publicationState: {
        type: String,
        enum: ['Draft', 'Pending Audit', 'Active', 'Archived'],
        default: 'Draft'
    },
    estimatedDurationHours: {
        type: Number,
        required: true
    },
    price: {
        type: Number,
        default: 0
    },
    thumbnailUrl: String,
    previewVideoUrl: String,
    totalEnrollments: {
        type: Number,
        default: 0
    },
    averageRating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    totalReviews: {
        type: Number,
        default: 0
    }
}, {
    timestamps: { createdAt: 'creationTimestamp', updatedAt: 'updatedAt' }
});

module.exports = mongoose.model('Course', CourseSchema);

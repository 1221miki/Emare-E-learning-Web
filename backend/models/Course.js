const mongoose = require('mongoose');

const LessonSchema = new mongoose.Schema({
    lessonTitle: {
        type: String,
        required: true,
        trim: true
    },
    // clientId: stable client-side identifier used by the course-creation wizard
    // to match lessons to inline assignments within the same save (e.g.
    // "_abc123"). Not shown to students.
    clientId: {
        type: String,
        default: null,
        trim: true
    },
    videoUrl: {
        type: String, // Bunny Stream embed URL: https://iframe.mediadelivery.net/embed/LIBRARY_ID/VIDEO_GUID
        required: true
    },
    durationMinutes: {
        type: Number,
        default: 0
    },
    isFreePreview: {
        type: Boolean,
        default: false
    },
    resourceLink: {
        type: String,
        default: ''
    },
    notesPdfUrl: {
        type: String,
        default: ''
    },
    // ── Completion requirements (per-lesson) ────────────────────────────────
    // quizRequired: student must pass the linked quiz before marking this lesson complete
    quizRequired: {
        type: Boolean,
        default: false
    },
    // assignmentRequired: student must submit the linked assignment before marking complete
    assignmentRequired: {
        type: Boolean,
        default: false
    },
    // linkedQuizId: ObjectId of the Quiz document that gates this lesson
    linkedQuizId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Quiz',
        default: null
    },
    // linkedAssignmentId: ObjectId of the Assignment document that gates this lesson
    linkedAssignmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Assignment',
        default: null
    },
    // ── In-video quiz checkpoints ───────────────────────────────────────────
    // Each checkpoint represents one VIDEO CONCEPT segment. The video plays
    // from startSeconds → endSeconds (timestampSeconds), then pauses and shows
    // a quiz covering that concept. Students cannot continue past a checkpoint
    // until they pass it. Lesson completion requires every checkpoint to be
    // passed (enforced server-side).
    quizCheckpoints: [{
        _id: false,
        checkpointId: { type: String, required: true }, // stable client/server id
        title: { type: String, default: '', trim: true, maxlength: 120 },
        // startSeconds: where this concept begins in the video (default 0 for first concept)
        startSeconds: { type: Number, default: 0, min: 0 },
        // timestampSeconds: where the video PAUSES and the quiz is shown (concept end)
        timestampSeconds: { type: Number, required: true, min: 0 },
        passingScorePercent: { type: Number, default: 60, min: 0, max: 100 },
        questions: [{
            _id: false,
            questionText: { type: String, required: true, trim: true },
            options: { type: [String], required: true },
            correctAnswerIndex: { type: Number, required: true, min: 0 }
        }]
    }]
});

const ChapterSchema = new mongoose.Schema({
    chapterTitle: {
        type: String,
        required: true,
        trim: true
    },
    lessons: [LessonSchema]
});

// Course Notes — plain study/reference notes authored by the instructor/admin
// during course creation. Visible to enrolled students inside the workspace.
const CourseNoteSchema = new mongoose.Schema({
    title: {
        type: String,
        trim: true,
        maxlength: 150,
        default: ''
    },
    content: {
        type: String,
        required: true,
        trim: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    _id: true
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
            'Cybersecurity',
            'Cloud Computing',
            'Artificial Intelligence',
            'Business & Management',
            'Databases',
            'DevOps & CI/CD',
            'Graphic Design'
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
    resources: [{
        name: { type: String, trim: true },
        url: { type: String, trim: true }
    }],
    creatorRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    assignedInstructorRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    curriculumTree: [ChapterSchema],
    publicationState: {
        type: String,
        enum: ['Draft', 'Pending Review', 'Revision Needed', 'Published', 'Active', 'Archived'],
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
    discountPrice: {
        type: Number,
        default: null,
        validate: {
            validator: function(value) {
                if (value === null || value === undefined) return true;
                return value >= 0 && value < this.price;
            },
            message: 'Discount price must be less than the original price'
        }
    },
    thumbnailUrl: String,
    previewVideoUrl: String,
    notes: [CourseNoteSchema],
    isFeatured: {
        type: Boolean,
        default: false
    },
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
    },
    adminFeedback: [{
        adminRef: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        message: {
            type: String,
            trim: true
        },
        action: {
            type: String,
            enum: ['Feedback', 'Revision Requested', 'Rejected', 'Approved'],
            default: 'Feedback'
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }]
}, {
    timestamps: { createdAt: 'creationTimestamp', updatedAt: 'updatedAt' }
});

module.exports = mongoose.model('Course', CourseSchema);

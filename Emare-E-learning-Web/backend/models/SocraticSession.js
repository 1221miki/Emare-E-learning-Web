const mongoose = require('mongoose');

/**
 * SocraticSession Model
 * Tracks Socratic method tutoring sessions with structured dialogue
 */
const SocraticMessageSchema = new mongoose.Schema({
    role: {
        type: String,
        enum: ['student', 'tutor'],
        required: true
    },
    content: {
        type: String,
        required: true
    },
    // Socratic method category
    messageType: {
        type: String,
        enum: ['question', 'response', 'clarification', 'evaluation', 'hint', 'hint_request'],
        default: 'response'
    },
    // Whether this was generated using Socratic questioning
    usedSocraticMethod: {
        type: Boolean,
        default: false
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

const SocraticSessionSchema = new mongoose.Schema({
    studentRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    courseRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },

    sessionId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },

    title: {
        type: String,
        default: 'Socratic Learning Session'
    },

    topic: {
        type: String,
        description: 'Learning topic or concept being discussed'
    },

    // Dialogue history
    messages: [SocraticMessageSchema],

    // Learning goals for this session
    learningObjectives: [String],

    // Student comprehension level (1-5)
    comprehensionLevel: {
        type: Number,
        min: 1,
        max: 5,
        default: 3
    },

    // Socratic method settings
    socraticSettings: {
        mode: {
            type: String,
            enum: ['questioning', 'evaluative', 'exploratory', 'mixed'],
            default: 'mixed'
        },
        // Whether to ask follow-up clarification questions
        askClarifications: {
            type: Boolean,
            default: true
        },
        // Whether to evaluate student answers
        evaluateResponses: {
            type: Boolean,
            default: true
        },
        // Difficulty level (1-5)
        difficultyLevel: {
            type: Number,
            min: 1,
            max: 5,
            default: 3
        }
    },

    // Progress metrics
    metrics: {
        totalQuestions: {
            type: Number,
            default: 0
        },
        correctResponses: {
            type: Number,
            default: 0
        },
        partialCorrect: {
            type: Number,
            default: 0
        },
        hintRequests: {
            type: Number,
            default: 0
        },
        sessionDuration: {
            // in minutes
            type: Number,
            default: 0
        }
    },

    // Context and metadata
    contextual: {
        courseContext: Object,
        lessonContext: Object,
        relevantResources: [String]
    },

    isActive: {
        type: Boolean,
        default: true,
        index: true
    },

    status: {
        type: String,
        enum: ['ongoing', 'completed', 'paused'],
        default: 'ongoing'
    }
}, { timestamps: true });

module.exports = mongoose.model('SocraticSession', SocraticSessionSchema);

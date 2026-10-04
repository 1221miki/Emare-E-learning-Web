const mongoose = require('mongoose');

/**
 * ContentEmbedding Model
 * Stores vectorized course lesson content for RAG (Retrieval-Augmented Generation)
 * Supports MongoDB Atlas Vector Search
 */
const ContentEmbeddingSchema = new mongoose.Schema({
    // Reference to the course
    courseRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true,
        index: true
    },

    // Reference to the lesson (index in the lessons array)
    lessonIndex: {
        type: Number,
        required: true
    },

    // Chapter index in the course
    chapterIndex: {
        type: Number,
        required: true
    },

    // Metadata about the lesson
    courseTitle: String,
    chapterTitle: String,
    lessonTitle: String,

    // Original content
    content: {
        type: String,
        required: true
    },

    // Chunk metadata
    chunkIndex: {
        type: Number,
        default: 0
    },
    totalChunks: {
        type: Number,
        default: 1
    },

    // Vector embedding (1536 dimensions for OpenAI text-embedding-3-small)
    // This will be indexed as vector search in MongoDB Atlas
    embedding: {
        type: [Number],
        required: false
    },

    // Metadata for context
    metadata: {
        videoUrl: String,
        resourceLink: String,
        notesPdfUrl: String,
        durationMinutes: Number,
        isFreePreview: Boolean
    },

    // Embedding generation timestamp
    embeddingGeneratedAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

// Index for vector search (will be created manually in MongoDB Atlas)
// db.contentembeddings.createIndex({ embedding: "cosmosSearch", "cosmosSearchConfig": { "kind": "vector-ivf", "dimension": 1536, "m": 4, "efConstruction": 400, "efSearch": 40, "maxConnections": 4, "seed": 42 } })
// For MongoDB Atlas: use the Search Index creation UI

module.exports = mongoose.model('ContentEmbedding', ContentEmbeddingSchema);

/**
 * generateEmbeddings.js
 * 
 * Script to generate vector embeddings for all course lessons
 * Populates the ContentEmbedding collection for RAG
 * Supports both OpenAI and Google Gemini APIs
 * 
 * Usage: node scripts/generateEmbeddings.js [courseId] [chunkSize]
 */

require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');
const Course = require('../models/Course');
const ContentEmbedding = require('../models/ContentEmbedding');

// Configuration
const CHUNK_SIZE = 500; // Characters per chunk
const AI_API_KEY = process.env.AI_API_KEY;
const AI_PROVIDER = process.env.AI_PROVIDER || 'gemini';
const AI_MODEL = process.env.AI_MODEL || 'gemini-flash-latest';
const DB_URI = process.env.MONGODB_URI;

if (!AI_API_KEY) {
    console.error('ERROR: AI_API_KEY not set in environment variables');
    process.exit(1);
}

/**
 * Generate embedding using Gemini API
 */
async function generateGeminiEmbedding(text) {
    try {
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/embedding-001:embedContent?key=${AI_API_KEY}`,
            {
                model: 'models/embedding-001',
                content: {
                    parts: [{ text: text.substring(0, 8191) }]
                }
            },
            {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );

        return response.data.embedding.values;
    } catch (error) {
        console.error('Error generating Gemini embedding:', error.message);
        throw error;
    }
}

/**
 * Generate embedding using OpenAI API
 */
async function generateOpenAIEmbedding(text) {
    try {
        const response = await axios.post(
            'https://api.openai.com/v1/embeddings',
            {
                input: text.substring(0, 8191), // OpenAI token limit
                model: 'text-embedding-3-small'
            },
            {
                headers: {
                    'Authorization': `Bearer ${AI_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );

        return response.data.data[0].embedding;
    } catch (error) {
        console.error('Error generating OpenAI embedding:', error.message);
        throw error;
    }
}

/**
 * Generate embedding for text using configured provider
 */
async function generateEmbedding(text) {
    if (AI_PROVIDER === 'gemini') {
        return await generateGeminiEmbedding(text);
    } else {
        return await generateOpenAIEmbedding(text);
    }
}

/**
 * Split text into chunks
 */
function chunkText(text, chunkSize = CHUNK_SIZE) {
    const chunks = [];
    for (let i = 0; i < text.length; i += chunkSize) {
        chunks.push(text.substring(i, i + chunkSize));
    }
    return chunks;
}

/**
 * Process a single course and generate embeddings for all lessons
 */
async function processCourseLessons(courseId) {
    try {
        console.log(`\n📚 Processing course: ${courseId}`);

        const course = await Course.findById(courseId);
        if (!course) {
            console.error(`Course not found: ${courseId}`);
            return false;
        }

        console.log(`Course: ${course.courseTitle}`);
        console.log(`Chapters: ${course.chapters?.length || 0}`);

        let totalEmbeddingsCreated = 0;

        // Process each chapter
        if (course.chapters && course.chapters.length > 0) {
            for (let chapterIndex = 0; chapterIndex < course.chapters.length; chapterIndex++) {
                const chapter = course.chapters[chapterIndex];
                console.log(`\n  📖 Chapter ${chapterIndex + 1}: ${chapter.chapterTitle}`);

                // Process each lesson in the chapter
                if (chapter.lessons && chapter.lessons.length > 0) {
                    for (let lessonIndex = 0; lessonIndex < chapter.lessons.length; lessonIndex++) {
                        const lesson = chapter.lessons[lessonIndex];
                        
                        // Build comprehensive lesson content
                        let lessonContent = `${lesson.lessonTitle}\n\n`;
                        if (lesson.resourceLink) {
                            lessonContent += `Resources: ${lesson.resourceLink}\n`;
                        }
                        if (lesson.durationMinutes) {
                            lessonContent += `Duration: ${lesson.durationMinutes} minutes\n`;
                        }

                        // Chunk the content
                        const chunks = chunkText(lessonContent);
                        console.log(`    📝 Lesson ${lessonIndex + 1}: ${lesson.lessonTitle} (${chunks.length} chunks)`);

                        // Generate embeddings for each chunk
                        for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
                            const chunk = chunks[chunkIndex];

                            try {
                                console.log(`      ⏳ Generating embedding ${chunkIndex + 1}/${chunks.length}...`);

                                const embedding = await generateEmbedding(chunk);

                                // Check if embedding already exists
                                const existingEmbedding = await ContentEmbedding.findOne({
                                    courseRef: courseId,
                                    chapterIndex,
                                    lessonIndex,
                                    chunkIndex
                                });

                                if (existingEmbedding) {
                                    // Update existing
                                    await ContentEmbedding.findByIdAndUpdate(
                                        existingEmbedding._id,
                                        {
                                            embedding,
                                            content: chunk,
                                            embeddingGeneratedAt: new Date()
                                        }
                                    );
                                    console.log(`      ✏️  Updated embedding`);
                                } else {
                                    // Create new
                                    await ContentEmbedding.create({
                                        courseRef: courseId,
                                        chapterIndex,
                                        lessonIndex,
                                        chunkIndex,
                                        totalChunks: chunks.length,
                                        courseTitle: course.courseTitle,
                                        chapterTitle: chapter.chapterTitle,
                                        lessonTitle: lesson.lessonTitle,
                                        content: chunk,
                                        embedding,
                                        metadata: {
                                            videoUrl: lesson.videoUrl,
                                            resourceLink: lesson.resourceLink,
                                            notesPdfUrl: lesson.notesPdfUrl,
                                            durationMinutes: lesson.durationMinutes,
                                            isFreePreview: lesson.isFreePreview
                                        }
                                    });
                                    totalEmbeddingsCreated++;
                                    console.log(`      ✅ Created embedding`);
                                }

                                // Rate limiting to avoid API throttling
                                await new Promise(resolve => setTimeout(resolve, 500));

                            } catch (error) {
                                console.error(`      ❌ Error processing chunk ${chunkIndex}:`, error.message);
                            }
                        }
                    }
                }
            }
        }

        console.log(`\n✨ Completed processing course: ${totalEmbeddingsCreated} new embeddings created`);
        return true;

    } catch (error) {
        console.error('Error processing course:', error);
        return false;
    }
}

/**
 * Generate embeddings for all courses
 */
async function generateAllEmbeddings() {
    try {
        console.log('🚀 Starting embedding generation...\n');

        // Connect to MongoDB
        await mongoose.connect(DB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Get all courses
        const courses = await Course.find().select('_id courseTitle');
        console.log(`Found ${courses.length} courses`);

        let successful = 0;
        let failed = 0;

        for (const course of courses) {
            const result = await processCourseLessons(course._id.toString());
            if (result) {
                successful++;
            } else {
                failed++;
            }
        }

        console.log(`\n\n📊 Summary:`);
        console.log(`✅ Successfully processed: ${successful} courses`);
        console.log(`❌ Failed: ${failed} courses`);

        await mongoose.connection.close();
        console.log('\n✨ Embedding generation complete!');

    } catch (error) {
        console.error('Error in main function:', error);
        process.exit(1);
    }
}

/**
 * Main entry point
 */
const args = process.argv.slice(2);
const courseId = args[0];
const chunkSize = parseInt(args[1]) || CHUNK_SIZE;

(async () => {
    if (courseId) {
        // Process specific course
        console.log(`🚀 Starting embedding generation for course: ${courseId}`);
        await mongoose.connect(DB_URI);
        const result = await processCourseLessons(courseId);
        await mongoose.connection.close();
        process.exit(result ? 0 : 1);
    } else {
        // Process all courses
        await generateAllEmbeddings();
    }
})();

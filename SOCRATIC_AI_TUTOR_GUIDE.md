# 🎓 Socratic AI Tutor - Complete Implementation Guide

## በአማርኛ | In Amharic

ሰላም! ይህ የ**Socratic AI Tutor** ን ወደ MERN Stack ዕሳታ ውስጥ ሙሉ ስታቦ ነው።

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Setup Instructions](#setup-instructions)
4. [Database Configuration](#database-configuration)
5. [API Endpoints](#api-endpoints)
6. [Integration Steps](#integration-steps)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)

---

## Overview

The **Socratic AI Tutor** is an advanced AI-powered learning assistant that:

- 🧑‍🏫 Asks probing questions using the Socratic method
- 🔍 Retrieves relevant course content using Vector Search (RAG)
- 📊 Tracks student comprehension and adapts difficulty
- 💬 Streams real-time responses using Server-Sent Events (SSE)
- 🎯 Provides personalized feedback and hints
- 📈 Generates learning summaries and metrics

### Key Features

| Feature | Description |
|---------|-------------|
| **Socratic Method** | Guides students through questioning and dialogue |
| **Vector Search (RAG)** | Retrieves relevant course material using embeddings |
| **Real-time Streaming** | SSE for live response streaming |
| **Adaptive Difficulty** | Adjusts based on student comprehension |
| **Hint Generation** | Provides adaptive hints based on level |
| **Session Tracking** | Full conversation history and metrics |
| **OpenAI Integration** | GPT-4 for intelligent responses |

---

## Architecture

### System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     React Frontend                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │         SocraticTutorChat Component                │   │
│  │  - Session setup                                   │   │
│  │  - Real-time chat with SSE streaming              │   │
│  │  - Response evaluation                            │   │
│  │  - Session summary                                │   │
│  └─────────────────────────────────────────────────────┘   │
└────────────┬────────────────────────────────────────────────┘
             │
             │ HTTP + SSE
             ▼
┌──────────────────────────────────────────────────────────────┐
│                   Express.js Backend                         │
│  ┌────────────────────────────────────────────────────────┐ │
│  │         socraticTutorController                       │ │
│  │  - startSocraticSession()                            │ │
│  │  - streamSocraticResponse()                          │ │
│  │  - evaluateStudentResponse()                         │ │
│  │  - getSocraticSessions()                             │ │
│  │  - endSocraticSession()                              │ │
│  └────────────────────────────────────────────────────────┘ │
│                         ▲                                    │
│                         │                                    │
│  ┌────────────────────────────────────────────────────────┐ │
│  │         socraticAiService                            │ │
│  │  - generateEmbedding()                               │ │
│  │  - retrieveRelevantContent()                         │ │
│  │  - generateSocraticQuestion()                        │ │
│  │  - evaluateStudentResponse()                         │ │
│  │  - generateAdaptiveHint()                            │ │
│  └────────────────────────────────────────────────────────┘ │
└────────────┬───────────────────┬─────────────────────────────┘
             │                   │
             │                   │ Vector Search
             ▼                   ▼
        ┌─────────────────────────────────┐
        │   MongoDB Atlas                 │
        │  ┌─────────────────────────┐   │
        │  │  ContentEmbedding       │   │
        │  │  (Vector Search Index)  │   │
        │  └─────────────────────────┘   │
        │  ┌─────────────────────────┐   │
        │  │  SocraticSession        │   │
        │  └─────────────────────────┘   │
        │  ┌─────────────────────────┐   │
        │  │  Course / Lessons       │   │
        │  └─────────────────────────┘   │
        └─────────────────────────────────┘
                     │
                     │
                     ▼
            ┌─────────────────────┐
            │   OpenAI API        │
            │  - Embeddings       │
            │  - GPT-4/4o         │
            └─────────────────────┘
```

### Data Model

#### ContentEmbedding Collection
```javascript
{
  _id: ObjectId,
  courseRef: ObjectId,      // Reference to Course
  lessonIndex: Number,       // Index in lessons array
  chapterIndex: Number,      // Index in chapters array
  courseTitle: String,
  chapterTitle: String,
  lessonTitle: String,
  content: String,           // Original text content
  chunkIndex: Number,        // For multi-chunk lessons
  totalChunks: Number,
  embedding: [Number],       // 1536-dimensional vector (OpenAI)
  metadata: {
    videoUrl: String,
    resourceLink: String,
    notesPdfUrl: String,
    durationMinutes: Number,
    isFreePreview: Boolean
  },
  embeddingGeneratedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

#### SocraticSession Collection
```javascript
{
  _id: ObjectId,
  studentRef: ObjectId,      // Reference to User
  courseRef: ObjectId,       // Reference to Course
  sessionId: String,         // Unique session identifier
  title: String,
  topic: String,
  messages: [{
    role: String,            // 'student' | 'tutor'
    content: String,
    messageType: String,     // 'question' | 'response' | 'evaluation' | 'hint'
    usedSocraticMethod: Boolean,
    timestamp: Date
  }],
  learningObjectives: [String],
  comprehensionLevel: Number, // 1-5
  socraticSettings: {
    mode: String,            // 'questioning' | 'evaluative' | 'exploratory' | 'mixed'
    askClarifications: Boolean,
    evaluateResponses: Boolean,
    difficultyLevel: Number  // 1-5
  },
  metrics: {
    totalQuestions: Number,
    correctResponses: Number,
    partialCorrect: Number,
    hintRequests: Number,
    sessionDuration: Number  // in minutes
  },
  status: String,            // 'ongoing' | 'completed' | 'paused'
  createdAt: Date,
  updatedAt: Date
}
```

---

## Setup Instructions

### 1. Install Dependencies

No new npm packages needed! Existing packages support the implementation.

### 2. Environment Variables

Add to your `.env` file:

```env
# OpenAI Configuration
OPENAI_API_KEY=sk-your-api-key-here
AI_MODEL=gpt-4o-mini
AI_PROVIDER=openai

# MongoDB
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname

# Server
NODE_ENV=development
PORT=5000
```

### 3. Update server.js

Add the Socratic routes to your main server file:

```javascript
// In backend/server.js, add this before the error handling middleware:

const socraticRoutes = require('./routes/socraticRoutes');

// Routes
app.use('/api/socratic', socraticRoutes);
```

### 4. Create Vector Search Index in MongoDB Atlas

**Important:** MongoDB Atlas Vector Search must be enabled!

#### Steps:

1. Go to [MongoDB Atlas Console](https://cloud.mongodb.com)
2. Navigate to your cluster → Collections
3. Select your database → `contentembeddings` collection
4. Click "Search Indexes" → "Create Search Index"
5. Choose "JSON Editor" and paste:

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "similarity": "cosine",
      "dimensions": 1536
    },
    {
      "type": "filter",
      "path": "courseRef"
    },
    {
      "type": "filter",
      "path": "chapterIndex"
    },
    {
      "type": "filter",
      "path": "lessonIndex"
    }
  ]
}
```

6. Click "Create" and wait for index to be ready (typically 2-5 minutes)

---

## Database Configuration

### MongoDB Atlas Vector Search Setup

Vector Search is only available on MongoDB Atlas M10+ clusters.

#### Verify Vector Search Availability:

```bash
# Check your cluster tier
# Go to: MongoDB Atlas → Clusters → Your Cluster → Settings
# Tier must be M10 or higher
```

#### Create Vector Search Index:

The index configuration includes:
- **vector** field: `embedding` (1536 dimensions for OpenAI)
- **similarity**: cosine (measures angle between vectors)
- **filter fields**: for efficient querying

---

## API Endpoints

### Base URL
```
http://localhost:5000/api/socratic
```

### 1. Start Socratic Session

```http
POST /session/:courseId/start
Content-Type: application/json
Authorization: Bearer {token}

{
  "topic": "React Hooks",
  "learningObjectives": ["Understand useState", "Learn useEffect"],
  "difficultyLevel": 3
}
```

**Response:**
```json
{
  "success": true,
  "session": {
    "sessionId": "socratic-60d5ec...",
    "courseId": "60d5ec...",
    "topic": "React Hooks"
  }
}
```

### 2. Stream Socratic Response (SSE)

```http
POST /ask
Content-Type: application/json
Authorization: Bearer {token}

{
  "sessionId": "socratic-60d5ec...",
  "question": "What is the purpose of useState?",
  "courseId": "60d5ec...",
  "useHints": false
}
```

**Response (Server-Sent Events):**
```
data: {"type":"status","message":"Retrieving relevant course material..."}

data: {"type":"response","content":"Great question! Before I answer...","relevantContent":[...]}

data: {"type":"done","totalInteractions":2}
```

### 3. Evaluate Student Response

```http
POST /evaluate
Content-Type: application/json
Authorization: Bearer {token}

{
  "sessionId": "socratic-60d5ec...",
  "studentResponse": "useState manages component state",
  "expectedConcept": "useState hook basics"
}
```

**Response:**
```json
{
  "isCorrect": "partial",
  "comprehensionLevel": 3,
  "feedback": "Good start!...",
  "socraticQuestion": "Can you elaborate on...",
  "misconceptions": [],
  "nextTopic": "useEffect hook"
}
```

### 4. Get Sessions for Course

```http
GET /sessions/:courseId
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "sessions": [
    {
      "sessionId": "socratic-60d5ec...",
      "title": "Course Title - Socratic Session",
      "topic": "React Hooks",
      "createdAt": "2024-08-13T10:30:00Z",
      "metrics": {
        "totalQuestions": 5,
        "correctResponses": 3,
        "partialCorrect": 1
      },
      "comprehensionLevel": 3
    }
  ]
}
```

### 5. Get Session Details

```http
GET /session/:sessionId
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "session": {
    "sessionId": "socratic-60d5ec...",
    "title": "...",
    "messages": [
      {"role": "student", "content": "...", "timestamp": "..."},
      {"role": "tutor", "content": "...", "timestamp": "..."}
    ],
    "comprehensionLevel": 3,
    "metrics": {...}
  }
}
```

### 6. End Session

```http
POST /session/:sessionId/end
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "summary": {
    "sessionDuration": 15.5,
    "totalInteractions": 10,
    "totalQuestions": 5,
    "correctResponses": 3,
    "partialCorrect": 1,
    "accuracy": "60%",
    "comprehensionLevel": 3,
    "hintsUsed": 1
  }
}
```

---

## Integration Steps

### Step 1: Register Routes

In `backend/server.js`:

```javascript
const socraticRoutes = require('./routes/socraticRoutes');

// Add before error handling
app.use('/api/socratic', socraticRoutes);
```

### Step 2: Generate Embeddings

Generate embeddings for all course content:

```bash
# For specific course
node backend/scripts/generateEmbeddings.js 60d5ec49c1234567890abcdef

# For all courses
node backend/scripts/generateEmbeddings.js
```

The script will:
1. Fetch all courses from database
2. Extract lesson content
3. Split into chunks (500 characters)
4. Generate OpenAI embeddings (1536 dimensions)
5. Store in ContentEmbedding collection

### Step 3: Add React Component

In your course page or lesson page:

```jsx
import { useState } from 'react';
import SocraticTutorChat from '../../components/SocraticTutorChat';

function CoursePage() {
  const [showSocratic, setShowSocratic] = useState(false);

  return (
    <div>
      {/* Course content */}
      <button onClick={() => setShowSocratic(true)}>
        🎓 Launch Socratic Tutor
      </button>

      {showSocratic && (
        <SocraticTutorChat
          courseId={courseId}
          courseName="Your Course Name"
          onClose={() => setShowSocratic(false)}
        />
      )}
    </div>
  );
}
```

### Step 4: Add to Navigation/Menu

```jsx
// In your navigation component
<li>
  <Link to={`/course/${courseId}/socratic`}>
    🎓 Socratic Tutor
  </Link>
</li>
```

---

## Testing

### 1. Test API Endpoints

Use Postman or cURL:

```bash
# 1. Start Session
curl -X POST http://localhost:5000/api/socratic/session/60d5ec49c1234567890abcdef/start \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "topic": "React Hooks",
    "learningObjectives": ["Learn useState"],
    "difficultyLevel": 3
  }'

# 2. Send Question
curl -X POST http://localhost:5000/api/socratic/ask \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "sessionId": "socratic-...",
    "question": "What is useState?",
    "courseId": "60d5ec...",
    "useHints": false
  }'

# 3. Evaluate Response
curl -X POST http://localhost:5000/api/socratic/evaluate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "sessionId": "socratic-...",
    "studentResponse": "useState manages state",
    "expectedConcept": "useState basics"
  }'

# 4. Get Sessions
curl http://localhost:5000/api/socratic/sessions/60d5ec... \
  -H "Authorization: Bearer YOUR_TOKEN"

# 5. End Session
curl -X POST http://localhost:5000/api/socratic/session/socratic-.../end \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. Test Vector Search

```javascript
// In Node.js console or test file
const ContentEmbedding = require('./models/ContentEmbedding');

// Test embedding retrieval
const embeddings = await ContentEmbedding.find()
  .limit(5);

console.log('Embeddings found:', embeddings.length);
embeddings.forEach(e => {
  console.log(`- ${e.lessonTitle}: ${e.embedding.length} dimensions`);
});
```

### 3. Test Component Locally

```bash
cd client
npm run dev
# Navigate to course page and click "Socratic Tutor" button
```

---

## Troubleshooting

### Issue: "OPENAI_API_KEY not configured"

**Solution:**
1. Check `.env` file has `OPENAI_API_KEY=sk-...`
2. Restart backend server
3. Verify API key is valid at [OpenAI Dashboard](https://platform.openai.com)

### Issue: Vector Search returns empty results

**Solution:**
1. Verify Vector Search Index exists in MongoDB Atlas
2. Run embedding generation script: `node backend/scripts/generateEmbeddings.js`
3. Check ContentEmbedding collection has documents with `embedding` field
4. Wait 2-5 minutes for index to be ready

### Issue: SSE connection fails

**Solution:**
1. Ensure `Content-Type: text/event-stream` headers are set
2. Check CORS configuration in backend
3. Verify EventSource is supported in browser (most modern browsers support it)
4. Try POST fallback method instead

### Issue: "Session not found"

**Solution:**
1. Verify sessionId is correct
2. Check student owns the session (studentRef matches userId)
3. Verify course exists in database

### Issue: Embeddings generation is slow

**Solution:**
1. OpenAI API rate limits apply (~3500 RPM for free tier)
2. Script has 500ms delay between requests
3. For large courses, run script during off-peak hours
4. Consider upgrading OpenAI API tier

### Issue: High API costs

**Solution:**
1. Use `text-embedding-3-small` (cheaper) instead of `text-embedding-3-large`
2. Generate embeddings once, cache results
3. Reuse embeddings for similar queries
4. Monitor API usage in OpenAI dashboard

---

## Performance Optimization

### 1. Caching

```javascript
// In socraticAiService.js
const embedderCache = new Map();

async function generateEmbedding(text) {
  const hash = require('crypto').createHash('md5').update(text).digest('hex');
  if (embedderCache.has(hash)) {
    return embedderCache.get(hash);
  }
  
  const embedding = await openaiEmbeddingAPI(text);
  embedderCache.set(hash, embedding);
  return embedding;
}
```

### 2. Batch Processing

```javascript
// Generate embeddings in batches
async function batchGenerateEmbeddings(texts, batchSize = 10) {
  const results = [];
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    results.push(await Promise.all(batch.map(generateEmbedding)));
  }
  return results.flat();
}
```

### 3. Database Indexing

```javascript
// Ensure indexes exist
ContentEmbeddingSchema.index({ courseRef: 1, chapterIndex: 1, lessonIndex: 1 });
ContentEmbeddingSchema.index({ embeddingGeneratedAt: 1 });
SocraticSessionSchema.index({ studentRef: 1, courseRef: 1 });
SocraticSessionSchema.index({ isActive: 1 });
```

---

## Security Considerations

1. **API Key Protection:**
   - Never commit `.env` to git
   - Use environment variables for all secrets
   - Rotate API keys regularly

2. **Authentication:**
   - All endpoints require `authMiddleware` (already implemented)
   - Verify user owns session before returning data

3. **Rate Limiting:**
   - Consider implementing rate limiting per user
   - Monitor for abuse

4. **Data Privacy:**
   - Student responses are stored - ensure compliance with privacy laws
   - Implement data retention policies
   - Allow students to delete their session history

---

## Future Enhancements

1. **Multi-language Support**
   - Translate prompts based on user language preference
   - Support for non-English course content

2. **Advanced Analytics**
   - Learning path recommendations
   - Identify weak topics
   - Generate learning reports

3. **Collaborative Learning**
   - Peer discussion in Socratic sessions
   - Group tutoring mode

4. **Mobile Optimization**
   - Responsive design for mobile devices
   - Progressive Web App (PWA) support

5. **Gamification**
   - Points for correct answers
   - Badges for milestones
   - Leaderboards

6. **Integration with LMS**
   - Grade sync
   - Calendar integration
   - Assignment submission

---

## Support & Documentation

- **OpenAI Documentation:** https://platform.openai.com/docs
- **MongoDB Vector Search:** https://www.mongodb.com/docs/atlas/atlas-search/
- **React SSE:** https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events

---

## License

This implementation is part of the Emare E-Learning Management System.

---

**Version:** 1.0.0  
**Last Updated:** August 13, 2024  
**Author:** GitHub Copilot

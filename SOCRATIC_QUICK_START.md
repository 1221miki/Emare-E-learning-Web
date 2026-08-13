# 🚀 Socratic AI Tutor - Quick Start Guide

## በአማርኛ | In Amharic

ይህ ቁጥር ወሰኘለት ሌልኩ **Socratic AI Tutor** ን በ**5 ደቂቃ** ውስጥ ለማስጀመር።

---

## ⚡ 5-Minute Setup

### 1. Update Backend Server (1 minute)

**File:** `backend/server.js`

Find this section:
```javascript
// Routes
app.use('/api/ai', aiRoutes);
app.use('/api/aiHistory', aiHistoryRoutes);
```

Add this line after it:
```javascript
const socraticRoutes = require('./routes/socraticRoutes');
app.use('/api/socratic', socraticRoutes);
```

**Save and restart backend:**
```bash
npm run dev
```

### 2. Generate Embeddings (3 minutes)

Run the embedding generation script:

```bash
cd backend
node scripts/generateEmbeddings.js
```

Output:
```
🚀 Starting embedding generation...
✅ Connected to MongoDB

📚 Processing course: 60d5ec49c1234567890abcdef
Course: Introduction to React
Chapters: 3

  📖 Chapter 1: React Basics
    📝 Lesson 1: What is React? (2 chunks)
      ⏳ Generating embedding 1/2...
      ✅ Created embedding
      ⏳ Generating embedding 2/2...
      ✅ Created embedding
    ...

✨ Completed processing course: 12 new embeddings created

📊 Summary:
✅ Successfully processed: 1 courses
❌ Failed: 0 courses

✨ Embedding generation complete!
```

### 3. Add React Component (1 minute)

In your course page component:

```jsx
import { useState } from 'react';
import SocraticTutorChat from '../components/SocraticTutorChat';

function CoursePage() {
  const [showSocratic, setShowSocratic] = useState(false);
  const courseId = '60d5ec49c1234567890abcdef'; // Your course ID
  const courseName = 'Introduction to React';

  return (
    <div>
      {/* Your course content */}
      
      <button 
        onClick={() => setShowSocratic(true)}
        className="btn-primary"
      >
        🎓 Launch Socratic Tutor
      </button>

      {showSocratic && (
        <SocraticTutorChat
          courseId={courseId}
          courseName={courseName}
          onClose={() => setShowSocratic(false)}
        />
      )}
    </div>
  );
}

export default CoursePage;
```

---

## ✅ Verification Checklist

- [ ] Backend server has socraticRoutes imported
- [ ] Backend restarted successfully
- [ ] `.env` has `OPENAI_API_KEY` set
- [ ] MongoDB Vector Search Index created
- [ ] Embeddings generated for courses
- [ ] React component added to course page
- [ ] Can see "🎓 Launch Socratic Tutor" button

---

## 🧪 Quick Test

### Test 1: Check Backend Routes

```bash
curl -X GET http://localhost:5000/api/socratic/sessions/YOUR_COURSE_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected: Returns empty array (no sessions yet) or sessions list

### Test 2: Check Embeddings

In MongoDB Atlas, run:
```javascript
db.contentembeddings.countDocuments()
// Should return > 0
```

### Test 3: Launch UI

1. Go to your course page
2. Click "🎓 Launch Socratic Tutor" button
3. Enter a topic (e.g., "React Hooks")
4. Set difficulty level
5. Click "Start Learning Session"
6. Ask a question
7. See Socratic response!

---

## 📝 API Test Flow

```javascript
// Test in browser console or Postman

// 1. Start Session
POST http://localhost:5000/api/socratic/session/{courseId}/start
Body: {
  "topic": "React Hooks",
  "learningObjectives": [],
  "difficultyLevel": 3
}
// Response: { success: true, session: { sessionId: "..." } }

// 2. Ask Question
POST http://localhost:5000/api/socratic/ask
Body: {
  "sessionId": "...",
  "question": "What is useState?",
  "courseId": "...",
  "useHints": false
}
// Response: Stream of SSE messages

// 3. Evaluate Response
POST http://localhost:5000/api/socratic/evaluate
Body: {
  "sessionId": "...",
  "studentResponse": "useState manages component state",
  "expectedConcept": "useState hook"
}
// Response: { isCorrect: "...", feedback: "...", socraticQuestion: "..." }

// 4. End Session
POST http://localhost:5000/api/socratic/session/{sessionId}/end
// Response: { success: true, summary: { ... } }
```

---

## 🔧 Common Issues & Fixes

### Issue: Can't find routes

**Error:** `Cannot find module './routes/socraticRoutes.js'`

**Fix:** 
1. Ensure file exists: `backend/routes/socraticRoutes.js`
2. Check spelling matches exactly
3. Verify backend folder structure

### Issue: OPENAI_API_KEY error

**Error:** `OPENAI_API_KEY not configured`

**Fix:**
1. Check `.env` file in backend folder
2. Add: `OPENAI_API_KEY=sk-your-key-here`
3. Restart backend: `npm run dev`

### Issue: Vector Search not working

**Error:** Empty results from similarity search

**Fix:**
1. Run embedding script: `node backend/scripts/generateEmbeddings.js`
2. Wait 2-5 minutes for MongoDB index to build
3. Verify: `db.contentembeddings.countDocuments()` > 0

### Issue: SSE connection fails

**Fix:** Add CORS headers to express if needed:
```javascript
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
```

---

## 📚 Files Created/Modified

### Backend
- ✅ `backend/models/ContentEmbedding.js` - NEW
- ✅ `backend/models/SocraticSession.js` - NEW
- ✅ `backend/services/socraticAiService.js` - NEW
- ✅ `backend/controllers/socraticTutorController.js` - NEW
- ✅ `backend/routes/socraticRoutes.js` - NEW
- ✅ `backend/scripts/generateEmbeddings.js` - NEW
- 📝 `backend/server.js` - MODIFY (add routes)

### Frontend
- ✅ `client/src/services/socraticApi.jsx` - NEW
- ✅ `client/src/components/SocraticTutorChat.jsx` - NEW
- ✅ `client/src/components/SocraticTutorChat.css` - NEW

### Documentation
- ✅ `SOCRATIC_AI_TUTOR_GUIDE.md` - NEW (comprehensive guide)
- ✅ `SOCRATIC_QUICK_START.md` - THIS FILE

---

## 🎯 Next Steps

1. **Complete Setup:**
   - Update `server.js` with socratic routes
   - Generate embeddings for courses

2. **Test Functionality:**
   - Verify API endpoints work
   - Test React component

3. **Integrate into Course Page:**
   - Add button to launch tutor
   - Add to course menu/navigation

4. **Deploy:**
   - Push changes to production
   - Generate embeddings on prod database
   - Monitor API usage

5. **Monitor & Optimize:**
   - Track user engagement
   - Monitor API costs
   - Gather feedback

---

## 🎓 How It Works (User Perspective)

### Student Flow:

1. **Access Tutor:** Click "🎓 Launch Socratic Tutor" button
2. **Setup Session:** 
   - Choose learning topic
   - Set difficulty level
   - Click "Start Learning Session"
3. **Learn via Socratic Method:**
   - Tutor asks guiding questions
   - Student responds
   - Tutor evaluates and asks follow-ups
   - Can request hints anytime
4. **Wrap Up:**
   - Click "End Session & View Summary"
   - See learning metrics and progress

### Behind the Scenes:

1. **Session Management:**
   - Store in `SocraticSession` collection
   - Track comprehension level
   - Save message history

2. **Vector Search (RAG):**
   - When student asks question
   - Convert question to vector using OpenAI
   - Search similar course content
   - Include relevant material in response

3. **Socratic Questioning:**
   - Generate guiding questions
   - Evaluate student answers
   - Provide adaptive hints
   - Adjust difficulty based on performance

4. **Real-time Streaming:**
   - Use SSE for live responses
   - Stream response chunks as they arrive
   - Provide responsive user experience

---

## 💡 Tips for Better Learning Experience

1. **For Instructors:**
   - Ensure course content is detailed
   - Create multiple lessons for deep topics
   - Provide learning resources for each lesson

2. **For Students:**
   - Think before answering
   - Use hints strategically
   - Review session summaries
   - Practice regularly

3. **For Platform:**
   - Monitor comprehension metrics
   - Identify struggling students
   - Recommend additional resources
   - Provide instructor reports

---

## 📞 Support

Need help? Check:
- `SOCRATIC_AI_TUTOR_GUIDE.md` - Full documentation
- Backend logs: `npm run dev` output
- MongoDB Atlas logs
- Browser console for frontend errors

---

**Ready to empower learning with Socratic AI! 🚀**

# Emare E-Learning Management System (ELMS)

## Overview
The Emare E-Learning Management System is an enterprise-grade, secure, multi-role web-based platform tailored for the Emare ICT Hub in Debre Birhan, Ethiopia. It transitions the institution's legacy manual training delivery methods into a scalable cloud environment. The platform automates course delivery, streamlines remote resource distribution, and centralizes student assessment tracking across various technical training streams like Full-Stack Web Development, Mobile App Engineering, and Graphic Design.

---

## Key Features

### 🛡️ Administrator Role
- **Global User Management:** Full CRUD operations for student and instructor accounts.
- **Course Approval Workflow:** Dedicated clearance queue to review and publish drafted courses.
- **Institutional Analytics:** Real-time dashboard aggregating enrollment totals, completion velocities, and performance metrics.

### 👨‍🏫 Instructor Role
- **Curriculum Authoring:** Step-by-step workspace to build multi-level courses (chapters/lessons).
- **Asset Management:** Attach streaming video URLs and supplementary resource files.
- **Assessment Engine:** Create timed multiple-choice quizzes and programming assignments.
- **Grading Portal:** Review student project submissions and provide numerical scores and qualitative feedback.

### 🎓 Student Role
- **Course Catalog:** Browse and enroll in available technical training packages.
- **Split-Screen Workspace:** Interactive learning interface combining asynchronous video playback with a persistent navigation sidebar.
- **Progress Tracking:** Automated calculation of module completion percentages.
- **Interactive Evaluations:** Take timed quizzes with instant grading and upload project files for instructor review.

---

## 🚀 Innovation Roadmap & Future Features
To position Emare ELMS as a modern, AI-powered, and competitive final-year project, the following features are prioritized for future implementation:

### High-Priority Innovations
1. **AI Learning Assistant** – 24/7 support for Q&A, concept explanation, PDF/video summarization, quiz generation, coding help, and multilingual assistance.
2. **AI Personalized Learning Path** – Adaptive recommendations based on quiz scores, completion trends, strengths, weaknesses, and career goals.
3. **Multi-Language Support** – Interface and content localization for English, Amharic, Afaan Oromo, Tigrinya, and future languages.
4. **Offline Learning** – Downloadable courses, lessons, PDFs, and videos with automatic sync when connectivity returns.
5. **Gamification** – XP points, badges, levels, streaks, leaderboards, challenges, and achievement rewards.
6. **QR Code Certificate Verification** – Secure certificate validation with unique IDs and employer-facing verification.
7. **Job & Internship Portal** – Career opportunities, employer recommendations, resume submission, and internship listings.
8. **Smart Analytics Dashboard** – Role-based insights for admins, instructors, and students.
9. **Mentor Booking System** – Mentor profiles, session booking, live meeting integration, and peer feedback.
10. **Digital Student Portfolio** – Showcase projects, certificates, skills, resume, GitHub, and achievements for employers.

### Additional Advanced Features
- **Live Class Integration** with Zoom, Google Meet, or Jitsi.
- **AI Exam Proctoring** with face detection, tab-switch monitoring, full-screen tracking, and suspicious activity logging.
- **Discussion Forum** with voting, best-answer marking, search, and topic following.
- **Peer Review Assignments** with rubric-based structured evaluation.
- **Voice Search** for hands-free navigation.
- **Parent Dashboard** for progress and attendance monitoring.
- **Mobile App & Push Notifications** for reminders and announcements.
- **Community Learning** through study groups, coding clubs, and project teams.

These enhancements will help the platform go beyond traditional LMS functionality and become a scalable, secure, and future-ready learning ecosystem.

---

## Technology Stack
The platform is built using a decoupled, three-tier MERN architecture:

| Layer | Technology |
|-------|-----------|
| **Frontend (Presentation)** | React.js, Vanilla CSS |
| **Backend (Application Logic)** | Node.js, Express.js |
| **Database (Data Persistence)** | MongoDB Atlas / In-Memory MongoDB (dev) |
| **Security** | JSON Web Tokens (JWT), bcrypt, Role-Based Access Control (RBAC) |

---

## Security & RBAC
The system enforces strict Role-Based Access Control across frontend and backend layers. Admins can manage user roles, assign permissions, and control access at the API, module, page, and action levels.

Key security features:
- Role-Based Access Control (RBAC) middleware protects all sensitive routes.
- Admin user management supports assigning and updating roles for Student, Instructor, and Admin accounts.
- Login restrictions prevent suspended or deactivated users from performing protected actions.
- JWTs are stored in HTTP-only cookies to protect against XSS, and password hashes are generated with bcrypt.
- Permission enforcement covers API endpoints, UI modules, page navigation, and action buttons.
- Audit and security controls are surfaced to administrators from the admin dashboard.

---

## System Architecture
The codebase follows a strict **Controller-Service-Repository** abstraction model:
- **Routes:** Capture endpoint strings and delegate parameters.
- **Controllers:** Orchestrate HTTP response cycles.
- **Services:** Contain business logic computations.
- **Models:** Mongoose schema definitions enforcing strict data validations.
- **Middleware:** Authentication, authorization (RBAC), and error handling.

---

## Project Folder Structure

```
Emare E-learning-Web/
├── backend/          ← Node.js + Express API server
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   └── server.js
├── client/           ← React.js frontend
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── context/
│   │   └── services/
│   └── public/
└── README.md
```

---

## Prerequisites
Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (LTS Version 20.x or higher)
- [Git](https://git-scm.com/)
- A [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) account (optional — app runs with in-memory DB in dev mode)

---

## Installation and Setup

### ⚙️ Backend Setup

Open a terminal and run:

```bash
cd backend
npm install
npm run dev
```

The backend will start on **http://localhost:5000**

Create a `.env` file inside the `backend/` folder:
```env
PORT=5000
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRE=120m
FRONTEND_URL=http://localhost:3000

# ── Email Configuration (Password Reset & Notifications) ──
# For Development (Console Logging)
NODE_ENV=development
# For Production (Gmail)
# NODE_ENV=production
# EMAIL_USER=your_gmail@gmail.com
# EMAIL_PASSWORD=your_app_specific_password

# For Custom SMTP (Gmail, SendGrid, etc.)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=your_email@gmail.com
MAIL_PASS=your_app_specific_password
EMAIL_FROM=noreply@emare.com

# AI Tutor Integration
AI_PROVIDER=mock
AI_API_KEY=your_openai_api_key
AI_MODEL=gpt-4o-mini
```

#### 📧 Email Setup Instructions



**Option 1: Development (Console Logging)**
- By default, emails are logged to console in development mode
- Perfect for testing without a real email service

**Option 2: Gmail SMTP**
1. Enable 2-factor authentication on your Gmail account
2. Create an [App Password](https://myaccount.google.com/apppasswords)
3. Use the app password in `MAIL_PASS`
4. Set `MAIL_HOST=smtp.gmail.com` and `MAIL_PORT=587`

**Option 3: SendGrid / Other SMTP**
1. Get your SMTP credentials from your email service
2. Update `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, and `MAIL_PASS`

> 💡 **Note:** If no MongoDB URI is provided, the app automatically falls back to an in-memory database — no extra setup needed for development!

---

### 🌐 Frontend (Client) Setup

Open a **second terminal** and run:

```bash
cd client
npm install
npm start
```

The frontend will start on **http://localhost:3000**

Create a `.env` file inside the `client/` folder:
```env
REACT_APP_API_URL=http://localhost:5000/api
```

---

## ✅ Default Test Accounts

When running in development mode, these accounts are auto-created:

| Role | Email | Password |
|------|-------|----------|
| 👑 Admin | `admin@emare.com` | `admin12345` |
| 🎓 Student | `student@emare.com` | `student12345` |
| 👨‍🏫 Instructor | `instructor@emare.com` | `instructor12345` |

---

## Running on Windows (PowerShell)

If you get a "scripts disabled" error in PowerShell, use:

```powershell
powershell -ExecutionPolicy Bypass -Command "npm run dev"    # backend
powershell -ExecutionPolicy Bypass -Command "npm start"      # frontend
```

---

## Documentation
Comprehensive documentation including Use Case diagrams, Class diagrams, Entity Relationship Diagrams (ERD), and API endpoint specifications can be found in the official Final Year Project Report.

---

## Authors
- Amen Terefe
- Ayires Zebene
- Asamnew Agiz

*Department of Information System | Debre Birhan University*

---

## **Local Development (One-command)**

Quick professional start (runs backend + frontend together):

1. From the project root run:

```powershell
npm install
npm run dev
```

- Backend: http://localhost:5000
- Frontend: http://localhost:3000 (or 3001 if 3000 is occupied)

This uses the root `dev` script which runs the backend and client concurrently. You can also run each separately:

```powershell
# backend only
npm run dev:backend

# frontend only
npm run dev:client
```

## **Health Checks & Quick Verification**

- Backend health endpoint:
	- http://localhost:5000/api/health  (expect HTTP 200)
- Frontend: open http://localhost:3000 (or http://localhost:3001)

If a port is already in use, stop the process (example for PowerShell):

```powershell
# show process using port 5000
Get-NetTCPConnection -LocalPort 5000 | Format-List

# stop that PID safely (replace <PID> with the number shown)
Stop-Process -Id <PID> -Force
```

If multiple node processes are stuck (use with care):

```powershell
taskkill /F /IM node.exe
```

## **Troubleshooting Common Issues**

- Blank page / UI not rendering:
	- Open browser DevTools (F12) → Console and Network. Fix any red errors.
	- Verify `REACT_APP_API_URL` in `client/.env` points to `http://localhost:5000/api`.
- Backend crashes with EADDRINUSE:
	- A different process is already listening on the configured port. Kill it or set `PORT` in `backend/.env` to a different number.
- Mongoose duplicate-index warnings:
	- Some models declared the same index twice (`index: true` and `schema.index(...)`). Search models and remove the duplicate. (I removed the duplicate index in `backend/models/Message.js`.)
- Dev server chooses another port (React):
	- If port 3000 is busy, CRA will prompt to use 3001. Open the port shown in the terminal.

## **Files I updated for a smoother workflow**
- `package.json` (project root): added `dev`, `dev:backend`, `dev:client`, and `build:client` scripts to run both services with one command.
- `backend/models/Message.js`: removed duplicate `MessageSchema.index({ conversationRef: 1 });` to silence duplicate-index warning.

## **Next steps / Recommendations**

- Run `npm audit fix` to fix non-breaking vulnerabilities. Use `npm audit fix --force` only after reviewing breaking changes.
- Upgrade `react-scripts` and other dev tooling carefully to reduce deprecation warnings.
- Add a README health-check badge or a short startup script if you deploy to a CI/CD environment.

If you want, I can now:
- Open the frontend in your browser, or
- Tail backend logs and the browser console to resolve any remaining runtime errors.

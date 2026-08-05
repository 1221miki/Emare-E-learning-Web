# Emare E-Learning Management System (ELMS)

A modern learning management platform with a React + Vite frontend and Node + Express backend.

## Project layout

- client/ ? React + Vite frontend
- ackend/ ? Express API, MongoDB, payment and webhook handling
- README.md ? project documentation

## Prerequisites

- Node.js 16+ / npm
- MongoDB Atlas or local MongoDB

## Local Development

### Run both services

From the repository root:

`powershell
npm install
npm start
`

This starts:
- Backend: http://localhost:5000
- Frontend: http://localhost:5173

### Run backend only

`powershell
cd backend
npm install
npm run dev
`

### Run frontend only

`powershell
cd client
npm install
npm start
`

## Environment Variables

### Backend (ackend/.env)

Required:
- PORT=5000
- MONGODB_URI=your_mongo_connection_string
- FRONTEND_URL=http://localhost:3000
- APP_BASE_URL=http://localhost:5000
- JWT_SECRET=your_jwt_secret
- CHAPA_PUBLIC_KEY=CHAPUBK_TEST_...
- CHAPA_SECRET_KEY=CHASECK_TEST_...
- CHAPA_WEBHOOK_SECRET=your_chapa_webhook_secret
- CHAPA_BASE_URL=https://api.chapa.co/v1

Optional:
- NODE_ENV=development
- MAIL_HOST, MAIL_PORT, MAIL_USER, MAIL_PASS, EMAIL_FROM

### Frontend (client/.env)

`env
VITE_API_URL=http://localhost:5000/api
`

## Payment Flow (Chapa)

1. Student clicks **Enroll Now** and frontend navigates to /checkout/:courseId.
2. Frontend calls backend POST /api/payments/initiate.
3. Backend creates a pending transaction and a 	x_ref.
4. Backend initializes Chapa checkout and returns checkout_url.
5. Student completes payment on Chapa.
6. Chapa sends webhook to /api/payments/chapa/webhook.
7. Backend verifies status, updates Transaction, Payment, and Enrollment.

For local webhook testing, expose the backend with ngrok and configure the public webhook URL in Chapa.

## Quick Verification

- Frontend: http://localhost:3000
- Backend health: http://localhost:5000/api/health

## Sample Accounts

The backend seeds default accounts during development. Use these credentials for local login:

- Admin
  - Email: admin@emare.com
  - Password: admin12345
- Student
  - Email: student@emare.com
  - Password: student12345
- Instructor
  - Email: instructor@emare.com
  - Password: instructor12345

## Troubleshooting

- EADDRINUSE: stop the process using port 5000 or change PORT in ackend/.env.
- Frontend not loading: confirm VITE_API_URL points to http://localhost:5000/api.
- Webhooks not received: use ngrok or a public tunnel and configure the Chapa webhook URL.

## Recommended Stack

### Frontend
- React + Vite
- React Router
- Axios
- Tailwind CSS / custom styles

### Backend
- Node.js
- Express.js
- MongoDB + Mongoose
- JWT authentication
- Socket.IO
- Chapa payment integration

## Notes

- Use separate terminals for backend and frontend.
- Keep .env files out of version control.

## Run Summary

`powershell
# Full stack
npm start

# Backend only
cd backend
npm run dev

# Frontend only
cd client
npm start
`

## Authors

- Amen Terefe
- Ayires Zebene
- Asamnew Agiz

## Instructor Responsibilities

Instructors play a central role in creating and maintaining course content. Their primary responsibilities include:

### 1. Curriculum Design

The instructor is responsible for:

- Designing course structure.
- Creating chapters.
- Creating lessons.
- Organizing learning flow.
- Defining course duration.
- Selecting course category.
- Writing course descriptions.
- Submit completed courses for administrator approval.
- Revise rejected courses based on administrator feedback.
- Archive completed courses.

### 2. Learning Content Management

The instructor can:

- Upload video lectures.
- Upload PDF notes.
- Upload programming source code.
- Upload downloadable resources.
- Add markdown/text notes.
- Attach learning materials to chapters.
- Manage multimedia content.

#### Video Delivery Notes

- The current student experience supports embedded YouTube video links directly in the lesson player, which makes it easy to launch the platform quickly with existing public video content.
- For future scalability, the platform is designed to support self-hosted video delivery through Cloudinary, AWS S3, Vimeo, or Bunny.net once instructor-uploaded media is fully integrated into the lesson workflow.
- This will improve playback reliability, streaming performance, analytics, and storage control for institution-owned course content.

### 3. Assignment Management

The instructor can:

- Create assignments.
- Publish assignments.
- Define assignment instructions.
- Set submission deadlines.
- Receive student submissions.
- View uploaded files.
- Review GitHub/repository links.

### 3. Quiz & Assessment Management

The instructor can:

- Create quizzes.
- Add multiple-choice questions.
- Set correct answers.
- Assign quiz scores.
- Configure timers.
- Set passing scores.
- Publish quizzes.
- Manage assessments.

### 4. Interface Status

The current instructor dashboard UI supports the following course authoring workflows:

- creating, editing, and saving draft courses
- organizing course metadata, learning objectives, and prerequisites
- submitting drafts for administrator review
- archiving and duplicating courses
- grading, student management, announcements, reviews, analytics, and earnings

The user interface does not yet include a dedicated content-management section for:

- direct video, PDF, source-code, or resource upload controls
- inline markdown/text note creation
- attaching learning materials directly to chapters or lessons
- a multimedia asset manager for course content

### 4. Proposed Missing UI Sections

To align the product with the instructor responsibilities, add a dedicated instructor content workflow with these screens/components:

- **Course Library / Content Hub**
  - course cards with status, stats, and quick actions
  - filter by draft/active/pending review
  - button to open course content manager

- **Course Editor + Curriculum Builder**
  - course metadata fields (title, description, category, objectives)
  - chapter list with drag-and-drop ordering
  - add/edit/delete chapter buttons
  - lesson list per chapter with inline reorder controls

- **Lesson Content Panel**
  - lesson title, description, duration, and media preview
  - upload controls for:
    - video lectures
    - PDF notes
    - downloadable resources (ZIP, code files)
    - source code attachments
  - markdown/text editor for lesson notes and summaries
  - save as draft / publish lesson controls

- **Material Attachment Area**
  - attach uploaded files directly to chapters or lessons
  - show associated resources, documents, and videos per lesson
  - allow removing or replacing attachments

- **Multimedia Resource Manager**
  - gallery of uploaded assets with thumbnails and file type badges
  - search/filter by video, PDF, code, or other resource types
  - bulk upload and delete actions

- **Review & Publish Workflow**
  - submit course or lesson updates for administrator approval
  - display approval status, rejection reason, and revision requests

This draft can be used as the basis for implementation and for updating the README/UI documentation to match the actual current interface.

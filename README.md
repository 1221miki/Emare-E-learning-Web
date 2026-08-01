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
npm run dev
`

This starts:
- Backend: http://localhost:5000
- Frontend: http://localhost:3000

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
npm run dev
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
npm run dev

# Backend only
cd backend
npm run dev

# Frontend only
cd client
npm run dev
`

## Authors

- Amen Terefe
- Ayires Zebene
- Asamnew Agiz

## Instructor Responsibilities

Instructors have a central role in creating and maintaining course content. The primary responsibilities include:

1. Course Management

- Create new courses.
- Edit and update course information.
- Delete draft courses.
- Organize course curriculum.
- Create chapters and lessons.
- Arrange lesson order.
- Submit completed courses for administrator approval.
- Revise rejected courses based on admin feedback.
- Archive completed courses.


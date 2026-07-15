# Emare E-Learning Management System (ELMS)

## Overview
The Emare E-Learning Management System is an enterprise-grade, secure, multi-role web-based platform tailored for the Emare ICT Hub in Debre Birhan, Ethiopia. It transitions the institution's legacy manual training delivery methods into a scalable cloud environment. The platform automates course delivery, streamlines remote resource distribution, and centralizes student assessment tracking across various technical training streams like Full-Stack Web Development, Mobile App Engineering, and Graphic Design.

## Key Features

### Administrator Role
* **Global User Management:** Full CRUD operations for student and instructor accounts.
* **Course Approval Workflow:** Dedicated clearance queue to review and publish drafted courses.
* **Institutional Analytics:** Real-time dashboard aggregating enrollment totals, completion velocities, and performance metrics.

### Instructor Role
* **Curriculum Authoring:** Step-by-step workspace to build multi-level courses (chapters/lessons).
* **Asset Management:** Attach streaming video URLs and supplementary resource files.
* **Assessment Engine:** Create timed multiple-choice quizzes and programming assignments.
* **Grading Portal:** Review student project submissions and provide numerical scores and qualitative feedback.

### Student Role
* **Course Catalog:** Browse and enroll in available technical training packages.
* **Split-Screen Workspace:** Interactive learning interface combining asynchronous video playback with a persistent navigation sidebar.
* **Progress Tracking:** Automated calculation of module completion percentages.
* **Interactive Evaluations:** Take timed quizzes with instant grading and upload project files for instructor review.

## Technology Stack
The platform is built using a decoupled, three-tier MERN architecture:

* **Frontend (Presentation Layer):** React.js, TailwindCSS
* **Backend (Application Logic Layer):** Node.js, Express.js
* **Database (Data Persistence Layer):** MongoDB Atlas, Mongoose ODM
* **Security:** JSON Web Tokens (JWT), bcrypt password hashing, strict Role-Based Access Control (RBAC)

## System Architecture
The codebase follows a strict Controller-Service-Repository abstraction model:
* **Routes:** Capture endpoint strings and delegate parameters.
* **Controllers:** Orchestrate HTTP response cycles.
* **Services:** Contain business logic computations.
* **Models:** Mongoose schema definitions enforcing strict data validations.
* **Middleware:** Authentication, authorization (RBAC), and error handling.

## Prerequisites
Before you begin, ensure you have the following installed:
* [Node.js](https://nodejs.org/) (LTS Version 20.x or higher)
* [Git](https://git-scm.com/)
* A [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) account and cluster

## Installation and Setup

### Backend Setup
1. Navigate into the backend directory (or clone the backend repository):
   ```bash
   cd elms-backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` configuration file in the root of the backend directory with the following variables:
   ```env
   PORT=5000
   MONGODB_URI=your_mongodb_atlas_connection_string
   JWT_SECRET=your_jwt_secret_key
   JWT_EXPIRE=120m
   CDN_BUCKET_URL=your_cloud_storage_bucket_url
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

### Frontend Setup
1. Navigate into the frontend directory (or clone the frontend repository):
   ```bash
   cd elms-frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root of the frontend directory:
   ```env
   REACT_APP_API_URL=http://localhost:5000
   ```
4. Start the development server:
   ```bash
   npm start
   ```

## Documentation
Comprehensive documentation including Use Case diagrams, Class diagrams, Entity Relationship Diagrams (ERD), and API endpoint specifications can be found in the official Final Year Project Report.

## Authors
* Amen Terefe
* Ayires Zebene
* Asamnew Agiz

*Department of Information System | Debre Birhan University*

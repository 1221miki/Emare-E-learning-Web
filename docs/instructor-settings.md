# Instructor Settings & Account Management — UI/UX Design Spec

This document captures the UI/UX design and interaction requirements for the Instructor Settings & Account Management Dashboard for Emare ICT Hub.

## Purpose
Provide instructors with a single, professional control center to manage profile, teaching preferences, course defaults, security, notifications, payments, integrations, privacy, and data lifecycle.

## Visual Style
- Modern SaaS dashboard (desktop-first, responsive)
- Primary: Education Blue (#2563eb)
- Secondary: Purple (#7c3aed)
- Success: Green (#10b981)
- Warning: Orange (#f59e0b)
- Danger: Red (#ef4444)
- White background, soft shadows, rounded cards, smooth hover states
- Use `lucide-react` icons for consistency

## Layout
- Left fixed navigation (app-level)
- Secondary left column: settings navigation (this section)
- Top header: avatar, search, notifications, account menu
- Main content: card-based, modular sections, responsive grid

## Sidebar Settings Navigation
List of items (icon + label + optional badge):
- Profile Settings
- Professional Profile
- Course Settings
- Teaching Preferences
- Security
- Notifications
- Payments & Revenue
- Language & Localization
- Integrations
- Privacy
- Data Management
- Verification & Compliance

Each menu supports an active state and a small badge when action is required.

## Pages & Components
For each major section below, produce a responsive card, form controls, helper text, and action buttons. Use modals for destructive actions and toast notifications for feedback.

### Overview
- Profile completion circular progress
- Missing information checklist
- Verification status & instructor level
- Quick stats: Total Courses, Published, Students, Avg Rating, Revenue

### Profile Settings
- Uploaders: profile picture and banner (drag-and-drop)
- Text fields: full name, username, title, biography
- Structured lists: skills, certifications, education (editable chips)
- Contact: email (verify), phone (verify), country, city, preferred language
- Social connections: LinkedIn, GitHub, Twitter, Facebook, Website, YouTube (connect/remove)

### Professional Profile
- Teaching identity: category, expertise tags, years of experience, languages taught
- Public profile toggles: show profile, show courses, show reviews, show certificates
- Live preview card of public instructor page

### Course Settings
- Defaults: course language, level, default category
- Visibility toggles: preview allowed, show instructor profile, display reviews
- Publishing workflow: require admin approval / auto publish
- Status cards for Draft / Pending / Approved / Rejected

### Teaching Preferences
- Content: default video quality, autosave toggles, lesson completion rules
- Assessments: quiz defaults, assignment defaults, automatic grading settings

### Security
- Change password form with strength meter and password history
- 2FA management (enable/disable) with options: SMS, Email, Authenticator App
- Login history table with device actions and active devices list

### Notifications
- Granular toggles for email, push, in-app alerts
- Categories: enrollments, messages, reviews, submissions, payments, approvals

### Payments & Revenue
- Revenue summary card (total, pending, available, last payout)
- Payment methods management (Chapa, Telebirr, bank, wallets)
- Auto-payout settings and schedule
- Tax & invoice document uploads

### Localization
- Interface language selection
- Time zone, date format, currency

### Integrations
- Connectors for Zoom, Google Meet, Teams, YouTube, GitHub
- Storage connectors: Google Drive, Dropbox

### Privacy & Data Management
- Profile visibility controls, communication permissions
- Export data flows (profile, course, students, revenue)
- Account actions: deactivate, delete, transfer (danger zone + confirmation)

### Verification & Compliance
- Upload flows for identity and professional documents
- Status UI: verified / pending / required

## Components & Patterns
- Reusable cards, table components, form field components, toggles, chips, multi-selects, uploaders, confirmation modals, toasts
- Accessibility: keyboard navigable, labeled controls, aria roles for dialogs

## Developer Notes
- Implement pages as route under `/instructor/settings` and nested routes for sub-pages
- Reuse existing `courseService`, `userService`, `uploadService`, and `notificationService` APIs
- Lazy-load heavy components (file uploaders, charts)
- Provide unit tests for critical form behavior and API wiring

---
This spec is ready to be converted into React components and wire-up tasks. Next: scaffold the React `InstructorSettings` page with the settings navigation and Overview + Profile placeholders.

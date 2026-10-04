export const promptLibrary = [
    {
        id: 'account-profile',
        title: 'Account & Profile Management',
        description: 'Prompts for registration, profile completion, and security.',
        prompts: [
            'Welcome to Emare ELMS! Create your account to start learning.',
            'Please verify your email address to activate your account.',
            'Enter your phone number for added security.',
            'Complete your profile to get personalized course recommendations.',
            'Upload a profile picture so instructors can recognize you.',
            'Update your personal information to ensure accurate certificates.',
            'Change your password regularly to keep your account secure.',
            'Enable two-factor authentication for extra account protection.',
            'Your profile is 60% complete. Add your skills and interests.',
            '🔔 Reminder: Please update your profile information before enrolling in new courses.',
            'Your email has changed? Update it in Settings to receive important notifications.'
        ]
    },
    {
        id: 'course-discovery',
        title: 'Course Discovery & Enrollment',
        description: 'Prompts to help students find and enroll in relevant courses.',
        prompts: [
            'Browse our course catalog and find your next learning adventure.',
            'Search courses by category, level, or instructor.',
            'Check course ratings and reviews before enrolling.',
            '📚 Recommended for you: [Course Name] based on your interests.',
            'Trending this week: [Course Name] - Join 500+ learners!',
            'Enroll now in this free course and start learning today!',
            'Purchase this course to unlock all premium content.',
            'Congratulations! You have successfully enrolled in [Course Name].',
            'Ready to start? Click Go to Course and begin your journey.',
            'Don\'t miss out! The course [Course Name] is ending soon.',
            'Enrollment deadline approaching: [Course Name] closes in 2 days.'
        ]
    },
    {
        id: 'content-access',
        title: 'Learning Content Access',
        description: 'Prompts to guide lesson access, navigation, and new materials.',
        prompts: [
            'Watch the video lesson: [Lesson Title]',
            '📖 Read the document: [Document Name]',
            'Download learning resources for offline access.',
            '🎧 Listen to the audio lesson: [Audio Title]',
            'Access the presentation: [Presentation Name]',
            'Follow the lesson order for the best learning experience.',
            'Complete this module before moving to the next.',
            'Resume learning from where you left off: [Last Lesson]',
            'Next lesson: [Lesson Name] - Continue your progress.',
            '📺 New video lesson available: [Lesson Title]',
            'New learning materials have been added to your course.',
            'You haven\'t accessed [Course Name] in 3 days. Pick up where you left off!'
        ]
    },
    {
        id: 'progress-management',
        title: 'Learning Progress Management',
        description: 'Prompts that motivate students to track and complete progress.',
        prompts: [
            'Track your progress: [Course Name] - 45% Complete',
            '🎯 Milestone achieved! You\'ve completed 50% of the course.',
            'Mark this lesson as completed to track your progress.',
            'You\'re on a 5-day learning streak! Keep going!',
            'Set a personal learning goal: Complete 2 lessons per day.',
            'Course Progress: Digital Marketing 2026\n████████████████████████░░░░░░░░░ 65% Complete',
            '⏰ Your goal: Complete 1 module by this Friday.',
            'You\'re 85% done with [Course Name]. Complete the final module!',
            '📊 Your course completion rate is 70%. Keep up the momentum!',
            'Last lesson watched: 4 days ago. Resume learning now.'
        ]
    },
    {
        id: 'assignments',
        title: 'Assignment Responsibility',
        description: 'Prompts for assignment work, submission, and feedback.',
        prompts: [
            '📝 New assignment: [Assignment Name] - Due: [Date]',
            'Read the assignment instructions carefully before starting.',
            'Download the assignment files to begin your work.',
            'Upload your completed assignment for submission.',
            'Submit your assignment before the deadline to avoid penalties.',
            'Your instructor has reviewed your assignment. Check your feedback!',
            'Resubmit your assignment with corrections (if allowed).',
            'Great job! Your assignment was graded: [Grade].',
            '⏰ ⚠️ Assignment due in 24 hours: [Assignment Name]',
            '🔔 Reminder: Submit your assignment before [Date]',
            'You have 3 pending assignments. Complete them now!',
            'Assignment deadline extension: [New Date] - Submit now!',
            'Ask the AI coach to clarify assignment requirements before you start.',
            'Break the assignment into steps and track your progress.',
            'Need an approach idea? Ask the AI for a suggested solution path.',
            'Review your assignment draft and request constructive feedback.',
            'Request hints instead of answers to stay independent and learn more.'
        ]
    },
    {
        id: 'quizzes-exams',
        title: 'Quiz & Exam Responsibility',
        description: 'Prompts for quiz preparation, exams, and review.',
        prompts: [
            '📝 Take the quiz: [Quiz Name]',
            '📝 Exam: [Exam Name] - Duration: [Time]',
            'Read the exam rules before starting.',
            'Answer all questions honestly and to the best of your ability.',
            'You have [X] attempts remaining for this quiz.',
            'Review your quiz score: [Score]%',
            'Check the explanations for incorrect answers.',
            'Focus on your weak areas: [Topics]',
            '⏰ Quiz due in 2 days: [Quiz Name]',
            '🔔 Exam starts in 1 hour: [Exam Name]',
            'You missed the quiz. Retake available until [Date].',
            'Generate a short practice quiz from this lesson.',
            'Create a mixed question review for the current course material.',
            'Ask the AI to explain the correct quiz answers after submission.'
        ]
    },
    {
        id: 'projects',
        title: 'Project Responsibility',
        description: 'Prompts for project work, collaboration, and delivery.',
        prompts: [
            '🎯 Start your practical project: [Project Name]',
            'Upload your project files for review.',
            'Follow the project requirements carefully.',
            'Submit your project before [Date].',
            'Collaborate with your team members on this project.',
            'Share your progress with your team.',
            '⏰ Project deadline approaching: [Project Name]',
            'Your project submission has been received. Awaiting review.',
            'Project feedback available! Check your grade.'
        ]
    },
    {
        id: 'communication',
        title: 'Communication Responsibility',
        description: 'Prompts for messaging, professionalism, and discussion participation.',
        prompts: [
            '💬 Send a message to your instructor: [Instructor Name]',
            'Ask a question about [Topic] in the course discussion.',
            'Reply to a discussion thread: [Thread Title]',
            'Participate in the weekly live Q&A session.',
            'Communicate professionally with instructors and peers.',
            'Use clear and respectful language in all messages.',
            '📩 You have 2 unread messages from your instructor.',
            '🔔 New discussion post: [Topic] - Share your thoughts!',
            'Your instructor responded to your question. Check now!'
        ]
    },
    {
        id: 'payment',
        title: 'Payment Responsibility',
        description: 'Prompts for payment actions, subscriptions, and confirmations.',
        prompts: [
            '💳 Complete payment to access this course.',
            'Select your preferred payment method: Bank, Credit Card, or Digital Wallet.',
            'View your payment history and receipts.',
            'Download invoice: [Invoice Number]',
            'Manage your subscription plan.',
            'Your subscription expires on [Date]. Renew now!',
            '⚠️ Payment pending: Complete your payment to continue learning.',
            'Your payment was successful! Welcome to [Course Name].',
            'Payment failed. Please try again with a different method.'
        ]
    },
    {
        id: 'certificates',
        title: 'Certificate Responsibility',
        description: 'Prompts for certificate completion, download, and sharing.',
        prompts: [
            '🎓 Congratulations! You\'ve completed all course requirements.',
            'Request your certificate of completion.',
            'Your certificate is ready! Download it now.',
            'Share your certificate on LinkedIn and showcase your achievement.',
            '📜 2 more lessons to complete to earn your certificate!',
            'Pass the final exam to unlock your certificate.',
            'Your certificate has been verified and is now available.'
        ]
    },
    {
        id: 'review-feedback',
        title: 'Review & Feedback Responsibility',
        description: 'Prompts for course ratings, reviews, and improvement suggestions.',
        prompts: [
            '⭐ Rate this course and help other learners.',
            'Write a review for [Course Name].',
            'Provide feedback about your instructor: [Instructor Name].',
            'Report a problem you encountered in the course.',
            'Suggest improvements for this course.',
            'Your feedback matters! Help us improve Emare ELMS.',
            '✍️ Don\'t forget to rate the course you just completed!',
            'Your review helps 1000+ learners choose the right course.'
        ]
    },
    {
        id: 'notifications',
        title: 'Notification Management',
        description: 'Prompts for notifications, preferences, and announcements.',
        prompts: [
            '🔔 New course announcement: [Announcement]',
            '📅 Upcoming live session: [Date & Time]',
            '📝 Assignment reminder: Due in 3 days.',
            '💰 Payment confirmation: Receipt #12345.',
            'Manage your notification preferences in Settings.',
            'Enable notifications to never miss an update.'
        ]
    },
    {
        id: 'community',
        title: 'Learning Community Participation',
        description: 'Prompts for group engagement, events, and networking.',
        prompts: [
            '👥 Join the student group: [Group Name]',
            'Share your knowledge and help other learners.',
            'Attend the upcoming webinar: [Webinar Title]',
            'Participate in the discussion forum: [Topic]',
            'Connect with peers who share your interests.',
            'Collaborate on group projects and assignments.'
        ]
    },
    {
        id: 'security-privacy',
        title: 'Privacy & Security Responsibility',
        description: 'Prompts for securing accounts, privacy, and reporting issues.',
        prompts: [
            '🔒 Keep your login credentials secure.',
            'Do not share your account with anyone.',
            'Protect your personal information online.',
            'Report suspicious activities immediately.',
            'Logout from shared devices after your session.',
            '⚠️ Login attempt detected from an unknown device. Was this you?',
            'Your password was last changed 60 days ago. Consider updating it.'
        ]
    },
    {
        id: 'academic-ethics',
        title: 'Academic Ethics Responsibility',
        description: 'Prompts for integrity, honesty, and LMS policy compliance.',
        prompts: [
            '⚠️ Plagiarism is strictly prohibited. Submit original work only.',
            'Cheating in exams will result in disqualification.',
            'Respect your instructors and fellow learners.',
            'Follow all LMS rules and policies.',
            '📜 Academic Integrity Policy: Read and acknowledge.',
            'Submitting someone else\'s work is a violation of our policy.'
        ]
    },
    {
        id: 'technical',
        title: 'Technical Responsibility',
        description: 'Prompts for system compatibility, support, and maintenance.',
        prompts: [
            'Ensure a stable internet connection for uninterrupted learning.',
            'Use a compatible device and browser for the best experience.',
            'Update your browser to the latest version.',
            'Report any technical issues to support@emareelms.com',
            '📞 Having trouble? Contact technical support.',
            'Clear your cache and cookies if the page doesn\'t load.',
            'Check system requirements before installing the mobile app.',
            '🔧 Technical maintenance scheduled: [Date & Time]',
            'The platform will be down for 2 hours for updates.'
        ]
    },
    {
        id: 'system-wide',
        title: 'System-Wide Prompts',
        description: 'Motivational, welcome, and general system prompts for learners.',
        prompts: [
            '🌟 Welcome to Emare ELMS! Start your learning journey today.',
            'Your future starts here. Let\'s learn together!',
            '💪 You can do it! Complete one more lesson today.',
            'Learning is a journey, not a destination. Keep going!',
            'Every expert was once a beginner. Keep learning!',
            '☀️ Good morning! Your daily lesson is ready.',
            '🌙 Good evening! Complete your daily goal before bed.',
            '📅 Check your calendar for upcoming deadlines.',
            '📊 Your weekly learning summary is ready.',
            '🎯 Goal of the day: Complete 2 lessons.',
            '📘 Create a personalized learning path for me based on my progress.',
            '🎓 Recommend courses and certifications for my career goals.'
        ]
    }
];

const Quiz = require('../models/Quiz');
const User = require('../models/User');
const Course = require('../models/Course');
const GradeBook = require('../models/GradeBook');

// ─────────────────────────────────────────────
// @desc    Create a new quiz for a course
// @route   POST /api/quizzes
// @access  Private (Instructor only)
// ─────────────────────────────────────────────
const createQuiz = async (req, res, next) => {
    try {
        const { courseRef, quizTitle, allottedDurationMinutes, passingScoreThreshold, questionArray, submissionDeadline } = req.body;

        // Verify the course exists and belongs to the instructor
        const course = await Course.findById(courseRef);
        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found.' });
        }
        if (course.creatorRef.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'You can only create quizzes for your own courses.' });
        }

        const quiz = await Quiz.create({
            courseRef,
            quizTitle,
            allottedDurationMinutes,
            passingScoreThreshold: passingScoreThreshold || 60,
            questionArray,
            submissionDeadline
        });

        res.status(201).json({ success: true, data: quiz });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────
// @desc    Get all quizzes for a specific course
// @route   GET /api/quizzes/course/:courseId
// @access  Private
// ─────────────────────────────────────────────
const getQuizzesByCourse = async (req, res, next) => {
    try {
        const quizzes = await Quiz.find({ courseRef: req.params.courseId, isActive: true })
            .select('-questionArray.correctAnswerIndex') // Hide answers in listing
            .sort({ createdAt: -1 })
            .lean();

        res.status(200).json({ success: true, count: quizzes.length, data: quizzes });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────
// @desc    Get a single quiz by ID
// @route   GET /api/quizzes/:id
// @access  Private
// ─────────────────────────────────────────────
const getQuizById = async (req, res, next) => {
    try {
        let quiz = await Quiz.findById(req.params.id).lean();
        if (!quiz) {
            return res.status(404).json({ success: false, message: 'Quiz not found.' });
        }

        // If the requesting user is a Student, strip correct answers from the response
        if (req.user.assignedRole === 'Student') {
            quiz.questionArray = quiz.questionArray.map(q => ({
                _id: q._id,
                questionText: q.questionText,
                options: q.options
                // correctAnswerIndex is intentionally omitted
            }));
        }

        res.status(200).json({ success: true, data: quiz });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────
// @desc    Submit a quiz attempt for auto-grading
// @route   POST /api/quizzes/:id/attempt
// @access  Private (Student only)
// ─────────────────────────────────────────────
const submitQuizAttempt = async (req, res, next) => {
    try {
        const { answers } = req.body; // Array of { questionId, selectedIndex }

        const quiz = await Quiz.findById(req.params.id);
        if (!quiz) {
            return res.status(404).json({ success: false, message: 'Quiz not found.' });
        }

        if (!quiz.isActive) {
            return res.status(400).json({ success: false, message: 'This quiz is no longer active.' });
        }

        // Check if student has already attempted this quiz
        const existingAttempt = await GradeBook.findOne({ studentRef: req.user.id, assessmentRef: quiz._id });
        if (existingAttempt) {
            return res.status(400).json({ success: false, message: 'You have already submitted an attempt for this quiz.' });
        }

        // Auto-grade: compare submitted answers against correct answer indices
        let correctCount = 0;
        const totalQuestions = quiz.questionArray.length;

        if (answers && Array.isArray(answers)) {
            answers.forEach(answer => {
                const question = quiz.questionArray.id(answer.questionId);
                if (question && question.correctAnswerIndex === answer.selectedIndex) {
                    correctCount++;
                }
            });
        }

        const scorePercentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
        const passed = scorePercentage >= quiz.passingScoreThreshold;

        // Record the grade in the GradeBook
        const gradeEntry = await GradeBook.create({
            studentRef: req.user.id,
            assessmentRef: quiz._id,
            numericalScoreEarned: scorePercentage,
            submissionTimestamp: Date.now(),
            gradingTimestamp: Date.now(),
            isGraded: true,
            instructorReviewNotes: `Auto-graded: ${correctCount}/${totalQuestions} correct.`
        });

        // Gamification Logic: Award points and badges if passed
        let pointsAwarded = 0;
        let newBadge = null;
        if (passed) {
            pointsAwarded = 100; // Base points for passing
            if (scorePercentage === 100) pointsAwarded += 50; // Perfect score bonus

            const user = await User.findById(req.user.id);
            user.gamificationPoints += pointsAwarded;
            
            // Logic for awarding 'Quiz Master' badge
            if (scorePercentage >= 90 && !user.earnedBadges.includes('Quiz Master')) {
                user.earnedBadges.push('Quiz Master');
                newBadge = 'Quiz Master';
            }
            await user.save({ validateBeforeSave: false }); // Skip strict validation for this specific update
        }

        res.status(200).json({
            success: true,
            message: passed ? 'Congratulations! You passed the quiz.' : 'You did not meet the passing threshold.',
            data: {
                scorePercentage,
                correctCount,
                totalQuestions,
                passingThreshold: quiz.passingScoreThreshold,
                passed,
                gradeEntryId: gradeEntry._id,
                gamification: {
                    pointsAwarded,
                    newBadge
                }
            }
        });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────
// @desc    Get quiz results for a student
// @route   GET /api/quizzes/:id/results
// @access  Private (Student only)
// ─────────────────────────────────────────────
const getQuizResults = async (req, res, next) => {
    try {
        const gradeEntry = await GradeBook.findOne({
            studentRef: req.user.id,
            assessmentRef: req.params.id
        }).lean();

        if (!gradeEntry) {
            return res.status(404).json({ success: false, message: 'No attempt found for this quiz.' });
        }

        res.status(200).json({ success: true, data: gradeEntry });
    } catch (err) {
        next(err);
    }
};

module.exports = { createQuiz, getQuizzesByCourse, getQuizById, submitQuizAttempt, getQuizResults };

const Quiz = require('../models/Quiz');
const User = require('../models/User');
const Course = require('../models/Course');
const GradeBook = require('../models/GradeBook');
const AssessmentAiBlock = require('../models/AssessmentAiBlock');
const { getQuizAccess } = require('../services/sequenceService');

// ─────────────────────────────────────────────
// @desc    Create a new quiz for a course
// @route   POST /api/quizzes
// @access  Private (Instructor only)
// ─────────────────────────────────────────────
const createQuiz = async (req, res, next) => {
    try {
        const {
            courseRef, quizTitle, allottedDurationMinutes, passingScoreThreshold,
            questionArray, submissionDeadline, attemptLimit,
            lessonRef   // optional — links quiz to a specific embedded lesson
        } = req.body;

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
            lessonRef: lessonRef || null,
            quizTitle,
            allottedDurationMinutes,
            passingScoreThreshold: passingScoreThreshold || 60,
            attemptLimit: Number(attemptLimit) || 1,
            questionArray,
            submissionDeadline,
            aiTutorEnabled: req.body.aiTutorEnabled !== false
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
            // ── SEQUENTIAL GATE ─────────────────────────────────────────────
            // A quiz belonging to a lesson may only be viewed once its owning
            // lesson is unlocked (i.e. all earlier lessons are fully complete).
            const access = await getQuizAccess(req.user.id, quiz);
            if (!access.granted) {
                return res.status(403).json({
                    success: false,
                    message: access.reason,
                    lessonLocked: true,
                    lockReason: access.reason
                });
            }

            quiz.questionArray = quiz.questionArray.map(q => ({
                _id: q._id,
                questionText: q.questionText,
                options: q.options
                // correctAnswerIndex is intentionally omitted
            }));

            // Server-side AI Tutor enforcement: if the instructor disabled the
            // AI Tutor for this quiz, register a block for this student that
            // lasts for the quiz duration + a 10 minute grace period. While the
            // block is active, every AI Tutor endpoint rejects their requests.
            if (quiz.aiTutorEnabled === false) {
                const expiresAt = new Date(Date.now() + (quiz.allottedDurationMinutes + 10) * 60 * 1000);
                await AssessmentAiBlock.findOneAndUpdate(
                    { studentRef: req.user.id, quizRef: quiz._id },
                    { $set: { studentRef: req.user.id, quizRef: quiz._id, courseRef: quiz.courseRef, expiresAt, reason: AssessmentAiBlock.BLOCK_MESSAGE } },
                    { upsert: true, new: true }
                );
            }
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

        // ── SEQUENTIAL GATE ────────────────────────────────────────────────
        // A quiz linked to a lesson is only attemptable when its lesson is
        // unlocked. Attempting an out-of-order quiz is rejected on the server.
        const access = await getQuizAccess(req.user.id, quiz);
        if (!access.granted) {
            return res.status(403).json({
                success: false,
                message: access.reason,
                lessonLocked: true,
                lockReason: access.reason
            });
        }

        // ── ATTEMPT LIMIT ──────────────────────────────────────────────────
        // Retries are allowed only up to the quiz's attemptLimit (each attempt
        // is recorded as a GradeBook row). A failed attempt therefore locks the
        // lesson until the student passes — students with attempts left can retry.
        const attemptLimit = Number(quiz.attemptLimit) || 1;
        const attemptsUsed = await GradeBook.countDocuments({ studentRef: req.user.id, assessmentRef: quiz._id });
        if (attemptsUsed >= attemptLimit) {
            return res.status(400).json({
                success: false,
                message: `You have used all ${attemptLimit} allowed attempt${attemptLimit > 1 ? 's' : ''} for this quiz.`
            });
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

        // The attempt is complete — release the AI Tutor block for this student
        await AssessmentAiBlock.deleteOne({ studentRef: req.user.id, quizRef: quiz._id });

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
                attemptLimit,
                attemptsUsed: attemptsUsed + 1,
                attemptsLeft: Math.max(0, attemptLimit - (attemptsUsed + 1)),
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

// ─────────────────────────────────────────────
// @desc    Get all quizzes for courses owned by the instructor
// @route   GET /api/quizzes/instructor/mine
// @access  Private (Instructor only)
// ─────────────────────────────────────────────
const getInstructorQuizzes = async (req, res, next) => {
    try {
        // Find all courses belonging to this instructor
        const courses = await Course.find({ creatorRef: req.user.id }).select('_id courseTitle').lean();
        const courseIds = courses.map(c => c._id);

        // Find all quizzes for those courses
        const quizzes = await Quiz.find({ courseRef: { $in: courseIds } })
            .populate('courseRef', 'courseTitle')
            .sort({ createdAt: -1 })
            .lean();

        res.status(200).json({ success: true, count: quizzes.length, data: quizzes });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────
// @desc    Update a quiz
// @route   PUT /api/quizzes/:id
// @access  Private (Instructor only)
// ─────────────────────────────────────────────
const updateQuiz = async (req, res, next) => {
    try {
        let quiz = await Quiz.findById(req.params.id);
        if (!quiz) {
            return res.status(404).json({ success: false, message: 'Quiz not found.' });
        }

        // Verify ownership through the course
        const course = await Course.findById(quiz.courseRef);
        if (!course || course.creatorRef.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'You can only edit quizzes for your own courses.' });
        }

        // Allow updating lessonRef (link/unlink this quiz from a lesson)
        if ('lessonRef' in req.body) {
            req.body.lessonRef = req.body.lessonRef || null;
        }

        // Emare AI Tutor toggle — normalize to a boolean
        if ('aiTutorEnabled' in req.body) {
            req.body.aiTutorEnabled = !!req.body.aiTutorEnabled;
        }

        quiz = await Quiz.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        res.status(200).json({ success: true, data: quiz });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────
// @desc    Delete a quiz
// @route   DELETE /api/quizzes/:id
// @access  Private (Instructor only)
// ─────────────────────────────────────────────
const deleteQuiz = async (req, res, next) => {
    try {
        const quiz = await Quiz.findById(req.params.id);
        if (!quiz) {
            return res.status(404).json({ success: false, message: 'Quiz not found.' });
        }

        // Verify ownership through the course
        const course = await Course.findById(quiz.courseRef);
        if (!course || course.creatorRef.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'You can only delete quizzes for your own courses.' });
        }

        await Quiz.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true, message: 'Quiz deleted successfully.' });
    } catch (err) {
        next(err);
    }
};

module.exports = { createQuiz, getQuizzesByCourse, getQuizById, submitQuizAttempt, getQuizResults, getInstructorQuizzes, updateQuiz, deleteQuiz };

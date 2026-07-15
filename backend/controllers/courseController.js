const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');

// ─────────────────────────────────────────────
// @desc    Create a new course (Draft state)
// @route   POST /api/courses
// @access  Private (Instructor only)
// ─────────────────────────────────────────────
const createCourse = async (req, res, next) => {
    try {
        const { courseTitle, descriptionText, technicalCategory, estimatedDurationHours, price, thumbnailUrl } = req.body;

        const course = await Course.create({
            courseTitle,
            descriptionText,
            technicalCategory,
            estimatedDurationHours,
            price: price || 0,
            thumbnailUrl,
            creatorRef: req.user.id,
            publicationState: 'Draft'
        });

        res.status(201).json({ success: true, data: course });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────
// @desc    Get all publicly Active courses (Student catalog)
// @route   GET /api/courses
// @access  Public
// ─────────────────────────────────────────────
const getPublishedCourses = async (req, res, next) => {
    try {
        const courses = await Course.find({ publicationState: 'Active' })
            .populate('creatorRef', 'fullName accountEmail')
            .sort({ creationTimestamp: -1 })
            .lean();

        res.status(200).json({ success: true, count: courses.length, data: courses });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────
// @desc    Get a single course by ID
// @route   GET /api/courses/:id
// @access  Public
// ─────────────────────────────────────────────
const getCourseById = async (req, res, next) => {
    try {
        const course = await Course.findById(req.params.id).populate('creatorRef', 'fullName accountEmail');

        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found.' });
        }

        // Check if user is authorized to view full videos (Admin, Instructor owner, or Cleared Student)
        let isAuthorized = false;
        if (req.user) {
            if (req.user.assignedRole === 'Admin') {
                isAuthorized = true;
            } else if (req.user.assignedRole === 'Instructor' && course.creatorRef.toString() === req.user.id) {
                isAuthorized = true;
            } else if (req.user.assignedRole === 'Student') {
                const enrollment = await Enrollment.findOne({ studentRef: req.user.id, courseRef: course._id });
                if (enrollment && enrollment.tuitionClearanceFlag) {
                    isAuthorized = true;
                }
            }
        }

        // Convert Mongoose doc to plain object to allow field modification
        const courseObj = course.toObject();

        // If not authorized, redact videoUrl for non-preview lessons
        if (!isAuthorized && courseObj.curriculumTree) {
            courseObj.curriculumTree = courseObj.curriculumTree.map(chapter => {
                if (chapter.lessons) {
                    chapter.lessons = chapter.lessons.map(lesson => {
                        if (!lesson.isFreePreview) {
                            lesson.videoUrl = ''; // Redact video link
                        }
                        return lesson;
                    });
                }
                return chapter;
            });
        }

        res.status(200).json({ success: true, data: courseObj });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────
// @desc    Update course details
// @route   PUT /api/courses/:id
// @access  Private (Instructor - must be owner)
// ─────────────────────────────────────────────
const updateCourse = async (req, res, next) => {
    try {
        let course = await Course.findById(req.params.id);

        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found.' });
        }

        // Ownership check
        if (course.creatorRef.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'You are not the owner of this course.' });
        }

        // Only allow editing Draft courses
        if (['Active', 'Archived'].includes(course.publicationState)) {
            return res.status(400).json({ success: false, message: `Cannot edit a course that is currently ${course.publicationState}.` });
        }

        course = await Course.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });

        res.status(200).json({ success: true, data: course });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────
// @desc    Submit course for Admin review
// @route   PATCH /api/courses/:id/submit
// @access  Private (Instructor)
// ─────────────────────────────────────────────
const submitCourseForReview = async (req, res, next) => {
    try {
        const course = await Course.findById(req.params.id);

        if (!course) return res.status(404).json({ success: false, message: 'Course not found.' });
        if (course.creatorRef.toString() !== req.user.id) return res.status(403).json({ success: false, message: 'Access denied.' });
        if (course.publicationState !== 'Draft') return res.status(400).json({ success: false, message: `Course is already in '${course.publicationState}' state.` });

        course.publicationState = 'Pending Audit';
        await course.save();

        res.status(200).json({ success: true, message: 'Course submitted for administrator review.', data: course });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────
// @desc    Approve course and publish to catalog
// @route   PATCH /api/courses/:id/approve
// @access  Private (Admin only)
// ─────────────────────────────────────────────
const approveCourse = async (req, res, next) => {
    try {
        const course = await Course.findById(req.params.id);

        if (!course) return res.status(404).json({ success: false, message: 'Course not found.' });
        if (course.publicationState !== 'Pending Audit') return res.status(400).json({ success: false, message: `Course must be in 'Pending Audit' state to approve.` });

        course.publicationState = 'Active';
        await course.save();

        res.status(200).json({ success: true, message: 'Course approved and is now live in the catalog.', data: course });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────
// @desc    Enroll student in a course
// @route   POST /api/courses/:id/enroll
// @access  Private (Student only)
// ─────────────────────────────────────────────
const enrollInCourse = async (req, res, next) => {
    try {
        const course = await Course.findById(req.params.id);

        if (!course) return res.status(404).json({ success: false, message: 'Course not found.' });
        if (course.publicationState !== 'Active') return res.status(400).json({ success: false, message: 'This course is not available for enrollment.' });

        // Prevent duplicate enrollments
        const existing = await Enrollment.findOne({ studentRef: req.user.id, courseRef: course._id });
        if (existing) return res.status(400).json({ success: false, message: 'You are already enrolled in this course.' });

        const enrollment = await Enrollment.create({
            studentRef: req.user.id,
            courseRef: course._id,
            tuitionClearanceFlag: false
        });

        res.status(201).json({
            success: true,
            message: 'Enrolled successfully. Please complete payment clearance to access course materials.',
            data: enrollment
        });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────
// @desc    Get all courses for the logged-in Instructor
// @route   GET /api/courses/instructor/mine
// @access  Private (Instructor)
// ─────────────────────────────────────────────
const getInstructorCourses = async (req, res, next) => {
    try {
        const courses = await Course.find({ creatorRef: req.user.id }).sort({ creationTimestamp: -1 });
        res.status(200).json({ success: true, count: courses.length, data: courses });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────
// @desc    Get all enrolled courses for logged-in Student
// @route   GET /api/courses/student/enrolled
// @access  Private (Student)
// ─────────────────────────────────────────────
const getStudentEnrollments = async (req, res, next) => {
    try {
        const enrollments = await Enrollment.find({ studentRef: req.user.id })
            .populate({ path: 'courseRef', populate: { path: 'creatorRef', select: 'fullName' } })
            .lean();

        // Sanitize video URLs if tuition is not cleared
        const sanitizedEnrollments = enrollments.map(enrollment => {
            if (!enrollment.tuitionClearanceFlag && enrollment.courseRef && enrollment.courseRef.curriculumTree) {
                enrollment.courseRef.curriculumTree = enrollment.courseRef.curriculumTree.map(chapter => {
                    if (chapter.lessons) {
                        chapter.lessons = chapter.lessons.map(lesson => {
                            if (!lesson.isFreePreview) {
                                lesson.videoUrl = '';
                            }
                            return lesson;
                        });
                    }
                    return chapter;
                });
            }
            return enrollment;
        });

        res.status(200).json({ success: true, count: sanitizedEnrollments.length, data: sanitizedEnrollments });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────
// @desc    Admin toggles tuition clearance for a student enrollment
// @route   PATCH /api/courses/enrollment/:enrollmentId/clear
// @access  Private (Admin only)
// ─────────────────────────────────────────────
const toggleTuitionClearance = async (req, res, next) => {
    try {
        const enrollment = await Enrollment.findById(req.params.enrollmentId);

        if (!enrollment) return res.status(404).json({ success: false, message: 'Enrollment record not found.' });

        enrollment.tuitionClearanceFlag = !enrollment.tuitionClearanceFlag;
        await enrollment.save();

        res.status(200).json({
            success: true,
            message: `Tuition clearance ${enrollment.tuitionClearanceFlag ? 'GRANTED' : 'REVOKED'} successfully.`,
            data: enrollment
        });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────
// @desc    Securely stream lesson video if student has tuition clearance
// @route   GET /api/courses/lessons/:id/stream
// @access  Private (Authenticated users)
// ─────────────────────────────────────────────
const streamLessonVideo = async (req, res, next) => {
    try {
        const lessonId = req.params.id;
        // Find the course that contains this lesson
        const course = await Course.findOne({ "curriculumTree.lessons._id": lessonId });

        if (!course) {
            return res.status(404).json({ success: false, message: 'Lesson or Course not found.' });
        }

        // Find the lesson in the course's curriculumTree
        let lesson = null;
        for (const chapter of course.curriculumTree) {
            const found = chapter.lessons.find(l => l._id.toString() === lessonId);
            if (found) {
                lesson = found;
                break;
            }
        }

        if (!lesson) {
            return res.status(404).json({ success: false, message: 'Lesson not found.' });
        }

        // If it's a free preview, allow access
        if (lesson.isFreePreview) {
            return res.status(200).json({ success: true, videoUrl: lesson.videoUrl });
        }

        // Otherwise check authorization: Admin, Instructor owner, or Cleared Student
        let isAuthorized = false;
        if (req.user.assignedRole === 'Admin') {
            isAuthorized = true;
        } else if (req.user.assignedRole === 'Instructor' && course.creatorRef.toString() === req.user.id) {
            isAuthorized = true;
        } else if (req.user.assignedRole === 'Student') {
            const enrollment = await Enrollment.findOne({ studentRef: req.user.id, courseRef: course._id });
            if (enrollment && enrollment.tuitionClearanceFlag) {
                isAuthorized = true;
            }
        }

        if (!isAuthorized) {
            return res.status(402).json({
                success: false,
                message: 'Tuition clearance is required to stream this video.'
            });
        }

        res.status(200).json({ success: true, videoUrl: lesson.videoUrl });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    createCourse,
    getPublishedCourses,
    getCourseById,
    updateCourse,
    submitCourseForReview,
    approveCourse,
    enrollInCourse,
    getInstructorCourses,
    getStudentEnrollments,
    toggleTuitionClearance,
    streamLessonVideo
};

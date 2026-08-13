const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const User = require('../models/User');
const Review = require('../models/Review');
const Assignment = require('../models/Assignment');
const Submission = require('../models/Submission');
const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');
const LearningProgress = require('../models/LearningProgress');
const { uploadImage } = require('../services/cloudinaryService');
const { audit } = require('../utils/auditLogger');

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

        // Audit: course created
        audit.course({ req, user: req.user, action: 'COURSE_CREATED', severity: 'info',
            description: `Instructor (${req.user?.accountEmail}) created course: '${course.courseTitle}' as Draft.`,
            targetType: 'Course', targetId: course._id, targetLabel: course.courseTitle });

        res.status(201).json({ success: true, data: course });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────
// @desc    Get all publicly published courses (Student catalog)
// @route   GET /api/courses
// @access  Public
// ─────────────────────────────────────────────
const getPublishedCourses = async (req, res, next) => {
    try {
        const courses = await Course.find({ publicationState: { $in: ['Published', 'Active'] } })
            .populate('creatorRef', 'fullName accountEmail')
            .sort({ creationTimestamp: -1 })
            .lean();

        // Ensure thumbnailUrl is included in response
        const coursesWithThumbnails = courses.map(c => ({
            ...c,
            thumbnailUrl: c.thumbnailUrl || null
        }));

        console.log(`[${new Date().toISOString()}] getPublishedCourses: Returning ${coursesWithThumbnails.length} courses`);
        coursesWithThumbnails.forEach(c => {
            if (c.thumbnailUrl) {
                console.log(`  ✓ ${c.courseTitle}: ${c.thumbnailUrl}`);
            } else {
                console.warn(`  ✗ ${c.courseTitle}: NO THUMBNAIL`);
            }
        });

        res.status(200).json({ success: true, count: coursesWithThumbnails.length, data: coursesWithThumbnails });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────
// @desc    Get all courses for platform-wide admin management
// @route   GET /api/courses/admin/all
// @access  Private (Admin only)
// ─────────────────────────────────────────────
const getAllCourses = async (req, res, next) => {
    try {
        const courses = await Course.find({})
            .populate('creatorRef', 'fullName accountEmail')
            .populate('assignedInstructorRef', 'fullName accountEmail')
            .sort({ creationTimestamp: -1 })
            .lean();

        // Ensure all courses have thumbnailUrl included
        const coursesWithThumbnails = courses.map(c => ({
            ...c,
            thumbnailUrl: c.thumbnailUrl || null
        }));

        console.log('getAllCourses: Returning', coursesWithThumbnails.length, 'courses with thumbnails');
        if (coursesWithThumbnails.length > 0) {
            console.log('Sample course:', {
                title: coursesWithThumbnails[0].courseTitle,
                thumbnailUrl: coursesWithThumbnails[0].thumbnailUrl,
                hasThumb: !!coursesWithThumbnails[0].thumbnailUrl
            });
        }

        res.status(200).json({ success: true, count: coursesWithThumbnails.length, data: coursesWithThumbnails });
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

        // Allow editing courses in any state (Draft, Published, Active, etc.)
        // Archived courses can be edited to restore them

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
        if (!['Draft', 'Revision Needed'].includes(course.publicationState)) {
            return res.status(400).json({ success: false, message: `Course is already in '${course.publicationState}' state.` });
        }

        course.publicationState = 'Pending Review';
        await course.save();

        // Audit: course submitted for review
        audit.course({ req, user: req.user, action: 'COURSE_SUBMITTED', severity: 'info',
            description: `Instructor (${req.user?.accountEmail}) submitted course for review: '${course.courseTitle}'.`,
            targetType: 'Course', targetId: course._id, targetLabel: course.courseTitle });

        res.status(200).json({ success: true, message: 'Course submitted for administrator review.', data: course });
    } catch (err) {
        next(err);
    }
};

const uploadCourseThumbnail = async (req, res, next) => {
    try {
        const course = await Course.findById(req.params.id);
        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found.' });
        }
        if (course.creatorRef.toString() !== req.user.id && req.user.assignedRole !== 'Admin') {
            return res.status(403).json({ success: false, message: 'You are not authorized to update this course.' });
        }
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No thumbnail image uploaded.' });
        }

        console.log('Uploading thumbnail for course:', req.params.id, 'File size:', req.file.size);
        const result = await uploadImage(req.file.buffer, 'emare_elms/course_thumbnails');
        console.log('Cloudinary upload result:', result);
        
        if (!result || !result.secure_url) {
            return res.status(500).json({ success: false, message: 'Failed to upload thumbnail to Cloudinary.' });
        }
        
        course.thumbnailUrl = result.secure_url;
        const updatedCourse = await course.save();
        const populatedCourse = await Course.findById(updatedCourse._id).populate('creatorRef', 'fullName email');

        console.log('Thumbnail saved successfully:', populatedCourse.thumbnailUrl);
        res.status(200).json({ success: true, message: 'Course thumbnail uploaded successfully.', data: populatedCourse });
    } catch (err) {
        console.error('Thumbnail upload error:', err);
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
        if (course.publicationState !== 'Pending Review') return res.status(400).json({ success: false, message: `Course must be in 'Pending Review' state to publish.` });

        course.publicationState = 'Published';
        await course.save();

        // Audit: course approved
        audit.course({ req, user: req.user, action: 'COURSE_APPROVED', severity: 'info',
            description: `Admin (${req.user?.accountEmail}) approved course submission: '${course.courseTitle}'.`,
            targetType: 'Course', targetId: course._id, targetLabel: course.courseTitle });

        res.status(200).json({ success: true, message: 'Course approved and is now live in the catalog.', data: course });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────
// @desc    Request revisions for a course under review
// @route   PATCH /api/courses/:id/request-revision
// @access  Private (Admin only)
// ─────────────────────────────────────────────
const requestCourseRevision = async (req, res, next) => {
    try {
        const course = await Course.findById(req.params.id);
        const { message } = req.body;

        if (!course) return res.status(404).json({ success: false, message: 'Course not found.' });
        if (!['Pending Review'].includes(course.publicationState)) {
            return res.status(400).json({ success: false, message: 'Course must be pending review to request revisions.' });
        }

        course.publicationState = 'Revision Needed';
        if (message) {
            course.adminFeedback.push({
                adminRef: req.user.id,
                message,
                action: 'Revision Requested'
            });
        }

        await course.save();

        // Audit: revision requested
        audit.course({ req, user: req.user, action: 'COURSE_REVISION_REQUESTED', severity: 'warning',
            description: `Admin (${req.user?.accountEmail}) requested revisions for course '${course.courseTitle}': "${message || 'No reason given'}".`,
            targetType: 'Course', targetId: course._id, targetLabel: course.courseTitle });

        res.status(200).json({ success: true, message: 'Revision requested. The course has been sent back to the instructor for updates.', data: course });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────
// @desc    Reject a course to Draft for another round of authoring
// @route   PATCH /api/courses/:id/reject
// @access  Private (Admin only)
// ─────────────────────────────────────────────
const rejectCourse = async (req, res, next) => {
    try {
        const course = await Course.findById(req.params.id);
        const { message } = req.body;

        if (!course) return res.status(404).json({ success: false, message: 'Course not found.' });
        if (!['Pending Review', 'Revision Needed', 'Published'].includes(course.publicationState)) {
            return res.status(400).json({ success: false, message: 'Course must be pending review, revision needed, or published to reject it.' });
        }

        course.publicationState = 'Draft';
        if (message) {
            course.adminFeedback.push({
                adminRef: req.user.id,
                message,
                action: 'Rejected'
            });
        }

        await course.save();

        // Audit: course rejected
        audit.course({ req, user: req.user, action: 'COURSE_REJECTED', severity: 'warning',
            description: `Admin (${req.user?.accountEmail}) rejected course '${course.courseTitle}': "${message || 'No reason given'}".`,
            targetType: 'Course', targetId: course._id, targetLabel: course.courseTitle });

        res.status(200).json({ success: true, message: 'Course rejected and reverted back to Draft.', data: course });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────
// @desc    Publish a course directly from admin review
// @route   PATCH /api/courses/:id/publish
// @access  Private (Admin only)
// ─────────────────────────────────────────────
const publishCourse = async (req, res, next) => {
    try {
        const course = await Course.findById(req.params.id);

        if (!course) return res.status(404).json({ success: false, message: 'Course not found.' });
        if (course.publicationState !== 'Pending Review') {
            return res.status(400).json({ success: false, message: 'Course must be pending review to publish.' });
        }

        course.publicationState = 'Published';
        await course.save();

        // Audit: course published
        audit.course({ req, user: req.user, action: 'COURSE_PUBLISHED', severity: 'info',
            description: `Admin (${req.user?.accountEmail}) published course '${course.courseTitle}' — now visible to all learners.`,
            targetType: 'Course', targetId: course._id, targetLabel: course.courseTitle });

        res.status(200).json({ success: true, message: 'Course published and visible to learners.', data: course });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────
// @desc    Restore an archived course back to Draft
// @route   PATCH /api/courses/:id/restore
// @access  Private (Admin only)
// ─────────────────────────────────────────────
const restoreCourse = async (req, res, next) => {
    try {
        const course = await Course.findById(req.params.id);

        if (!course) return res.status(404).json({ success: false, message: 'Course not found.' });
        if (course.publicationState !== 'Archived') {
            return res.status(400).json({ success: false, message: 'Only archived courses can be restored.' });
        }

        course.publicationState = 'Draft';
        await course.save();

        res.status(200).json({ success: true, message: 'Course restored to Draft state.', data: course });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────
// @desc    Toggle course featured status
// @route   PATCH /api/courses/:id/feature
// @access  Private (Admin only)
// ─────────────────────────────────────────────
const featureCourse = async (req, res, next) => {
    try {
        const course = await Course.findById(req.params.id);

        if (!course) return res.status(404).json({ success: false, message: 'Course not found.' });

        if (typeof req.body.isFeatured === 'boolean') {
            course.isFeatured = req.body.isFeatured;
        } else {
            course.isFeatured = !course.isFeatured;
        }

        await course.save();

        res.status(200).json({ success: true, message: `Course ${course.isFeatured ? 'marked as featured' : 'unmarked as featured'}.`, data: course });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────
// @desc    Send feedback on a course without changing workflow state
const sendCourseFeedback = async (req, res, next) => {
    try {
        const course = await Course.findById(req.params.id);
        const { message } = req.body;

        if (!course) return res.status(404).json({ success: false, message: 'Course not found.' });
        if (!message || !message.trim()) {
            return res.status(400).json({ success: false, message: 'Feedback message is required.' });
        }

        course.adminFeedback.push({
            adminRef: req.user.id,
            message: message.trim(),
            action: 'Feedback'
        });

        await course.save();

        res.status(200).json({ success: true, message: 'Feedback sent to the instructor.', data: course });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────
// @desc    Assign an instructor to a course
// @route   PATCH /api/courses/:id/assign-instructor
// @access  Private (Admin only)
// ─────────────────────────────────────────────
const assignInstructor = async (req, res, next) => {
    try {
        const { instructorId } = req.body;

        if (!instructorId) {
            return res.status(400).json({ success: false, message: 'Instructor ID is required.' });
        }

        const [course, instructor] = await Promise.all([
            Course.findById(req.params.id),
            User.findById(instructorId)
        ]);

        if (!course) return res.status(404).json({ success: false, message: 'Course not found.' });
        if (!instructor || instructor.assignedRole !== 'Instructor') {
            return res.status(400).json({ success: false, message: 'Valid instructor not found.' });
        }

        course.assignedInstructorRef = instructor._id;
        await course.save();

        res.status(200).json({ success: true, message: `Instructor ${instructor.fullName} has been assigned to the course.`, data: course });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────
// @desc    Remove instructor assignment from a course
// @route   PATCH /api/courses/:id/remove-instructor
// @access  Private (Admin only)
// ─────────────────────────────────────────────
const removeInstructor = async (req, res, next) => {
    try {
        const course = await Course.findById(req.params.id);

        if (!course) return res.status(404).json({ success: false, message: 'Course not found.' });

        course.assignedInstructorRef = null;
        await course.save();

        res.status(200).json({ success: true, message: 'Instructor assignment removed from the course.', data: course });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────
// @desc    Change a course category
// @route   PATCH /api/courses/:id/change-category
// @access  Private (Admin only)
// ─────────────────────────────────────────────
const changeCourseCategory = async (req, res, next) => {
    try {
        const { technicalCategory } = req.body;

        if (!technicalCategory) {
            return res.status(400).json({ success: false, message: 'Category is required.' });
        }

        const course = await Course.findById(req.params.id);
        if (!course) return res.status(404).json({ success: false, message: 'Course not found.' });

        course.technicalCategory = technicalCategory;
        await course.save();

        res.status(200).json({ success: true, message: 'Course category updated successfully.', data: course });
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
        if (!['Published', 'Active'].includes(course.publicationState)) return res.status(400).json({ success: false, message: 'This course is not available for enrollment.' });

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

// ─────────────────────────────────────────────
// @desc    Delete a course (Instructor - must be owner, Draft only)
// @route   DELETE /api/courses/:id
// @access  Private (Instructor only)
// ─────────────────────────────────────────────
const deleteCourse = async (req, res, next) => {
    try {
        const course = await Course.findById(req.params.id);
        if (!course) return res.status(404).json({ success: false, message: 'Course not found.' });
        if (course.creatorRef.toString() !== req.user.id) return res.status(403).json({ success: false, message: 'Access denied.' });
        if (['Published', 'Active'].includes(course.publicationState)) return res.status(400).json({ success: false, message: 'Cannot delete a published course. Archive it first.' });

        await Course.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true, message: 'Course deleted permanently.' });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────
// @desc    Archive a course
// @route   PATCH /api/courses/:id/archive
// @access  Private (Instructor - must be owner)
// ─────────────────────────────────────────────
const archiveCourse = async (req, res, next) => {
    try {
        const course = await Course.findById(req.params.id);
        if (!course) return res.status(404).json({ success: false, message: 'Course not found.' });
        if (req.user.assignedRole !== 'Admin' && course.creatorRef.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Access denied.' });
        }

        course.publicationState = 'Archived';
        await course.save();
        res.status(200).json({ success: true, message: 'Course archived.', data: course });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────
// @desc    Unpublish a course (set back to Draft)
// @route   PATCH /api/courses/:id/unpublish
// @access  Private (Instructor or Admin)
// ─────────────────────────────────────────────
const unpublishCourse = async (req, res, next) => {
    try {
        const course = await Course.findById(req.params.id);
        if (!course) return res.status(404).json({ success: false, message: 'Course not found.' });
        if (req.user.assignedRole !== 'Admin' && course.creatorRef.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Access denied.' });
        }

        course.publicationState = 'Draft';
        await course.save();
        res.status(200).json({ success: true, message: 'Course unpublished.', data: course });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────
// @desc    Duplicate a course (creates a copy in Draft)
// @route   POST /api/courses/:id/duplicate
// @access  Private (Instructor - must be owner)
// ─────────────────────────────────────────────
const duplicateCourse = async (req, res, next) => {
    try {
        const source = await Course.findById(req.params.id).lean();
        if (!source) return res.status(404).json({ success: false, message: 'Course not found.' });
        if (source.creatorRef.toString() !== req.user.id) return res.status(403).json({ success: false, message: 'Access denied.' });

        delete source._id;
        delete source.creationTimestamp;
        delete source.updatedAt;
        source.courseTitle = `${source.courseTitle} (Copy)`;
        source.publicationState = 'Draft';
        source.totalEnrollments = 0;
        source.averageRating = 0;
        source.totalReviews = 0;

        const duplicate = await Course.create(source);
        res.status(201).json({ success: true, message: 'Course duplicated.', data: duplicate });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────
// @desc    Get instructor analytics (stats for their courses)
// @route   GET /api/courses/instructor/analytics
// @access  Private (Instructor)
// ─────────────────────────────────────────────
const getInstructorAnalytics = async (req, res, next) => {
    try {
        const courses = await Course.find({ creatorRef: req.user.id }).lean();
        const courseIds = courses.map(c => c._id);

        const [totalStudents, clearedStudents] = await Promise.all([
            Enrollment.countDocuments({ courseRef: { $in: courseIds } }),
            Enrollment.countDocuments({ courseRef: { $in: courseIds }, tuitionClearanceFlag: true })
        ]);

        const totalEarnings = courses.reduce((sum, c) => {
            return sum + (c.price || 0) * (c.totalEnrollments || 0);
        }, 0);

        const avgRating = courses.length > 0
            ? parseFloat((courses.reduce((sum, c) => sum + (c.averageRating || 0), 0) / courses.length).toFixed(1))
            : 0;

        const totalReviews = courses.reduce((sum, c) => sum + (c.totalReviews || 0), 0);

        // Pending reviews (not yet answered by the instructor)
        const pendingReviews = await Review.countDocuments({ courseRef: { $in: courseIds }, instructorReply: '' });

        // ── Recent Enrollments (with student + course info) ──
        const recentEnrollments = await Enrollment.find({ courseRef: { $in: courseIds } })
            .populate({ path: 'studentRef', select: 'fullName avatarUrl accountEmail' })
            .populate({ path: 'courseRef', select: 'courseTitle price' })
            .sort({ createdAt: -1 })
            .limit(8)
            .lean()
            .then(list => list.map(e => ({
                _id: e._id,
                studentName: e.studentRef?.fullName || 'Student',
                studentAvatar: e.studentRef?.avatarUrl || '',
                courseTitle: e.courseRef?.courseTitle || 'Course',
                coursePrice: e.courseRef?.price || 0,
                paymentStatus: e.paymentStatus || 'Unpaid',
                tuitionClearanceFlag: !!e.tuitionClearanceFlag,
                progress: Math.round(e.completionPercentage || 0),
                date: e.enrollmentTimestamp || e.createdAt
            })));

        // ── Recent Activity Feed ──
        const activity = [];

        recentEnrollments.slice(0, 5).forEach(e => {
            activity.push({
                id: `enroll-${e._id}`,
                type: 'enrollment',
                title: `${e.studentName} enrolled`,
                description: `Joined ${e.courseTitle}`,
                createdAt: e.date
            });
        });

        const [recentReviews, recentSubmissions, recentQuizAttempts] = await Promise.all([
            Review.find({ courseRef: { $in: courseIds } })
                .populate({ path: 'studentRef', select: 'fullName' })
                .populate({ path: 'courseRef', select: 'courseTitle' })
                .sort({ createdAt: -1 })
                .limit(5)
                .lean(),
            (async () => {
                const assignments = await Assignment.find({ courseRef: { $in: courseIds } }).select('_id').lean();
                const assignmentIds = assignments.map(a => a._id);
                if (assignmentIds.length === 0) return [];
                return Submission.find({ assignmentRef: { $in: assignmentIds } })
                    .populate({ path: 'studentRef', select: 'fullName' })
                    .populate({ path: 'assignmentRef', select: 'title' })
                    .sort({ submittedAt: -1 })
                    .limit(5)
                    .lean();
            })(),
            (async () => {
                const quizzes = await Quiz.find({ courseRef: { $in: courseIds } }).select('_id').lean();
                const quizIds = quizzes.map(q => q._id);
                if (quizIds.length === 0) return [];
                return QuizAttempt.find({ quizRef: { $in: quizIds } })
                    .populate({ path: 'studentRef', select: 'fullName' })
                    .populate({ path: 'quizRef', select: 'title' })
                    .sort({ submittedAt: -1 })
                    .limit(5)
                    .lean();
            })()
        ]);

        recentReviews.forEach(r => {
            activity.push({
                id: `review-${r._id}`,
                type: 'review',
                title: `${r.studentRef?.fullName || 'A student'} left a review`,
                description: `${'★'.repeat(r.rating || 0)}${'☆'.repeat(Math.max(0, 5 - (r.rating || 0)))} on ${r.courseRef?.courseTitle || 'a course'}`,
                createdAt: r.createdAt
            });
        });

        recentSubmissions.forEach(s => {
            activity.push({
                id: `sub-${s._id}`,
                type: 'assignment',
                title: `${s.studentRef?.fullName || 'A student'} submitted an assignment`,
                description: s.assignmentRef?.title || 'Assignment',
                createdAt: s.submittedAt || s.createdAt
            });
        });

        recentQuizAttempts.forEach(qa => {
            activity.push({
                id: `quiz-${qa._id}`,
                type: 'quiz',
                title: `${qa.studentRef?.fullName || 'A student'} completed a quiz`,
                description: qa.quizRef?.title || 'Quiz',
                createdAt: qa.submittedAt || qa.createdAt
            });
        });

        // Lesson completions from learning progress
        const progresses = await LearningProgress.find({ courseRef: { $in: courseIds } })
            .populate({ path: 'studentRef', select: 'fullName' })
            .populate({ path: 'courseRef', select: 'courseTitle' })
            .lean();
        progresses.forEach(p => {
            const completedLessons = (p.progressItems || []).filter(item => item.completed && item.completedAt);
            completedLessons.slice(0, 2).forEach(item => {
                activity.push({
                    id: `lesson-${p._id}-${item.lessonId || Math.random()}`,
                    type: 'lesson',
                    title: `${p.studentRef?.fullName || 'A student'} completed a lesson`,
                    description: item.lessonTitle || `Lesson in ${p.courseRef?.courseTitle || 'a course'}`,
                    createdAt: item.completedAt
                });
            });
        });

        const recentActivity = activity
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 8);

        // ── Trend Charts (last 6 months) ──
        const monthNames = [];
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            monthNames.push(d.toLocaleString('en-US', { month: 'short' }));
        }

        const startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        const monthEnrollments = await Enrollment.find({ courseRef: { $in: courseIds }, createdAt: { $gte: startDate } })
            .select('createdAt courseRef')
            .lean();

        const revenueTrend = monthNames.map(name => ({ name, revenue: 0 }));
        const enrollmentTrend = monthNames.map(name => ({ name, students: 0 }));
        const studentGrowth = monthNames.map(name => ({ name, students: 0 }));
        const coursePrices = Object.fromEntries(courses.map(c => [String(c._id), c.price || 0]));
        const totalStudentsAtMonth = [];

        let runningTotal = 0;
        monthNames.forEach((name, idx) => {
            const monthIndex = (now.getMonth() - (5 - idx) + 12) % 12;
            const monthStart = new Date(now.getFullYear(), monthIndex, 1);
            const monthEnd = new Date(now.getFullYear(), monthIndex + 1, 1);
            const bucket = monthEnrollments.filter(e => {
                const t = new Date(e.createdAt);
                return t >= monthStart && t < monthEnd;
            });
            const count = bucket.length;
            const revenue = bucket.reduce((sum, e) => sum + (coursePrices[String(e.courseRef)] || 0), 0);
            revenueTrend[idx].revenue = revenue;
            enrollmentTrend[idx].students = count;
            runningTotal += count;
            studentGrowth[idx].students = runningTotal;
        });

        // ── Course Performance ──
        const coursePerformance = [];
        for (const c of courses) {
            const enrollCount = c.totalEnrollments || 0;
            const perCourseEnrollments = await Enrollment.find({ courseRef: c._id })
                .select('completionPercentage')
                .lean();
            const completionRate = perCourseEnrollments.length
                ? Math.round(perCourseEnrollments.reduce((sum, e) => sum + (e.completionPercentage || 0), 0) / perCourseEnrollments.length)
                : 0;
            coursePerformance.push({
                name: c.courseTitle,
                category: c.technicalCategory || 'Other',
                views: c.views || 0,
                enrollments: enrollCount,
                completionRate,
                rating: c.averageRating || 0,
                reviews: c.totalReviews || 0
            });
        }

        const enrollmentsByCategory = {};
        for (const c of courses) {
            const cat = c.technicalCategory || 'Other';
            enrollmentsByCategory[cat] = (enrollmentsByCategory[cat] || 0) + (c.totalEnrollments || 0);
        }

        // Growth percentages (mock-friendly, based on trend buckets)
        const studentGrowthPct = enrollmentTrend.length >= 2
            ? computeGrowthPct(enrollmentTrend[enrollmentTrend.length - 1].students, enrollmentTrend[enrollmentTrend.length - 2].students)
            : 0;
        const revenueGrowthPct = revenueTrend.length >= 2
            ? computeGrowthPct(revenueTrend[revenueTrend.length - 1].revenue, revenueTrend[revenueTrend.length - 2].revenue)
            : 0;

        res.status(200).json({
            success: true,
            data: {
                totalCourses: courses.length,
                publishedCourses: courses.filter(c => ['Published', 'Active'].includes(c.publicationState)).length,
                draftCourses: courses.filter(c => c.publicationState === 'Draft').length,
                archivedCourses: courses.filter(c => c.publicationState === 'Archived').length,
                totalStudents,
                clearedStudents,
                totalEarnings,
                avgRating,
                totalReviews,
                pendingReviews,
                studentGrowthPct,
                revenueGrowthPct,
                enrollmentsByCategory,
                recentEnrollments,
                recentActivity,
                revenueTrend,
                enrollmentTrend,
                studentGrowth,
                coursePerformance
            }
        });
    } catch (err) {
        next(err);
    }
};

const computeGrowthPct = (current, previous) => {
    if (!previous || previous <= 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
};

// Debug endpoint: Check course thumbnail status
const debugCourseThumbnails = async (req, res, next) => {
    try {
        const courses = await Course.find({}).select('courseTitle thumbnailUrl publicationState _id').lean();
        const report = courses.map(c => ({
            title: c.courseTitle,
            id: c._id,
            hasThumb: !!c.thumbnailUrl,
            thumbUrl: c.thumbnailUrl || 'NOT SET',
            status: c.publicationState,
            isVisible: ['Published', 'Active'].includes(c.publicationState) && !!c.thumbnailUrl
        }));
        
        const stats = {
            total: courses.length,
            withThumbnails: report.filter(r => r.hasThumb).length,
            withoutThumbnails: report.filter(r => !r.hasThumb).length,
            published: report.filter(r => ['Published', 'Active'].includes(r.status)).length,
            visibleInCatalog: report.filter(r => r.isVisible).length,
            publishedButNoThumb: report.filter(r => ['Published', 'Active'].includes(r.status) && !r.hasThumb).length,
            courses: report.sort((a, b) => {
                // Sort: visible first, then with thumbnails, then by title
                if (a.isVisible && !b.isVisible) return -1;
                if (!a.isVisible && b.isVisible) return 1;
                if (a.hasThumb && !b.hasThumb) return -1;
                if (!a.hasThumb && b.hasThumb) return 1;
                return a.title.localeCompare(b.title);
            })
        };
        
        console.log('DEBUG - Course Thumbnails Status:', JSON.stringify(stats, null, 2));
        res.status(200).json({ success: true, data: stats });
    } catch (err) {
        next(err);
    }
};

// Auto-fix endpoint: Ensure all courses with thumbnails are properly configured
const fixCourseThumbnails = async (req, res, next) => {
    try {
        console.log('[fixCourseThumbnails] Starting thumbnail verification and fix...');
        
        // Find all courses with thumbnails
        const coursesWithThumbs = await Course.find({ thumbnailUrl: { $exists: true, $ne: '' } });
        let fixes = { checked: 0, published: 0, errors: [] };
        
        for (const course of coursesWithThumbs) {
            fixes.checked++;
            
            // If course has a thumbnail but isn't published, publish it
            const visibleStates = ['Published', 'Active'];
            if (!visibleStates.includes(course.publicationState)) {
                console.log(`[fixCourseThumbnails] Publishing "${course.courseTitle}" (was: ${course.publicationState})`);
                course.publicationState = 'Published';
                try {
                    await course.save();
                    fixes.published++;
                } catch (err) {
                    fixes.errors.push({ course: course.courseTitle, error: err.message });
                }
            }
        }
        
        // Re-run the debug report
        const allCourses = await Course.find({}).select('courseTitle thumbnailUrl publicationState _id').lean();
        const report = {
            visibleInCatalog: allCourses.filter(c => ['Published', 'Active'].includes(c.publicationState) && c.thumbnailUrl).length,
            total: allCourses.length,
            withThumbnails: allCourses.filter(c => c.thumbnailUrl).length
        };
        
        console.log('[fixCourseThumbnails] Fix complete:', JSON.stringify({ fixes, report }, null, 2));
        res.status(200).json({ 
            success: true, 
            message: 'Thumbnail courses have been published',
            fixes,
            report
        });
    } catch (err) {
        console.error('[fixCourseThumbnails] Error:', err);
        next(err);
    }
};

module.exports = {
    createCourse,
    getPublishedCourses,
    getAllCourses,
    getCourseById,
    updateCourse,
    submitCourseForReview,
    approveCourse,
    requestCourseRevision,
    rejectCourse,
    publishCourse,
    restoreCourse,
    featureCourse,
    sendCourseFeedback,
    assignInstructor,
    removeInstructor,
    changeCourseCategory,
    enrollInCourse,
    getInstructorCourses,
    getStudentEnrollments,
    toggleTuitionClearance,
    streamLessonVideo,
    deleteCourse,
    archiveCourse,
    unpublishCourse,
    duplicateCourse,
    getInstructorAnalytics,
    uploadCourseThumbnail,
    debugCourseThumbnails,
    fixCourseThumbnails
};

const User = require('../models/User');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Certificate = require('../models/Certificate');
const GradeBook = require('../models/GradeBook');
const Submission = require('../models/Submission');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { uploadImage } = require('../services/cloudinaryService');
const { 
    sendAdminPasswordResetEmail,
    sendPasswordResetConfirmationEmail,
    sendAccountCreatedEmail,
    sendEmailVerification
} = require('../services/emailService');

// ─────────────────────────────────────────────
// @desc    Get all users (paginated, filterable)
// @route   GET /api/users
// @access  Private (Admin only)
// ─────────────────────────────────────────────
const getAllUsers = async (req, res, next) => {
    try {
        const { page = 1, limit = 20, role, search } = req.query;
        const query = {};

        // Filter by role if specified
        if (role && ['Student', 'Instructor', 'Admin'].includes(role)) {
            query.assignedRole = role;
        }

        // Search by name or email
        if (search) {
            query.$or = [
                { fullName: { $regex: search, $options: 'i' } },
                { accountEmail: { $regex: search, $options: 'i' } }
            ];
        }

        const users = await User.find(query)
            .select('-securedPassword')
            .sort({ creationTimestamp: -1 })
            .skip((parseInt(page) - 1) * parseInt(limit))
            .limit(parseInt(limit))
            .lean();

        const total = await User.countDocuments(query);

        res.status(200).json({
            success: true,
            count: users.length,
            total,
            totalPages: Math.ceil(total / parseInt(limit)),
            currentPage: parseInt(page),
            data: users
        });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────
// @desc    Get single user by ID
// @route   GET /api/users/:id
// @access  Private (Admin only)
// ─────────────────────────────────────────────
const getUserById = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id).select('-securedPassword');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        res.status(200).json({ success: true, data: user });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────
// @desc    Create a new Admin or Instructor account
// @route   POST /api/users
// @access  Private (Admin only)
// ─────────────────────────────────────────────
const createUser = async (req, res, next) => {
    try {
        const { 
            fullName, accountEmail, securedPassword, assignedRole, contactPhone, isActive, requirePasswordChange, sendWelcomeEmail,
            username, gender, dateOfBirth, avatarUrl,
            // Instructor specific
            specialization, yearsOfExperience, skills, biography, department, employmentType, joiningDate,
            cvResumeUrl, educationCertificateUrl, professionalCertificateUrl, nationalIdUrl,
            // Admin specific
            positionJobTitle, dateOfAppointment, recoveryEmail, securityQuestion, securityAnswer,
            employeeIdCardUrl, appointmentLetterUrl, permissions
        } = req.body;

        // Security check: Only allow Admin and Instructor roles
        if (!assignedRole || !['Admin', 'Instructor'].includes(assignedRole)) {
            return res.status(403).json({ 
                success: false, 
                message: 'Invalid role selection. Only Administrators and Instructors can be created manually.' 
            });
        }

        // ── Backend email format validation ──────────────────────────────────
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!accountEmail || !emailRegex.test(accountEmail.trim())) {
            return res.status(400).json({ success: false, message: 'Please enter a valid email address (e.g. name@gmail.com).' });
        }

        // ── Backend phone format validation: 09xxxxxxxx or 07xxxxxxxx (10 digits) ──
        const phoneRegex = /^(09|07)\d{8}$/;
        if (!contactPhone || !phoneRegex.test(contactPhone.trim())) {
            return res.status(400).json({ success: false, message: 'Phone number must start with 09 or 07 and be exactly 10 digits (e.g. 0912345678).' });
        }

        const existingUser = await User.findOne({ accountEmail: accountEmail.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
        }

        // Auto-generate IDs
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        const instructorId = assignedRole === 'Instructor' ? `INST-${Date.now()}-${randomSuffix}` : undefined;
        const administratorId = assignedRole === 'Admin' ? `ADM-${Date.now()}-${randomSuffix}` : undefined;

        // Generate email verification OTP
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const hashedVerificationCode = crypto.createHash('sha256').update(verificationCode).digest('hex');
        const verificationExpire = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

        const user = await User.create({
            fullName,
            accountEmail: accountEmail.toLowerCase(),
            securedPassword,
            assignedRole,
            contactPhone: contactPhone.trim(),
            isActive: isActive !== false,
            requirePasswordChange: !!requirePasswordChange,
            username: username || undefined,
            gender: gender || '',
            dateOfBirth: dateOfBirth || undefined,
            avatarUrl: avatarUrl || '',
            // Email verification — NOT verified until OTP is confirmed
            isEmailVerified: false,
            emailVerificationToken: hashedVerificationCode,
            emailVerificationExpire: verificationExpire,
            // Instructor specific
            instructorId,
            specialization: specialization || '',
            yearsOfExperience: Number(yearsOfExperience) || 0,
            skills: skills || '',
            biography: biography || '',
            department: department || '',
            employmentType: employmentType || '',
            joiningDate: joiningDate || undefined,
            cvResumeUrl: cvResumeUrl || '',
            educationCertificateUrl: educationCertificateUrl || '',
            professionalCertificateUrl: professionalCertificateUrl || '',
            nationalIdUrl: nationalIdUrl || '',
            // Admin specific
            administratorId,
            positionJobTitle: positionJobTitle || '',
            dateOfAppointment: dateOfAppointment || undefined,
            recoveryEmail: recoveryEmail || '',
            securityQuestion: securityQuestion || '',
            securityAnswer: securityAnswer || '',
            employeeIdCardUrl: employeeIdCardUrl || '',
            appointmentLetterUrl: appointmentLetterUrl || '',
            permissions: permissions || undefined
        });

        // Send verification email with OTP
        let verificationSent = false;
        try {
            await sendEmailVerification(user, verificationCode);
            verificationSent = true;
            console.log(`✅ Verification email sent to ${user.accountEmail}`);
        } catch (emailErr) {
            console.error('Failed to send verification email:', emailErr.message);
            // If email fails, still return the code in dev mode so admin can verify manually
        }

        const userData = user.toObject();
        delete userData.securedPassword;
        delete userData.emailVerificationToken;

        res.status(201).json({
            success: true,
            message: `${assignedRole} account created. A verification code has been sent to ${user.accountEmail}. The account must be verified before it can be used.`,
            data: userData,
            verificationRequired: true,
            verificationSent,
            // Return code in non-production if email failed (so admin can manually verify)
            ...(process.env.NODE_ENV !== 'production' && !verificationSent ? { verificationCode } : {})
        });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────
// @desc    Update user (role, active status)
// @route   PATCH /api/users/:id
// @access  Private (Admin only)
// ─────────────────────────────────────────────
const updateUser = async (req, res, next) => {
    try {
        const { 
            assignedRole, isActive, fullName, accountEmail, avatarUrl,
            firstName, lastName, username, gender, dateOfBirth, country, city, address,
            biography, occupation, company, website, socialMediaLinks, contactPhone, githubUrl,
            twoFactorEnabled, preferredLanguage, timeZone, notificationPreferences, isPublicProfile,
            currentPassword, newPassword
        } = req.body;

        const user = await User.findById(req.params.id).select('+securedPassword');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        // Handle Password Update if requested
        if (newPassword) {
            if (currentPassword) {
                const isMatch = await user.comparePassword(currentPassword);
                if (!isMatch) {
                    return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
                }
            }
            if (newPassword.length < 8) {
                return res.status(400).json({ success: false, message: 'New password must be at least 8 characters long.' });
            }
            user.securedPassword = newPassword;
        }

        // Update fields if provided
        if (fullName !== undefined) user.fullName = fullName;
        if (accountEmail !== undefined) user.accountEmail = accountEmail;
        if (avatarUrl !== undefined && avatarUrl !== '') user.avatarUrl = avatarUrl;
        if (req.body.profilePicture !== undefined) user.profilePicture = req.body.profilePicture;
        if (req.body.professionalTitle !== undefined) user.professionalTitle = req.body.professionalTitle;
        if (req.body.phoneNumber !== undefined) user.phoneNumber = req.body.phoneNumber;
        if (req.body.linkedIn !== undefined) user.linkedIn = req.body.linkedIn;
        if (req.body.portfolioUrl !== undefined) user.portfolioUrl = req.body.portfolioUrl;
        if (req.body.institution !== undefined) user.institution = req.body.institution;
        if (req.body.expertiseAreas !== undefined) user.expertiseAreas = req.body.expertiseAreas;
        if (assignedRole && ['Student', 'Instructor', 'Admin'].includes(assignedRole)) user.assignedRole = assignedRole;
        if (typeof isActive === 'boolean') user.isActive = isActive;

        if (firstName !== undefined) user.firstName = firstName;
        if (lastName !== undefined) user.lastName = lastName;
        if (username !== undefined) user.username = username;
        if (gender !== undefined) user.gender = gender;
        if (dateOfBirth !== undefined) user.dateOfBirth = dateOfBirth;
        if (country !== undefined) user.country = country;
        if (city !== undefined) user.city = city;
        if (address !== undefined) user.address = address;
        if (biography !== undefined) user.biography = biography;
        if (occupation !== undefined) user.occupation = occupation;
        if (company !== undefined) user.company = company;
        if (contactPhone !== undefined) user.contactPhone = contactPhone;
        if (githubUrl !== undefined) user.githubUrl = githubUrl;

        if (socialMediaLinks) {
            user.socialMediaLinks = { ...user.socialMediaLinks, ...socialMediaLinks };
            if (website) user.socialMediaLinks.website = website;
        } else if (website) {
            user.socialMediaLinks = user.socialMediaLinks || {};
            user.socialMediaLinks.website = website;
        }

        if (typeof twoFactorEnabled === 'boolean') user.twoFactorEnabled = twoFactorEnabled;
        if (preferredLanguage !== undefined) user.preferredLanguage = preferredLanguage;
        if (timeZone !== undefined) user.timeZone = timeZone;
        if (notificationPreferences) user.notificationPreferences = { ...user.notificationPreferences, ...notificationPreferences };
        if (typeof isPublicProfile === 'boolean') user.isPublicProfile = isPublicProfile;

        await user.save();

        const updatedUser = user.toObject();
        delete updatedUser.securedPassword;

        res.status(200).json({ success: true, message: 'Profile updated successfully.', data: updatedUser });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────
// @desc    Admin resets a user's password
// @route   PATCH /api/users/:id/reset-password
// @access  Private (Admin only)
// ─────────────────────────────────────────────
const resetUserPassword = async (req, res, next) => {
    try {
        const { newPassword } = req.body;

        const user = await User.findById(req.params.id).select('+securedPassword');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        // If a new password is provided (direct reset), update it
        if (newPassword) {
            if (newPassword.length < 8) {
                return res.status(400).json({ success: false, message: 'New password must be at least 8 characters.' });
            }
            user.securedPassword = newPassword;
            await user.save({ validateBeforeSave: false });
            
            // Send confirmation email
            await sendPasswordResetConfirmationEmail(user, newPassword);

            return res.status(200).json({ 
                success: true, 
                message: `Password reset successfully for ${user.fullName}. Confirmation email sent.` 
            });
        }

        // If no password provided, generate a reset token and send reset link
        const resetToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

        user.resetPasswordToken = hashedToken;
        user.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 minutes
        await user.save({ validateBeforeSave: false });

        // Send reset link via email
        const emailResult = await sendAdminPasswordResetEmail(user, resetToken);

        if (!emailResult.success) {
            return res.status(500).json({ 
                success: false, 
                message: 'Failed to send password reset email. Please try again.' 
            });
        }

        res.status(200).json({ 
            success: true, 
            message: `Password reset link sent to ${user.accountEmail}. They have 15 minutes to reset their password.` 
        });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────
// @desc    Delete a user account
// @route   DELETE /api/users/:id
// @access  Private (Admin only)
// ─────────────────────────────────────────────
const deleteUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        await user.deleteOne();

        res.status(200).json({ success: true, message: `User '${user.fullName}' has been deleted.` });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────
// @desc    Get aggregated platform analytics
// @route   GET /api/analytics/overview
// @access  Private (Admin only)
// ─────────────────────────────────────────────
const getAnalytics = async (req, res, next) => {
    try {
        // Run all aggregation queries in parallel for performance
        const [
            totalUsers,
            totalStudents,
            totalInstructors,
            totalAdmins,
            totalCourses,
            activeCourses,
            pendingCourses,
            draftCourses,
            archivedCourses,
            totalEnrollments,
            clearedEnrollments,
            completedCourses,
            certificatesIssued,
            monthlyEnrollments,
            enrollmentsByCategory,
            recentRegistrations,
            revenueEstimateAgg,
            totalQuizAttempts,
            passedAssessments,
            failedAssessments,
            averageAssessmentScoreAgg,
            gradedAssignments,
            averageAssignmentScoreAgg,
            recentActiveStudents,
            activeInstructors,
            studentsAtRiskAgg,
            topPerformersAgg,
            recentEnrollments,
            recentAssessments,
            enrollmentTrend,
            dailyActivity,
            monthlyReports,
            yearlyReports,
            coursePopularity,
            instructorCourseCounts,
            gradeDistribution
        ] = await Promise.all([
            User.countDocuments(),
            User.countDocuments({ assignedRole: 'Student' }),
            User.countDocuments({ assignedRole: 'Instructor' }),
            User.countDocuments({ assignedRole: 'Admin' }),
            Course.countDocuments(),
            Course.countDocuments({ publicationState: { $in: ['Published', 'Active'] } }),
            Course.countDocuments({ publicationState: 'Pending Review' }),
            Course.countDocuments({ publicationState: 'Draft' }),
            Course.countDocuments({ publicationState: 'Archived' }),
            Enrollment.countDocuments(),
            Enrollment.countDocuments({ tuitionClearanceFlag: true }),
            Enrollment.countDocuments({ completionPercentage: { $gte: 100 } }),
            Certificate.countDocuments(),
            Enrollment.countDocuments({ enrollmentTimestamp: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }),
            Enrollment.aggregate([
                { $lookup: { from: 'courses', localField: 'courseRef', foreignField: '_id', as: 'course' } },
                { $unwind: '$course' },
                { $group: { _id: '$course.technicalCategory', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]),
            User.countDocuments({ creationTimestamp: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }),
            Enrollment.aggregate([
                { $match: { paymentStatus: 'Cleared' } },
                { $group: { _id: null, total: { $sum: '$paymentAmount' } } }
            ]),
            GradeBook.countDocuments(),
            GradeBook.countDocuments({ numericalScoreEarned: { $gte: 60 } }),
            GradeBook.countDocuments({ numericalScoreEarned: { $lt: 60 } }),
            GradeBook.aggregate([
                { $group: { _id: null, averageScore: { $avg: '$numericalScoreEarned' } } }
            ]),
            Submission.countDocuments({ grade: { $ne: null } }),
            Submission.aggregate([
                { $match: { grade: { $ne: null } } },
                { $group: { _id: null, averageGrade: { $avg: '$grade' } } }
            ]),
            User.countDocuments({ assignedRole: 'Student', lastLoginTimestamp: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }),
            User.countDocuments({ assignedRole: 'Instructor', isActive: true }),
            Enrollment.aggregate([
                { $group: { _id: '$studentRef', avgCompletion: { $avg: '$completionPercentage' } } },
                { $match: { avgCompletion: { $lt: 60 } } },
                { $count: 'count' }
            ]),
            GradeBook.aggregate([
                { $group: { _id: '$studentRef', avgScore: { $avg: '$numericalScoreEarned' }, totalAttempts: { $sum: 1 } } },
                { $sort: { avgScore: -1, totalAttempts: -1 } },
                { $limit: 5 },
                { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'student' } },
                { $unwind: '$student' },
                { $project: { _id: 0, studentId: '$_id', studentName: '$student.fullName', avgScore: { $round: ['$avgScore', 1] }, totalAttempts: 1 } }
            ]),
            Enrollment.find()
                .sort({ enrollmentTimestamp: -1 })
                .limit(5)
                .populate('studentRef', 'fullName')
                .populate('courseRef', 'courseTitle')
                .lean(),
            GradeBook.find()
                .sort({ gradingTimestamp: -1 })
                .limit(5)
                .populate('studentRef', 'fullName')
                .populate('assessmentRef', 'quizTitle title')
                .lean(),
            Enrollment.aggregate([
                { $match: { enrollmentTimestamp: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
                { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$enrollmentTimestamp' } }, count: { $sum: 1 } } },
                { $sort: { _id: 1 } }
            ]),
            Enrollment.aggregate([
                { $match: { enrollmentTimestamp: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } },
                { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$enrollmentTimestamp' } }, enrollments: { $sum: 1 } } },
                { $sort: { _id: 1 } }
            ]),
            Enrollment.aggregate([
                { $match: { enrollmentTimestamp: { $gte: new Date(new Date().getFullYear(), 0, 1) } } },
                { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$enrollmentTimestamp' } }, count: { $sum: 1 } } },
                { $sort: { _id: 1 } }
            ]),
            Enrollment.aggregate([
                { $group: { _id: { $dateToString: { format: '%Y', date: '$enrollmentTimestamp' } }, count: { $sum: 1 } } },
                { $sort: { _id: 1 } }
            ]),
            Enrollment.aggregate([
                { $lookup: { from: 'courses', localField: 'courseRef', foreignField: '_id', as: 'course' } },
                { $unwind: '$course' },
                { $group: { _id: '$course._id', title: { $first: '$course.courseTitle' }, count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 5 }
            ]),
            Course.aggregate([
                { $match: { publicationState: { $in: ['Published', 'Active'] } } },
                { $group: { _id: '$creatorRef', courseCount: { $sum: 1 } } },
                { $sort: { courseCount: -1 } },
                { $limit: 5 },
                { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'instructor' } },
                { $unwind: '$instructor' },
                { $project: { _id: 0, instructorName: '$instructor.fullName', courseCount: 1 } }
            ]),
            GradeBook.aggregate([
                { $bucket: { groupBy: '$numericalScoreEarned', boundaries: [0, 60, 70, 80, 90, 101], default: 'Other', output: { count: { $sum: 1 } } } }
            ])
        ]);

        const completionRate = totalEnrollments > 0
            ? Math.round((clearedEnrollments / totalEnrollments) * 100)
            : 0;

        const totalVisitors = Math.max(1000, totalUsers * 3 + totalCourses * 12);
        const revenueEstimate = revenueEstimateAgg?.[0]?.total || 0;
        const averageAssessmentScore = averageAssessmentScoreAgg?.[0]?.averageScore || 0;
        const averageAssignmentScore = averageAssignmentScoreAgg?.[0]?.averageGrade || 0;
        const studentsAtRisk = studentsAtRiskAgg?.[0]?.count || 0;
        const attendanceRate = totalStudents > 0
            ? Math.round((recentActiveStudents / totalStudents) * 100)
            : 0;

        const enrollmentTrendData = enrollmentTrend.map((row) => ({ date: row._id, enrollments: row.count }));
        const dailyActivityData = dailyActivity.map((row) => ({ date: row._id, enrollments: row.enrollments }));
        const monthlyReportsData = monthlyReports.map((row) => ({ month: row._id, enrollments: row.count }));
        const yearlyReportsData = yearlyReports.map((row) => ({ year: row._id, enrollments: row.count }));
        const coursePopularityData = coursePopularity.map((row) => ({ courseTitle: row.title, enrollments: row.count }));
        const gradeDistributionData = gradeDistribution.map((row) => ({ name: row._id === 'Other' ? '90-100' : `${row._id}`, value: row.count }));

        res.status(200).json({
            success: true,
            data: {
                totalUsers,
                totalStudents,
                totalInstructors,
                totalAdmins,
                activeInstructors,
                totalCourses,
                activeCourses,
                pendingCourses,
                draftCourses,
                archivedCourses,
                totalEnrollments,
                clearedEnrollments,
                completedCourses,
                certificatesIssued,
                monthlyEnrollments,
                totalVisitors,
                completionRate,
                studentCompletionRate: completionRate,
                enrollmentsByCategory,
                recentRegistrations,
                revenueEstimate,
                totalQuizAttempts,
                passedAssessments,
                failedAssessments,
                averageAssessmentScore: Math.round(averageAssessmentScore * 10) / 10,
                gradedAssignments,
                averageAssignmentScore: Math.round(averageAssignmentScore * 10) / 10,
                recentActiveStudents,
                attendanceRate,
                studentsAtRisk,
                topPerformers: topPerformersAgg,
                instructorCourseCounts,
                enrollmentTrend: enrollmentTrendData,
                dailyActivity: dailyActivityData,
                monthlyReports: monthlyReportsData,
                yearlyReports: yearlyReportsData,
                coursePopularity: coursePopularityData,
                gradeDistribution: gradeDistributionData,
                learningHistory: {
                    recentEnrollments: recentEnrollments.map(item => ({
                        studentName: item.studentRef?.fullName || 'Unknown',
                        courseTitle: item.courseRef?.courseTitle || 'Unknown Course',
                        completionPercentage: item.completionPercentage || 0,
                        enrolledAt: item.enrollmentTimestamp
                    })),
                    recentAssessments: recentAssessments.map(item => ({
                        studentName: item.studentRef?.fullName || 'Unknown',
                        assessmentTitle: item.assessmentRef?.quizTitle || item.assessmentRef?.title || 'Assessment',
                        score: item.numericalScoreEarned || 0,
                        gradedAt: item.gradingTimestamp
                    }))
                }
            }
        });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────
// @desc    Update instructor profile (for instructors to manage themselves)
// @route   PUT /api/users/instructor/profile
// @access  Private (Instructor only)
// ─────────────────────────────────────────────
const updateInstructorProfile = async (req, res, next) => {
    try {
        const { biography, qualifications, workExperience, teachingLanguages, socialMediaLinks, contactPhone, fullName } = req.body;
        const updateData = {};

        if (biography !== undefined) updateData.biography = biography;
        if (qualifications) updateData.qualifications = qualifications;
        if (workExperience) updateData.workExperience = workExperience;
        if (teachingLanguages) updateData.teachingLanguages = teachingLanguages;
        if (socialMediaLinks) updateData.socialMediaLinks = socialMediaLinks;
        if (contactPhone !== undefined) updateData.contactPhone = contactPhone;
        if (fullName) updateData.fullName = fullName;

        const user = await User.findByIdAndUpdate(req.user.id, updateData, {
            new: true,
            runValidators: true
        }).select('-securedPassword');

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        res.status(200).json({ success: true, message: 'Instructor profile updated.', data: user });
    } catch (err) {
        next(err);
    }
};

const uploadUserAvatar = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No avatar file uploaded.' });
        }

        const result = await uploadImage(req.file.buffer, 'emare_elms/avatars');
        const user = await User.findByIdAndUpdate(req.user.id, { avatarUrl: result.secure_url }, {
            new: true,
            runValidators: true
        }).select('-securedPassword');

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        res.status(200).json({ success: true, message: 'Avatar uploaded successfully.', data: user });
    } catch (err) {
        next(err);
    }
};

module.exports = { getAllUsers, getUserById, createUser, updateUser, resetUserPassword, deleteUser, getAnalytics, updateInstructorProfile, uploadUserAvatar };

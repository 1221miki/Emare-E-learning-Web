const User = require('../models/User');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Quiz = require('../models/Quiz');
const Assignment = require('../models/Assignment');
const GradeBook = require('../models/GradeBook');
const Certificate = require('../models/Certificate');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

const formatDate = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
};

const buildCsv = (headers, rows) => {
    const escapeValue = (value) => {
        if (value === null || value === undefined) return '';
        const normalized = String(value).replace(/"/g, '""');
        return `"${normalized}"`;
    };

    const csvLines = [headers.map(escapeValue).join(',')];
    rows.forEach((row) => {
        csvLines.push(headers.map((header) => escapeValue(row[header])).join(','));
    });
    return csvLines.join('\r\n');
};

const buildExcelBuffer = async (sheetName, headers, rows) => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(sheetName || 'Report');

    sheet.addRow(headers);
    rows.forEach((row) => {
        sheet.addRow(headers.map((header) => row[header] ?? ''));
    });

    sheet.columns = headers.map((header) => ({ width: Math.min(Math.max(header.length + 8, 16), 40) }));
    sheet.properties.defaultRowHeight = 18;
    sheet.getRow(1).font = { bold: true };

    return workbook.xlsx.writeBuffer();
};

const buildPdfBuffer = async (title, headers, rows) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const buffers = [];

    doc.on('data', (chunk) => buffers.push(chunk));

    return new Promise((resolve, reject) => {
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        doc.fontSize(18).text(title, { align: 'center' });
        doc.moveDown(1);
        doc.fontSize(10);

        const maxRowsPerPage = 28;
        let rowIndex = 0;

        const renderHeader = () => {
            doc.font('Helvetica-Bold');
            headers.forEach((header, index) => {
                doc.text(header, { continued: index < headers.length - 1, width: 130 });
                if (index < headers.length - 1) doc.text(' | ', { continued: true });
            });
            doc.moveDown(0.5);
            doc.font('Helvetica');
        };

        renderHeader();

        rows.forEach((row) => {
            if (rowIndex > 0 && rowIndex % maxRowsPerPage === 0) {
                doc.addPage();
                renderHeader();
            }
            headers.forEach((header, index) => {
                doc.text(String(row[header] ?? ''), { continued: index < headers.length - 1, width: 130 });
                if (index < headers.length - 1) doc.text(' | ', { continued: true });
            });
            doc.moveDown(0.5);
            rowIndex += 1;
        });

        doc.end();
    });
};

const getReportRows = async (reportType) => {
    switch (reportType) {
        case 'student': {
            const students = await User.find({ assignedRole: 'Student' })
                .select('fullName accountEmail isActive creationTimestamp lastLoginTimestamp')
                .lean();
            const enrollmentCounts = await Enrollment.aggregate([
                { $group: { _id: '$studentRef', count: { $sum: 1 } } }
            ]);
            const enrollmentsMap = enrollmentCounts.reduce((map, record) => {
                map[record._id.toString()] = record.count;
                return map;
            }, {});

            return {
                title: 'Student Report',
                headers: ['Full Name', 'Email', 'Status', 'Enrollments', 'Last Login', 'Registered'],
                rows: students.map((student) => ({
                    'Full Name': student.fullName,
                    Email: student.accountEmail,
                    Status: student.isActive ? 'Active' : 'Inactive',
                    Enrollments: enrollmentsMap[student._id.toString()] || 0,
                    'Last Login': formatDate(student.lastLoginTimestamp),
                    Registered: formatDate(student.creationTimestamp)
                }))
            };
        }

        case 'instructor': {
            const instructors = await User.find({ assignedRole: 'Instructor' })
                .select('fullName accountEmail isActive creationTimestamp')
                .lean();
            const instructorCourses = await Course.aggregate([
                { $group: { _id: '$creatorRef', courseCount: { $sum: 1 } } }
            ]);
            const courseCountMap = instructorCourses.reduce((map, record) => {
                map[record._id.toString()] = record.courseCount;
                return map;
            }, {});

            return {
                title: 'Instructor Report',
                headers: ['Full Name', 'Email', 'Status', 'Courses Created', 'Registered'],
                rows: instructors.map((instructor) => ({
                    'Full Name': instructor.fullName,
                    Email: instructor.accountEmail,
                    Status: instructor.isActive ? 'Active' : 'Inactive',
                    'Courses Created': courseCountMap[instructor._id.toString()] || 0,
                    Registered: formatDate(instructor.creationTimestamp)
                }))
            };
        }

        case 'course': {
            const courses = await Course.find()
                .populate('creatorRef', 'fullName')
                .select('courseTitle technicalCategory price publicationState totalEnrollments averageRating creationTimestamp')
                .lean();

            return {
                title: 'Course Report',
                headers: ['Title', 'Category', 'Price', 'Publish State', 'Enrollments', 'Average Rating', 'Created'],
                rows: courses.map((course) => ({
                    Title: course.courseTitle,
                    Category: course.technicalCategory,
                    Price: course.price?.toFixed(2) || '0.00',
                    'Publish State': course.publicationState,
                    Enrollments: course.totalEnrollments || 0,
                    'Average Rating': course.averageRating?.toFixed(1) || '0.0',
                    Created: formatDate(course.creationTimestamp)
                }))
            };
        }

        case 'quiz': {
            const quizzes = await Quiz.find()
                .populate('courseRef', 'courseTitle')
                .select('quizTitle allottedDurationMinutes passingScoreThreshold submissionDeadline isActive createdAt')
                .lean();

            return {
                title: 'Quiz Report',
                headers: ['Quiz Title', 'Course', 'Duration (min)', 'Passing Threshold', 'Deadline', 'Status', 'Created'],
                rows: quizzes.map((quiz) => ({
                    'Quiz Title': quiz.quizTitle,
                    Course: quiz.courseRef?.courseTitle || 'Unknown',
                    'Duration (min)': quiz.allottedDurationMinutes || 0,
                    'Passing Threshold': `${quiz.passingScoreThreshold || 0}%`,
                    Deadline: formatDate(quiz.submissionDeadline),
                    Status: quiz.isActive ? 'Active' : 'Inactive',
                    Created: formatDate(quiz.createdAt)
                }))
            };
        }

        case 'assignment': {
            const assignments = await Assignment.find()
                .populate('courseRef', 'courseTitle')
                .populate('instructorRef', 'fullName')
                .select('title maxScore isActive createdAt')
                .lean();

            return {
                title: 'Assignment Report',
                headers: ['Assignment Title', 'Course', 'Instructor', 'Max Score', 'Status', 'Created'],
                rows: assignments.map((assignment) => ({
                    'Assignment Title': assignment.title,
                    Course: assignment.courseRef?.courseTitle || 'Unknown',
                    Instructor: assignment.instructorRef?.fullName || 'N/A',
                    'Max Score': assignment.maxScore || 0,
                    Status: assignment.isActive ? 'Active' : 'Inactive',
                    Created: formatDate(assignment.createdAt)
                }))
            };
        }

        case 'enrollment': {
            const enrollments = await Enrollment.find()
                .populate('studentRef', 'fullName accountEmail')
                .populate('courseRef', 'courseTitle')
                .select('paymentStatus completionPercentage enrollmentTimestamp tuitionClearanceFlag')
                .lean();

            return {
                title: 'Enrollment Report',
                headers: ['Student', 'Email', 'Course', 'Payment Status', 'Completion (%)', 'Clearance', 'Enrolled At'],
                rows: enrollments.map((enrollment) => ({
                    Student: enrollment.studentRef?.fullName || 'Unknown',
                    Email: enrollment.studentRef?.accountEmail || '',
                    Course: enrollment.courseRef?.courseTitle || 'Unknown',
                    'Payment Status': enrollment.paymentStatus,
                    'Completion (%)': enrollment.completionPercentage?.toFixed(1) || '0.0',
                    Clearance: enrollment.tuitionClearanceFlag ? 'Cleared' : 'Pending',
                    'Enrolled At': formatDate(enrollment.enrollmentTimestamp)
                }))
            };
        }

        case 'completion': {
            const enrollments = await Enrollment.find()
                .populate('studentRef', 'fullName')
                .populate('courseRef', 'courseTitle')
                .select('completionPercentage enrollmentTimestamp')
                .lean();

            return {
                title: 'Completion Report',
                headers: ['Student', 'Course', 'Completion (%)', 'Completed On'],
                rows: enrollments.map((enrollment) => ({
                    Student: enrollment.studentRef?.fullName || 'Unknown',
                    Course: enrollment.courseRef?.courseTitle || 'Unknown',
                    'Completion (%)': enrollment.completionPercentage?.toFixed(1) || '0.0',
                    'Completed On': formatDate(enrollment.enrollmentTimestamp)
                }))
            };
        }

        case 'performance': {
            const topPerformers = await GradeBook.aggregate([
                { $group: { _id: '$studentRef', averageScore: { $avg: '$numericalScoreEarned' }, assessmentCount: { $sum: 1 } } },
                { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'student' } },
                { $unwind: '$student' },
                { $sort: { averageScore: -1, assessmentCount: -1 } }
            ]);

            return {
                title: 'Performance Report',
                headers: ['Student', 'Average Score', 'Assessments Completed'],
                rows: topPerformers.map((record) => ({
                    Student: record.student.fullName || 'Unknown',
                    'Average Score': record.averageScore?.toFixed(1) || '0.0',
                    'Assessments Completed': record.assessmentCount || 0
                }))
            };
        }

        case 'attendance': {
            const students = await User.find({ assignedRole: 'Student' })
                .select('fullName accountEmail isActive lastLoginTimestamp creationTimestamp')
                .lean();

            return {
                title: 'Attendance Report',
                headers: ['Student', 'Email', 'Last Login', 'Account Status'],
                rows: students.map((student) => ({
                    Student: student.fullName,
                    Email: student.accountEmail,
                    'Last Login': formatDate(student.lastLoginTimestamp),
                    'Account Status': student.isActive ? 'Active' : 'Inactive'
                }))
            };
        }

        case 'system': {
            const [totalUsers, totalStudents, totalInstructors, totalCourses, totalEnrollments, completedCourses, totalCertificates, clearedEnrollments] = await Promise.all([
                User.countDocuments(),
                User.countDocuments({ assignedRole: 'Student' }),
                User.countDocuments({ assignedRole: 'Instructor' }),
                Course.countDocuments(),
                Enrollment.countDocuments(),
                Enrollment.countDocuments({ completionPercentage: { $gte: 100 } }),
                Certificate.countDocuments(),
                Enrollment.countDocuments({ tuitionClearanceFlag: true })
            ]);

            return {
                title: 'System Report',
                headers: ['Metric', 'Value'],
                rows: [
                    { Metric: 'Total Users', Value: totalUsers },
                    { Metric: 'Total Students', Value: totalStudents },
                    { Metric: 'Total Instructors', Value: totalInstructors },
                    { Metric: 'Total Courses', Value: totalCourses },
                    { Metric: 'Total Enrollments', Value: totalEnrollments },
                    { Metric: 'Completed Courses', Value: completedCourses },
                    { Metric: 'Certificates Issued', Value: totalCertificates },
                    { Metric: 'Cleared Enrollments', Value: clearedEnrollments }
                ]
            };
        }

        default:
            throw new Error('Unsupported report type');
    }
};

exports.exportReport = async (req, res, next) => {
    try {
        const reportType = String(req.query.reportType || '').toLowerCase();
        const requestedFormat = String(req.query.format || 'csv').toLowerCase();
        const format = requestedFormat === 'excel' ? 'xlsx' : requestedFormat;

        if (!['student', 'instructor', 'course', 'quiz', 'assignment', 'enrollment', 'completion', 'performance', 'attendance', 'system'].includes(reportType)) {
            return res.status(400).json({ success: false, message: 'Invalid report type.' });
        }

        if (!['csv', 'xlsx', 'pdf'].includes(format)) {
            return res.status(400).json({ success: false, message: 'Unsupported export format.' });
        }

        const { title, headers, rows } = await getReportRows(reportType);
        const fileName = `${reportType}-report.${format}`;

        if (format === 'csv') {
            const csv = buildCsv(headers, rows);
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
            return res.send(csv);
        }

        if (format === 'xlsx') {
            const buffer = await buildExcelBuffer(title, headers, rows);
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
            return res.send(buffer);
        }

        if (format === 'pdf') {
            const buffer = await buildPdfBuffer(title, headers, rows);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
            return res.send(buffer);
        }
    } catch (err) {
        next(err);
    }
};

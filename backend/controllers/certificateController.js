/**
 * certificateController.js
 *
 * Key design rules:
 *  - certificateId is always generated atomically by certificateService.generateCertificateId()
 *    Format: EMARE-CERT-YYYY-NNNNNN  (e.g. EMARE-CERT-2026-000001)
 *  - ONE certificate per student per course (enforced by DB unique index + pre-check)
 *  - Re-downloading the same certificate always returns the same certificateId
 *  - Certificate ID is NEVER regenerated on download — always read from the DB record
 *  - /verify/:certificateId is PUBLIC — no auth required
 */

const Certificate         = require('../models/Certificate');
const CertificateTemplate = require('../models/CertificateTemplate');
const CertificateVerification = require('../models/CertificateVerification');
const Enrollment          = require('../models/Enrollment');
const User                = require('../models/User');
const Course              = require('../models/Course');
const { generateCertificatePdf, generateCertificateId } = require('../services/certificateService');
const { buildCompletionReport } = require('../services/completionService');
const { createNotification } = require('./notificationController');

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Safe public payload — never exposes email or sensitive fields */
function publicCertPayload(cert) {
    return {
        certificateId:   cert.certificateId,
        studentName:     cert.studentRef?.fullName || cert.studentRef?.username || 'Student',
        course:          cert.courseRef?.courseTitle  || cert.courseRef?.title   || 'Course',
        issuer:          cert.issuerName || 'Emare ICT Hub',
        issueDate:       cert.issueDate,
        completionDate:  cert.completionDate,
        status:          cert.status,
        grade:           cert.grade,
        platform:        'Emare ICT Hub — Ethiopian Tech Learning Platform'
    };
}

/**
 * Frontend base URL for QR / verification links embedded in certificates.
 *
 * Priority:
 *  1. FRONTEND_URL env var — the React app's LAN IP or public domain.
 *     QR codes point to /verify-certificate/:id on the React app.
 *     Local dev example:  FRONTEND_URL=http://10.18.56.22:5173
 *     Production example: FRONTEND_URL=https://emare.example.com
 *  2. APP_BASE_URL env var — backend base (used as fallback).
 *  3. The request host (req.protocol + req.get('host')) — last resort.
 *     On localhost this yields http://127.0.0.1:5000 which is unreachable
 *     from phones/external devices, so always prefer the env vars above.
 */
const reqBaseUrl = (req) =>
    (process.env.FRONTEND_URL || process.env.APP_BASE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/+$/, '');

// ── GET /certificates/check/:courseId  (protected) ───────────────────────────
exports.checkEligibility = async (req, res) => {
    try {
        const { courseId } = req.params;
        const [enrollment, course] = await Promise.all([
            Enrollment.findOne({ studentRef: req.user._id, courseRef: courseId }),
            Course.findById(courseId).lean()
        ]);
        if (!enrollment) {
            return res.status(404).json({ success: false, message: 'Enrollment not found.' });
        }
        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found.' });
        }

        // Full eligibility report — backend is the source of truth for what the
        // student still needs to do (lessons, quizzes, assignments, payment).
        const report = await buildCompletionReport({ studentRef: req.user._id, course, enrollment });

        // Check if certificate already issued
        const existing = await Certificate.findOne({
            studentRef: req.user._id,
            courseRef:  courseId
        }).select('certificateId status issueDate');

        res.json({
            success: true,
            data: {
                eligible: report.eligible,
                completionPercentage: report.completionPercentage,
                alreadyIssued: !!existing,
                certificate:  existing || null,
                report
            }
        });
    } catch (err) {
        console.error('[checkEligibility]', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// ── GET /certificates/eligibility  (protected, student) ──────────────────────
// Per-enrolled-course eligibility reports so the Certificates page can render a
// completion tracker in a single call (avoids N+1 check requests).
exports.getEligibilityOverview = async (req, res) => {
    try {
        const enrollments = await Enrollment.find({ studentRef: req.user._id })
            .populate('courseRef', 'courseTitle thumbnailUrl technicalCategory estimatedDurationHours')
            .sort('-updatedAt')
            .lean();

        const certificates = await Certificate.find({
            studentRef: req.user._id,
            status: { $ne: 'Revoked' }
        }).select('certificateId status issueDate courseRef').lean();
        const certByCourse = new Map(
            certificates.map((c) => [String(c.courseRef), c])
        );

        const data = [];
        for (const enrollment of enrollments) {
            const courseId = enrollment.courseRef?._id || enrollment.courseRef;
            if (!courseId) continue;
            const cert = certByCourse.get(String(courseId)) || null;
            if (cert) {
                data.push({
                    course: enrollment.courseRef,
                    eligible: true,
                    hasCertificate: true,
                    certificate: cert,
                    completionPercentage: 100,
                    report: null
                });
                continue;
            }
            const course = await Course.findById(courseId).lean();
            const report = await buildCompletionReport({ studentRef: req.user._id, course, enrollment });
            data.push({
                course: enrollment.courseRef,
                eligible: report.eligible,
                hasCertificate: false,
                certificate: null,
                completionPercentage: report.completionPercentage,
                report
            });
        }

        res.json({ success: true, data });
    } catch (err) {
        console.error('[getEligibilityOverview]', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// ── POST /certificates/issue/:courseId  (protected, student) ─────────────────
exports.issueCertificate = async (req, res) => {
    try {
        const { courseId } = req.params;
        const student = req.user;

        // 1. Verify enrollment + eligibility
        const enrollment = await Enrollment.findOne({
            studentRef: student._id,
            courseRef:  courseId
        });
        if (!enrollment) {
            return res.status(404).json({ success: false, message: 'You are not enrolled in this course.' });
        }

        // Load the course once — used for the eligibility report AND the PDF
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found.' });
        }

        // Free courses (price === 0) never block a certificate — tuition is
        // treated as cleared automatically. Paid courses require clearance.
        const tuitionCleared = (course.price || 0) === 0 || !!enrollment.tuitionClearanceFlag;
        if (!tuitionCleared) {
            return res.status(400).json({ success: false, message: 'Course payment is not cleared.' });
        }

        // ── BACKEND GATE: full eligibility (all lessons + required quizzes
        //    passed + required assignments approved + payment cleared).
        //    Reject even if the frontend was bypassed or cached stale state.
        const report = await buildCompletionReport({ studentRef: student._id, course, enrollment });
        if (!report.eligible) {
            return res.status(400).json({
                success: false,
                message: 'You are not yet eligible for a certificate. Please complete all required lessons, quizzes, assignments, and other course activities.',
                data: { report }
            });
        }

        // 2. Idempotent — return existing certificate (same ID every time)
        const existing = await Certificate.findOne({
            studentRef: student._id,
            courseRef:  courseId,
            status:     { $ne: 'Revoked' }
        }).populate('courseRef', 'courseTitle');
        if (existing) {
            return res.json({ success: true, data: existing, alreadyIssued: true });
        }

        // 3. Generate atomic sequential ID
        const certId = await generateCertificateId();

        // 4. Load template (course already loaded above)
        const template = await CertificateTemplate.findOne({ active: true }) || {};

        // 5. Generate PDF (uses certId from DB — consistent on every download)
        let pdfResult = { filename: `${certId}.pdf`, verifyUrl: '' };
        try {
            pdfResult = await generateCertificatePdf({
                studentName:    student.fullName || student.username || student.accountEmail,
                courseName:     course?.courseTitle || course?.title || 'Course',
                issuerName:     'Emare ICT Hub',
                issueDate:      new Date(),
                certificateId:  certId,
                logoUrl:        template.logoUrl,
                signatureImage: template.signatureImage,
                template,
                verificationBaseUrl: reqBaseUrl(req)
            });
        } catch (pdfErr) {
            console.warn('[issueCertificate] PDF generation failed (continuing):', pdfErr.message);
        }

        // 6. Save certificate — unique index on (studentRef, courseRef) prevents
        //    race-condition duplicates at the database level
        let cert;
        try {
            cert = await Certificate.create({
                certificateId:  certId,
                certificateNumber: certId,   // keep both fields in sync
                studentRef:     student._id,
                courseRef:      courseId,
                templateRef:    template._id,
                pdfPath:        `/certificates/${pdfResult.filename}`,
                qrCodeData:     pdfResult.verifyUrl,
                issuerName:     'Emare ICT Hub',
                status:         'Issued'
            });
        } catch (dbErr) {
            // Duplicate key — another concurrent request already created it
            if (dbErr.code === 11000) {
                const race = await Certificate.findOne({
                    studentRef: student._id,
                    courseRef:  courseId
                });
                return res.json({ success: true, data: race, alreadyIssued: true });
            }
            throw dbErr;
        }

        // 7. Notify student
        try {
            await createNotification({
                recipientRef: student._id,
                type:    'certificate',
                title:   'Certificate Earned! 🎉',
                message: `Congratulations! Your certificate has been issued. ID: ${certId}`,
                link:    '/student/certificates'
            });
        } catch { /* non-fatal */ }

        res.status(201).json({ success: true, data: cert });
    } catch (err) {
        console.error('[issueCertificate]', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// ── GET /certificates/verify/:certificateId  (PUBLIC — no auth) ──────────────
exports.verify = async (req, res) => {
    try {
        const { certificateId } = req.params;
        if (!certificateId) {
            return res.status(400).json({ success: false, message: 'Certificate ID is required.' });
        }

        const cert = await Certificate.findOne({ certificateId })
            .populate('studentRef', 'fullName username')
            .populate('courseRef',  'courseTitle title');

        if (!cert) {
            // Log failed attempt but don't reveal anything
            await CertificateVerification.create({
                verifierIp: req.ip,
                result:     'NotFound',
                rawPayload: { certificateId }
            }).catch(() => {});
            return res.status(404).json({
                success: false,
                valid:   false,
                message: 'Certificate not found. This ID does not match any issued certificate.'
            });
        }

        const isValid = cert.status === 'Issued' || cert.status === 'Reissued';

        // Log verification attempt
        await CertificateVerification.create({
            certificateRef: cert._id,
            verifierIp:     req.ip,
            result:         isValid ? 'Valid' : 'Revoked',
            rawPayload:     { certificateId }
        }).catch(() => {});

        res.json({
            success: true,
            valid:   isValid,
            data:    publicCertPayload(cert)
        });
    } catch (err) {
        console.error('[verify]', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// ── GET /certificates/my  (protected) ────────────────────────────────────────
exports.getMyCertificates = async (req, res) => {
    try {
        const certs = await Certificate.find({ studentRef: req.user._id })
            .sort({ issueDate: -1 })
            .populate('courseRef', 'courseTitle title thumbnailUrl technicalCategory');
        res.json({ success: true, data: certs });
    } catch (err) {
        console.error('[getMyCertificates]', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// ── GET /certificates/:id/download  (protected) ──────────────────────────────
// Downloads the PDF. certificateId in the PDF is ALWAYS from the DB record.
exports.downloadCertificate = async (req, res) => {
    try {
        // Support lookup by MongoDB _id OR certificateId
        const { id } = req.params;
        const isObjectId = /^[a-f\d]{24}$/i.test(id);
        const cert = await Certificate
            .findOne(isObjectId ? { _id: id } : { certificateId: id })
            .populate('studentRef', 'fullName username accountEmail')
            .populate('courseRef',  'courseTitle title');

        if (!cert) {
            return res.status(404).json({ success: false, message: 'Certificate not found.' });
        }

        // Authorization — student can only download their own
        const isOwner = cert.studentRef?._id?.toString() === req.user._id.toString();
        const isAdmin = req.user.assignedRole === 'Admin';
        if (!isOwner && !isAdmin) {
            return res.status(403).json({ success: false, message: 'Not authorized to download this certificate.' });
        }

        if (cert.status === 'Revoked') {
            return res.status(410).json({ success: false, message: 'This certificate has been revoked.' });
        }

        // Re-generate PDF on-the-fly using the SAME certificateId stored in DB
        // (never generates a new ID — guarantees identical downloads)
        const template = await CertificateTemplate.findOne({ active: true }) || {};
        const pdfResult = await generateCertificatePdf({
            studentName:    cert.studentRef?.fullName || cert.studentRef?.username || 'Student',
            courseName:     cert.courseRef?.courseTitle || cert.courseRef?.title || 'Course',
            issuerName:     cert.issuerName || 'Emare ICT Hub',
            issueDate:      cert.issueDate,
            certificateId:  cert.certificateId,   // ← always the stored ID
            logoUrl:        template.logoUrl,
            signatureImage: template.signatureImage,
            template,
            verificationBaseUrl: reqBaseUrl(req)
        });

        // Track downloads
        await Certificate.findByIdAndUpdate(cert._id, { $inc: { downloadCount: 1 } });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition',
            `attachment; filename="${cert.certificateId}.pdf"`
        );

        const fs   = require('fs');
        const stream = fs.createReadStream(pdfResult.filePath);
        stream.on('error', () => res.status(500).json({ success: false, message: 'PDF file not found.' }));
        stream.pipe(res);
    } catch (err) {
        console.error('[downloadCertificate]', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// ── GET /certificates/admin/all  (protected, Admin) ──────────────────────────
exports.getAllCertificates = async (req, res) => {
    try {
        const { search, page = 1, limit = 50 } = req.query;
        const filter = {};

        if (search) {
            // Search by certificateId, student name, or course title
            const regex = new RegExp(search.trim(), 'i');
            const [students, courses] = await Promise.all([
                require('../models/User').find({ fullName: regex }).select('_id'),
                require('../models/Course').find({ courseTitle: regex }).select('_id')
            ]);
            filter.$or = [
                { certificateId: regex },
                { studentRef: { $in: students.map(s => s._id) } },
                { courseRef:  { $in: courses.map(c => c._id) } }
            ];
        }

        const certs = await Certificate.find(filter)
            .populate('studentRef', 'fullName accountEmail')
            .populate('courseRef',  'courseTitle technicalCategory')
            .populate('issuedBy',   'fullName')
            .populate('revokedBy',  'fullName')
            .sort('-issueDate')
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const total = await Certificate.countDocuments(filter);

        res.json({ success: true, data: certs, total, page: Number(page), limit: Number(limit) });
    } catch (err) {
        console.error('[getAllCertificates]', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// ── POST /certificates/generate  (protected, student) ─────────────────────────
// Alias — same as issueCertificate but takes courseId from body
exports.generateCertificate = async (req, res) => {
    const { courseId } = req.body;
    if (!courseId) {
        return res.status(400).json({ success: false, message: 'courseId is required.' });
    }
    req.params.courseId = courseId;
    return exports.issueCertificate(req, res);
};

// ── POST /certificates/admin/generate  (protected, Admin) ────────────────────
exports.generateCertificateForAdmin = async (req, res) => {
    try {
        const { studentId, courseId, templateId } = req.body;

        const [student, course] = await Promise.all([
            User.findById(studentId),
            Course.findById(courseId)
        ]);
        if (!student || !course) {
            return res.status(404).json({ success: false, message: 'Student or course not found.' });
        }

        // Idempotent
        const existing = await Certificate.findOne({
            studentRef: studentId,
            courseRef:  courseId,
            status:     { $ne: 'Revoked' }
        });
        if (existing) {
            return res.json({
                success: true,
                message: 'Certificate already exists for this learner and course.',
                data: existing
            });
        }

        const certId   = await generateCertificateId();
        const template = await CertificateTemplate.findOne({ active: true }) || {};

        let pdfResult = { filename: `${certId}.pdf`, verifyUrl: '' };
        try {
            pdfResult = await generateCertificatePdf({
                studentName:    student.fullName || student.username,
                courseName:     course.courseTitle || course.title,
                issuerName:     'Emare ICT Hub',
                issueDate:      new Date(),
                certificateId:  certId,
                logoUrl:        template.logoUrl,
                signatureImage: template.signatureImage,
                template,
                verificationBaseUrl: reqBaseUrl(req)
            });
        } catch (pdfErr) {
            console.warn('[admin generateCertificate] PDF failed:', pdfErr.message);
        }

        let cert;
        try {
            cert = await Certificate.create({
                certificateId:     certId,
                certificateNumber: certId,
                studentRef:        studentId,
                courseRef:         courseId,
                issuedBy:          req.user._id,
                templateId:        templateId || 'standard',
                pdfPath:           `/certificates/${pdfResult.filename}`,
                qrCodeData:        pdfResult.verifyUrl,
                issuerName:        'Emare ICT Hub',
                status:            'Issued'
            });
        } catch (dbErr) {
            if (dbErr.code === 11000) {
                const race = await Certificate.findOne({ studentRef: studentId, courseRef: courseId });
                return res.json({ success: true, data: race, alreadyIssued: true });
            }
            throw dbErr;
        }

        res.status(201).json({ success: true, data: cert });
    } catch (err) {
        console.error('[generateCertificateForAdmin]', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// ── PATCH /certificates/:id/revoke  (protected, Admin) ───────────────────────
exports.revokeCertificate = async (req, res) => {
    try {
        const cert = await Certificate.findById(req.params.id);
        if (!cert) {
            return res.status(404).json({ success: false, message: 'Certificate not found.' });
        }
        cert.status           = 'Revoked';
        cert.revokedBy        = req.user._id;
        cert.revokedAt        = new Date();
        cert.revocationReason = req.body.reason || '';
        await cert.save();
        res.json({ success: true, data: cert });
    } catch (err) {
        console.error('[revokeCertificate]', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// ── POST /certificates/:id/reissue  (protected, Admin) ───────────────────────
exports.reissueCertificate = async (req, res) => {
    try {
        const original = await Certificate.findById(req.params.id);
        if (!original) {
            return res.status(404).json({ success: false, message: 'Certificate not found.' });
        }

        // Mark original as reissued
        await Certificate.findByIdAndUpdate(req.params.id, { status: 'Reissued' });

        // New certificate gets a NEW unique ID
        const newCertId = await generateCertificateId();
        const template  = await CertificateTemplate.findOne({ active: true }) || {};
        const [student, course] = await Promise.all([
            User.findById(original.studentRef),
            Course.findById(original.courseRef)
        ]);

        let pdfResult = { filename: `${newCertId}.pdf`, verifyUrl: '' };
        try {
            pdfResult = await generateCertificatePdf({
                studentName:    student?.fullName || 'Student',
                courseName:     course?.courseTitle || 'Course',
                issuerName:     'Emare ICT Hub',
                issueDate:      new Date(),
                certificateId:  newCertId,
                template,
                verificationBaseUrl: reqBaseUrl(req)
            });
        } catch { /* non-fatal */ }

        const reissued = await Certificate.create({
            certificateId:     newCertId,
            certificateNumber: newCertId,
            studentRef:        original.studentRef,
            courseRef:         original.courseRef,
            issuedBy:          req.user._id,
            templateId:        req.body.templateId || original.templateId || 'standard',
            pdfPath:           `/certificates/${pdfResult.filename}`,
            qrCodeData:        pdfResult.verifyUrl,
            issuerName:        'Emare ICT Hub',
            status:            'Issued',
            reissuedFrom:      original._id
        });

        res.status(201).json({
            success: true,
            message: 'Certificate reissued with a new unique ID.',
            data:    reissued
        });
    } catch (err) {
        console.error('[reissueCertificate]', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// ── Legacy alias ─────────────────────────────────────────────────────────────
exports.verifyCertificate = exports.verify;

// ── GET /certificates/verify-page/:certificateId  (PUBLIC — HTML page) ───────
// QR codes on PDFs point here. We always redirect to the Vercel frontend so
// the full React certificate page is shown on any device, any network.
exports.verifyPage = async (req, res) => {
    const { certificateId } = req.params;
    if (!certificateId) return res.redirect('/api/certificates/verify-page');

    // ── Always redirect to the React frontend ─────────────────────────────────
    // FRONTEND_URL is set on Render env vars dashboard.
    // Hard-coded Vercel fallback ensures old QR codes keep working even if
    // the env var is missing on the deployment.
    const frontendBase = (process.env.FRONTEND_URL || 'https://asamnew-emare-elearning.vercel.app').replace(/\/+$/, '');
    return res.redirect(301, `${frontendBase}/verify-certificate/${certificateId}`);

    const cert = await Certificate.findOne({ certificateId })
        .populate('studentRef', 'fullName username')
        .populate('courseRef', 'courseTitle title');

    const isValid = cert && (cert.status === 'Issued' || cert.status === 'Reissued');
    const d = cert ? publicCertPayload(cert) : null;

    // Silently fix any stale qrCodeData stored in the DB so the next PDF
    // download will embed the correct, accessible frontend URL.
    if (cert) {
        const correctBase = (process.env.FRONTEND_URL || process.env.APP_BASE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/+$/, '');
        const correctUrl  = `${correctBase}/verify-certificate/${certificateId}`;
        if (cert.qrCodeData !== correctUrl) {
            Certificate.findByIdAndUpdate(cert._id, { qrCodeData: correctUrl }).catch(() => {});
        }
    }

    const fmtDate = (dt) => dt ? new Date(dt).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' }) : '';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Certificate Verification — Emare ICT Hub</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0d1b4b;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
  .wrap{width:100%;max-width:860px}
  .badge{display:inline-flex;align-items:center;gap:6px;padding:7px 16px;border-radius:999px;font-size:13px;font-weight:700;margin-bottom:18px}
  .badge.valid{background:#d1fae5;color:#065f46;border:1px solid #6ee7b7}
  .badge.invalid{background:#fee2e2;color:#991b1b;border:1px solid #fca5a5}
  .badge.revoked{background:#fef3c7;color:#92400e;border:1px solid #fbbf24}
  .cert{background:#fafaf7;border-radius:16px;padding:8px;box-shadow:0 24px 60px rgba(0,0,0,.35)}
  .cert .outer{border:2px solid #c9a84c;border-radius:13px;padding:3px}
  .cert .inner{border:1px solid #e8c97a;border-radius:10px;overflow:hidden}
  .cert .head{background:#0d1b4b;padding:16px 20px;text-align:center;border-bottom:2px solid #c9a84c}
  .cert .head .brand{color:#e8c97a;font-size:11px;letter-spacing:.28em;font-weight:700;text-transform:uppercase}
  .cert .head .title{color:#fff;font-size:19px;font-weight:800;letter-spacing:.1em;margin-top:6px;text-transform:uppercase}
  .cert .body{padding:22px 26px;text-align:center}
  .cert .body .lead{color:#374151;font-size:12px}
  .cert .body .student{color:#0d1b4b;font-size:26px;font-weight:800;margin:8px 0 2px;line-height:1.2;letter-spacing:.02em}
  .cert .body .goldline{width:160px;height:2px;background:#c9a84c;margin:0 auto 12px}
  .cert .body .course{color:#0f766e;font-size:18px;font-weight:700;margin-top:6px;line-height:1.3}
  .cert .body .quote{color:#6b7280;font-size:11px;font-style:italic;margin-top:8px;line-height:1.5}
  .cert .foot{display:flex;justify-content:space-between;align-items:flex-end;margin-top:18px;padding-top:12px;border-top:1px solid #d1d5db}
  .cert .foot .block{text-align:left}
  .cert .foot .block.mid{text-align:center}
  .cert .foot .block.right{text-align:right}
  .cert .foot .sig{color:#0d1b4b;font-size:11px;font-weight:600}
  .cert .foot .sigline{width:90px;height:1px;background:#0d1b4b;margin:5px 0 4px}
  .cert .foot .cap{color:#6b7280;font-size:8px;letter-spacing:.1em;font-weight:700;text-transform:uppercase}
  .cert .foot .val{color:#111827;font-size:10px;font-weight:700;font-family:monospace;margin-top:3px}
  .cert .foot .seal{width:46px;height:46px;border-radius:50%;background:#0d1b4b;color:#e8c97a;font-size:8px;font-weight:800;display:flex;align-items:center;justify-content:center;text-align:center;letter-spacing:.04em;margin-left:auto}
  .cert .foot .scan{color:#6b7280;font-size:8px;margin-top:6px}
  .footer{text-align:center;margin-top:18px;color:#8fa3c8;font-size:12px}
  .box{background:#fff;border-radius:14px;box-shadow:0 8px 30px rgba(0,0,0,.2);padding:26px 28px;max-width:480px;width:100%;margin:0 auto;text-align:center}
</style>
</head>
<body>
<div class="wrap">
  ${isValid ? `
    <div style="text-align:center"><div class="badge valid">✅ Certificate is Valid</div></div>
    <div class="cert">
      <div class="outer">
        <div class="inner">
          <div class="head">
            <div class="brand">Emare ICT Hub</div>
            <div class="title">Certificate of Completion</div>
          </div>
          <div class="body">
            <div class="lead">This certificate is proudly presented to</div>
            <div class="student">${d.studentName.toUpperCase()}</div>
            <div class="goldline"></div>
            <div class="lead">for successfully completing</div>
            <div class="course">${d.course}</div>
            <div class="quote">and has demonstrated the knowledge, skills, and dedication required to earn this credential.</div>
            <div class="foot">
              <div class="block">
                <div class="sig">${d.issuer}</div>
                <div class="sigline"></div>
                <div class="cap">Signature</div>
              </div>
              <div class="block mid">
                <div class="cap">Certificate ID</div>
                <div class="val">${d.certificateId}</div>
                <div class="cap" style="margin-top:8px">Issue Date</div>
                <div class="val" style="font-family:inherit">${fmtDate(d.issueDate)}</div>
              </div>
              <div class="block right">
                <div class="seal">VERIFIED<br>✓</div>
                <div class="scan">Scan to verify</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="footer">Certificate ID: ${d.certificateId} • Completion: ${fmtDate(d.completionDate)} • Issuer: ${d.issuer} • Status: ${d.status}</div>
  ` : `
    <div class="box">
      ${cert ? `
        <div class="badge revoked">⚠️ Certificate Revoked</div>
        <p style="color:#92400e;font-size:14px">This certificate was issued by Emare ICT Hub but has been revoked.</p>
      ` : `
        <div class="badge invalid">❌ Certificate Not Found</div>
        <p style="color:#991b1b;font-size:14px;margin-top:10px">The ID <strong>${certificateId}</strong> does not match any certificate issued by Emare ICT Hub.</p>
      `}
      <div class="footer" style="color:#9ca3af">Verified via Emare ICT Hub • ${new Date().getFullYear()}</div>
    </div>
  `}
</div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
};

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

// ── GET /certificates/check/:courseId  (protected) ───────────────────────────
exports.checkEligibility = async (req, res) => {
    try {
        const { courseId } = req.params;
        const enrollment = await Enrollment.findOne({
            studentRef: req.user._id,
            courseRef:  courseId
        });
        if (!enrollment) {
            return res.status(404).json({ success: false, message: 'Enrollment not found.' });
        }

        const pct      = enrollment.completionPercentage || 0;
        const eligible = enrollment.tuitionClearanceFlag && pct >= 90;

        // Check if certificate already issued
        const existing = await Certificate.findOne({
            studentRef: req.user._id,
            courseRef:  courseId
        }).select('certificateId status issueDate');

        res.json({
            success: true,
            data: {
                eligible,
                completionPercentage: pct,
                alreadyIssued: !!existing,
                certificate:  existing || null
            }
        });
    } catch (err) {
        console.error('[checkEligibility]', err);
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
        if (!enrollment.tuitionClearanceFlag) {
            return res.status(400).json({ success: false, message: 'Course payment is not cleared.' });
        }
        const pct = enrollment.completionPercentage || 0;
        if (pct < 90) {
            return res.status(400).json({
                success: false,
                message: `You have completed ${pct}% of the course. At least 90% is required.`
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

        // 4. Load course + template
        const course   = await Course.findById(courseId);
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
                template
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
            template
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
                template
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
                template
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
// Self-contained HTML page so QR codes work from ANY device without a frontend.
exports.verifyPage = async (req, res) => {
    const { certificateId } = req.params;
    if (!certificateId) return res.redirect('/api/certificates/verify-page');

    const cert = await Certificate.findOne({ certificateId })
        .populate('studentRef', 'fullName username')
        .populate('courseRef', 'courseTitle title');

    const isValid = cert && (cert.status === 'Issued' || cert.status === 'Reissued');
    const d = cert ? publicCertPayload(cert) : null;

    const fmtDate = (dt) => dt ? new Date(dt).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' }) : '';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Certificate Verification — Emare ICT Hub</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f0f2f5;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
  .card{background:#fff;border-radius:16px;box-shadow:0 8px 30px rgba(0,0,0,.08);padding:36px 32px;max-width:480px;width:100%}
  .header{text-align:center;margin-bottom:28px}
  .header h1{font-size:22px;font-weight:800;color:#1a1a2e;margin-bottom:6px}
  .header p{font-size:13px;color:#6b7280}
  .badge{display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border-radius:999px;font-size:13px;font-weight:700;margin-bottom:20px}
  .badge.valid{background:#d1fae5;color:#065f46;border:1px solid #6ee7b7}
  .badge.invalid{background:#fee2e2;color:#991b1b;border:1px solid #fca5a5}
  .badge.revoked{background:#fef3c7;color:#92400e;border:1px solid #fbbf24}
  .field{margin-bottom:14px}
  .field label{display:block;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#6b7280;margin-bottom:3px;font-weight:600}
  .field span{font-size:15px;font-weight:600;color:#1a1a2e}
  .footer{text-align:center;margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af}
  .search-box{margin-top:20px}
  .search-box input{width:100%;padding:12px 14px;border:1.5px solid #d1d5db;border-radius:10px;font-size:14px;font-family:monospace;letter-spacing:.04em;margin-bottom:10px;outline:none}
  .search-box input:focus{border-color:#2563eb}
  .search-box button{width:100%;padding:12px;background:linear-gradient(135deg,#2563eb,#7c3aed);color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer}
</style>
</head>
<body>
<div class="card">
  <div class="header">
    <h1>🎓 Certificate Verification</h1>
    <p>Emare ICT Hub — Ethiopian Tech Learning Platform</p>
  </div>
  ${isValid ? `
    <div class="badge valid">✅ Certificate is Valid</div>
    <div class="field"><label>Certificate ID</label><span>${d.certificateId}</span></div>
    <div class="field"><label>Student Name</label><span>${d.studentName}</span></div>
    <div class="field"><label>Course</label><span>${d.course}</span></div>
    <div class="field"><label>Issuer</label><span>${d.issuer}</span></div>
    <div class="field"><label>Issue Date</label><span>${fmtDate(d.issueDate)}</span></div>
    <div class="field"><label>Completion Date</label><span>${fmtDate(d.completionDate)}</span></div>
    ${d.grade ? `<div class="field"><label>Grade</label><span>${d.grade}</span></div>` : ''}
    <div class="field"><label>Status</label><span>${d.status}</span></div>
  ` : cert ? `
    <div class="badge revoked">⚠️ Certificate Revoked</div>
    <p style="color:#92400e;font-size:14px">This certificate was issued but has been revoked.</p>
  ` : `
    <div class="badge invalid">❌ Certificate Not Found</div>
    <p style="color:#991b1b;font-size:14px">The ID <strong>${certificateId}</strong> does not match any certificate issued by Emare ICT Hub.</p>
  `}
  <div class="footer">Verified via Emare ICT Hub • ${new Date().getFullYear()}</div>
</div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
};

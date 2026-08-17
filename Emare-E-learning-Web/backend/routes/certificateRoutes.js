/**
 * certificateRoutes.js
 *
 * PUBLIC:
 *   GET  /verify/:certificateId  — anyone can verify a certificate by ID
 *
 * PROTECTED (student):
 *   GET  /my                     — list my certificates
 *   GET  /mine                   — alias
 *   GET  /check/:courseId        — eligibility check
 *   POST /issue/:courseId        — issue certificate (idempotent)
 *   POST /generate               — alias (courseId in body)
 *   GET  /:id/download           — download PDF
 *
 * PROTECTED (admin):
 *   GET  /admin/all              — list all certificates (with search)
 *   POST /admin/generate         — admin-issued certificate
 *   POST /:id/reissue            — reissue with new unique ID
 *   PATCH/:id/revoke             — revoke
 */
const router = require('express').Router();
const { protect, authorizeRoles } = require('../middleware/auth');
const c = require('../controllers/certificateController');

// ── Public ────────────────────────────────────────────────────────────────────
router.get('/verify/:certificateId', c.verify);

// ── Student (protected) ───────────────────────────────────────────────────────
router.get('/my',               protect, c.getMyCertificates);
router.get('/mine',             protect, c.getMyCertificates);
router.get('/check/:courseId',  protect, c.checkEligibility);
router.post('/issue/:courseId', protect, c.issueCertificate);
router.post('/generate',        protect, c.generateCertificate);
router.get('/:id/download',     protect, c.downloadCertificate);

// ── Admin (protected) ─────────────────────────────────────────────────────────
router.get('/admin/all',
    protect, authorizeRoles('Admin'), c.getAllCertificates);
router.post('/admin/generate',
    protect, authorizeRoles('Admin'), c.generateCertificateForAdmin);
router.post('/:id/reissue',
    protect, authorizeRoles('Admin'), c.reissueCertificate);
router.patch('/:id/revoke',
    protect, authorizeRoles('Admin'), c.revokeCertificate);

module.exports = router;

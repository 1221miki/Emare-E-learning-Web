const router = require('express').Router();
const { protect, authorizeRoles } = require('../middleware/auth');
const certificateController = require('../controllers/certificateController');

// Public verification and eligibility routes
router.get('/verify/:certificateId', certificateController.verify);
router.get('/check/:courseId', protect, certificateController.checkEligibility);
router.post('/issue/:courseId', protect, certificateController.issueCertificate);
router.get('/my', protect, certificateController.getMyCertificates);
router.get('/download/:certificateId', protect, certificateController.downloadCertificate);

// Protected certificate management routes
router.use(protect);
router.get('/mine', certificateController.getMyCertificates);
router.get('/admin/all', authorizeRoles('Admin'), certificateController.getAllCertificates);
router.post('/generate', certificateController.generateCertificate);
router.post('/admin/generate', authorizeRoles('Admin'), certificateController.generateCertificateForAdmin);
router.post('/:id/reissue', authorizeRoles('Admin'), certificateController.reissueCertificate);
router.patch('/:id/revoke', authorizeRoles('Admin'), certificateController.revokeCertificate);
router.get('/:id/download', certificateController.downloadCertificate);

module.exports = router;

const router = require('express').Router();
const { protect, authorizeRoles } = require('../middleware/auth');
const {
    generateCertificate,
    getMyCertificates,
    getAllCertificates,
    generateCertificateForAdmin,
    reissueCertificate,
    revokeCertificate,
    downloadCertificate,
    verifyCertificate
} = require('../controllers/certificateController');

router.get('/verify/:certNumber', verifyCertificate); // Public
router.use(protect);
router.get('/mine', getMyCertificates);
router.get('/admin/all', authorizeRoles('Admin'), getAllCertificates);
router.post('/generate', generateCertificate);
router.post('/admin/generate', authorizeRoles('Admin'), generateCertificateForAdmin);
router.post('/:id/reissue', authorizeRoles('Admin'), reissueCertificate);
router.patch('/:id/revoke', authorizeRoles('Admin'), revokeCertificate);
router.get('/:id/download', downloadCertificate);

module.exports = router;

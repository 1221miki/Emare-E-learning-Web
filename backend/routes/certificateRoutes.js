const router = require('express').Router();
const { protect } = require('../middleware/auth');
const { generateCertificate, getMyCertificates, verifyCertificate } = require('../controllers/certificateController');

router.get('/verify/:certNumber', verifyCertificate); // Public
router.use(protect);
router.post('/generate', generateCertificate);
router.get('/mine', getMyCertificates);

module.exports = router;

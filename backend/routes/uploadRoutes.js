const router = require('express').Router();
const { protect } = require('../middleware/auth');
const upload = require('../middleware/uploadMiddleware');
const { uploadFile } = require('../controllers/uploadController');

// Using the 'file' field name for multipart form data
router.post('/', protect, upload.single('file'), uploadFile);

module.exports = router;

const express = require('express');
const router = express.Router();

const upload = require('../middleware/upload');
const {
  uploadTestImage,
  uploadMedia,
} = require('../controllers/mediaController');

router.post('/test-image', upload.single('image'), uploadTestImage);
router.post('/upload', upload.single('image'), uploadMedia);

module.exports = router;

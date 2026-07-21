const multer = require('multer');

// Configure Multer to use MemoryStorage
// This means the file is kept in memory as a Buffer, rather than written to disk,
// making it extremely fast for piping directly to Cloudinary.
const storage = multer.memoryStorage();

// File validation filter
const fileFilter = (req, file, cb) => {
    // Only allow images, pdfs, and mp4s
    if (file.mimetype.startsWith('image/') || 
        file.mimetype === 'application/pdf' || 
        file.mimetype === 'video/mp4') {
        cb(null, true);
    } else {
        cb(new Error('Unsupported file format. Please upload an image, PDF, or MP4 video.'), false);
    }
};

const upload = multer({
    storage,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit
    },
    fileFilter
});

module.exports = upload;

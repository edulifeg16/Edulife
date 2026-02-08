const multer = require('multer');
const path = require('path');

// Set up storage engine
const storage = multer.diskStorage({
    destination: './uploads/videos/',
    filename: function(req, file, cb) {
        // Create a unique filename: fieldname-timestamp.extension
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

// Create multer instance with config
const uploadConfig = multer({
    storage: storage,
    limits: { 
        fileSize: 500 * 1024 * 1024, // 500MB size limit
        fieldSize: 100 * 1024 * 1024 // 100MB for form field size
    },
    fileFilter: function(req, file, cb) {
        checkFileType(file, cb);
    }
});

// Wrapper function to handle errors more gracefully
const upload = function(req, res, next) {
    uploadConfig.fields([{ name: 'lessonVideos', maxCount: 10 }])(req, res, function(err) {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    error: 'File too large',
                    details: `Maximum file size is 500MB. Your file exceeds this limit.`,
                    code: 'FILE_TOO_LARGE'
                });
            }
            return res.status(400).json({
                error: 'File upload error',
                details: err.message,
                code: err.code
            });
        } else if (err) {
            return res.status(400).json({
                error: 'Invalid file type',
                details: 'Only video files (mp4, mov, wmv, avi) are allowed',
                code: 'INVALID_FILE_TYPE'
            });
        }
        next();
    });
};

// Check file type
function checkFileType(file, cb) {
    // Allowed extensions
    const filetypes = /mp4|mov|wmv|avi/;
    // Check extension
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    // Check mime type
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('Only video files (mp4, mov, wmv, avi) are allowed'));
    }
}

// Format bytes to human readable format
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

module.exports = upload;

module.exports = upload;
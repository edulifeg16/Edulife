/**
 * S3 Upload Middleware for EduLife Platform
 * 
 * This middleware handles video file uploads, storing them temporarily
 * on disk (required for FFmpeg processing) and then uploading to S3.
 * 
 * The workflow:
 * 1. Multer saves files temporarily to local disk
 * 2. Files are uploaded to S3
 * 3. S3 keys are attached to the request for controller use
 * 4. Temp files are cleaned up after processing
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const s3Service = require('../Aws');

// Temp directory for processing (files need to be local for FFmpeg)
const TEMP_DIR = path.join(__dirname, '../temp');

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// ============================================================================
// MULTER CONFIGURATION (Temporary Local Storage)
// ============================================================================

const tempStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Ensure temp directory exists
        if (!fs.existsSync(TEMP_DIR)) {
            fs.mkdirSync(TEMP_DIR, { recursive: true });
        }
        cb(null, TEMP_DIR);
    },
    filename: (req, file, cb) => {
        // Create unique filename: fieldname-timestamp-originalname
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
    }
});

// File filter for video types
function videoFileFilter(req, file, cb) {
    const allowedTypes = /mp4|mov|wmv|avi|webm/;
    const extMatch = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimeMatch = /video\//i.test(file.mimetype);
    
    if (mimeMatch && extMatch) {
        cb(null, true);
    } else {
        cb(new Error('Only video files (mp4, mov, wmv, avi, webm) are allowed'));
    }
}

// Create multer instance with temp storage
const tempUpload = multer({
    storage: tempStorage,
    limits: {
        fileSize: 500 * 1024 * 1024, // 500MB limit
        fieldSize: 100 * 1024 * 1024 // 100MB for form fields
    },
    fileFilter: videoFileFilter
});

// ============================================================================
// S3 UPLOAD HELPER FUNCTIONS
// ============================================================================

/**
 * Upload a single file to S3 and return the S3 key
 * @param {Object} file - Multer file object
 * @param {string} [folder='videos'] - Folder in S3 bucket
 * @returns {Promise<Object>} - Object with s3Key, localPath, and metadata
 */
async function uploadToS3(file, folder = 'videos') {
    const s3Key = s3Service.generateVideoKey(file.originalname, folder);
    
    console.log(`📤 Uploading ${file.originalname} to S3...`);
    
    try {
        await s3Service.uploadLocalFile(file.path, s3Key);
        
        return {
            s3Key,
            localPath: file.path,
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size
        };
    } catch (error) {
        console.error(`❌ Failed to upload ${file.originalname} to S3:`, error.message);
        throw error;
    }
}

/**
 * Upload multiple files to S3
 * @param {Array} files - Array of multer file objects
 * @param {string} [folder='videos'] - Folder in S3 bucket
 * @returns {Promise<Array>} - Array of upload results
 */
async function uploadMultipleToS3(files, folder = 'videos') {
    const results = [];
    
    for (const file of files) {
        const result = await uploadToS3(file, folder);
        results.push(result);
    }
    
    return results;
}

/**
 * Clean up temporary local files
 * @param {Array|string} files - File paths to delete
 */
function cleanupTempFiles(files) {
    const filePaths = Array.isArray(files) ? files : [files];
    
    for (const filePath of filePaths) {
        try {
            if (filePath && fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log(`🧹 Cleaned up temp file: ${path.basename(filePath)}`);
            }
        } catch (error) {
            console.warn(`⚠️ Failed to cleanup temp file: ${filePath}`, error.message);
        }
    }
}

// ============================================================================
// MIDDLEWARE FUNCTIONS
// ============================================================================

/**
 * Middleware for handling video uploads with S3 storage
 * - Files are first saved temporarily to disk (for FFmpeg processing)
 * - After processing, call cleanupTempFiles() to remove local copies
 * 
 * Attaches to req:
 * - req.files.lessonVideos: Array of file objects with s3Key property
 * - req.tempFilePaths: Array of local temp file paths (for cleanup)
 */
const s3Upload = (req, res, next) => {
    tempUpload.fields([{ name: 'lessonVideos', maxCount: 10 }])(req, res, async (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    error: 'File too large',
                    details: 'Maximum file size is 500MB. Your file exceeds this limit.',
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
                details: 'Only video files (mp4, mov, wmv, avi, webm) are allowed',
                code: 'INVALID_FILE_TYPE'
            });
        }

        // If S3 is not configured, proceed with local storage only
        if (!s3Service.config.isConfigured) {
            console.warn('⚠️ S3 not configured, using local storage only');
            next();
            return;
        }

        // Process uploaded files - upload to S3 but keep local copies for processing
        try {
            const lessonVideos = req.files?.lessonVideos || [];
            req.tempFilePaths = [];
            
            if (lessonVideos.length > 0) {
                for (const file of lessonVideos) {
                    // Generate S3 key and store it on the file object
                    file.s3Key = s3Service.generateVideoKey(file.originalname, 'videos');
                    req.tempFilePaths.push(file.path);
                    
                    console.log(`📁 File ready for processing: ${file.originalname}`);
                    console.log(`   Local path: ${file.path}`);
                    console.log(`   S3 Key: ${file.s3Key}`);
                }
            }
            
            next();
        } catch (uploadError) {
            console.error('❌ Error preparing files for S3:', uploadError);
            return res.status(500).json({
                error: 'File processing error',
                details: uploadError.message
            });
        }
    });
};

/**
 * Middleware for direct S3 upload (skip local temp storage)
 * Use for small files or when local processing is not needed
 */
const directS3Upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 100 * 1024 * 1024, // 100MB limit for memory storage
    },
    fileFilter: videoFileFilter
});

// ============================================================================
// MODULE EXPORTS
// ============================================================================

module.exports = {
    // Main middleware
    s3Upload,
    directS3Upload,
    
    // Helper functions (for use in controllers)
    uploadToS3,
    uploadMultipleToS3,
    cleanupTempFiles,
    
    // Constants
    TEMP_DIR,
};

/**
 * AWS S3 Service Module for EduLife Platform
 * 
 * This module provides modular, reusable functions for S3 operations:
 * - Upload files to S3
 * - Generate signed URLs for secure access
 * - Download files from S3
 * - Delete files from S3
 * 
 * Usage: 
 *   const s3Service = require('./Aws');
 *   await s3Service.uploadFile(buffer, 'videos/lesson-1.mp4', 'video/mp4');
 *   const url = await s3Service.getSignedDownloadUrl('videos/lesson-1.mp4');
 */

const { 
    S3Client, 
    GetObjectCommand, 
    PutObjectCommand, 
    DeleteObjectCommand,
    HeadObjectCommand,
    ListObjectsV2Command 
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { Upload } = require("@aws-sdk/lib-storage");
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// ============================================================================
// S3 CLIENT CONFIGURATION
// ============================================================================

// Get configuration from environment variables (secure approach)
const AWS_REGION = process.env.AWS_REGION || 'ap-south-1';
const AWS_BUCKET_NAME = process.env.AWS_BUCKET_NAME || 'edulife-learning-platform-2025-26-bucket';
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;

// Validate required credentials
if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
    console.warn('⚠️ AWS credentials not found in environment variables. S3 operations will fail.');
    console.warn('Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in your .env file');
}

// Create S3 client instance
const s3Client = new S3Client({
    region: AWS_REGION,
    credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY,
    },
});

// ============================================================================
// S3 UPLOAD FUNCTIONS
// ============================================================================

/**
 * Upload a file buffer to S3
 * @param {Buffer|Stream} fileContent - File buffer or readable stream
 * @param {string} key - S3 object key (path in bucket, e.g., 'videos/lesson-1.mp4')
 * @param {string} contentType - MIME type of the file
 * @returns {Promise<Object>} - Upload result with location and key
 */
async function uploadFile(fileContent, key, contentType) {
    try {
        const upload = new Upload({
            client: s3Client,
            params: {
                Bucket: AWS_BUCKET_NAME,
                Key: key,
                Body: fileContent,
                ContentType: contentType,
            },
        });

        // Track progress (useful for large video files)
        upload.on('httpUploadProgress', (progress) => {
            const percent = Math.round((progress.loaded / progress.total) * 100);
            console.log(`📤 Upload progress: ${percent}%`);
        });

        const result = await upload.done();
        console.log(`✅ File uploaded successfully to S3: ${key}`);
        
        return {
            success: true,
            key: key,
            location: result.Location,
            bucket: AWS_BUCKET_NAME,
        };
    } catch (error) {
        console.error('❌ S3 Upload Error:', error.message);
        throw new Error(`Failed to upload file to S3: ${error.message}`);
    }
}

/**
 * Upload a local file to S3 by reading from disk
 * @param {string} localFilePath - Absolute path to local file
 * @param {string} s3Key - S3 object key (path in bucket)
 * @param {string} [contentType] - MIME type (auto-detected if not provided)
 * @returns {Promise<Object>} - Upload result
 */
async function uploadLocalFile(localFilePath, s3Key, contentType) {
    const fileStream = fs.createReadStream(localFilePath);
    
    // Auto-detect content type based on extension if not provided
    if (!contentType) {
        const ext = path.extname(localFilePath).toLowerCase();
        const mimeTypes = {
            '.mp4': 'video/mp4',
            '.mov': 'video/quicktime',
            '.avi': 'video/x-msvideo',
            '.wmv': 'video/x-ms-wmv',
            '.webm': 'video/webm',
            '.vtt': 'text/vtt',
            '.srt': 'text/plain',
            '.wav': 'audio/wav',
            '.mp3': 'audio/mpeg',
        };
        contentType = mimeTypes[ext] || 'application/octet-stream';
    }
    
    return uploadFile(fileStream, s3Key, contentType);
}

/**
 * Generate a presigned URL for uploading directly to S3 (browser upload)
 * @param {string} key - S3 object key
 * @param {string} contentType - MIME type of the file to be uploaded
 * @param {number} [expiresIn=3600] - URL expiration time in seconds (default 1 hour)
 * @returns {Promise<string>} - Presigned upload URL
 */
async function getSignedUploadUrl(key, contentType, expiresIn = 3600) {
    const command = new PutObjectCommand({
        Bucket: AWS_BUCKET_NAME,
        Key: key,
        ContentType: contentType,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn });
    return url;
}

// ============================================================================
// S3 DOWNLOAD FUNCTIONS
// ============================================================================

/**
 * Generate a presigned URL for downloading/viewing a file from S3
 * @param {string} key - S3 object key
 * @param {number} [expiresIn=3600] - URL expiration time in seconds (default 1 hour)
 * @returns {Promise<string>} - Presigned download URL
 */
async function getSignedDownloadUrl(key, expiresIn = 3600) {
    try {
        const command = new GetObjectCommand({
            Bucket: AWS_BUCKET_NAME,
            Key: key,
        });

        const url = await getSignedUrl(s3Client, command, { expiresIn });
        return url;
    } catch (error) {
        console.error('❌ Error generating signed URL:', error.message);
        throw new Error(`Failed to generate signed URL: ${error.message}`);
    }
}

/**
 * Download a file from S3 to local disk
 * @param {string} key - S3 object key
 * @param {string} localPath - Local path to save the file
 * @returns {Promise<string>} - Path to downloaded file
 */
async function downloadToLocal(key, localPath) {
    try {
        const command = new GetObjectCommand({
            Bucket: AWS_BUCKET_NAME,
            Key: key,
        });

        const response = await s3Client.send(command);
        
        // Ensure directory exists
        const dir = path.dirname(localPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        // Write stream to file
        const writeStream = fs.createWriteStream(localPath);
        response.Body.pipe(writeStream);

        return new Promise((resolve, reject) => {
            writeStream.on('finish', () => {
                console.log(`✅ File downloaded to: ${localPath}`);
                resolve(localPath);
            });
            writeStream.on('error', reject);
        });
    } catch (error) {
        console.error('❌ S3 Download Error:', error.message);
        throw new Error(`Failed to download file from S3: ${error.message}`);
    }
}

/**
 * Get file content as buffer
 * @param {string} key - S3 object key
 * @returns {Promise<Buffer>} - File content as buffer
 */
async function getFileBuffer(key) {
    try {
        const command = new GetObjectCommand({
            Bucket: AWS_BUCKET_NAME,
            Key: key,
        });

        const response = await s3Client.send(command);
        const chunks = [];
        
        for await (const chunk of response.Body) {
            chunks.push(chunk);
        }
        
        return Buffer.concat(chunks);
    } catch (error) {
        console.error('❌ Error getting file buffer:', error.message);
        throw new Error(`Failed to get file from S3: ${error.message}`);
    }
}

// ============================================================================
// S3 UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if an object exists in S3
 * @param {string} key - S3 object key
 * @returns {Promise<boolean>} - True if object exists
 */
async function objectExists(key) {
    try {
        const command = new HeadObjectCommand({
            Bucket: AWS_BUCKET_NAME,
            Key: key,
        });
        await s3Client.send(command);
        return true;
    } catch (error) {
        if (error.name === 'NotFound') {
            return false;
        }
        throw error;
    }
}

/**
 * Delete an object from S3
 * @param {string} key - S3 object key
 * @returns {Promise<boolean>} - True if deleted successfully
 */
async function deleteObject(key) {
    try {
        const command = new DeleteObjectCommand({
            Bucket: AWS_BUCKET_NAME,
            Key: key,
        });
        await s3Client.send(command);
        console.log(`🗑️ Deleted from S3: ${key}`);
        return true;
    } catch (error) {
        console.error('❌ Error deleting from S3:', error.message);
        throw new Error(`Failed to delete from S3: ${error.message}`);
    }
}

/**
 * List objects in a specific folder/prefix
 * @param {string} prefix - Prefix to filter objects (e.g., 'videos/')
 * @param {number} [maxKeys=1000] - Maximum number of keys to return
 * @returns {Promise<Array>} - Array of object keys
 */
async function listObjects(prefix = '', maxKeys = 1000) {
    try {
        const command = new ListObjectsV2Command({
            Bucket: AWS_BUCKET_NAME,
            Prefix: prefix,
            MaxKeys: maxKeys,
        });

        const result = await s3Client.send(command);
        return (result.Contents || []).map(obj => ({
            key: obj.Key,
            size: obj.Size,
            lastModified: obj.LastModified,
        }));
    } catch (error) {
        console.error('❌ Error listing objects:', error.message);
        throw new Error(`Failed to list objects: ${error.message}`);
    }
}

/**
 * Generate S3 key for a video file
 * @param {string} filename - Original filename
 * @param {string} [folder='videos'] - Folder in bucket
 * @returns {string} - S3 key
 */
function generateVideoKey(filename, folder = 'videos') {
    const timestamp = Date.now();
    const sanitizedName = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `${folder}/${timestamp}_${sanitizedName}`;
}

/**
 * Generate S3 key for a subtitle/caption file
 * @param {string} videoKey - Original video S3 key
 * @returns {string} - S3 key for caption file
 */
function generateCaptionKey(videoKey) {
    const baseName = videoKey.replace(/\.[^/.]+$/, '');
    return `subtitles/${path.basename(baseName)}.vtt`;
}

/**
 * Generate S3 key for a simplified video (cognitive mode)
 * @param {string} videoKey - Original video S3 key
 * @returns {string} - S3 key for simplified video
 */
function generateSimplifiedVideoKey(videoKey) {
    const baseName = videoKey.replace(/\.[^/.]+$/, '');
    return `${baseName}_simplified.mp4`;
}

/**
 * Generate S3 key for simplified captions (cognitive mode)
 * @param {string} videoKey - Original video S3 key
 * @returns {string} - S3 key for simplified captions
 */
function generateSimplifiedCaptionKey(videoKey) {
    const baseName = videoKey.replace(/\.[^/.]+$/, '');
    return `subtitles/${path.basename(baseName)}_simplified.vtt`;
}

// ============================================================================
// CONFIGURATION EXPORTS
// ============================================================================

const config = {
    region: AWS_REGION,
    bucketName: AWS_BUCKET_NAME,
    isConfigured: !!(AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY),
};

// ============================================================================
// MODULE EXPORTS
// ============================================================================

module.exports = {
    // Core S3 client (for advanced usage)
    s3Client,
    
    // Upload functions
    uploadFile,
    uploadLocalFile,
    getSignedUploadUrl,
    
    // Download functions
    getSignedDownloadUrl,
    downloadToLocal,
    getFileBuffer,
    
    // Utility functions
    objectExists,
    deleteObject,
    listObjects,
    
    // Key generators
    generateVideoKey,
    generateCaptionKey,
    generateSimplifiedVideoKey,
    generateSimplifiedCaptionKey,
    
    // Configuration
    config,
};
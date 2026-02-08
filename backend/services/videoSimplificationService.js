const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const s3Service = require('../Aws');
require('dotenv').config();

// Set FFmpeg paths from environment or use defaults
const FFMPEG_PATH = process.env.FFMPEG_PATH || 'C:\\ffmpeg\\bin\\ffmpeg.exe';
const FFPROBE_PATH = process.env.FFPROBE_PATH || FFMPEG_PATH.replace('ffmpeg.exe', 'ffprobe.exe');

// Validate FFmpeg installation
if (!fs.existsSync(FFMPEG_PATH)) {
    console.error('❌ FFmpeg not found at:', FFMPEG_PATH);
    console.error('Please install FFmpeg and set FFMPEG_PATH in .env file');
} else {
    console.log('✅ FFmpeg found at:', FFMPEG_PATH);
    ffmpeg.setFfmpegPath(FFMPEG_PATH);
    ffmpeg.setFfprobePath(FFPROBE_PATH);
}

/**
 * Process video for cognitive mode - creates a slowed-down version (0.75x speed)
 * @param {string} videoPath - Absolute path to the original video file
 * @param {string} captionUrl - URL of the original captions (unused but kept for consistency)
 * @param {string|null} s3VideoKey - S3 key of the original video (for generating simplified video key)
 * @returns {Promise<Object>} - Object containing simplified video URL/S3 key and processing status
 */
async function processVideoForCognitive(videoPath, captionUrl, s3VideoKey = null) {
    try {
        console.log('🎬 Starting video simplification for cognitive mode...');
        console.log('📹 Original video path:', videoPath);
        
        // Validate input video exists
        if (!fs.existsSync(videoPath)) {
            throw new Error(`Video file not found: ${videoPath}`);
        }
        
        // Generate output path for simplified video (in temp directory)
        const tempDir = path.join(__dirname, '../temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        
        const videoBasename = path.basename(videoPath, path.extname(videoPath));
        const simplifiedVideoFilename = `${videoBasename}_simplified.mp4`;
        const simplifiedVideoPath = path.join(tempDir, simplifiedVideoFilename);
        
        console.log('💾 Simplified video will be saved to:', simplifiedVideoPath);
        
        // Create simplified video using FFmpeg
        await new Promise((resolve, reject) => {
            ffmpeg(videoPath)
                .videoFilters('setpts=1.33*PTS')  // Slow down video to 0.75x
                .audioFilters('atempo=0.75')       // Slow down audio to 0.75x
                .output(simplifiedVideoPath)
                .on('start', (commandLine) => {
                    console.log('🔧 FFmpeg command:', commandLine);
                })
                .on('progress', (progress) => {
                    if (progress.percent) {
                        console.log(`⏳ Processing: ${Math.round(progress.percent)}% complete`);
                    }
                })
                .on('end', () => {
                    console.log('✅ Video simplification completed successfully');
                    resolve();
                })
                .on('error', (err) => {
                    console.error('❌ FFmpeg error:', err.message);
                    reject(new Error(`Failed to create simplified video: ${err.message}`));
                })
                .run();
        });
        
        // Verify output file was created
        if (!fs.existsSync(simplifiedVideoPath)) {
            throw new Error('Simplified video file was not created');
        }
        
        const fileStats = fs.statSync(simplifiedVideoPath);
        console.log(`📊 Simplified video size: ${(fileStats.size / 1024 / 1024).toFixed(2)} MB`);
        
        // Upload to S3 if configured
        let s3Key = null;
        let publicUrl = `/uploads/videos/${simplifiedVideoFilename}`; // fallback local URL
        
        if (s3Service.config.isConfigured) {
            try {
                // Generate S3 key based on original video key
                if (s3VideoKey) {
                    s3Key = s3Service.generateSimplifiedVideoKey(s3VideoKey);
                } else {
                    s3Key = `videos/${simplifiedVideoFilename}`;
                }
                
                await s3Service.uploadLocalFile(simplifiedVideoPath, s3Key, 'video/mp4');
                console.log(`✅ Simplified video uploaded to S3: ${s3Key}`);
                
                // Keep local file for now (may be needed for subtitle generation)
                // Will be cleaned up by the controller after all processing is done
            } catch (s3Error) {
                console.warn('⚠️ S3 upload failed for simplified video:', s3Error.message);
                // Copy to permanent local storage as fallback
                const permanentVideoDir = path.join(__dirname, '../uploads/videos');
                if (!fs.existsSync(permanentVideoDir)) {
                    fs.mkdirSync(permanentVideoDir, { recursive: true });
                }
                const permanentPath = path.join(permanentVideoDir, simplifiedVideoFilename);
                fs.copyFileSync(simplifiedVideoPath, permanentPath);
            }
        } else {
            // No S3, copy to permanent local storage
            const permanentVideoDir = path.join(__dirname, '../uploads/videos');
            if (!fs.existsSync(permanentVideoDir)) {
                fs.mkdirSync(permanentVideoDir, { recursive: true });
            }
            const permanentPath = path.join(permanentVideoDir, simplifiedVideoFilename);
            fs.copyFileSync(simplifiedVideoPath, permanentPath);
        }
        
        return {
            simplifiedVideoUrl: publicUrl,
            simplifiedVideoLocalPath: simplifiedVideoPath,
            s3Key: s3Key,
            isS3: !!s3Key && s3Service.config.isConfigured,
            processingStatus: 'completed'
        };
        
    } catch (error) {
        console.error('❌ Error in processVideoForCognitive:', error);
        throw error;
    }
}

module.exports = {
    processVideoForCognitive
};

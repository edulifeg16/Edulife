const fs = require('fs');
const path = require('path');
const axios = require('axios');
const ffmpeg = require('fluent-ffmpeg');
const s3Service = require('../Aws');
require('dotenv').config();

// Set FFmpeg paths from environment or use defaults
const FFMPEG_PATH = process.env.FFMPEG_PATH || 'C:\\ffmpeg\\bin\\ffmpeg.exe';
const FFPROBE_PATH = process.env.FFPROBE_PATH || FFMPEG_PATH.replace('ffmpeg.exe', 'ffprobe.exe');

// Validate FFmpeg installation
if (!fs.existsSync(FFMPEG_PATH)) {
    console.error('❌ FFmpeg not found at:', FFMPEG_PATH);
    console.error('Please install FFmpeg and set FFMPEG_PATH in .env file');
    console.error('Download from: https://www.gyan.dev/ffmpeg/builds/');
} else {
    console.log('✅ FFmpeg found at:', FFMPEG_PATH);
    ffmpeg.setFfmpegPath(FFMPEG_PATH);
    ffmpeg.setFfprobePath(FFPROBE_PATH);
}

// --- AssemblyAI API Configuration ---
const assembly = axios.create({
    baseURL: "https://api.assemblyai.com/v2",
    headers: {
        authorization: process.env.ASSEMBLYAI_API_KEY,
        "content-type": "application/json",
    },
});

// Helper function to delay execution, needed for checking results
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// --- Main Function to Generate Captions ---
/**
 * Generate captions for a video file
 * @param {string} videoPath - Local path to video file
 * @param {string|null} language - Language code (e.g., 'en', 'mr')
 * @param {string|null} s3VideoKey - Optional S3 key of the video (for generating caption key)
 * @returns {Promise<Object>} - Object with localPath and s3Key of the VTT file
 */
async function generateCaptions(videoPath, language = null, s3VideoKey = null) {
    return new Promise((resolve, reject) => {
        const audioOutputPath = path.join(__dirname, `../temp/audio_${Date.now()}.wav`);
        
        // Ensure temp directory exists
        const tempDir = path.join(__dirname, '../temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        // 1. Extract audio from video using FFmpeg
        ffmpeg(videoPath)
            .toFormat('wav')
            .audioChannels(1)
            .audioFrequency(16000)
            .on('end', async () => {
                console.log('Audio extraction complete.');

                try {
                    // 2. Upload the extracted audio to AssemblyAI
                    const audioData = fs.readFileSync(audioOutputPath);
                    const uploadResponse = await assembly.post('/upload', audioData);
                    const audio_url = uploadResponse.data.upload_url;
                    console.log('Audio uploaded successfully.');

                    // 3. Start the transcription process
                    const transcriptPayload = { audio_url };
                    if (language) {
                        transcriptPayload.language_code = language;
                    }
                    console.log('Starting transcription with payload:', transcriptPayload);
                    const transcriptResponse = await assembly.post('/transcript', transcriptPayload);
                    const transcriptId = transcriptResponse.data.id;
                    console.log(`Transcription started with ID: ${transcriptId}`);

                    // 4. Poll for the transcription result
                    while (true) {
                        const pollResponse = await assembly.get(`/transcript/${transcriptId}`);
                        const status = pollResponse.data.status;

                        if (status === 'completed') {
                            console.log('Transcription complete!');
                            // 5. Get the caption file directly in VTT format
                            const vttResponse = await assembly.get(`/transcript/${transcriptId}/vtt`);
                            
                            // 6. Save the VTT file locally first
                            const videoFileName = path.basename(videoPath, path.extname(videoPath));
                            const vttFileName = `caption_${videoFileName}.vtt`;
                            const subtitlesDir = path.join(__dirname, '../temp/subtitles');
                            if (!fs.existsSync(subtitlesDir)) fs.mkdirSync(subtitlesDir, { recursive: true });
                            const vttLocalPath = path.join(subtitlesDir, vttFileName);

                            fs.writeFileSync(vttLocalPath, vttResponse.data);
                            console.log(`VTT file saved locally at ${vttLocalPath}`);

                            // 7. Upload to S3 if configured
                            let s3Key = null;
                            let publicUrl = `/uploads/subtitles/${vttFileName}`; // fallback local URL

                            if (s3Service.config.isConfigured) {
                                try {
                                    // Generate S3 key based on video key or filename
                                    if (s3VideoKey) {
                                        s3Key = s3Service.generateCaptionKey(s3VideoKey);
                                    } else {
                                        s3Key = `subtitles/${vttFileName}`;
                                    }
                                    
                                    await s3Service.uploadLocalFile(vttLocalPath, s3Key, 'text/vtt');
                                    console.log(`✅ VTT uploaded to S3: ${s3Key}`);
                                    
                                    // Keep local file for now - cognitive mode processing needs it
                                    // It will be cleaned up by the controller after all processing is done
                                } catch (s3Error) {
                                    console.warn('⚠️ S3 upload failed, keeping local file:', s3Error.message);
                                    // Copy to permanent local storage
                                    const permanentSubtitlesDir = path.join(__dirname, '../uploads/subtitles');
                                    if (!fs.existsSync(permanentSubtitlesDir)) {
                                        fs.mkdirSync(permanentSubtitlesDir, { recursive: true });
                                    }
                                    const permanentPath = path.join(permanentSubtitlesDir, vttFileName);
                                    fs.copyFileSync(vttLocalPath, permanentPath);
                                    fs.unlinkSync(vttLocalPath);
                                }
                            } else {
                                // No S3, copy to permanent local storage
                                const permanentSubtitlesDir = path.join(__dirname, '../uploads/subtitles');
                                if (!fs.existsSync(permanentSubtitlesDir)) {
                                    fs.mkdirSync(permanentSubtitlesDir, { recursive: true });
                                }
                                const permanentPath = path.join(permanentSubtitlesDir, vttFileName);
                                fs.copyFileSync(vttLocalPath, permanentPath);
                                fs.unlinkSync(vttLocalPath);
                            }

                            // 8. Clean up audio file
                            try { 
                                if (fs.existsSync(audioOutputPath)) fs.unlinkSync(audioOutputPath); 
                            } catch (e) { /* ignore cleanup errors */ }
                            
                            // Return result object
                            resolve({
                                localUrl: publicUrl,
                                s3Key: s3Key,
                                isS3: !!s3Key && s3Service.config.isConfigured
                            });
                            return;
                        } else if (status === 'failed') {
                            throw new Error(`Transcription failed: ${pollResponse.data.error}`);
                        } else {
                            console.log('Transcription in progress, waiting...');
                            await delay(5000);
                        }
                    }
                } catch (error) {
                    try { fs.unlinkSync(audioOutputPath); } catch (e) {}
                    reject(error);
                }
            })
            .on('error', (err) => {
                console.error('FFmpeg error:', err);
                reject(err);
            })
            .save(audioOutputPath);
    });
}

module.exports = { generateCaptions };
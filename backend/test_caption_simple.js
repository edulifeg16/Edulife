// Simple test to verify caption generation works
const fs = require('fs');
const path = require('path');
const axios = require('axios');

async function testCaptions() {
    try {
        console.log('🎬 Testing caption generation...');
        
        // Check if FFmpeg path works
        const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
        console.log('FFmpeg path:', ffmpegPath);
        console.log('FFmpeg exists:', fs.existsSync(ffmpegPath));
        
        // Check AssemblyAI API key
        console.log('AssemblyAI API Key set:', !!process.env.ASSEMBLYAI_API_KEY);
        console.log('API Key length:', process.env.ASSEMBLYAI_API_KEY ? process.env.ASSEMBLYAI_API_KEY.length : 0);
        
        // Try to find any video file in the uploads folder
        const uploadsDir = path.join(__dirname, 'uploads', 'videos');
        if (fs.existsSync(uploadsDir)) {
            const files = fs.readdirSync(uploadsDir);
            console.log('Video files found:', files.length);
            console.log('Files:', files.slice(0, 3)); // Show first 3
        } else {
            console.log('❌ Uploads directory does not exist');
        }
        
        // Test a simple API request to the server
        const response = await axios.get('http://localhost:5000/api/courses');
        console.log('✅ Server is responding, courses found:', response.data.length);
        
        // Try the signed URL endpoint
        const testCourse = response.data[0];
        if (testCourse) {
            const signedResponse = await axios.get(`http://localhost:5000/api/courses/${testCourse._id}/signed`);
            console.log('✅ Signed URL endpoint working');
            
            const lesson = signedResponse.data.lessons[0];
            if (lesson) {
                console.log('First lesson data:', {
                    id: lesson._id,
                    title: lesson.title,
                    hasVideoUrl: !!lesson.videoUrl,
                    hasVideoS3Key: !!lesson.videoS3Key,
                    hasCaptionUrl: !!lesson.captionUrl,
                    hasCaptionS3Key: !!lesson.captionS3Key
                });
                
                // Try caption generation
                console.log('🎯 Attempting caption generation...');
                const captionResponse = await axios.post(
                    `http://localhost:5000/api/courses/${testCourse._id}/lessons/${lesson._id}/generate-subtitles`,
                    {}
                );
                console.log('✅ Caption generation response:', captionResponse.data);
            }
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
    }
}

// Load environment variables
require('dotenv').config();
testCaptions();
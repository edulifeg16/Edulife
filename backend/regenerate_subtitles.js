require('dotenv').config();
const mongoose = require('mongoose');
const Course = require('./models/Course');
const { generateSimplifiedSubtitles, extractTranscriptFromVTT } = require('./services/simplificationService');
const path = require('path');
const fs = require('fs');

async function regenerateSubtitles() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to database');

        const courseId = '691c9cab19404b5b49c6973b';
        const course = await Course.findById(courseId);
        
        if (!course) {
            console.error('Course not found');
            process.exit(1);
        }

        const lesson = course.lessons[0];
        console.log('Processing lesson:', lesson.title);
        console.log('Caption URL:', lesson.captionUrl);
        
        if (!lesson.captionUrl) {
            console.error('No caption URL found');
            process.exit(1);
        }

        // Get the VTT file path
        const vttFileName = path.basename(lesson.captionUrl);
        const vttFilePath = path.join(__dirname, 'uploads', 'subtitles', vttFileName);
        
        console.log('VTT file path:', vttFilePath);
        
        if (!fs.existsSync(vttFilePath)) {
            console.error('VTT file not found:', vttFilePath);
            process.exit(1);
        }

        // Extract transcript
        console.log('Extracting transcript...');
        const transcript = extractTranscriptFromVTT(vttFilePath);
        console.log('Transcript length:', transcript.length, 'characters');
        
        if (transcript.length < 50) {
            console.error('Transcript too short');
            process.exit(1);
        }

        // Generate simplified subtitles
        console.log('Generating simplified subtitles...');
        const simplifiedSubtitlesUrl = await generateSimplifiedSubtitles(transcript, vttFilePath);
        console.log('✅ Simplified subtitles generated:', simplifiedSubtitlesUrl);

        // Update the course in database
        lesson.cognitiveMode.simplifiedSubtitlesUrl = simplifiedSubtitlesUrl;
        await course.save();
        console.log('✅ Course updated in database');

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

regenerateSubtitles();

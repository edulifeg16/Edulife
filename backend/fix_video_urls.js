require('dotenv').config();
const mongoose = require('mongoose');
const Course = require('./models/Course');
const fs = require('fs');
const path = require('path');

async function fixVideoUrls() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to database');

        // Get all courses with disabilityType undefined or 'all'
        const courses = await Course.find({
            $or: [
                { disabilityType: 'all' },
                { disabilityType: { $exists: false } },
                { disabilityType: undefined }
            ]
        });

        console.log(`Found ${courses.length} universal courses to check`);

        for (const course of courses) {
            for (let i = 0; i < course.lessons.length; i++) {
                const lesson = course.lessons[i];
                
                // Check if cognitiveMode exists and has wrong URL
                if (lesson.cognitiveMode && lesson.cognitiveMode.simplifiedVideoUrl === '/uploads/undefined') {
                    // Extract original video filename
                    const originalVideoUrl = lesson.videoUrl;
                    if (originalVideoUrl) {
                        const filename = path.basename(originalVideoUrl, '.mp4');
                        const simplifiedFilename = `${filename}_simplified.mp4`;
                        const simplifiedPath = path.join(__dirname, 'uploads', 'videos', simplifiedFilename);
                        
                        // Check if simplified video exists
                        if (fs.existsSync(simplifiedPath)) {
                            const correctUrl = `/uploads/videos/${simplifiedFilename}`;
                            lesson.cognitiveMode.simplifiedVideoUrl = correctUrl;
                            console.log(`✅ Fixed: ${course._id} - Lesson ${i}: ${correctUrl}`);
                        } else {
                            console.log(`⚠️  Simplified video not found: ${simplifiedPath}`);
                        }
                    }
                }
            }
            
            await course.save();
        }

        console.log('✅ All courses fixed!');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

fixVideoUrls();

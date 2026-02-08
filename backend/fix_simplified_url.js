require('dotenv').config();
const mongoose = require('mongoose');
const Course = require('./models/Course');

async function fixUrl() {
    await mongoose.connect(process.env.MONGO_URI);
    
    const result = await Course.updateOne(
        { _id: '691c9cab19404b5b49c6973b' },
        { 
            $set: { 
                'lessons.0.cognitiveMode.simplifiedVideoUrl': '/uploads/videos/lessonVideos-1763482562820_simplified.mp4' 
            } 
        }
    );
    
    console.log('Updated:', result.modifiedCount);
    
    const course = await Course.findById('691c9cab19404b5b49c6973b');
    console.log('Verified simplifiedVideoUrl:', course.lessons[0].cognitiveMode?.simplifiedVideoUrl);
    console.log('Verified simplifiedSubtitlesUrl:', course.lessons[0].cognitiveMode?.simplifiedSubtitlesUrl);
    
    process.exit(0);
}

fixUrl();

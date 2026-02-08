const mongoose = require('mongoose');

const LessonSchema = new mongoose.Schema({
    title: { type: String, required: true },
    videoUrl: String,           // Local fallback URL
    videoS3Key: String,         // S3 object key for video
    textContent: String,        // For transcripts & simplified text
    audioLessonUrl: String,     // For visual impairment
    subtitlesUrl: String,
    captionUrl: { type: String },
    captionS3Key: String,       // S3 object key for captions
    
    // Cognitive Easy Mode content
    cognitiveMode: {
        simplifiedVideoUrl: String,            // Local fallback URL for simplified video
        simplifiedVideoS3Key: String,          // S3 object key for simplified video
        transcript: String,                    // Full transcript extracted from captions
        simplifiedSummary: String,             // Easy-to-read summary
        keyPoints: [String],                   // 5-7 bullet points in simple language
        simplifiedSubtitlesUrl: String,        // Local fallback URL for simplified VTT subtitles
        simplifiedSubtitlesS3Key: String,      // S3 object key for simplified subtitles
        processedAt: Date,                     // Timestamp of when content was generated
        processingStatus: String               // 'pending', 'processing', 'completed', 'failed'
    }
});

const CourseSchema = new mongoose.Schema({
    subject: { 
        type: String, 
        required: true,
        enum: ['English', 'Mathematics', 'Science', 'History', 'Geography']
    },
    standard: { 
        type: Number, 
        required: true,
        min: 7,
        max: 10
    },
    disabilityType: { 
        type: String, 
        required: false,  // Made optional for single-upload courses
        enum: ['visual', 'hearing', 'cognitive', 'mobility'] 
    },
    lessons: [LessonSchema]
}, {
    timestamps: true  // Adds createdAt and updatedAt fields
});

module.exports = mongoose.model('Course', CourseSchema);
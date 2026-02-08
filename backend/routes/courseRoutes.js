const express = require('express');
const router = express.Router();
const { 
    createCourse, 
    getCourses, 
    getStudentCourses, 
    getCourseById, 
    generateSubtitlesForLesson,
    getLessonContent,
    generateCognitiveContentForLesson,
    getCourseWithModes,
    deleteCourse,
    getLessonSignedUrls,
    getCourseWithSignedUrls
} = require('../controllers/courseController');
const { s3Upload } = require('../middleware/s3UploadMiddleware');
const Course = require('../models/Course');

// We'll add admin-only middleware later
// Use S3 upload middleware for course creation
router.route('/').post(s3Upload, createCourse).get(getCourses);

router.get('/student/:disabilityType/:standard', getStudentCourses);

// Search for course by lesson name (for voice commands)
router.get('/search/lesson/:searchTerm', async (req, res) => {
    try {
        const searchTerm = req.params.searchTerm.toLowerCase();
        console.log(`🔍 Backend search for: "${searchTerm}"`);
        
        const courses = await Course.find({});
        console.log(`📚 Total courses in DB: ${courses.length}`);
        
        for (const course of courses) {
            if (course.lessons && Array.isArray(course.lessons)) {
                for (let i = 0; i < course.lessons.length; i++) {
                    const lesson = course.lessons[i];
                    const normalizedLessonTitle = lesson.title.toLowerCase().replace(/[^a-z]/g, '');
                    const normalizedSearch = searchTerm.toLowerCase().replace(/[^a-z]/g, '');
                    
                    console.log(`  Comparing: "${normalizedLessonTitle}" with "${normalizedSearch}"`);
                    
                    if (normalizedLessonTitle.includes(normalizedSearch) || 
                        normalizedSearch.includes(normalizedLessonTitle)) {
                        
                        console.log(`✅ MATCH FOUND! Lesson: "${lesson.title}", Course ID: ${course._id}`);
                        
                        return res.json({
                            success: true,
                            courseId: course._id,
                            lessonIndex: i,
                            lessonTitle: lesson.title,
                            subject: course.subject,
                            standard: course.standard,
                            disabilityType: course.disabilityType
                        });
                    }
                }
            }
        }
        
        console.log(`❌ No match found for: "${searchTerm}"`);
        return res.status(404).json({
            success: false,
            message: `No course or lesson found matching "${req.params.searchTerm}"`
        });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ message: 'Search error', error: error.message });
    }
});

router.get('/:id', getCourseById);

// Get course with signed URLs for video playback (S3 support)
router.get('/:id/signed', getCourseWithSignedUrls);

// Get signed URLs for a specific lesson
router.get('/:courseId/lessons/:lessonIndex/signed-urls', getLessonSignedUrls);

// Get course with both normal and cognitive-easy modes
router.get('/:courseId/modes', getCourseWithModes);

// Get lesson content by mode (normal or cognitive-easy)
router.get('/:courseId/lessons/:lessonId/content', getLessonContent);

// On-demand caption generation for a lesson
router.post('/:courseId/lessons/:lessonId/generate-subtitles', generateSubtitlesForLesson);

// Manually generate cognitive-friendly content for a lesson
router.post('/:courseId/lessons/:lessonId/generate-cognitive-content', generateCognitiveContentForLesson);

// Delete a course
router.delete('/:id', deleteCourse);

/*
router.get('/', async (req, res) => {
    try {
        const courses = await Course.find({}); // Correct: finds everything
        res.json(courses);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching courses' });
    }
});
*/
module.exports = router;
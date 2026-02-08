const Course = require('./models/Course');
const mongoose = require('mongoose');
require('dotenv').config();

async function checkDatabase() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to database');
        
        const courses = await Course.find({});
        console.log('Total courses:', courses.length);
        
        courses.forEach((course, i) => {
            console.log(`\nCourse ${i+1}:`);
            console.log(`  Subject: ${course.subject}`);
            console.log(`  Standard: ${course.standard}`);
            console.log(`  Disability: ${course.disabilityType}`);
            console.log(`  Lessons: ${course.lessons.length}`);
            
            course.lessons.forEach((lesson, j) => {
                console.log(`    Lesson ${j+1}: "${lesson.title}"`);
            });
        });
        
        // Test search specifically for crop production
        console.log('\n=== SEARCH TEST ===');
        const searchTerm = 'crop production and management';
        console.log(`Searching for: "${searchTerm}"`);
        
        for (const course of courses) {
            if (course.lessons && Array.isArray(course.lessons)) {
                for (let i = 0; i < course.lessons.length; i++) {
                    const lesson = course.lessons[i];
                    const normalizedLessonTitle = lesson.title.toLowerCase().replace(/\s+/g, '');
                    const normalizedSearch = searchTerm.toLowerCase().replace(/\s+/g, '');
                    
                    console.log(`  Comparing: "${normalizedLessonTitle}" with "${normalizedSearch}"`);
                    
                    if (normalizedLessonTitle.includes(normalizedSearch) || 
                        normalizedSearch.includes(normalizedLessonTitle)) {
                        console.log(`  ✅ MATCH FOUND! Lesson: "${lesson.title}", Course ID: ${course._id}`);
                    }
                }
            }
        }
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkDatabase();
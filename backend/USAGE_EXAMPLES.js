/**
 * COGNITIVE MODE - QUICK START EXAMPLES
 * 
 * This file contains code examples for integrating the cognitive-friendly
 * content generation system into your frontend application.
 */

// ============================================================================
// EXAMPLE 1: Fetch Lesson Content with Mode Selection
// ============================================================================

async function fetchLessonContent(courseId, lessonId, mode = 'normal') {
  try {
    const response = await fetch(
      `http://localhost:5000/api/courses/${courseId}/lessons/${lessonId}/content?mode=${mode}`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching lesson content:', error);
    throw error;
  }
}

// Usage:
// const normalContent = await fetchLessonContent('courseId123', 'lessonId456', 'normal');
// const easyContent = await fetchLessonContent('courseId123', 'lessonId456', 'cognitive-easy');


// ============================================================================
// EXAMPLE 2: React Component with Mode Toggle
// ============================================================================

import React, { useState, useEffect } from 'react';

function LessonViewer({ courseId, lessonId }) {
  const [mode, setMode] = useState('normal');
  const [lessonData, setLessonData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadLesson = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(
          `/api/courses/${courseId}/lessons/${lessonId}/content?mode=${mode}`
        );
        
        if (!response.ok) {
          throw new Error('Failed to load lesson content');
        }
        
        const data = await response.json();
        setLessonData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadLesson();
  }, [courseId, lessonId, mode]);

  const toggleMode = () => {
    setMode(prevMode => prevMode === 'normal' ? 'cognitive-easy' : 'normal');
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!lessonData) return <div>No content available</div>;

  return (
    <div className="lesson-viewer">
      <h2>{lessonData.title}</h2>
      
      {/* Mode Toggle Button */}
      <button onClick={toggleMode} className="mode-toggle-btn">
        {mode === 'normal' ? '🧠 Switch to Easy Mode' : '📚 Switch to Normal Mode'}
      </button>

      {/* Video Player */}
      <video controls width="100%">
        <source src={lessonData.videoUrl} type="video/mp4" />
        {lessonData.content.subtitlesUrl && (
          <track
            kind="captions"
            src={lessonData.content.subtitlesUrl}
            srcLang="en"
            label="English"
            default
          />
        )}
      </video>

      {/* Content Display */}
      {mode === 'cognitive-easy' ? (
        <div className="cognitive-easy-content">
          <div className="summary-section">
            <h3>📝 Simple Summary</h3>
            <p className="easy-text">{lessonData.content.summary}</p>
          </div>

          <div className="keypoints-section">
            <h3>🎯 Key Points</h3>
            <ul className="easy-list">
              {lessonData.content.keyPoints?.map((point, index) => (
                <li key={index}>{point}</li>
              ))}
            </ul>
          </div>

          {lessonData.content.transcript && (
            <details>
              <summary>📄 Full Transcript</summary>
              <p className="transcript">{lessonData.content.transcript}</p>
            </details>
          )}
        </div>
      ) : (
        <div className="normal-content">
          <div className="text-content">
            <h3>Lesson Content</h3>
            <p>{lessonData.content.textContent}</p>
          </div>
          
          {lessonData.content.audioLessonUrl && (
            <div className="audio-section">
              <h3>🔊 Audio Lesson</h3>
              <audio controls src={lessonData.content.audioLessonUrl}></audio>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default LessonViewer;


// ============================================================================
// EXAMPLE 3: Manually Generate Cognitive Content for Existing Lesson
// ============================================================================

async function generateCognitiveContent(courseId, lessonId) {
  try {
    const response = await fetch(
      `http://localhost:5000/api/courses/${courseId}/lessons/${lessonId}/generate-cognitive-content`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Add auth token if required
          // 'Authorization': `Bearer ${token}`
        }
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.msg || 'Failed to generate cognitive content');
    }

    const result = await response.json();
    console.log('Cognitive content generated:', result);
    return result;
    
  } catch (error) {
    console.error('Error generating cognitive content:', error);
    throw error;
  }
}

// Usage:
// await generateCognitiveContent('courseId123', 'lessonId456');


// ============================================================================
// EXAMPLE 4: Fetch Course with Both Modes for Comparison
// ============================================================================

async function getCourseWithAllModes(courseId) {
  try {
    const response = await fetch(
      `http://localhost:5000/api/courses/${courseId}/modes`
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch course');
    }
    
    const courseData = await response.json();
    return courseData;
    
  } catch (error) {
    console.error('Error fetching course with modes:', error);
    throw error;
  }
}

// Usage example - display both modes side by side:
/*
const course = await getCourseWithAllModes('courseId123');

course.lessons.forEach(lesson => {
  console.log('Lesson:', lesson.title);
  console.log('Normal Mode:', lesson.normalMode);
  console.log('Cognitive Easy Mode:', lesson.cognitiveEasyMode);
});
*/


// ============================================================================
// EXAMPLE 5: Admin Panel - Batch Generate Cognitive Content
// ============================================================================

async function batchGenerateCognitiveContent(courseId, lessonIds) {
  const results = [];
  
  for (const lessonId of lessonIds) {
    try {
      console.log(`Generating content for lesson ${lessonId}...`);
      const result = await generateCognitiveContent(courseId, lessonId);
      results.push({ lessonId, success: true, data: result });
      
      // Add delay to avoid API rate limits
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      results.push({ lessonId, success: false, error: error.message });
    }
  }
  
  return results;
}

// Usage:
// const lessonIds = ['lesson1', 'lesson2', 'lesson3'];
// const results = await batchGenerateCognitiveContent('courseId123', lessonIds);
// console.log('Batch generation results:', results);


// ============================================================================
// EXAMPLE 6: CSS Styles for Cognitive-Easy Mode
// ============================================================================

const cognitiveEasyCss = `
/* Easy Mode Styling - High readability for cognitive impairments */
.cognitive-easy-content {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  background: #f9f9f9;
}

.easy-text {
  font-size: 20px;
  line-height: 1.8;
  font-family: 'Arial', sans-serif;
  color: #333;
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.easy-list {
  list-style: none;
  padding: 0;
}

.easy-list li {
  font-size: 18px;
  line-height: 1.6;
  padding: 15px;
  margin: 10px 0;
  background: white;
  border-left: 4px solid #4CAF50;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.easy-list li::before {
  content: "✓ ";
  color: #4CAF50;
  font-weight: bold;
  margin-right: 10px;
}

.mode-toggle-btn {
  padding: 12px 24px;
  font-size: 16px;
  background: #2196F3;
  color: white;
  border: none;
  border-radius: 25px;
  cursor: pointer;
  margin: 20px 0;
  transition: background 0.3s;
}

.mode-toggle-btn:hover {
  background: #1976D2;
}

.summary-section,
.keypoints-section {
  margin: 30px 0;
}

.summary-section h3,
.keypoints-section h3 {
  font-size: 24px;
  color: #333;
  margin-bottom: 15px;
}
`;


// ============================================================================
// EXAMPLE 7: Student Dashboard - Mode Preference Storage
// ============================================================================

// Save user's mode preference
function saveModePreference(mode) {
  localStorage.setItem('contentMode', mode);
}

// Load user's mode preference
function loadModePreference() {
  return localStorage.getItem('contentMode') || 'normal';
}

// Student dashboard component
function StudentDashboard() {
  const [preferredMode, setPreferredMode] = useState(loadModePreference());

  const handleModeChange = (newMode) => {
    setPreferredMode(newMode);
    saveModePreference(newMode);
  };

  return (
    <div className="student-dashboard">
      <div className="settings">
        <h3>Content Display Mode</h3>
        <select 
          value={preferredMode} 
          onChange={(e) => handleModeChange(e.target.value)}
        >
          <option value="normal">Normal Mode</option>
          <option value="cognitive-easy">Easy Reading Mode</option>
        </select>
      </div>
      
      {/* Rest of dashboard content */}
    </div>
  );
}


// ============================================================================
// EXAMPLE 8: Testing Helper Function
// ============================================================================

async function testCognitiveMode() {
  console.log('🧪 Testing Cognitive Mode Implementation...\n');

  try {
    // Test 1: Fetch all courses
    console.log('1️⃣ Fetching all courses...');
    const coursesResponse = await fetch('http://localhost:5000/api/courses');
    const courses = await coursesResponse.json();
    console.log(`✅ Found ${courses.length} courses\n`);

    if (courses.length === 0) {
      console.log('⚠️ No courses found. Please upload a course first.');
      return;
    }

    // Test 2: Get first cognitive course
    const cognitiveCourse = courses.find(c => c.disabilityType === 'cognitive');
    
    if (!cognitiveCourse) {
      console.log('⚠️ No cognitive courses found.');
      return;
    }

    console.log(`2️⃣ Testing with course: ${cognitiveCourse.subject} (Grade ${cognitiveCourse.standard})`);

    if (cognitiveCourse.lessons.length === 0) {
      console.log('⚠️ Course has no lessons.');
      return;
    }

    const testLesson = cognitiveCourse.lessons[0];
    console.log(`   Lesson: ${testLesson.title}\n`);

    // Test 3: Fetch normal mode content
    console.log('3️⃣ Fetching Normal Mode content...');
    const normalContent = await fetchLessonContent(
      cognitiveCourse._id, 
      testLesson._id, 
      'normal'
    );
    console.log('✅ Normal mode loaded\n');

    // Test 4: Fetch cognitive-easy mode content
    console.log('4️⃣ Fetching Cognitive-Easy Mode content...');
    try {
      const easyContent = await fetchLessonContent(
        cognitiveCourse._id, 
        testLesson._id, 
        'cognitive-easy'
      );
      console.log('✅ Cognitive-easy mode loaded');
      console.log(`   Summary length: ${easyContent.content.summary?.length || 0} characters`);
      console.log(`   Key points: ${easyContent.content.keyPoints?.length || 0}`);
      console.log(`   Simplified subtitles: ${easyContent.content.simplifiedSubtitlesUrl || 'Not available'}\n`);
    } catch (error) {
      console.log('⚠️ Cognitive content not available yet');
      console.log('   You can generate it using the generate-cognitive-content endpoint\n');
    }

    // Test 5: Get course with all modes
    console.log('5️⃣ Fetching course with all modes...');
    const courseWithModes = await getCourseWithAllModes(cognitiveCourse._id);
    console.log('✅ Course with modes loaded');
    console.log(`   Lessons with cognitive content: ${
      courseWithModes.lessons.filter(l => l.cognitiveEasyMode).length
    }/${courseWithModes.lessons.length}\n`);

    console.log('✅ All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run tests:
// testCognitiveMode();


// ============================================================================
// EXPORT FOR USE IN OTHER FILES
// ============================================================================

export {
  fetchLessonContent,
  generateCognitiveContent,
  getCourseWithAllModes,
  batchGenerateCognitiveContent,
  saveModePreference,
  loadModePreference,
  testCognitiveMode
};

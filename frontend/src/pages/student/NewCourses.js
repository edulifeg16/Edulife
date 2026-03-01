import React, { useState, useEffect, useContext, useRef, useCallback } from 'react'; 
import api from '../../api/apiConfig';
import { Link } from 'react-router-dom';
import StudentSidebar from '../../components/layout/StudentSidebar';
import { AuthContext } from '../../context/AuthContext';
import { ThemeContext } from '../../context/ThemeContext';

// Subject Card Component
const SubjectCard = ({ subject, onClick }) => {
  const subjectColors = {
    'English': '#45B7D1',
    'Mathematics': '#96CEB4',
    'Science': '#88D8B0',
    'History': '#FFBE0B',
    'Geography': '#4DA167'
  };

  return (
    <div 
      onClick={onClick}
      style={{ 
        backgroundColor: '#fff', 
        padding: '20px', 
        borderRadius: '12px', 
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)', 
        cursor: 'pointer',
        transition: 'transform 0.2s, box-shadow 0.2s',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '15px',
        height: '200px',
        position: 'relative',
        overflow: 'hidden'
      }}
      onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
      onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
    >
      <div style={{
        width: '100%',
        height: '60%',
        backgroundColor: subjectColors[subject],
        position: 'absolute',
        top: 0,
        left: 0,
        borderRadius: '12px 12px 0 0'
      }} />
      <div style={{
        position: 'relative',
        zIndex: 1,
        marginTop: 'auto',
        marginBottom: 'auto',
        textAlign: 'center'
      }}>
        <h3 style={{ 
          margin: '0',
          color: '#fff',
          fontSize: '24px',
          fontWeight: '600'
        }}>{subject}</h3>
      </div>
    </div>
  );
};

const normalizeUnitTitle = (text) => text.replace(/\s+/g, '').toLowerCase();

// Main component for "New Courses" page
const NewCourses = () => {
  const { user } = useContext(AuthContext);
  const { theme, fontSize } = useContext(ThemeContext);
  const [courses, setCourses] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Use refs to avoid infinite loops in useEffect dependencies
  const coursesRef = useRef([]);
  const selectedSubjectRef = useRef(null);

  // Update refs when state changes
  coursesRef.current = courses;
  selectedSubjectRef.current = selectedSubject;

  const subjects = [
    'English', 'Mathematics',
    'Science', 'History', 'Geography'
  ];

  // Voice: Go to subject
  useEffect(() => {
    const handleVoiceSubject = (e) => {
      const subject = e.detail;
      setSelectedSubject(subject);
    };
    window.addEventListener('voice-subject-select', handleVoiceSubject);

    const params = new URLSearchParams(window.location.search);
    const subjectFromQuery = params.get('subject');
    if (subjectFromQuery) setSelectedSubject(subjectFromQuery);

    return () => window.removeEventListener('voice-subject-select', handleVoiceSubject);
  }, []);

  // Voice: Back to subjects (only when in a subject)
  useEffect(() => {
    const handleVoiceBack = () => {
      console.log('🎤 Current selectedSubject:', selectedSubject);
      
      // Only respond if we're currently viewing a specific subject
      if (!selectedSubject) {
        console.log('🎤 Voice back ignored: already on subjects page');
        return;
      }
      
      console.log('🎤 NewCourses processing voice-back-to-subjects: navigating back to subjects');
      
      // Clear selected subject to show subjects grid
      setSelectedSubject(null);
      
      // Also update URL to remove subject query parameter
      const currentUrl = new URL(window.location);
      currentUrl.searchParams.delete('subject');
      window.history.pushState({}, '', currentUrl.pathname + currentUrl.search);
      
      // Provide spoken confirmation (but let VoiceAssistant handle the main speech)
      console.log('🎤 Successfully cleared subject and updated URL');
    };

    window.addEventListener('voice-back-to-subjects', handleVoiceBack);
    return () => {
      console.log('🎤 NewCourses removing voice-back-to-subjects listener');
      window.removeEventListener('voice-back-to-subjects', handleVoiceBack);
    };
  }, [selectedSubject]); // Include selectedSubject in deps to check current state

  // Create stable voice handlers using useCallback
  const handleVoiceStartLesson = useCallback((e) => {
    const unitTitle = e.detail;
    if (!selectedSubjectRef.current) {
      alert('Please select a subject first');
      return;
    }

    const selectedCourse = coursesRef.current.find(c => c.subject === selectedSubjectRef.current);
    if (!selectedCourse || !selectedCourse.lessons) return;

    const normalizedTarget = normalizeUnitTitle(unitTitle);
    const lessonIndex = selectedCourse.lessons.findIndex(
      (lesson) => normalizeUnitTitle(lesson.title) === normalizedTarget
    );

    if (lessonIndex === -1) {
      alert(`${unitTitle} not found for ${selectedSubjectRef.current}`);
      return;
    }

    const lessonLink = `/course/${selectedCourse._id}?lesson=${lessonIndex}`;
    window.location.href = lessonLink;
  }, []);

  const handleVoiceSearchCourse = useCallback((e) => {
    const searchTerm = e.detail;
    console.log(' Voice Search Started');
    console.log('Search term received:', searchTerm);
    console.log('Total courses loaded:', coursesRef.current.length);
    
    if (!coursesRef.current || coursesRef.current.length === 0) {
      console.log('No courses loaded yet');
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance('No courses are loaded. Please wait a moment and try again.');
      window.speechSynthesis.speak(utterance);
      return;
    }

    // Normalize the search term once
    const normalizedSearchTerm = normalizeUnitTitle(searchTerm);
    console.log('Normalized search term:', normalizedSearchTerm);
    
    // Search through all courses and lessons
    for (const course of coursesRef.current) {
      console.log(`\n📚 Checking course in subject: ${course.subject}`);
      console.log(`   Lessons count: ${course.lessons ? course.lessons.length : 0}`);
      
      if (course.lessons && Array.isArray(course.lessons)) {
        for (let i = 0; i < course.lessons.length; i++) {
          const lesson = course.lessons[i];
          const lessonTitle = lesson.title || '';
          const normalizedLessonTitle = normalizeUnitTitle(lessonTitle);
          
          console.log(`   📝 Lesson ${i}: "${lessonTitle}"`);
          console.log(`      Normalized: "${normalizedLessonTitle}"`);
          console.log(`      Match: ${normalizedLessonTitle.includes(normalizedSearchTerm) || normalizedSearchTerm.includes(normalizedLessonTitle)}`);
          
          // Check if lesson title contains the search term (flexible matching)
          if (normalizedLessonTitle.includes(normalizedSearchTerm) || 
              normalizedSearchTerm.includes(normalizedLessonTitle)) {
            
            console.log(`\n✅ MATCH FOUND!`);
            console.log(`   Lesson: ${lesson.title}`);
            console.log(`   Course ID: ${course._id}`);
            console.log(`   Lesson Index: ${i}`);
            console.log(`   Subject: ${course.subject}`);
            
            // Speak confirmation BEFORE navigating
            const message = `Opening ${lesson.title} from ${course.subject}`;
            console.log(`   Speaking: "${message}"`);
            
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(message);
            utterance.onend = () => {
              console.log('Speech finished, now navigating...');
              // Navigate AFTER speaking
              const lessonLink = `/course/${course._id}?lesson=${i}`;
              console.log('Navigation link:', lessonLink);
              window.location.href = lessonLink;
            };
            window.speechSynthesis.speak(utterance);
            return;
          }
        }
      } else {
        console.log(`   ⚠️  No lessons in this course`);
      }
    }
    
    // If no match found
    console.log(`\n❌ No match found for: "${searchTerm}"`);
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(`Sorry, I couldn't find a course or lesson called ${searchTerm}`);
    window.speechSynthesis.speak(utterance);
  }, []);

  // Voice: Start Unit X
  useEffect(() => {
    window.addEventListener('voice-start-lesson', handleVoiceStartLesson);
    window.addEventListener('voice-search-course', handleVoiceSearchCourse);
    
    return () => {
      window.removeEventListener('voice-start-lesson', handleVoiceStartLesson);
      window.removeEventListener('voice-search-course', handleVoiceSearchCourse);
    };
  }, [handleVoiceStartLesson, handleVoiceSearchCourse]);

  useEffect(() => {
    if (user) {
      const fetchCourses = async () => {
        try {
          console.log(`📚 Fetching courses for: ${user.disabilityType}, Standard: ${user.standard}`);
          const res = await api.get(`/courses/student/${user.disabilityType}/${user.standard}`);
          console.log('📚 Courses fetched:', res.data);
          if (Array.isArray(res.data)) {
            setCourses(res.data);
            // Store courses globally so voice commands can access them
            window.__EDULIFE_COURSES__ = res.data;
            window.__EDULIFE_NORMALIZE_TITLE__ = normalizeUnitTitle;
            console.log(`✅ Set ${res.data.length} courses to state and window`);
          }
        } catch (error) {
          console.error("Failed to fetch student courses", error);
        } finally {
          setLoading(false);
        }
      };
      fetchCourses();
    } else {
      setLoading(false);
    }
  }, [user]);

  return (
    <div className={`dashboard-layout theme-${theme} font-${fontSize}`}>
      <StudentSidebar />
      <main className="main-content">
        {loading ? (
          <p style={{ textAlign: 'center' }}>Loading courses...</p>
        ) : selectedSubject ? (
          <>
            <button
              onClick={() => setSelectedSubject(null)}
              style={{
                padding: '8px 16px',
                backgroundColor: '#f0f0f0',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                marginBottom: '20px'
              }}
            >
              ← Back to Subjects
            </button>
            <h1>{selectedSubject}</h1>
            <div style={{ marginTop: '20px' }}>
              {courses.filter(course => course.subject === selectedSubject).map(course => (
                <div key={course._id} style={{
                  backgroundColor: '#fff',
                  padding: '20px',
                  borderRadius: '8px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  marginBottom: '20px'
                }}>
                  <h2>{course.subject}</h2>
                  {course.lessons.map((lesson, index) => (
                    <div key={lesson._id} style={{
                      backgroundColor: '#f8f9fa',
                      padding: '15px',
                      borderRadius: '6px',
                      marginBottom: '10px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span>{lesson.title}</span>
                      <Link
                        to={`/course/${course._id}?lesson=${index}`}
                        style={{
                          backgroundColor: '#4CAF50',
                          color: 'white',
                          padding: '8px 16px',
                          borderRadius: '4px',
                          textDecoration: 'none'
                        }}
                      >
                        Start Lesson
                      </Link>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <h1>Select a Subject</h1>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', 
              gap: '20px',
              marginTop: '30px' 
            }}>
              {subjects.map(subject => (
                <SubjectCard 
                  key={subject} 
                  subject={subject} 
                  onClick={() => setSelectedSubject(subject)}
                />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default NewCourses;

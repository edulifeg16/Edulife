import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../../api/apiConfig';
import StudentSidebar from '../../components/layout/StudentSidebar';
import { AuthContext } from '../../context/AuthContext';
import CourseVideoPlayer from '../../components/course/CourseVideoPlayer';
import { getCourseWithSignedUrls } from '../../api/courseApi';

const CourseViewer = () => {
  const { courseId } = useParams();
  const searchParams = new URLSearchParams(window.location.search);
  const resumeLessonIndex = searchParams.get('lesson');
  
  const { user, token, login } = useContext(AuthContext);
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [quizId, setQuizId] = useState(null);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [loading, setLoading] = useState(true);

  const videoRef = useRef(null);

  // Track physical user interaction
  const [userInteracted, setUserInteracted] = useState(false);
  
  // Track mute status feedback
  const [muteStatus, setMuteStatus] = useState('');
  //
  //
  useEffect(() => {
    const unlock = () => setUserInteracted(true);

    window.addEventListener("click", unlock);
    window.addEventListener("keydown", unlock);

    return () => {
      window.removeEventListener("click", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  // Clear mute status after 2 seconds
  useEffect(() => {
    if (muteStatus) {
      const timer = setTimeout(() => setMuteStatus(''), 2000);
      return () => clearTimeout(timer);
    }
  }, [muteStatus]);

  // SAFE PLAY — fixes autoplay blocked issues
  const safePlay = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      if (!userInteracted) {
        // Chrome allows muted play before interaction
        video.muted = true;
      }

      await video.play();

      // Unmute ONLY after real user interaction
      if (userInteracted) {
        video.muted = false;
      }

    } catch (err) {
      console.warn("Autoplay prevented:", err);
    }
  }, [userInteracted]);

  // VOICE COMMAND HANDLERS
  useEffect(() => {
    const playHandler = () => safePlay();

    const pauseHandler = () => {
      const video = videoRef.current;
      if (video) video.pause();
    };

    const muteHandler = () => {
      const video = videoRef.current;
      if (video) {
        video.muted = true;
        setMuteStatus('🔇 Video Muted');
        console.log('🎤 CourseViewer: Video muted');
      }
    };

    const unmuteHandler = () => {
      const video = videoRef.current;
      if (video) {
        video.muted = false;
        // Ensure reasonable volume
        if (video.volume === 0) {
          video.volume = 0.8;
        }
        setMuteStatus('🔊 Video Unmuted');
        console.log('🎤 CourseViewer: Video unmuted');
      }
    };


    const quizHandler = () => {
      if (quizId) navigate(`/quiz/${quizId}`);
      else {
        const utter = new SpeechSynthesisUtterance('No quiz available for this lesson');
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utter);
      }
    };

    // Register event listeners
    window.addEventListener("voice-video-play", playHandler);
    window.addEventListener("voice-video-pause", pauseHandler);
    window.addEventListener("voice-video-mute", muteHandler);
    window.addEventListener("voice-video-unmute", unmuteHandler);
    window.addEventListener("voice-take-quiz", quizHandler);

    // Cleanup
    return () => {
      window.removeEventListener("voice-video-play", playHandler);
      window.removeEventListener("voice-video-pause", pauseHandler);
      window.removeEventListener("voice-video-mute", muteHandler);
      window.removeEventListener("voice-video-unmute", unmuteHandler);
      window.removeEventListener("voice-take-quiz", quizHandler);
    };
  }, [userInteracted, navigate, quizId, safePlay]);


  // ✅ Fetch Course & Quiz Data
  useEffect(() => {
    const fetchCourseAndQuiz = async () => {
      try {
        // Use signed URL endpoint for S3 support
        const courseData = await getCourseWithSignedUrls(courseId, user?.disabilityType);
        setCourse(courseData);

        // Determine lesson
        let initialLesson = null;
        if (resumeLessonIndex && courseData.lessons?.[resumeLessonIndex]) {
          initialLesson = courseData.lessons[resumeLessonIndex];
        } else if (courseData.lessons?.length > 0) {
          initialLesson = courseData.lessons[0];
        }

        if (initialLesson) setSelectedLesson(initialLesson);

        // ✅ Fetch quizzes safely (check if courseId exists)
        const quizRes = await api.get(`/quizzes`);
        const validQuiz = quizRes.data.find(
          (q) =>
            q.courseId && // make sure courseId is not null
            q.courseId._id === courseId &&
            q.lessonId === initialLesson?._id
        );
        if (validQuiz) setQuizId(validQuiz._id);
      } catch (error) {
        console.error('❌ Failed to fetch course data', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCourseAndQuiz();
  }, [courseId, resumeLessonIndex, user?.disabilityType]);

  useEffect(() => {
    const userId = user?._id;
    if (!userId || !course || !selectedLesson) return;

    const markStarted = async () => {
      try {
        await api.post(`/users/${userId}/course-start`, { courseId });
        const updated = await api.get(`/users/${userId}`);
        login(updated.data, token);
      } catch (e) {
        console.warn('⚠️ Failed to mark course started', e);
      }
    };
    markStarted();
  }, [user?._id, course, selectedLesson, courseId, login, token]);

  // ✅ Mark course as complete when on last lesson
  useEffect(() => {
    const userId = user?._id;
    if (!userId || !course || !selectedLesson) return;

    const isLastLesson = (lessonId) => {
      const lessons = course.lessons || [];
      const last = lessons[lessons.length - 1];
      return last && String(last._id) === String(lessonId);
    };

    if (isLastLesson(selectedLesson._id)) {
      (async () => {
        try {
          await api.post(`/users/${userId}/course-complete`, { courseId });
          const updated = await api.get(`/users/${userId}`);
          login(updated.data, token);
        } catch (e) {
          console.warn('⚠️ Failed to mark course complete', e);
        }
      })();
    }
  }, [user?._id, course, selectedLesson, courseId, login, token]);

  // Voice command: Take quiz
  useEffect(() => {
    const handleVoiceTakeQuiz = () => {
      if (quizId) {
        console.log('🎤 CourseViewer: Taking quiz via voice command', { quizId });
        navigate(`/quiz/${quizId}`);
      } else {
        // Simple TTS feedback
        try {
          window.speechSynthesis.cancel();
          const utter = new SpeechSynthesisUtterance('No quiz available for this lesson');
          window.speechSynthesis.speak(utter);
        } catch (e) {
          console.warn('TTS failed', e);
        }
      }
    };

    window.addEventListener('voice-take-quiz', handleVoiceTakeQuiz);
    return () => window.removeEventListener('voice-take-quiz', handleVoiceTakeQuiz);
  }, [quizId, navigate]);

  if (loading)
    return (
      <div className="dashboard-layout">
        <StudentSidebar />
        <main className="main-content">
          <h1>Loading Course...</h1>
        </main>
      </div>
    );

  if (!course || !course.lessons)
    return (
      <div className="dashboard-layout">
        <StudentSidebar />
        <main className="main-content">
          <h1>Course not found or has no lessons.</h1>
        </main>
      </div>
    );

  return (
    <div className="dashboard-layout">
      <StudentSidebar />
      <main
        className="main-content"
        style={{ display: 'flex', gap: '30px', alignItems: 'flex-start' }}
      >
        <div style={{ flex: 3 }}>
          <h1>{course.subject}</h1>
          {selectedLesson ? (
            <div>
              <h2
                style={{
                  color: '#374151',
                  borderBottom: '1px solid #ddd',
                  paddingBottom: '10px',
                }}
              >
                {selectedLesson.title}
              </h2>
              <CourseVideoPlayer
                lesson={selectedLesson}
                courseId={courseId}
                videoRef={videoRef} 
                disabilityType={course.disabilityType}
                userDisabilityType={user?.disabilityType}
                onUpdateLesson={(updated) => setSelectedLesson(updated)}
              />
            </div>
          ) : (
            <p>Select a lesson from the list on the right to begin.</p>
          )}
        </div>

        <div
          style={{
            flex: 1,
            backgroundColor: '#fff',
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            height: 'fit-content',
          }}
        >
          <h3>Course Content</h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {course.lessons.map((lesson, index) => (
              <li
                key={lesson._id || index}
                onClick={() => setSelectedLesson(lesson)}
                style={{
                  padding: '10px',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  backgroundColor:
                    selectedLesson && selectedLesson._id === lesson._id
                      ? '#D1FAE5'
                      : 'transparent',
                  fontWeight:
                    selectedLesson && selectedLesson._id === lesson._id
                      ? 'bold'
                      : 'normal',
                }}
              >
                {lesson.title}
              </li>
            ))}
          </ul>

          {quizId && (
            <div
              style={{
                marginTop: '20px',
                borderTop: '1px solid #eee',
                paddingTop: '15px',
              }}
            >
              <Link
                to={`/quiz/${quizId}`}
                style={{
                  display: 'block',
                  textAlign: 'center',
                  backgroundColor: '#3B82F6',
                  color: 'white',
                  padding: '12px',
                  borderRadius: '5px',
                  textDecoration: 'none',
                  fontWeight: 'bold',
                }}
              >
                Take the Quiz
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default CourseViewer;

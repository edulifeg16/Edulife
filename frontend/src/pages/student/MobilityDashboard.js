import React, { useState, useEffect, useContext } from 'react';
import api from '../../api/apiConfig';
import { Link } from 'react-router-dom';
import StudentSidebar from '../../components/layout/StudentSidebar';
import { AuthContext } from '../../context/AuthContext';
import { ThemeContext } from '../../context/ThemeContext';
import { PAGES_COMMANDS } from '../../components/voice/voiceCommands';

const findNextLessonId = (course, completedLessons = []) => {
    if (!course || !course.modules) return null;
    const completedSet = new Set(completedLessons);
    for (const module of course.modules) {
        if (module.lessons) {
            for (const lesson of module.lessons) {
                if (!completedSet.has(lesson._id)) {
                    return lesson._id;
                }
            }
        }
    }
    return null;
};

const MobilityDashboard = () => {
    const { user } = useContext(AuthContext);
    const { theme, fontSize } = useContext(ThemeContext);
    const [allCoursesCount, setAllCoursesCount] = useState(0);
    const [quizzesCount, setQuizzesCount] = useState(0);
    const [lastActive, setLastActive] = useState(null);
    const [resumeLink, setResumeLink] = useState('/new-courses');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user || !user._id) {
            setLoading(false);
            return;
        }

        const fetchData = async () => {
            try {
                const [coursesRes, quizzesRes, userRes] = await Promise.all([
                    api.get(`/courses/student/${user.disabilityType}/${user.standard}`),
                    api.get(`/quizzes`),
                    api.get(`/users/${user._id}`)
                ]);

                // Filter courses for mobility
                const filteredCourses = (coursesRes.data || []).filter(
                    course => course.disabilityType === 'mobility'
                );

                // For quizzes, just count all quizzes since they're already specific to mobility
                const quizzes = quizzesRes.data || [];
                console.log('Available quizzes:', quizzes);

                // Set the correct counts
                console.log('Setting courses count:', filteredCourses.length);
                console.log('Setting quizzes count:', quizzes.length);
                setAllCoursesCount(filteredCourses.length);
                setQuizzesCount(quizzes.length);

                const progress = userRes.data.courseProgress || [];

                const last = progress.find(p => p.status === 'ongoing' || p.status === 'incomplete');
                
                if (last && last.courseId) {
                    setLastActive(last);
                    const nextLessonId = findNextLessonId(last.courseId, last.completedLessons);
                    setResumeLink(nextLessonId ? `/course/${last.courseId._id}?lesson=${nextLessonId}` : `/course/${last.courseId._id}`);
                }
            } catch (err) {
                console.error('Failed to load dashboard data', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user]);

    return (
        <div className={`dashboard-layout theme-${theme} font-${fontSize}`}>
            <StudentSidebar />
            <main className="main-content">
                <h1>Immobility Accessibility Dashboard</h1>
                <p>Welcome, {user?.name}! This learning space is designed for easy navigation using a keyboard or other input devices.</p>

                {/* --- Accessibility Controls Section --- */}
                <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', marginTop: '20px' }}>
                    <h2 style={{ marginTop: 0 }}>Keyboard Navigation Guide ⌨️</h2>
                    <ul style={{ paddingLeft: '20px', margin: 0 }}>
                        <li>Use the **Tab** key to move between buttons, links, and form fields.</li>
                        <li>Press **Enter** to activate a selected link or button.</li>
                        <li>Use the **Spacebar** to toggle checkboxes or play/pause videos.</li>
                        <li>Use the **Arrow Keys** (Up/Down) to scroll the page.</li>
                    </ul>
                </div>

                {/* --- Stats Cards ---
                <div style={{ display: 'flex', gap: '20px', marginTop: '30px', flexWrap: 'wrap' }}>
                    <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', minWidth: '200px' }}>
                        <h3 style={{ margin: 0 }}>Courses Available</h3>
                        <p style={{ fontSize: '28px', margin: '10px 0' }}>{loading ? '...' : allCoursesCount}</p>
                    </div>
                    <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', minWidth: '200px' }}>
                        <h3 style={{ margin: 0 }}>Quizzes Available</h3>
                        <p style={{ fontSize: '28px', margin: '10px 0' }}>{loading ? '...' : quizzesCount}</p>
                    </div>
                    <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', minWidth: '200px' }}>
                        <h3 style={{ margin: 0 }}>Total Content</h3>
                        <p style={{ fontSize: '28px', margin: '10px 0' }}>{loading ? '...' : allCoursesCount + quizzesCount}</p>
                    </div>
                </div> */}

                {/* --- Resume Section --- */}
                <div style={{ marginTop: '40px' }}>
                    <h2>Resume where you left off</h2>
                    {loading ? <p>Loading your progress...</p> : lastActive ? (
                        <div style={{ background: '#fff', padding: '20px', borderRadius: '8px' }}>
                            <h3 style={{ margin: 0 }}>{lastActive.courseId?.title || 'Your course'}</h3>
                            <p>Status: {lastActive.status}</p>
                            <Link to={resumeLink} style={{ display: 'inline-block', marginTop: '10px', backgroundColor: '#F59E0B', color: '#fff', padding: '10px 15px', borderRadius: '6px', textDecoration: 'none' }}>
                                Continue Learning
                            </Link>
                        </div>
                    ) : (
                        <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
                            <p>You have no active courses. Why not start a new one?</p>
                            <Link to="/new-courses" style={{ display: 'inline-block', marginTop: '10px', backgroundColor: '#4CAF50', color: '#fff', padding: '10px 15px', borderRadius: '6px', textDecoration: 'none' }}>
                                Find a New Course
                            </Link>
                        </div>
                    )}

                        {/* Voice command guide removed per request */}
                </div>
            </main>
        </div>
    );
};

export default MobilityDashboard;
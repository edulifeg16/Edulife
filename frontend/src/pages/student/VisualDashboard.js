// /src/pages/student/VisualDashboard.js
import React, { useState, useEffect, useContext } from 'react';
import api from '../../api/apiConfig';
import { Link } from 'react-router-dom';
import StudentSidebar from '../../components/layout/StudentSidebar';
import { AuthContext } from '../../context/AuthContext';
import { ThemeContext } from '../../context/ThemeContext';
import VisualScreenReader from "../../components/accessibility/VisualScreenReader";
import VisualVoiceAssistant from "../../components/voice/VisualVoiceAssistant";

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

const VisualDashboard = () => {
    const { user } = useContext(AuthContext);
    const { theme, fontSize } = useContext(ThemeContext);
    const [allCoursesCount, setAllCoursesCount] = useState(0);
    const [allQuizzesCount, setAllQuizzesCount] = useState(0);
    const [completedCount, setCompletedCount] = useState(0);
    const [lastActive, setLastActive] = useState(null);
    const [resumeLink, setResumeLink] = useState('/new-courses');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const userId = user?._id || user?.id;
        if (!userId) return;

        const fetchData = async () => {
            try {
                const [coursesRes, quizzesRes, userRes] = await Promise.all([
                    api.get(`/courses/student/${user.disabilityType}/${user.standard}`),
                    api.get(`/quizzes`),
                    api.get(`/users/${userId}`)
                ]);

                const filteredCourses = (coursesRes.data || []).filter(
                    course => course.disabilityType === 'visual'
                );

                // Quizzes are now universal - no disability filtering needed
                const allQuizzes = quizzesRes.data || [];

                setAllCoursesCount(filteredCourses.length);
                setAllQuizzesCount(allQuizzes.length);

                const progress = userRes.data.courseProgress || [];
                const completed = progress.filter(p => p.status === 'complete').length;
                setCompletedCount(completed);

                let last = progress.find(p => p.status === 'ongoing' || p.status === 'incomplete');

                if (!last) {
                    last = [...progress].reverse().find(p =>
                        ['ongoing', 'incomplete', 'started'].includes(p.status)
                    );
                }

                if (last && last.courseId) {
                    let courseObj = null;
                    if (typeof last.courseId === 'object' && last.courseId._id) {
                        courseObj = last.courseId;
                    } else if (typeof last.courseId === 'string') {
                        try {
                            const courseRes = await api.get(`/courses/${last.courseId}`);
                            courseObj = courseRes.data;
                        } catch (e) {
                            console.error('Failed to fetch last active course', e);
                        }
                    }

                    setLastActive({ ...last, course: courseObj });

                    const nextLessonId = findNextLessonId(courseObj, last.completedLessons);
                    const courseIdVal = courseObj?._id || last.courseId;

                    if (courseIdVal) {
                        if (nextLessonId) {
                            setResumeLink(`/course/${courseIdVal}?lesson=${nextLessonId}`);
                        } else {
                            setResumeLink(`/course/${courseIdVal}`);
                        }
                    }
                }
            } catch (err) {
                console.error('Failed to load visual dashboard data', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user]);

    return (
    <div className={`dashboard-layout theme-${theme} font-${fontSize}`}>

      {user?.disabilityType === "visual" && <VisualScreenReader enabled={true} />}

        <StudentSidebar />

            <main className="main-content">
                <h1>Visual Dashboard</h1>
                <p>
                    Welcome, {user?.name}! This dashboard is designed for visually impaired students.
                    Use voice control to navigate. Example: say <strong>1-Dashboard,2-Profile,3-New courses,4-Courses History,5-Quizzes History,6-Settings,7-Logout</strong>.
                    After you say these, the assistant will navigate you. To use chatbot use commands: open chatbot,talk to chatbot and close chatbot.<strong>For better experience headphones are recommended."</strong>
                </p>

                {/* <div style={{ display: 'flex', gap: '20px', marginTop: '20px', flexWrap: 'wrap' }}>
                    <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', minWidth: '200px' }}>
                        <h3 style={{ margin: 0 }}>Courses Available</h3>
                        <p style={{ fontSize: '28px', margin: '10px 0' }}>{allCoursesCount}</p>
                    </div>
                    <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', minWidth: '200px' }}>
                        <h3 style={{ margin: 0 }}>Quizzes Available</h3>
                        <p style={{ fontSize: '28px', margin: '10px 0' }}>{allQuizzesCount}</p>
                    </div>
                    <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', minWidth: '200px' }}>
                        <h3 style={{ margin: 0 }}>Total Content</h3>
                        <p style={{ fontSize: '28px', margin: '10px 0' }}>{allCoursesCount + allQuizzesCount}</p>
                    </div>
                </div> */}

                {loading && (
                    <div style={{ marginTop: '20px' }}>
                        <em>Loading dashboard...</em>
                    </div>
                )}

                <div style={{ marginTop: '40px' }}>
                    <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
                        {lastActive && (
                            <div style={{ marginBottom: '10px' }}>
                                <div style={{ fontWeight: '600' }}>Resume last active course:</div>
                                <div style={{ marginTop: '6px' }}>{lastActive?.course?.title || 'Untitled Course'}</div>
                                <Link to={resumeLink} style={{ display: 'inline-block', marginTop: '10px', backgroundColor: '#2196F3', color: '#fff', padding: '10px 15px', borderRadius: '6px', textDecoration: 'none' }}>
                                    Resume
                                </Link>
                            </div>
                        )}

                        <Link to="/new-courses" style={{ display: 'inline-block', marginTop: '10px', backgroundColor: '#4CAF50', color: '#fff', padding: '10px 15px', borderRadius: '6px', textDecoration: 'none' }}>
                            Browse New Courses
                        </Link>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default VisualDashboard;

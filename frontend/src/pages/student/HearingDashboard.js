import React, { useState, useEffect, useContext } from 'react';
import api from '../../api/apiConfig';
import { Link } from 'react-router-dom';
import StudentSidebar from '../../components/layout/StudentSidebar';
import { AuthContext } from '../../context/AuthContext';
import { ThemeContext } from '../../context/ThemeContext';

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

const HearingDashboard = () => {
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

                // Filter courses by disability type
                const filteredCourses = (coursesRes.data || []).filter(
                    course => course.disabilityType === 'hearing'
                );

                // Quizzes are now universal - no disability filtering needed
                const allQuizzes = quizzesRes.data || [];

                // Set count for courses and all quizzes
                setAllCoursesCount(filteredCourses.length);
                setAllQuizzesCount(allQuizzes.length);

                const progress = userRes.data.courseProgress || [];
                const completed = progress.filter(p => p.status === 'complete').length;
                setCompletedCount(completed);

                let last = progress.find(p => p.status === 'ongoing' || p.status === 'incomplete');

                // If there's no explicit ongoing/incomplete entry, fallback to the most recently started course
                if (!last) {
                    // Prefer the last entry in the array (assuming it's appended when started). If there's a started status, prefer that too
                    last = [...progress].reverse().find(p => ['ongoing', 'incomplete', 'started'].includes(p.status)) || null;
                }

                if (last && last.courseId) {
                    // last.courseId might be an Object (populated) or just an id string
                    let courseObj = null;
                    if (typeof last.courseId === 'object' && last.courseId._id) {
                        courseObj = last.courseId;
                    } else if (typeof last.courseId === 'string') {
                        // fetch the course to inspect modules and lessons
                        try {
                            const courseRes = await api.get(`/courses/${last.courseId}`);
                            courseObj = courseRes.data;
                        } catch (e) {
                            console.error('Failed to fetch last active course', e);
                        }
                    }

                    // attach fetched course object to lastActive so UI can show the title
                    setLastActive({ ...last, course: courseObj });

                    const nextLessonId = findNextLessonId(courseObj, last.completedLessons);
                    const courseIdVal = courseObj?._id || (typeof last.courseId === 'string' ? last.courseId : null);
                    if (courseIdVal) {
                        if (nextLessonId) {
                            setResumeLink(`/course/${courseIdVal}?lesson=${nextLessonId}`);
                        } else {
                            setResumeLink(`/course/${courseIdVal}`);
                        }
                    }
                }

            } catch (err) {
                console.error('Failed to load hearing dashboard data', err);
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
                <h1>Hearing Dashboard</h1>
                <p>Welcome, {user?.name}! This dashboard focuses on hearing-accessible materials. Use the controls in the sidebar for accessibility.</p>
{/* 
                <div style={{ display: 'flex', gap: '20px', marginTop: '20px', flexWrap: 'wrap' }}>
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
                    <div style={{ marginTop: '20px' }}><em>Loading dashboard...</em></div>
                )}

                <div style={{ marginTop: '40px' }}>
                    <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
                        {lastActive && (
                            <div style={{ marginBottom: '10px' }}>
                                <div style={{ fontWeight: '600' }}>Resume last active course:</div>
                                <div style={{ marginTop: '6px' }}>{lastActive?.course?.title || lastActive?.courseId?.title || lastActive?.courseId || 'Untitled Course'}</div>
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

export default HearingDashboard;
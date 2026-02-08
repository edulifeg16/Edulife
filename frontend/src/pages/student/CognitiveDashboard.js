import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import StudentSidebar from '../../components/layout/StudentSidebar';
import { AuthContext } from '../../context/AuthContext';

const ProgressIndicator = ({ progress = 0 }) => (
    <div style={{ 
        width: '100%', 
        height: '8px', 
        backgroundColor: 'rgba(0, 0, 0, 0.1)',
        borderRadius: '4px',
        overflow: 'hidden'
    }}>
        <div style={{
            width: `${progress}%`,
            height: '100%',
            backgroundColor: 'rgba(255,255,255,0.9)',
            borderRadius: '4px',
            transition: 'width 0.3s ease'
        }} />
    </div>
);

const CourseCard = ({ course }) => {
    const iconMap = {
        math: '�',
        science: '🔬',
        language: '📚',
        art: '🎨',
        music: '🎵',
        default: '📖'
    };

    const getBackground = (category) => {
        switch(category) {
            case 'math': return 'linear-gradient(135deg, #2193b0 0%, #6dd5ed 100%)';
            case 'science': return 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)';
            case 'language': return 'linear-gradient(135deg, #f46b45 0%, #eea849 100%)';
            case 'art': return 'linear-gradient(135deg, #e44d26 0%, #f16529 100%)';
            case 'music': return 'linear-gradient(135deg, #834d9b 0%, #d04ed6 100%)';
            default: return 'linear-gradient(135deg, #4776E6 0%, #8E54E9 100%)';
        }
    };

    return (
        <div style={{ 
            background: getBackground(course.category),
            padding: '25px',
            borderRadius: '15px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
            marginBottom: '25px',
            transition: 'all 0.3s ease',
            cursor: 'pointer',
            position: 'relative',
            overflow: 'hidden',
            color: 'white'
        }}
        onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-5px)';
            e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.2)';
        }}
        onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.15)';
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
                <span style={{ 
                    fontSize: '2.5rem',
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    borderRadius: '12px',
                    padding: '10px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>{iconMap[course.category] || iconMap.default}</span>
                <div>
                    <h3 style={{ 
                        margin: 0, 
                        color: 'white', 
                        fontSize: '1.5rem', 
                        fontWeight: '600',
                        textShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}>{course.title}</h3>
                    <span style={{ 
                        color: 'rgba(255,255,255,0.9)', 
                        fontSize: '0.9rem',
                        display: 'block',
                        marginTop: '4px'
                    }}>
                        {course.duration || '30 mins'} • {course.level || 'Beginner friendly'}
                    </span>
                </div>
            </div>
            
            <p style={{ 
                color: 'rgba(255,255,255,0.95)', 
                margin: '15px 0', 
                lineHeight: '1.6',
                fontSize: '1.1rem'
            }}>{course.description}</p>
            
            <div style={{ 
                background: 'rgba(255,255,255,0.1)',
                padding: '15px',
                borderRadius: '10px',
                marginTop: '20px'
            }}>
                <ProgressIndicator progress={course.progress || 0} />
                
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginTop: '12px'
                }}>
                    <span style={{ 
                        color: 'rgba(255,255,255,0.9)',
                        fontSize: '0.9rem'
                    }}>
                        {course.progress ? `${course.progress}% Complete` : '✨ Ready to start!'}
                    </span>
                    <Link 
                        to={`/course/${course._id}`} 
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: 'rgba(255,255,255,0.2)',
                            color: 'white',
                            padding: '12px 24px',
                            borderRadius: '10px',
                            fontWeight: '500',
                            textDecoration: 'none',
                            transition: 'all 0.2s ease',
                            border: '1px solid rgba(255,255,255,0.3)',
                            backdropFilter: 'blur(5px)'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.3)';
                            e.currentTarget.style.transform = 'translateX(5px)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
                            e.currentTarget.style.transform = 'translateX(0)';
                        }}>
                        Start Course
                    </Link>
                </div>
            </div>
        </div>
    );
};

const CognitiveDashboard = () => {
    const { user } = useContext(AuthContext);
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            const fetchCourses = async () => {
                try {
                    const res = await axios.get(`http://localhost:5000/api/courses/student/${user.disabilityType}/${user.standard}`);
                    setCourses(res.data);
                    setLoading(false);
                } catch (error) {
                    console.error("Failed to fetch student courses", error);
                    setLoading(false);
                }
            };
            fetchCourses();
        }
    }, [user]);

    return (
        <div className="dashboard-layout">
            <StudentSidebar />
            <main className="main-content" style={{ padding: '30px', maxWidth: '1200px', margin: '0 auto' }}>
                {/* Welcome Section */}
                <div style={{
                    background: 'linear-gradient(135deg, #6B46C1 0%, #4834d4 100%)',
                    borderRadius: '20px',
                    padding: '30px',
                    color: 'white',
                    marginBottom: '40px',
                    boxShadow: '0 4px 20px rgba(107, 70, 193, 0.2)'
                }}>
                    <h1 style={{ 
                        fontSize: '2.5rem', 
                        marginBottom: '15px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '15px'
                    }}>
                        <span role="img" aria-label="wave">👋</span>
                        Hi, {user?.name}!
                    </h1>
                    <p style={{ fontSize: '1.2rem', lineHeight: '1.5', maxWidth: '600px' }}>
                        Welcome to your personalized learning space! Here you'll find fun and 
                        interactive courses designed just for you. Take your time and learn at 
                        your own pace.
                    </p>
                </div>

                {/* Learning Progress Overview */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                    gap: '20px',
                    marginBottom: '40px'
                }}>
                    <div style={{
                        background: 'linear-gradient(135deg, #7fff6bff 0%, #ccff8eff 100%)',
                        padding: '25px',
                        borderRadius: '15px',
                        boxShadow: '0 4px 15px rgba(255, 107, 107, 0.2)',
                        color: 'white'
                    }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '0 0 10px 0', color: 'white' }}>
                            <span role="img" aria-label="books">📚</span> Active Courses
                        </h3>
                        <p style={{ fontSize: '2.5rem', fontWeight: 'bold', margin: '0', textShadow: '2px 2px 4px rgba(0,0,0,0.1)' }}>
                            {courses.length}
                        </p>
                    </div>
                </div>

                {/* Courses Section */}
                <h2 style={{ 
                    fontSize: '1.8rem', 
                    marginBottom: '25px',
                    color: '#2D3748',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                }}>
                    <span role="img" aria-label="sparkles">✨</span>
                    Your Learning Journey
                </h2>

                <div style={{ marginTop: '20px' }}>
                    {loading ? (
                        <div style={{
                            padding: '40px',
                            textAlign: 'center',
                            background: '#fff',
                            borderRadius: '15px',
                            boxShadow: '0 4px 15px rgba(0,0,0,0.05)'
                        }}>
                            <p style={{ fontSize: '1.2rem', color: '#4A5568' }}>
                                <span role="img" aria-label="hourglass">⌛</span> Getting your amazing courses ready...
                            </p>
                        </div>
                    ) : courses.length > 0 ? (
                        <div style={{ display: 'grid', gap: '25px' }}>
                            {courses.map(course => <CourseCard key={course._id} course={course} />)}
                        </div>
                    ) : (
                        <div style={{
                            padding: '40px',
                            textAlign: 'center',
                            background: '#fff',
                            borderRadius: '15px',
                            boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
                            border: '2px dashed #e2e8f0'
                        }}>
                            <span role="img" aria-label="books" style={{ fontSize: '3rem', marginBottom: '15px' }}>📚</span>
                            <p style={{ fontSize: '1.2rem', color: '#4A5568', margin: '10px 0' }}>
                                No courses available right now
                            </p>
                            <p style={{ color: '#718096' }}>Check back soon for exciting new lessons!</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default CognitiveDashboard;
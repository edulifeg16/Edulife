import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import StudentSidebar from '../../components/layout/StudentSidebar';
import { AuthContext } from '../../context/AuthContext';
import { ThemeContext } from '../../context/ThemeContext';

const HistoryCard = ({ course, status }) => (
    <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
            <p style={{ color: '#6B7280', margin: '0 0 5px 0', fontSize: '0.9rem' }}>Subject: <span style={{ fontWeight: 'bold', color: '#111827' }}>{course.subject || 'N/A'}</span></p>
            <p style={{ color: '#6B7280', margin: '5px 0 0 0', fontSize: '0.9rem' }}>Lesson: <span style={{ fontWeight: 'bold', color: '#111827' }}>{course.lessons && course.lessons.length > 0 ? course.lessons[0].title : 'N/A'}</span></p>
            <p style={{ color: '#6B7280', margin: '10px 0 0 0' }}>Status: <span style={{ fontWeight: 'bold' }}>{status}</span></p>
        </div>
        <Link to={`/course/${course._id}`} style={{
            backgroundColor: '#3B82F6', color: 'white', padding: '10px 15px',
            border: 'none', borderRadius: '5px', cursor: 'pointer', textDecoration: 'none'
        }}>
            View Course
        </Link>
    </div>
);


const CoursesHistory = () => {
    const { user } = useContext(AuthContext);
    const { theme, fontSize } = useContext(ThemeContext);
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            const fetchCourses = async () => {
                try {
                    const res = await axios.get(`http://localhost:5000/api/courses/student/${user.disabilityType}/${user.standard}`);
                    // For now, we assume all assigned courses are "Ongoing"
                    setCourses(res.data);
                } catch (error) {
                    console.error("Failed to fetch course history", error);
                } finally {
                    setLoading(false);
                }
            };
            fetchCourses();
        }
    }, [user]);

    return (
        <div className={`dashboard-layout theme-${theme} font-${fontSize}`}>
            <StudentSidebar />
            <main className="main-content">
                <h1>Courses History</h1>
                
                {/* We will just show "Ongoing" for now. */}
                <h2 style={{ borderBottom: '1px solid #ddd', paddingBottom: '10px' }}>Ongoing</h2>
                {loading ? <p>Loading history...</p> :
                    courses.length > 0 ? (
                        courses.map(course => <HistoryCard key={course._id} course={course} status="Ongoing" />)
                    ) : (
                        <p>You have not started any courses yet.</p>
                    )
                }
            </main>
        </div>
    );
};

export default CoursesHistory;
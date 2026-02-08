import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AdminSidebar from '../../components/layout/AdminSidebar';

const CourseList = () => {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchCourses = async () => {
        try {
            const response = await axios.get('http://localhost:5000/api/courses');
            setCourses(response.data);
            setLoading(false);
        } catch (err) {
            setError('Failed to fetch courses.');
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCourses();
    }, []);

    const handleDelete = async (courseId, subject) => {
        if (window.confirm(`Are you sure you want to delete the course: ${subject}?`)) {
            try {
                await axios.delete(`http://localhost:5000/api/courses/${courseId}`);
                alert('Course deleted successfully!');
                fetchCourses(); // Refresh the list
            } catch (err) {
                console.error('Error deleting course:', err);
                alert('Failed to delete course.');
            }
        }
    };

    // Inline styles for the table
    const tableStyle = {
        width: '100%',
        marginTop: '20px',
        borderCollapse: 'collapse',
    };
    const thStyle = {
        backgroundColor: '#F3F4F6',
        padding: '12px',
        textAlign: 'left',
        borderBottom: '2px solid #E5E7EB',
    };
    const tdStyle = {
        padding: '12px',
        borderBottom: '1px solid #E5E7EB',
    };

    if (loading) return <p>Loading courses...</p>;
    if (error) return <p style={{ color: 'red' }}>{error}</p>;

    return (
        <div className="dashboard-layout">
            <AdminSidebar />
            <main className="main-content">
                <h1>Course Management</h1>
                <p>Here is a list of all courses on the platform.</p>

                <table style={tableStyle}>
                    <thead>
                        <tr>
                            <th style={thStyle}>Subject</th> 
                            <th style={thStyle}>Standard</th>
                            <th style={thStyle}>Disability Type</th>
                            <th style={thStyle}>Total Lessons</th>
                            <th style={thStyle}>Lesson Titles</th>
                            <th style={thStyle}>Created</th>
                            <th style={thStyle}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {courses.length > 0 ? (
                            courses.map((course) => (
                                <tr key={course._id}>
                                    <td style={tdStyle}>{course.subject}</td>
                                    <td style={tdStyle}>{course.standard}</td>
                                    <td style={tdStyle}>
                                        <span style={{
                                            padding: '4px 8px',
                                            borderRadius: '4px',
                                            backgroundColor: 
                                                !course.disabilityType ? '#e0e7ff' :
                                                course.disabilityType === 'visual' ? '#dbeafe' :
                                                course.disabilityType === 'hearing' ? '#fef3c7' :
                                                course.disabilityType === 'cognitive' ? '#ddd6fe' :
                                                '#d1fae5',
                                            color: 
                                                !course.disabilityType ? '#3730a3' :
                                                course.disabilityType === 'visual' ? '#1e40af' :
                                                course.disabilityType === 'hearing' ? '#92400e' :
                                                course.disabilityType === 'cognitive' ? '#5b21b6' :
                                                '#065f46',
                                            fontWeight: !course.disabilityType ? 'bold' : 'normal'
                                        }}>
                                            {course.disabilityType || 'All Disabilities'}
                                        </span>
                                    </td>
                                    <td style={tdStyle}>{course.lessons?.length || 0}</td>
                                    <td style={tdStyle}>
                                        <details>
                                            <summary style={{ cursor: 'pointer', color: '#2563eb' }}>
                                                View {course.lessons?.length || 0} lessons
                                            </summary>
                                            <ol style={{ marginTop: '8px', paddingLeft: '20px' }}>
                                                {course.lessons?.map((lesson, idx) => (
                                                    <li key={idx} style={{ marginBottom: '4px' }}>
                                                        {lesson.title}
                                                    </li>
                                                ))}
                                            </ol>
                                        </details>
                                    </td>
                                    <td style={tdStyle}>
                                        {course.createdAt ? new Date(course.createdAt).toLocaleDateString() : 'N/A'}
                                    </td>
                                    <td style={tdStyle}>
                                        <button
                                            onClick={() => handleDelete(course._id, course.subject)}
                                            style={{
                                                backgroundColor: '#dc2626',
                                                color: 'white',
                                                border: 'none',
                                                padding: '6px 12px',
                                                borderRadius: '4px',
                                                cursor: 'pointer'
                                            }}
                                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#b91c1c'}
                                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="7" style={{...tdStyle, textAlign: 'center'}}>No courses found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </main>
        </div>
    );
};

export default CourseList;
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AdminSidebar from '../../components/layout/AdminSidebar';

const QuizList = () => {
    const [quizzes, setQuizzes] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchQuizzes = async () => {
        try {
            const response = await axios.get('http://localhost:5000/api/quizzes');
            setQuizzes(response.data);
        } catch (err) {
            console.error("Failed to fetch quizzes", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQuizzes();
    }, []);

    const handleDelete = async (quizId, title) => {
        if (window.confirm(`Are you sure you want to delete the quiz: ${title}?`)) {
            try {
                await axios.delete(`http://localhost:5000/api/quizzes/${quizId}`);
                alert('Quiz deleted successfully!');
                fetchQuizzes(); // Refresh the list
            } catch (err) {
                console.error('Error deleting quiz:', err);
                alert('Failed to delete quiz.');
            }
        }
    };

    const tableStyle = { width: '100%', marginTop: '20px', borderCollapse: 'collapse' };
    const thStyle = { backgroundColor: '#F3F4F6', padding: '12px', textAlign: 'left', borderBottom: '2px solid #E5E7EB' };
    const tdStyle = { padding: '12px', borderBottom: '1px solid #E5E7EB' };

    return (
        <div className="dashboard-layout">
            <AdminSidebar />
            <main className="main-content">
                <h1>Quiz Management</h1>
                <p>A list of all quizzes on the platform.</p>
                {loading ? <p>Loading quizzes...</p> : (
                    <table style={tableStyle}>
                        <thead>
                            <tr>
                                <th style={thStyle}>Quiz Title</th>
                                <th style={thStyle}>Linked Course</th>
                                <th style={thStyle}>Subject</th>
                                <th style={thStyle}>Standard</th>
                                <th style={thStyle}>Questions</th>
                                <th style={thStyle}>Question Details</th>
                                <th style={thStyle}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {quizzes.length > 0 ? (
                                quizzes.map((quiz) => (
                                    <tr key={quiz._id}>
                                        <td style={tdStyle}>{quiz.title}</td>
                                        <td style={tdStyle}>
                                            {quiz.courseId ? 
                                                `${quiz.courseId.subject} (Std ${quiz.courseId.standard})` : 
                                                'Course not found'}
                                        </td>
                                        <td style={tdStyle}>
                                            <span style={{
                                                padding: '4px 8px',
                                                borderRadius: '4px',
                                                backgroundColor: '#dbeafe',
                                                color: '#1e40af'
                                            }}>
                                                {quiz.courseId?.subject || 'N/A'}
                                            </span>
                                        </td>
                                        <td style={tdStyle}>{quiz.courseId?.standard || 'N/A'}</td>
                                        <td style={tdStyle}>
                                            <strong>{quiz.questions?.length || 0}</strong>
                                        </td>
                                        <td style={tdStyle}>
                                            <details>
                                                <summary style={{ cursor: 'pointer', color: '#2563eb' }}>
                                                    View questions
                                                </summary>
                                                <ol style={{ marginTop: '8px', paddingLeft: '20px', maxHeight: '200px', overflowY: 'auto' }}>
                                                    {quiz.questions?.map((q, idx) => (
                                                        <li key={idx} style={{ marginBottom: '6px', fontSize: '13px' }}>
                                                            {q.questionText}
                                                        </li>
                                                    ))}
                                                </ol>
                                            </details>
                                        </td>
                                        <td style={tdStyle}>
                                            <button
                                                onClick={() => handleDelete(quiz._id, quiz.title)}
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
                                    <td colSpan="7" style={{...tdStyle, textAlign: 'center'}}>No quizzes found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </main>
        </div>
    );
};

export default QuizList;
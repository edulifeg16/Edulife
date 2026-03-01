import React, { useState, useEffect, useContext } from 'react';
import api from '../../api/apiConfig';
import StudentSidebar from '../../components/layout/StudentSidebar';
import { AuthContext } from '../../context/AuthContext';
import { ThemeContext } from '../../context/ThemeContext';

const QuizzesHistory = () => {
    const { user } = useContext(AuthContext);
    const { theme, fontSize } = useContext(ThemeContext);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const userId = user?._id || user?.id;
        if (!userId) {
            setLoading(false);
            return;
        }
        const fetchHistory = async () => {
            try {
                const res = await api.get(`/users/${userId}/quiz-history`);
                setHistory(res.data);
            } catch (error) {
                console.error("Failed to fetch quiz history", error);
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, [user]);

    const tableStyle = { width: '100%', marginTop: '20px', borderCollapse: 'collapse' };
    const thStyle = { backgroundColor: '#F3F4F6', padding: '12px', textAlign: 'left', borderBottom: '2px solid #E5E7EB' };
    const tdStyle = { padding: '12px', borderBottom: '1px solid #E5E7EB' };

    return (
        <div className={`dashboard-layout theme-${theme} font-${fontSize}`}>
            <StudentSidebar />
            <main className="main-content">
                <h1>Quizzes History</h1>
                <p>Here are the results of the quizzes you have completed.</p>
                {loading ? <p>Loading history...</p> : (
                    <table style={tableStyle}>
                        <thead>
                            <tr>
                                <th style={thStyle}>Quiz Title</th>
                                <th style={thStyle}>Score</th>
                                <th style={thStyle}>Date Attempted</th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.length > 0 ? (
                                history.map((item) => (
                                    <tr key={item._id}>
                                        <td style={tdStyle}>{item.quizId?.title || 'Quiz not found'}</td>
                                        <td style={tdStyle}>{item.score} / {item.totalQuestions}</td>
                                        <td style={tdStyle}>{new Date(item.attemptedOn).toLocaleDateString()}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="3" style={{...tdStyle, textAlign: 'center'}}>You have not attempted any quizzes yet.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </main>
        </div>
    );
};

export default QuizzesHistory;
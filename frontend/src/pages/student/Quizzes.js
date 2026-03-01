import React, { useState, useEffect, useContext } from 'react';
import api from '../../api/apiConfig';
import { Link } from 'react-router-dom';
import StudentSidebar from '../../components/layout/StudentSidebar';
import { AuthContext } from '../../context/AuthContext';
import { ThemeContext } from '../../context/ThemeContext';

// --- Reusable Card Component for Displaying a Single Quiz ---
const QuizCard = ({ quiz }) => {
    // Check if the user has an attempt for this quiz
    const hasAttempt = quiz.userAttempt;

    return (
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
                <h3 style={{ margin: 0, color: '#111827' }}>{quiz.title}</h3>
                <p style={{ color: '#6B7280', margin: '5px 0 0 0' }}>{quiz.description}</p>
            </div>
            <div>
                {hasAttempt ? (
                    // ✅ If quiz has been taken, show the score
                    <div style={{ textAlign: 'center' }}>
                        <p style={{ margin: 0, fontWeight: 'bold', fontSize: '18px' }}>
                            {quiz.userAttempt.score} / {quiz.userAttempt.totalQuestions}
                        </p>
                        <span style={{ fontSize: '12px', color: '#6B7280' }}>Completed</span>
                    </div>
                ) : (
                    // ✅ If quiz has NOT been taken, show the link
                    <Link to={`/quiz/${quiz._id}`} style={{
                        display: 'inline-block',
                        backgroundColor: '#3B82F6',
                        color: 'white',
                        padding: '10px 20px',
                        borderRadius: '5px',
                        textDecoration: 'none',
                        whiteSpace: 'nowrap'
                    }}>
                        Take Quiz
                    </Link>
                )}
            </div>
        </div>
    );
};


// --- Main Component for the Quizzes Page ---
const Quizzes = () => {
    const { user } = useContext(AuthContext);
    const { theme, fontSize } = useContext(ThemeContext);
    const [quizzes, setQuizzes] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const userId = user?._id || user?.id;
        if (!userId) {
            setLoading(false);
            return;
        }
        const fetchData = async () => {
                try {
                    // Step 1: Fetch both datasets in parallel
                    const [quizzesRes, historyRes] = await Promise.all([
                        api.get('/quizzes'),
                        api.get(`/users/${userId}/quiz-history`)
                    ]);
                    
                    const allQuizzes = quizzesRes.data || [];
                    const quizHistory = historyRes.data || [];

                    // Step 2: Combine the data
                    // Create a Map for efficient lookups of user's attempts
                    const historyMap = new Map(quizHistory.map(attempt => [attempt.quizId, attempt]));

                    // Attach user's attempt to each quiz object
                    const combinedQuizzes = allQuizzes.map(quiz => ({
                        ...quiz,
                        userAttempt: historyMap.get(quiz._id) || null
                    }));

                    setQuizzes(combinedQuizzes);
                } catch (error) {
                    console.error("Failed to fetch quizzes or history", error);
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
                <h1>Available Quizzes</h1>
                <p>Test your knowledge. Completed quizzes will show your score.</p>
                <div style={{ marginTop: '30px' }}>
                    {loading ? (
                        <p>Loading quizzes...</p>
                    ) : quizzes.length > 0 ? (
                        // Step 3: Render the QuizCard for each quiz
                        quizzes.map(quiz => <QuizCard key={quiz._id} quiz={quiz} />)
                    ) : (
                        <p>No quizzes are available at the moment.</p>
                    )}
                </div>
            </main>
        </div>
    );
};

export default Quizzes;
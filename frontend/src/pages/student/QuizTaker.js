import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import StudentSidebar from '../../components/layout/StudentSidebar';

const QuizTaker = () => {
    const { quizId } = useParams();
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);

    const [quiz, setQuiz] = useState(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState([]);
    const [selectedOption, setSelectedOption] = useState(null);
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(true);

    // --------------------------------------
    // FETCH QUIZ
    // --------------------------------------
    useEffect(() => {
        const fetchQuiz = async () => {
            try {
                console.log('🎯 QuizTaker: Fetching quiz', { quizId });
                const res = await axios.get(`http://localhost:5000/api/quizzes/${quizId}`);
                console.log('🎯 QuizTaker: Quiz fetched successfully', { 
                    quizTitle: res.data.title,
                    questionsCount: res.data.questions?.length,
                    firstQuestion: res.data.questions?.[0]
                });
                setQuiz(res.data);
                setAnswers(new Array(res.data.questions.length).fill(null));
            } catch (error) {
                console.error("🎯 QuizTaker: Failed to fetch quiz", error);
            } finally {
                setLoading(false);
            }
        };
        fetchQuiz();
    }, [quizId]);



    // --------------------------------------
    // SUBMIT QUIZ
    // --------------------------------------
    const handleSubmit = useCallback(async () => {
        const finalAnswers = [...answers];
        finalAnswers[currentQuestionIndex] = selectedOption;

        try {
            const res = await axios.post('http://localhost:5000/api/quizzes/submit', {
                quizId,
                userId: user.id,
                answers: finalAnswers
            });
            setResults(res.data);
        } catch (error) {
            console.error("Failed to submit quiz", error);
        }
    }, [answers, currentQuestionIndex, selectedOption, quizId, user.id]);

    // --------------------------------------
    // SELECT OPTION
    // --------------------------------------
    const handleOptionSelect = (optionIndex) => {
        console.log('🎯 QuizTaker: Option selected', { 
            optionIndex, 
            currentQuestionIndex, 
            previousSelection: selectedOption 
        });
        setSelectedOption(optionIndex);
    };

    // --------------------------------------
    // NEXT QUESTION
    // --------------------------------------
    const handleNextQuestion = useCallback(() => {
        const newAnswers = [...answers];
        newAnswers[currentQuestionIndex] = selectedOption;

        setAnswers(newAnswers);
        setSelectedOption(null);
        setCurrentQuestionIndex(currentQuestionIndex + 1);
    }, [answers, currentQuestionIndex, selectedOption]);

    // --------------------------------------
    // VOICE COMMAND LISTENERS
    // --------------------------------------
    useEffect(() => {
        if (!quiz) return; // Wait until quiz is loaded

        const isLastQuestion = currentQuestionIndex === quiz.questions.length - 1;

        const handleVoiceNext = () => {
            if (selectedOption !== null && !isLastQuestion) {
                handleNextQuestion();
            } else if (selectedOption === null) {
                const utter = new SpeechSynthesisUtterance('Please select an option first');
                window.speechSynthesis.speak(utter);
            }
        };

        const handleVoiceSubmit = () => {
            if (isLastQuestion && selectedOption !== null) {
                handleSubmit();
            } else {
                const utter = new SpeechSynthesisUtterance('Please select an option first');
                window.speechSynthesis.speak(utter);
            }
        };

        const handleVoiceOption = (event) => {
            const index = event.detail;
            console.log('🎤 QuizTaker: Received voice-select-option event', { 
                index, 
                currentQuestionIndex,
                quiz: quiz?.title 
            });
            setSelectedOption(index);
            
            // Provide audio feedback
            try {
                window.speechSynthesis.cancel();
                const utter = new SpeechSynthesisUtterance(`Option ${index + 1} selected`);
                window.speechSynthesis.speak(utter);
            } catch (e) {
                console.warn('TTS failed for option selection', e);
            }
        };

        window.addEventListener('voice-next-question', handleVoiceNext);
        window.addEventListener('voice-submit-quiz', handleVoiceSubmit);
        window.addEventListener('voice-select-option', handleVoiceOption);

        return () => {
            window.removeEventListener('voice-next-question', handleVoiceNext);
            window.removeEventListener('voice-submit-quiz', handleVoiceSubmit);
            window.removeEventListener('voice-select-option', handleVoiceOption);
        };
    }, [quiz, currentQuestionIndex, selectedOption, handleNextQuestion, handleSubmit]);

    // --------------------------------------
    // LOADING / ERROR HANDLING
    // --------------------------------------
    if (loading) return <div>Loading Quiz...</div>;
    if (!quiz) return <div>Quiz not found.</div>;

    // --------------------------------------
    // RESULTS SCREEN
    // --------------------------------------
    if (results) {
        return (
            <div className="dashboard-layout">
                <StudentSidebar />
                <main className="main-content">
                    <h1>Quiz Completed!</h1>
                    <h2>Your Score: {results.score} / {results.totalQuestions}</h2>
                    <button onClick={() => navigate('/quizzes-history')} style={{ padding: '10px 20px', fontSize: '16px' }}>
                        Back to Quizzes History
                    </button>
                </main>
            </div>
        );
    }

    // --------------------------------------
    // QUIZ QUESTION VIEW
    // --------------------------------------
    const currentQuestion = quiz.questions[currentQuestionIndex];
    const isLastQuestion = currentQuestionIndex === quiz.questions.length - 1;

    return (
        <div className="dashboard-layout">
            <StudentSidebar />
            <main className="main-content">
                <h1>{quiz.title}</h1>

                <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px' }}>
                    <h3>Question {currentQuestionIndex + 1} of {quiz.questions.length}</h3>
                    <p style={{ fontSize: '1.2rem' }}>{currentQuestion.questionText}</p>

                    {/* OPTIONS */}
                    <div>
                        {currentQuestion.options.map((option, index) => (
                            <div
                                key={index}
                                onClick={() => handleOptionSelect(index)}
                                style={{
                                    padding: '15px',
                                    border: '1px solid #ccc',
                                    borderRadius: '5px',
                                    marginBottom: '10px',
                                    cursor: 'pointer',
                                    backgroundColor: selectedOption === index ? '#D1FAE5' : '#fff'
                                }}
                            >
                                {option}
                            </div>
                        ))}
                    </div>

                    {/* NEXT or SUBMIT BUTTON */}
                    {isLastQuestion ? (
                        <button
                            onClick={handleSubmit}
                            disabled={selectedOption === null}
                            style={{ padding: '10px 20px' }}
                        >
                            Submit Quiz
                        </button>
                    ) : (
                        <button
                            onClick={handleNextQuestion}
                            disabled={selectedOption === null}
                            style={{ padding: '10px 20px' }}
                        >
                            Next
                        </button>
                    )}
                </div>
            </main>
        </div>
    );
};

export default QuizTaker;

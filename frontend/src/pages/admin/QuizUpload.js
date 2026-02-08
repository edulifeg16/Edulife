import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '../../components/layout/AdminSidebar';

const QuizUpload = () => {
    const navigate = useNavigate();
    const [courses, setCourses] = useState([]);
    const [quizData, setQuizData] = useState({
        title: '',
        courseId: '',
        lessonId: '',
        questions: [{ questionText: '', options: ['', '', '', ''], correctOptionIndex: 0 }]
    });
    const [message, setMessage] = useState('');
    const [selectedStandard, setSelectedStandard] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [availableLessons, setAvailableLessons] = useState([]);
    const [standards] = useState(['7', '8', '9', '10']);
    const [subjects] = useState([
        'English',
        'Mathematics',
        'Science',
        'History',
        'Geography'
    ]);
    // Fetch all courses to populate the dropdown menu
    useEffect(() => {
        const fetchCourses = async () => {
            try {
                const res = await axios.get('http://localhost:5000/api/courses');
                setCourses(res.data);
            } catch (error) {
                console.error("Failed to fetch courses", error);
            }
        };
        fetchCourses();
    }, []);

    // Filter lessons based on selected standard and subject
    useEffect(() => {
        if (courses.length > 0 && selectedStandard && selectedSubject) {
            const standardNum = parseInt(selectedStandard, 10);
            const matchingCourses = courses.filter(
                course => course.standard === standardNum && course.subject === selectedSubject
            );
           
            // Collect all lessons from matching courses
            const lessons = [];
            matchingCourses.forEach(course => {
                if (course.lessons && course.lessons.length > 0) {
                    course.lessons.forEach(lesson => {
                        lessons.push({
                            ...lesson,
                            courseId: course._id,
                            courseName: `${course.disabilityType}`
                        });
                    });
                }
            });
           
            setAvailableLessons(lessons);
            setQuizData(prev => ({ ...prev, courseId: '', lessonId: '' }));
        } else {
            setAvailableLessons([]);
        }
    }, [courses, selectedStandard, selectedSubject]);

    const handleQuizChange = (e) => {
        setQuizData({ ...quizData, [e.target.name]: e.target.value });
    };

    const handleLessonSelect = (e) => {
        const selectedLessonId = e.target.value;
        const selectedLesson = availableLessons.find(lesson => lesson._id === selectedLessonId);
        
        if (selectedLesson) {
            setQuizData({ 
                ...quizData, 
                lessonId: selectedLessonId,
                courseId: selectedLesson.courseId
            });
        }
    };

    const handleQuestionChange = (qIndex, e) => {
        const updatedQuestions = [...quizData.questions];
        updatedQuestions[qIndex][e.target.name] = e.target.value;
        setQuizData({ ...quizData, questions: updatedQuestions });
    };

    const handleOptionChange = (qIndex, optIndex, e) => {
        const updatedQuestions = [...quizData.questions];
        updatedQuestions[qIndex].options[optIndex] = e.target.value;
        setQuizData({ ...quizData, questions: updatedQuestions });
    };

    const addQuestion = () => {
        setQuizData({
            ...quizData,
            questions: [...quizData.questions, { questionText: '', options: ['', '', '', ''], correctOptionIndex: 0 }]
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!quizData.courseId || !quizData.lessonId) {
            setMessage('Please select a course and a lesson.');
            return;
        }
        setMessage('');
        try {
            await axios.post('http://localhost:5000/api/quizzes', quizData);
            setMessage('Quiz uploaded successfully!');
            setTimeout(() => navigate('/admin/quiz-list'), 1500);
        } catch (error) {
            setMessage('Failed to upload quiz.');
            console.error('Quiz upload error:', error);
        }
    };

    // --- Inline Styles ---
    const inputStyle = { padding: '10px', marginBottom: '10px', borderRadius: '5px', border: '1px solid #ccc', width: '100%', boxSizing: 'border-box' };
    const buttonStyle = { padding: '10px 15px', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' };
    const questionSectionStyle = { backgroundColor: '#f9f9f9', padding: '15px', borderRadius: '8px', border: '1px solid #eee', marginBottom: '20px' };

    return (
        <div className="dashboard-layout">
            <AdminSidebar />
            <main className="main-content">
                <h1>Upload New Quiz</h1>
                <form onSubmit={handleSubmit} style={{ maxWidth: '800px' }}>
                    <input type="text" name="title" placeholder="Quiz Title" onChange={handleQuizChange} style={inputStyle} required />
                   
                    {/* Standard Selection */}
                    <select
                        value={selectedStandard}
                        onChange={(e) => setSelectedStandard(e.target.value)}
                        style={inputStyle}
                        required
                    >
                        <option value="">Select Class</option>
                        {standards.map(standard => (
                            <option key={standard} value={standard}>Class {standard}</option>
                        ))}
                    </select>

                    {/* Subject Selection */}
                    <select
                        value={selectedSubject}
                        onChange={(e) => setSelectedSubject(e.target.value)}
                        style={inputStyle}
                        required
                    >
                        <option value="">Select Subject</option>
                        {subjects.map(subject => (
                            <option key={subject} value={subject}>{subject}</option>
                        ))}
                    </select>

                    {/* Lesson Selection */}
                    <select 
                        name="lessonId" 
                        value={quizData.lessonId} 
                        onChange={handleLessonSelect}
                        style={inputStyle} 
                        required
                        disabled={!selectedStandard || !selectedSubject}
                    >
                        <option value="">Select Lesson</option>
                        {availableLessons.map((lesson, index) => (
                            <option key={lesson._id} value={lesson._id}>
                                {lesson.title}
                            </option>
                        ))}
                    </select>
                    <hr style={{ margin: '20px 0' }} />

                    {quizData.questions.map((q, qIndex) => (
                        <div key={qIndex} style={questionSectionStyle}>
                            <h3>Question {qIndex + 1}</h3>
                            <input type="text" name="questionText" placeholder="Question Text" value={q.questionText} onChange={(e) => handleQuestionChange(qIndex, e)} style={inputStyle} required />
                            {q.options.map((opt, optIndex) => (
                                <input key={optIndex} type="text" placeholder={`Option ${optIndex + 1}`} value={opt} onChange={(e) => handleOptionChange(qIndex, optIndex, e)} style={inputStyle} required />
                            ))}
                            <select name="correctOptionIndex" value={q.correctOptionIndex} onChange={(e) => handleQuestionChange(qIndex, e)} style={inputStyle} required>
                                <option value={0}>Correct Answer is Option 1</option>
                                <option value={1}>Correct Answer is Option 2</option>
                                <option value={2}>Correct Answer is Option 3</option>
                                <option value={3}>Correct Answer is Option 4</option>
                            </select>
                        </div>
                    ))}

                    <button type="button" onClick={addQuestion} style={{...buttonStyle, backgroundColor: '#D1FAE5', color: '#065F46', marginBottom: '20px' }}>Add Another Question</button>
                    <button type="submit" style={{...buttonStyle, backgroundColor: '#4CAF50', color: 'white', width: '100%', padding: '15px' }}>Upload Quiz</button>
                    {message && <p style={{ textAlign: 'center', marginTop: '15px', color: message.includes('success') ? 'green' : 'red' }}>{message}</p>}
                </form>
            </main>
        </div>
    );
};

export default QuizUpload;
import React, { useState } from 'react';
import api from '../../api/apiConfig';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '../../components/layout/AdminSidebar';

const CourseUpload = () => {
    const navigate = useNavigate();
    const subjects = [
        'English',
        'Mathematics',
        'Science',
        'History',
        'Geography'
    ];

    const [courseData, setCourseData] = useState({
        subject: '',
        standard: '',
        lessons: [{ title: '', videoFile: null, language: 'en' }]
    });
    const [message, setMessage] = useState('');

    const handleCourseChange = (e) => {
        setCourseData({ ...courseData, [e.target.name]: e.target.value });
    };

    const handleLessonChange = (lessonIndex, e) => {
        const updatedLessons = [...courseData.lessons];
        const { name, value, files } = e.target;
        if (name === 'videoFile') {
            // Check file size before allowing upload (500MB limit)
            if (files[0] && files[0].size > 500 * 1024 * 1024) {
                setMessage('Error: File size exceeds 500MB limit');
                e.target.value = ''; // Clear the file input
                return;
            }
            updatedLessons[lessonIndex][name] = files[0];
        } else {
            updatedLessons[lessonIndex][name] = value;
        }
        setCourseData({ ...courseData, lessons: updatedLessons });
    };

    const addLesson = () => {
        setCourseData({
            ...courseData,
            lessons: [...courseData.lessons, { title: '', videoFile: null, language: 'en' }]
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');

        const formData = new FormData();
        
        // Separate video files from the rest of the data
    // Include lesson language when sending metadata to the server
    const courseDetails = { ...courseData, lessons: courseData.lessons.map(l => ({ title: l.title, language: l.language || 'en' })) };
        
        // Append the JSON data as a string
        formData.append('courseData', JSON.stringify(courseDetails));

        // Append each video file with the field name 'lessonVideos'
        courseData.lessons.forEach(lesson => {
            if (lesson.videoFile) {
                formData.append('lessonVideos', lesson.videoFile);
            }
        });
        
        try {
            await api.post('/courses', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setMessage('Course uploaded successfully!');
            setTimeout(() => navigate('/admin/course-list'), 1500);
        } catch (error) {
            setMessage('Failed to upload course. Please check all fields.');
            console.error('Upload error:', error);
        }
    };

    // --- Inline Styles ---
    const inputStyle = { padding: '10px', marginBottom: '10px', borderRadius: '5px', border: '1px solid #ccc', width: '100%', boxSizing: 'border-box' };
    const buttonStyle = { padding: '10px 15px', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' };
    const lessonSectionStyle = { backgroundColor: '#fff', padding: '10px', borderRadius: '5px', border: '1px solid #ddd', marginTop: '10px', marginLeft: '20px' };

    return (
        <div className="dashboard-layout">
            <AdminSidebar />
            <main className="main-content">
                <h1>Upload New Course</h1>
                <form onSubmit={handleSubmit} style={{ maxWidth: '800px' }}>
                    {/* Course Details */}
                    <select name="subject" value={courseData.subject} onChange={handleCourseChange} style={inputStyle} required>
                        <option value="" disabled>Select Subject</option>
                        {subjects.map(subject => (
                            <option key={subject} value={subject}>{subject}</option>
                        ))}
                    </select>
                    <select name="standard" value={courseData.standard} onChange={handleCourseChange} style={inputStyle} required>
                        <option value="" disabled>Select Class</option><option value="7">7th</option><option value="8">8th</option><option value="9">9th</option><option value="10">10th</option>
                    </select>
                    <div style={{padding: '10px', backgroundColor: '#e0f2fe', borderRadius: '5px', marginBottom: '10px', border: '1px solid #7dd3fc'}}>
                        <strong>📌 Note:</strong> This course will be available to all students regardless of disability type. Cognitive-friendly versions will be generated automatically.
                    </div>
                    <hr style={{ margin: '20px 0' }} />

                    {/* Lessons */}
                    <h3>Lessons</h3>
                    {courseData.lessons.map((lesson, lessonIndex) => (
                        <div key={lessonIndex} style={lessonSectionStyle}>
                            <h4>Lesson {lessonIndex + 1}</h4>
                            <input 
                                type="text" 
                                name="title" 
                                placeholder="Lesson Title" 
                                value={lesson.title} 
                                onChange={(e) => handleLessonChange(lessonIndex, e)} 
                                style={inputStyle} 
                                required 
                            />
                            <label>Upload Video:</label>
                            <input 
                                type="file" 
                                name="videoFile" 
                                accept="video/*" 
                                onChange={(e) => handleLessonChange(lessonIndex, e)} 
                                style={{...inputStyle, border: 'none'}} 
                            />
                            <label style={{ display: 'block', marginTop: 8 }}>Language:</label>
                            <select
                                name="language"
                                value={lesson.language || 'en'}
                                onChange={(e) => handleLessonChange(lessonIndex, e)}
                                style={{ ...inputStyle, width: '200px' }}
                            >
                                <option value="en">English</option>
                                <option value="en">Marathi</option>
                                <option value="en">Hindi</option>
                            </select>
                        </div>
                    ))}
                    <button 
                        type="button" 
                        onClick={addLesson} 
                        style={{...buttonStyle, backgroundColor: '#E0E7FF', color: '#4338CA', marginTop: '10px' }}
                    >
                        Add Lesson
                    </button>
                    
                    <hr style={{ margin: '20px 0' }} />
                    <button type="submit" style={{...buttonStyle, backgroundColor: '#4CAF50', color: 'white', width: '100%', padding: '15px' }}>Upload Course</button>
                    {message && <p style={{ textAlign: 'center', marginTop: '15px', color: message.includes('success') ? 'green' : 'red' }}>{message}</p>}
                </form>
            </main>
        </div>
    );
};

export default CourseUpload;
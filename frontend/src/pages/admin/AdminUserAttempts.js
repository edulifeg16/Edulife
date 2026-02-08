import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import AdminSidebar from '../../components/layout/AdminSidebar';

const AdminUserAttempts = () => {
    const { id } = useParams();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    const [quizTitles, setQuizTitles] = useState({});

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await axios.get(`http://localhost:5000/api/users/${id}`);
                setUser(res.data);
                // load quiz titles for any quizIds that are objects or ids
                const idsToFetch = new Set();
                (res.data.quizHistory || []).forEach(a => {
                    const q = a.quizId;
                    if (q && typeof q === 'string') idsToFetch.add(q);
                    if (q && q._id && !q.title) idsToFetch.add(q._id);
                });
                if (idsToFetch.size > 0) {
                    const titles = {};
                    await Promise.all(Array.from(idsToFetch).map(async (qid) => {
                        try {
                            const r = await axios.get(`http://localhost:5000/api/quizzes/${qid}`);
                            titles[qid] = r.data.title;
                        } catch (e) {
                            // ignore
                        }
                    }));
                    setQuizTitles(titles);
                }
            } catch (err) {
                setError('Failed to fetch user');
            } finally {
                setLoading(false);
            }
        };
        fetchUser();
    }, [id]);


    if (loading) return <div className="dashboard-layout"><AdminSidebar /><main className="main-content"><p>Loading...</p></main></div>;
    if (!user) return <div className="dashboard-layout"><AdminSidebar /><main className="main-content"><p>User not found.</p></main></div>;

    return (
        <div className="dashboard-layout">
            <AdminSidebar />
            <main className="main-content">
                <h1>Quiz Attempts for {user.name}</h1>
                {error && <p style={{ color: 'red' }}>{error}</p>}
                <h3>Quizzes Results</h3>
                <ul>
                    {user.quizHistory.map(a => {
                        const qid = typeof a.quizId === 'string' ? a.quizId : (a.quizId?._id || a.quizId);
                        const title = (typeof a.quizId === 'object' && a.quizId?.title) || quizTitles[qid] || qid;
                        return (
                            <li key={a._id} style={{ marginBottom: '8px' }}>
                                {title} — Score: {a.score}/{a.totalQuestions}
                            </li>
                        );
                    })}
                </ul>
            </main>
        </div>
    );
};

export default AdminUserAttempts;

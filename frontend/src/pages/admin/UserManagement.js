import React, { useState, useEffect } from 'react';
import api from '../../api/apiConfig';
import AdminSidebar from '../../components/layout/AdminSidebar';

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Function to fetch all users
    const fetchUsers = async () => {
        try {
            const response = await api.get('/admin/users');
            setUsers(response.data);
        } catch (err) {
            setError('Failed to fetch users.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    // Function to handle user deletion
    const handleDelete = async (userId) => {
        if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
            try {
                await api.delete(`/admin/users/${userId}`);
                // Refresh the user list after deletion
                fetchUsers();
            } catch (err) {
                setError('Failed to delete user.');
            }
        }
    };

    // Inline styles for better UI
    const tableStyle = { width: '100%', marginTop: '20px', borderCollapse: 'collapse' };
    const thStyle = { backgroundColor: '#F3F4F6', padding: '12px', textAlign: 'left', borderBottom: '2px solid #E5E7EB' };
    const tdStyle = { padding: '12px', borderBottom: '1px solid #E5E7EB' };
    const deleteBtnStyle = { backgroundColor: '#EF4444', color: 'white', padding: '8px 12px', border: 'none', borderRadius: '5px', cursor: 'pointer' };

    return (
        <div className="dashboard-layout">
            <AdminSidebar />
            <main className="main-content">
                <h1>User Management</h1>
                <p>View and manage all student accounts on the platform.</p>
                {error && <p style={{ color: 'red' }}>{error}</p>}
                {loading ? (
                    <p>Loading users...</p>
                ) : (
                    <table style={tableStyle}>
                        <thead>
                            <tr>
                                <th style={thStyle}>Name</th>
                                <th style={thStyle}>Email</th>
                                <th style={thStyle}>Class</th>
                                <th style={thStyle}>Disability Type</th>
                                <th style={thStyle}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.length > 0 ? (
                                users.map((user) => (
                                    <tr key={user._id}>
                                        <td style={tdStyle}>{user.name}</td>
                                        <td style={tdStyle}>{user.email}</td>
                                        <td style={tdStyle}>{user.standard}th</td>
                                        <td style={tdStyle}>{user.disabilityType}</td>
                                        <td style={tdStyle}>
                                            <button onClick={() => handleDelete(user._id)} style={deleteBtnStyle}>Delete</button>
                                            <a href={`/admin/user/${user._id}/attempts`} style={{ marginLeft: '8px' }}>Quiz Submitted</a>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" style={{...tdStyle, textAlign: 'center'}}>No users found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </main>
        </div>
    );
};

export default UserManagement;
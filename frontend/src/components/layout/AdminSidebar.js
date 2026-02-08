import React, { useContext } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

const AdminSidebar = () => {
  const { logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  return (
    <nav className="sidebar">
      <div className="logo">EduLife Admin</div>
      <ul>
        <li><NavLink to="/admin/dashboard">Dashboard</NavLink></li>
        <li><NavLink to="/admin/user-management">User Management</NavLink></li>
        <li><NavLink to="/admin/course-list">Course List</NavLink></li>
        <li><NavLink to="/admin/course-upload">Course Upload</NavLink></li>
        <li><NavLink to="/admin/quiz-list">Quiz List</NavLink></li>
        <li><NavLink to="/admin/quiz-upload">Quiz Upload</NavLink></li>
      </ul>
      <button onClick={handleLogout} className="sidebar-logout-button">
        Logout
      </button>
    </nav>
  );
};

export default AdminSidebar;
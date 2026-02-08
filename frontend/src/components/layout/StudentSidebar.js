import React, { useContext } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

const StudentSidebar = () => {
  const { logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  return (
    <nav className="sidebar">
      <div className="logo">EduLife</div>
      <ul>
        <li><NavLink to="/dashboard">Dashboard</NavLink></li>
        <li><NavLink to="/profile">Profile</NavLink></li>
        <li><NavLink to="/new-courses">New Courses</NavLink></li>
        <li><NavLink to="/courses-history">Courses History</NavLink></li>
        <li><NavLink to="/quizzes-history">Quizzes History</NavLink></li>
        <li><NavLink to="/settings">Settings</NavLink></li>
      </ul>
      <button onClick={handleLogout} className="sidebar-logout-button">
        Logout
      </button>
    </nav>
  );
};

export default StudentSidebar;
import React from 'react';

function Navbar({ onAuthClick }) {
  return (
    <nav className="navbar">
      <a href="#home" className="logo">EduLife</a>
      <div className="nav-links">
        <a href="#home">Home</a>
        <a href="#about">About Us</a>
        <a href="#features">Features</a>
        <a href="#disabilities">Disabilities</a>
        <a href="#contact">Contact</a>
      </div>
      <div className="auth-buttons">
        <button className="Login" onClick={onAuthClick}>Login</button>
        <button className="Signup" onClick={onAuthClick}>Sign Up</button>
      </div>
    </nav>
  );
}

export default Navbar;
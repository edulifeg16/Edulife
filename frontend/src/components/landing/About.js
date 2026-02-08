import React from 'react';
import aboutImage from '../../assets/about.png';

function AboutSection() {
  return (
    <section id="about" className="about-section">
      <div className="about-image-container">
        <img src={aboutImage} alt="Diverse group of people" className="about-image" />
      </div>
      <div className="about-content">
        <h2>About Our Mission</h2>
        <p>We are dedicated to creating a world where education is accessible to everyone, regardless of ability. Our platform is a labor of love, built to break down barriers and foster a truly inclusive learning environment. We believe in the power of technology to unlock potential.</p>
      </div>
    </section>
  );
}

export default AboutSection;
import React from 'react';
import heroImage from '../../assets/hero-icon.png';

function HeroSection() {
  return (
    <section id="home" className="hero-section">
      <div className="hero-content">
        <h1>Empowering Specially Abled Students to Learn and Grow</h1>
        <p>
          Discover a world of accessible courses, interactive tools, and a supportive community designed for your unique learning journey.
        </p>
        <div className="hero-buttons">
          <button className="get-started">Get Started</button>
          <button className="learn-more">Learn More</button>
        </div>
      </div>
      <div className="hero-image-container">
        <img src={heroImage} alt="Students learning together" className="hero-image" />
      </div>
    </section>
  );
}

export default HeroSection;
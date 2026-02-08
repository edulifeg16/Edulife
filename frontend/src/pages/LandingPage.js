import React from 'react';
import { useNavigate } from 'react-router-dom';

// Import all the section components for the landing page
import Navbar from '../components/landing/Navbar';
import HeroSection from '../components/landing/Hero';
import AboutSection from '../components/landing/About';
import FeaturesSection from '../components/landing/Features';
import DisabilitiesSection from '../components/landing/Disabilities';
import ContactSection from '../components/landing/Contact';
import Footer from '../components/landing/Footer';
import '../index.css'; // Ensure styles are applied

const LandingPage = () => {
  const navigate = useNavigate();

  // This function will be passed to the Navbar to handle clicks on Login/Sign Up
  const handleAuthClick = () => {
    navigate('/auth');
  };

  return (
    <div>
      <Navbar onAuthClick={handleAuthClick} />
      <main>
        <HeroSection />
        <FeaturesSection />
        <DisabilitiesSection />
        <AboutSection />
        <ContactSection />
      </main>
      <Footer />
    </div>
  );
};

export default LandingPage;
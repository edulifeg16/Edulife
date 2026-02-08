import React from 'react';
import MobilityIcon from '../../assets/mobility.png';
import VisualIcon from '../../assets/visual.png';
import HearingIcon from '../../assets/hearing.png';
import CognitiveIcon from '../../assets/cognitive.png';

const disabilitiesData = [
    {
      icon: MobilityIcon,
      title: "Mobility Impairments",
      description: "Seamless navigation with voice commands and assistive tools for a barrier-free experience."
    },
    {
      icon: VisualIcon,
      title: "Visual Impairments",
      description: "High-contrast themes, screen reader compatibility, and adjustable fonts for clear viewing."
    },
    {
      icon: HearingIcon,
      title: "Hearing Impairments",
      description: "Video transcripts, closed captions, and sign language modules for a complete learning experience."
    },
    {
      icon: CognitiveIcon,
      title: "Cognitive Challenges",
      description: "Tools for text summarization, gamified quizzes, and simplified interfaces to aid comprehension."
    }
];

function DisabilitiesSection() {
  return (
    <section id="disabilities" className="disabilities-section">
      <h2>Our Specialized Support</h2>
      <p className="disabilities-description">We offer tailored tools and resources to support students with diverse learning needs.</p>
      <div className="disability-cards">
        {disabilitiesData.map((disability, index) => (
          <div key={index} className="disability-card">
            <img src={disability.icon} alt={disability.title} className="disability-icon" />
            <h3>{disability.title}</h3>
            <p>{disability.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default DisabilitiesSection;
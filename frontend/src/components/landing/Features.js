import React from 'react';
import AccessibleIcon from '../../assets/accessible.png';
import CommunityIcon from '../../assets/community.png';
import PersonalizedIcon from '../../assets/personalized.png';

const featuresData = [
    {
      icon: AccessibleIcon,
      title: "Accessible Learning",
      description: "Courses designed with screen readers, adjustable fonts, and clear navigation in mind."
    },
    {
      icon: CommunityIcon,
      title: "Supportive Community",
      description: "Learn with ease through accessible and structured study content in a safe and inclusive environment."
    },
    {
      icon: PersonalizedIcon,
      title: "Personalized Paths",
      description: "Customized learning plans that adapt to each student's pace and needs."
    }
];

function FeaturesSection() {
  return (
    <section id="features" className="features-section">
      <h2>Key Features</h2>
      <p className="features-description">Our platform is built to provide an empowering and barrier-free learning experience.</p>
      <div className="feature-cards">
        {featuresData.map((feature, index) => (
          <div key={index} className="feature-card">
            <img src={feature.icon} alt={feature.title} className="feature-icon" />
            <h3>{feature.title}</h3>
            <p>{feature.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default FeaturesSection;
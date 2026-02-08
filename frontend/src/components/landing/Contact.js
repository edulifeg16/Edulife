import React from 'react';

function ContactSection() {
  return (
    <section id="contact" className="contact-section">
      <div className="contact-info">
        <p>
          <strong>Email:</strong>
          <a href="mailto:info@EduLife.org">info@EduLife.org</a>
        </p>
        <p>
          <strong>Telephone:</strong>
          <a href="tel:+15551234567">+91 7434579001</a>
        </p>
      </div>
    </section>
  );
}

export default ContactSection;
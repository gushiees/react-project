import React from 'react';
import './about.css';

const About = () => {
  // 🔧 Dynamic content (replace with API or database later)
  const aboutContent = {
    bannerImage: 'COMPANY.png',
    title: 'About ST. IVANS',
    intro: 'ST. IVANS is built with both purpose and passion – a place where we keep focused while helping others progress.',
    sections: [
      {
        heading: 'Company History',
        content: 'Founded in 2015, ST. IVANS has been helping clients live slightly better lives for the last decade.',
      },
      {
        heading: 'Mission',
        content: 'To simplify moments by providing simple, honest, digital tools and heartfelt service.',
      },
      {
        heading: 'Vision',
        content: 'We envision a future where we always help ST. IVANS customers experience meaningful solutions, anytime, anywhere.',
      },
      {
        heading: 'Values',
        content: [
          '🤝 Compassion: We serve with empathy, honoring every family’s story with dignity and care.',
          '🧠 Innovation: We embrace digital tools to simplify memorial planning and elevate service quality.',
          '🛡️ Integrity: We uphold trust through transparency, respect, and professional conduct.',
          '📱 Accessibility: We ensure every Filipino family can access respectful memorial solutions—anytime, anywhere.',
        ],
      },
    ],
    footer: '© 2025 ST. IVANS Memorial Services. All rights reserved.',
  };

  return (
    <div className="about-wrapper">
      {/* 🔷 Banner Image */}
      <div className="about-banner">
        <img src={aboutContent.bannerImage} alt="ST. IVANS Building" className="header-banner" />
      </div>

      {/* 🔷 Page Title */}
      <div className="about-header">
        <h1>{aboutContent.title}</h1>
        <p>{aboutContent.intro}</p>
      </div>

      {/* 🔷 Sections */}
      {aboutContent.sections.map((section, index) => (
        <section className="about-block" key={index}>
          <h2>{section.heading}</h2>
          {Array.isArray(section.content) ? (
            <ul>
              {section.content.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          ) : (
            <p>{section.content}</p>
          )}
        </section>
      ))}

      {/* 🔷 Footer */}
      <footer className="about-footer">
        <p>{aboutContent.footer}</p>
      </footer>
    </div>
  );
};

export default About;

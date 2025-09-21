import Footer from "../../components/footer/footer";
import Header from "../../components/header/header";
import React from 'react';
import './about.css';
import bannerImage from '../../assets/stivan10.png'; // ✅ Import from src/assets

const About = () => {
  const aboutContent = {
    bannerImage: bannerImage, // ✅ Use imported image
    title: 'About ST. IVANS',
    intro: 'ST. IVANS – Integrated Virtual Access to Necro Services is a digital funeral planning system built with purpose and compassion. We help Filipino families navigate loss with clarity, dignity, and ease.',
    sections: [
      {
        heading: 'Company History',
        content: 'Founded in 2025, ST. IVANS emerged in response to the increasing demand for accessible, customizable, and dignified funeral services in the Philippines. The platform was developed to address prevalent industry challenges, including limited service reach, inflexible package offerings, and manual coordination processes.',
      },
      {
        heading: 'Mission',
        content: 'To simplify the funeral planning process by providing digital tools, real-time updates, and compassionate service ensuring that every Filipino family is able to honor their loved ones with dignity, clarity, and without unnecessary burden.',
      },
      {
        heading: 'Vision',
        content: 'We envision a future where every Filipino has access to meaningful, customizable, and dignified funeral services anytime, anywhere through technology and compassion.',
      },
      {
        heading: 'Values',
        content: [
          '🤝 Compassion: We serve with empathy, honoring every family’s story with dignity and care.',
          '🧠 Innovation: We embrace digital tools to simplify memorial planning and elevate service quality.',
          '🛡️ Integrity: We uphold trust through transparency, respect, and professional conduct.',
          '📱 Accessibility: We ensure every Filipino family can access respectful memorial solutions anytime, anywhere.',
        ],
      },
    ],
    footer: '© 2025 ST. IVANS Memorial Services. All rights reserved.',
  };

  return (
    <div className="about-wrapper">
      <div className="about-banner">
        <img src={aboutContent.bannerImage} alt="ST. IVANS Building" className="header-banner" />
      </div>

      <div className="about-header">
        <h1>{aboutContent.title}</h1>
        <p>{aboutContent.intro}</p>
      </div>

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

      <footer className="about-footer">
        <p>{aboutContent.footer}</p>
      </footer>
    </div>
  );
};

export default About;

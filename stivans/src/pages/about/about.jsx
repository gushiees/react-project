// src/pages/About.js
import React, { useState } from "react";
import Header from "../../components/header/header";
import Footer from "../../components/footer/footer";
import bannerImage from "../../assets/stivan10.png";
import logoImage from "../../assets/stivanlogolight.png";
import "./about.css";



const About = () => {
  const [openIndex, setOpenIndex] = useState(null);

  const toggleSection = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const aboutContent = {
    sections: [
      {
        heading: "Our Mission",
        content:
          "To provide compassionate, dignified, and affordable funeral services that honor the life of every individual.",
      },
      {
        heading: "Our Vision",
        content:
          "To be the most trusted funeral service provider in the country, embracing innovation while preserving tradition.",
      },
      {
        heading: "Our Values",
        content: [
          {
            title: "Compassion and Respect",
            desc: "We treat every family with empathy and honor the dignity of every life."
          },
          {
            title: "Professionalism and Integrity",
            desc: "We maintain the highest standards of service, guided by honesty and transparency."
          },
          {
            title: "Affordability and Accessibility",
            desc: "We ensure that meaningful services are within reach for all families."
          },
          {
            title: "Innovation with Tradition",
            desc: "We embrace technology to improve our services while respecting cultural practices."
          },
        ],
        type: "values"
      },
      {
        heading: "Company History",
        content: [
          {
            year: "2020",
            event: "ST. IVANS Funeral Services was founded to provide dignified and accessible services.",
          },
          {
            year: "2022",
            event: "Expanded nationwide with partnerships across multiple regions.",
          },
          {
            year: "2023",
            event: "Launched digital platform for memorial planning.",
          },
          {
            year: "2025",
            event: "Introduced mobile app for real-time updates and planning.",
          },
        ],
        type: "timeline",
      },
      {
        heading: "Meet Our Team",
        content: [
          "John Doe – Founder & CEO",
          "Jane Smith – Operations Manager",
          "Michael Lee – Head of Client Services",
          "Sarah Johnson – Digital Platform Manager",
        ],
      },
      {
        heading: "Frequently Asked Questions",
        content: [
          {
            q: "What services do you offer?",
            a: "We offer funeral arrangements, cremation, memorial planning, and online tribute options."
          },
          {
            q: "How do I plan a funeral with ST. IVANS?",
            a: "You can visit our office, call our hotline, or use our digital platform to plan a service."
          },
          {
            q: "Do you offer online memorial options?",
            a: "Yes, we provide digital memorial pages and live-streaming services for loved ones afar."
          },
          {
            q: "Are your services available nationwide?",
            a: "Yes, we have expanded our reach across multiple regions in the country."
          }
        ],
        type: "faq"
      },
    ],
  };

  return (
    <section className="about">
      <Header />

      <div className="about-container">
        {/* Left Column (Image + Logo + Slogan) */}
       <div className="about-left">
       <div className="about-image-wrapper">
       <img src={bannerImage} alt="About ST. IVANS" className="about-image" />

         {/* Logo + Slogan Overlay */}
        <div className="about-overlay">
          <img src={logoImage} alt="ST. IVANS-Logo" className="about-logo" />
          <p className="about-slogan">Your Comfort To Heaven</p>
        </div>
      </div>
    </div>


        {/* Right Column (Accordion Info) */}
        <div className="about-right">
          {aboutContent.sections.map((section, index) => (
            <div className="about-block" key={index}>
              <button
                className="accordion-toggle"
                onClick={() => toggleSection(index)}
              >
                {section.heading}
                <span className={`arrow ${openIndex === index ? "open" : ""}`}>
                  &#9660;
                </span>
              </button>

              {openIndex === index && (
                <div className="about-block-content">
                  {/* Timeline */}
                  {section.type === "timeline" ? (
                    <div className="timeline">
                      <div className="timeline-container">
                        {section.content.map((item, i) => (
                          <div className="timeline-item" key={i}>
                            <div className="timeline-dot"></div>
                            <div className="timeline-content">
                              <div className="timeline-year">{item.year}</div>
                              <div className="timeline-event">{item.event}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : section.type === "values" ? (
                    <ul className="values-list">
                      {section.content.map((val, i) => (
                        <li key={i}>
                          <strong>{val.title}:</strong> {val.desc}
                        </li>
                      ))}
                    </ul>
                  ) : section.type === "faq" ? (
                    <div className="faq-section">
                      {section.content.map((faq, i) => (
                        <div className="faq-item" key={i}>
                          <div className="faq-question">{faq.q}</div>
                          <div className="faq-answer">{faq.a}</div>
                        </div>
                      ))}
                    </div>
                  ) : Array.isArray(section.content) ? (
                    <ul>
                      {section.content.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>{section.content}</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      <Footer />
    </section>
  );
};

export default About;

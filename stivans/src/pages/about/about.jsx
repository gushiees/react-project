// src/pages/about/about.jsx
import React, { useEffect, useState } from "react";
import Header from "../../components/header/header";
import Footer from "../../components/footer/footer";
import bannerImage from "../../assets/stivan10.png";
import logoImage from "../../assets/stivanlogolight.png";
import "./about.css";
import { supabase } from "../../supabaseClient";

export default function About() {
  const [openIndex, setOpenIndex] = useState(null);
  const toggleSection = (index) => setOpenIndex(openIndex === index ? null : index);

  // CMS state with safe defaults (your current hard-coded content)
  const [media, setMedia] = useState({
    image_url: "",
    logo_url: "",
    slogan: "Your Comfort To Heaven",
  });

  const [sections, setSections] = useState({
    mission:
      "To provide compassionate, dignified, and affordable funeral services that honor the life of every individual.",
    vision:
      "To be the most trusted funeral service provider in the country, embracing innovation while preserving tradition.",
    values: [
      { title: "Compassion and Respect", desc: "We treat every family with empathy and honor the dignity of every life." },
      { title: "Professionalism and Integrity", desc: "We maintain the highest standards of service, guided by honesty and transparency." },
      { title: "Affordability and Accessibility", desc: "We ensure that meaningful services are within reach for all families." },
      { title: "Innovation with Tradition", desc: "We embrace technology to improve our services while respecting cultural practices." },
    ],
    timeline: [
      { year: "2020", event: "ST. IVANS Funeral Services was founded to provide dignified and accessible services." },
      { year: "2022", event: "Expanded nationwide with partnerships across multiple regions." },
      { year: "2023", event: "Launched digital platform for memorial planning." },
      { year: "2025", event: "Introduced mobile app for real-time updates and planning." },
    ],
    team: [
      "John Doe – Founder & CEO",
      "Jane Smith – Operations Manager",
      "Michael Lee – Head of Client Services",
      "Sarah Johnson – Digital Platform Manager",
    ],
    faq: [
      { q: "What services do you offer?", a: "We offer funeral arrangements, cremation, memorial planning, and online tribute options." },
      { q: "How do I plan a funeral with ST. IVANS?", a: "You can visit our office, call our hotline, or use our digital platform to plan a service." },
      { q: "Do you offer online memorial options?", a: "Yes, we provide digital memorial pages and live-streaming services for loved ones afar." },
      { q: "Are your services available nationwide?", a: "Yes, we have expanded our reach across multiple regions in the country." },
    ],
  });

  // Fetch CMS (slug: 'about') → blocks: 'about_media' and 'about_sections'
  useEffect(() => {
    let cancelled = false;

    async function loadAboutFromCMS() {
      try {
        const { data: page, error: pageErr } = await supabase
          .from("cms_pages")
          .select("*")
          .eq("slug", "about")
          .maybeSingle();
        if (pageErr || !page?.id) return;

        const [{ data: mediaBlock }, { data: sectionsBlock }] = await Promise.all([
          supabase.from("cms_blocks").select("data").eq("page_id", page.id).eq("key", "about_media").maybeSingle(),
          supabase.from("cms_blocks").select("data").eq("page_id", page.id).eq("key", "about_sections").maybeSingle(),
        ]);

        if (cancelled) return;

        if (mediaBlock?.data) {
          setMedia((m) => ({
            image_url: mediaBlock.data.image_url || "",
            logo_url: mediaBlock.data.logo_url || "",
            slogan: mediaBlock.data.slogan || m.slogan,
          }));
        }

        if (sectionsBlock?.data) {
          const d = sectionsBlock.data || {};
          setSections((s) => ({
            mission: d.mission ?? s.mission,
            vision: d.vision ?? s.vision,
            values: Array.isArray(d.values) && d.values.length ? d.values : s.values,
            timeline: Array.isArray(d.timeline) && d.timeline.length ? d.timeline : s.timeline,
            team: Array.isArray(d.team) && d.team.length ? d.team : s.team,
            faq: Array.isArray(d.faq) && d.faq.length ? d.faq : s.faq,
          }));
        }
      } catch (e) {
        // keep defaults on any error
        console.warn("About CMS load failed:", e?.message || e);
      }
    }

    loadAboutFromCMS();
    return () => {
      cancelled = true;
    };
  }, []);

  // Build UI sections the same way your current component expects
  const uiSections = [
    { heading: "Our Mission", content: sections.mission },
    { heading: "Our Vision", content: sections.vision },
    { heading: "Our Values", content: sections.values, type: "values" },
    { heading: "Company History", content: sections.timeline, type: "timeline" },
    { heading: "Meet Our Team", content: sections.team },
    { heading: "Frequently Asked Questions", content: sections.faq, type: "faq" },
  ];

  const mainImageSrc = media.image_url || bannerImage;
  const logoSrc = media.logo_url || logoImage;
  const sloganText = media.slogan || "Your Comfort To Heaven";

  return (
    <section className="about">
      <Header />

      <div className="about-container">
        {/* Left Column (Image + Logo + Slogan) */}
        <div className="about-left">
          <div className="about-image-wrapper">
            <img src={mainImageSrc} alt="About ST. IVANS" className="about-image" />
            <div className="about-overlay">
              <img src={logoSrc} alt="ST. IVANS-Logo" className="about-logo" />
              <p className="about-slogan">{sloganText}</p>
            </div>
          </div>
        </div>

        {/* Right Column (Accordion Info) */}
        <div className="about-right">
          {uiSections.map((section, index) => (
            <div className="about-block" key={index}>
              <button className="accordion-toggle" onClick={() => setOpenIndex(openIndex === index ? null : index)}>
                {section.heading}
                <span className={`arrow ${openIndex === index ? "open" : ""}`}>&#9660;</span>
              </button>

              {openIndex === index && (
                <div className="about-block-content">
                  {section.type === "timeline" ? (
                    <div className="timeline">
                      <div className="timeline-container">
                        {(section.content || []).map((item, i) => (
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
                      {(section.content || []).map((val, i) => (
                        <li key={i}>
                          <strong>{val.title}:</strong> {val.desc}
                        </li>
                      ))}
                    </ul>
                  ) : section.type === "faq" ? (
                    <div className="faq-section">
                      {(section.content || []).map((faq, i) => (
                        <div className="faq-item" key={i}>
                          <div className="faq-question">{faq.q}</div>
                          <div className="faq-answer">{faq.a}</div>
                        </div>
                      ))}
                    </div>
                  ) : Array.isArray(section.content) ? (
                    <ul>
                      {(section.content || []).map((item, i) => <li key={i}>{item}</li>)}
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
}

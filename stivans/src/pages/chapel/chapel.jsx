import React, { useState } from "react";
import "./chapel.css";
import chapelImage from "../../assets/stivanschapels.png";
import cubaoImage from "../../assets/chapelcubao1.png";
import commonwealthImage from "../../assets/chapelcommonwealth.png";
import kamuningImage from "../../assets/chapelkamuning.png";
import { useUser } from "../../contexts/UserContext";
import Header from "../../components/header/header";
import Footer from "../../components/footer/footer";
import Button from "../../components/button/button";

const Chapels = () => {
  const { user } = useUser();

  const [showHeritage, setShowHeritage] = useState(false);
  const [showCommitment, setShowCommitment] = useState(false);
  const [showLocations, setShowLocations] = useState(false);

  return (
    <>
      <Header />
      <div className="chapels-page">
        {/* 🔷 Banner Section */}
        <header className="chapels-banner">
          <div className="banner-text">
            <h1>Honoring Every Life with Grace and Meaning</h1>
            <p>
              At ST. IVANS, we offer more than memorial services - we provide a sanctuary for remembrance, healing, and heartfelt farewells to families across Quezon City.
            </p>
          </div>
          <div className="banner-image">
            <img src={chapelImage} alt="ST. IVANS Chapel Building" />
          </div>
        </header>

        {/* 🔷 About ST. IVANS Section */}
        <section className="chapels-section">
          <h2> What Makes ST. IVANS Different </h2>

          <div className="info-toggle">
            <button
              onClick={() => setShowHeritage(!showHeritage)}
              className={`info-button ${showHeritage ? "active" : ""}`}
            >
              Our Heritage
            </button>
            {showHeritage && (
              <div className="info-content">
                <p>
                  Founded in 2025, ST. IVANS was born from a commitment to provide dignified and compassionate memorial care to the families of Quezon City. We blend time-honored tradition with modern innovation, offering professional memorial services alongside state-of-the-art cremation facilities at the ST. IVANS Crematorium. In our dedication to serving families in today's world, we have pioneered digital memorial solutions, including the ST. IVANS E-Burol, E-Libing, and Tribute platforms, ensuring that distance is no barrier to honoring a loved one.
                </p>
              </div>
            )}
          </div>

          <div className="info-toggle">
            <button
              onClick={() => setShowCommitment(!showCommitment)}
              className={`info-button ${showCommitment ? "active" : ""}`}
            >
              Our Commitment to Excellence and Community
            </button>
            {showCommitment && (
              <div className="info-content">
                <p>
                  We uphold excellence through continuous professional development, exemplified by our Embalmers’ Licensure Program (ELP) in partnership with F&M Review and Training Center. Our commitment extends to the community via CSR initiatives, including complimentary infant memorial services, clergy gift certificates, and the ST. IVANS Soul Trees Program.
                </p>
              </div>
            )}
          </div>

          <div className="info-toggle">
            <button
              onClick={() => setShowLocations(!showLocations)}
              className={`info-button ${showLocations ? "active" : ""}`}
            >
              Our Locations in Quezon City
            </button>
            {showLocations && (
              <div className="info-content">
                <p>
                  ST. IVANS operates several serene and modern chapels strategically located across Quezon City. You will find our welcoming facilities in key areas such as Commonwealth Avenue, Cubao, Kamuning, La Loma, Mayon, Novaliches, Sampaloc, and Quezon Avenue. Each location is designed to be a place of solace and remembrance, ensuring that every family in Quezon City has access to reliable, dignified, and superior-quality memorial services when they need them most.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* 🔷 Chapel Gallery */}
        <section className="chapels-section">
          <h2>Featured Chapels</h2>
          <div className="chapel-gallery">
            <div className="chapel-card">
              <img src={cubaoImage} alt="Cubao Chapel" />
              <h3>Cubao Chapel</h3>
              <p>
                Located near major transport hubs, Cubao Chapel offers a peaceful space with full air-conditioning and seating for up to 100 guests.
              </p>
            </div>

            <div className="chapel-card">
              <img src={commonwealthImage} alt="Commonwealth Chapel" />
              <h3>Commonwealth Chapel</h3>
              <p>
                Our flagship location along Commonwealth Avenue features modern interiors, AV equipment, and 24/7 service availability.
              </p>
            </div>

            <div className="chapel-card">
              <img src={kamuningImage} alt="Kamuning Chapel" />
              <h3>Kamuning Chapel</h3>
              <p>
                Kamuning Chapel is designed for intimate gatherings, with elegant lighting, private viewing rooms, and accessible parking.
              </p>
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
};

export default Chapels;

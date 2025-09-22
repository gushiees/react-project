import React from "react";
import "./chapel.css";
import chapelImage from "../../assets/stpeter-building.jpg";
import { useUser } from "../../contexts/UserContext";
import Header from "../../components/header/header";
import Footer from "../../components/footer/footer";
import Button from "../../components/button/button";

const Chapels = () => {
  const { user } = useUser();

  return (
    <>
      <Header />
      <div className="chapels-page">
        {/* 🔷 Banner Section */}
        <header className="chapels-banner">
          <div className="banner-text">
            <h1>Honoring Legacies with Dignity and Compassion</h1>
            <p>Dedicated to providing solace and respectful memorial services for families across Quezon City.</p>
          </div>
          <div className="banner-image">
            <img src={chapelImage} alt="ST. IVANS Chapel Building" />
          </div>
        </header>

        {/* 🔷 Introduction Section */}
        <section className="chapels-section">
          <h2>Our Heritage</h2>
          <p>
            Founded in 2025, ST. IVANS was born from a commitment to provide dignified and compassionate memorial care to the families of Quezon City. We blend time-honored tradition with modern innovation, offering professional memorial services alongside state-of-the-art cremation facilities at the ST. IVANS Crematorium. In our dedication to serving families in today's world, we have pioneered digital memorial solutions, including the ST. IVANS E-Burol, E-Libing, and Tribute platforms, ensuring that distance is no barrier to honoring a loved one.
          </p>
        </section>

        {/* 🔷 Educational Programs & CSR */}
        <section className="chapels-section">
          <h2>Our Commitment to Excellence and Community</h2>
          <p>
            Our pursuit of excellence is reflected in our commitment to professional development. Through our Embalmers’ Licensure Program (ELP), conducted in partnership with the esteemed F&M Review and Training Center, we ensure our team adheres to the highest international standards of care. Our service also extends into the heart of the community through our Corporate Social Responsibility (CSR) initiatives, which include complimentary Memorial Services for Infants, gift certificates for the Clergy, and the environmentally conscious ST. IVANS Soul Trees Program.
          </p>
        </section>

        {/* 🔷 Our Locations */}
        <section className="chapels-section">
          <h2>Our Locations in Quezon City</h2>
          <p>
            To serve every community within our city, ST. IVANS operates several serene and modern chapels strategically located across Quezon City. You will find our welcoming facilities in key areas such as Commonwealth Avenue, Cubao, Kamuning, La Loma, Mayon, Novaliches, Sampaloc, and Quezon Avenue. Each location is designed to be a place of solace and remembrance, ensuring that every family in Quezon City has access to reliable, dignified, and superior-quality memorial services when they need them most.
          </p>
        </section>
      </div>
      <Footer />
    </>
  );
};

export default Chapels;
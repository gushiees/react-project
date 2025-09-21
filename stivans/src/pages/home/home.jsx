import "./home.css";
import Header from "../../components/header/header";
import Footer from "../../components/footer/footer";
import Button from "../../components/button/button";
import homeCloud from "../../assets/home-cloud.jpg";

import svcFuneral from "../../assets/funeral.jpg";
import svcInsurance from "../../assets/insurance.jpg";
import svcChapel from "../../assets/chapel.jpg";

export default function Home() {
  return (
    <div className="home">
      <Header />

      {/* HERO */}
      <section className="hero" style={{ "--hero-h": "1080px" }}>
        <div
          className="hero__bg"
          style={{ backgroundImage: `url(${homeCloud})` }}
          role="img"
          aria-label="Clouds background"
        />
        <div className="hero__overlay" aria-hidden="true" />
        <div className="hero__content">
          <h1 className="hero__title">
            <span>Your Comfort</span>
            <span>to Heaven</span>
          </h1>
          <Button
            id="hero-get-started"
            type="secondary"
            label="Get Started"
            to="/signup"
            externalStyles="hero__cta"
          />
        </div>
      </section>

      {/* SERVICES */}
      <section className="slab slab--light">
        <div className="container">
          <h2 className="section-title">Services</h2>

          <div className="card-grid">
            {/* Funeral */}
            <article className="service-card">
              <img src={svcFuneral} alt="Funeral service" className="service-card__img" />
              <div className="service-card__shade" aria-hidden="true" />
              <div className="service-card__content">
                <h3 className="service-card__title">Funeral Service</h3>
                <p className="service-card__text">
                  Compassionate, end-to-end support so you can focus on remembrance
                  and healing.
                </p>
              </div>
            </article>

            {/* Insurance */}
            <article className="service-card">
              <img src={svcInsurance} alt="Life insurance" className="service-card__img" />
              <div className="service-card__shade" aria-hidden="true" />
              <div className="service-card__content">
                <h3 className="service-card__title">Life Insurance</h3>
                <p className="service-card__text">
                  Affordable protection designed for students and families—small
                  premiums, meaningful coverage.
                </p>
              </div>
            </article>

            {/* Chapels */}
            <article className="service-card">
              <img src={svcChapel} alt="Chapel interior" className="service-card__img" />
              <div className="service-card__shade" aria-hidden="true" />
              <div className="service-card__content">
                <h3 className="service-card__title">Chapels</h3>
                <p className="service-card__text">
                  Comfortable, dignified settings for quiet reflection and togetherness.
                </p>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section className="slab slab--white">
        <div className="container">
          <h2 className="section-title">About us</h2>

          <div className="about__grid">
            <div className="about__block">
              <h3 className="about__heading">Mission</h3>
              <p className="about__text">
                At St. Ivans, our mission is to honor every life with warmth, dignity,
                and meticulous care. We ease families’ burdens through compassionate
                memorial services and clear, accessible support—before, during, and
                after the goodbye.
              </p>
            </div>

            <div className="about__block">
              <h3 className="about__heading">Vision</h3>
              <p className="about__text">
                We envision a future where every family can create a meaningful,
                personal farewell. St. Ivans will be the most trusted companion in
                remembrance, uniting tradition with thoughtful, modern service so no
                one faces loss alone.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

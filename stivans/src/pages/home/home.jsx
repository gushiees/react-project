// src/pages/home/home.jsx
import "./home.css";
import Header from "../../components/header/header";
import Footer from "../../components/footer/footer";
import Button from "../../components/button/button";
import { Link } from "react-router-dom";
import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";

import homeCloud from "../../assets/home-cloud.jpg";
import svcFuneral from "../../assets/funeral.jpg";
import svcChapel from "../../assets/chapel.jpg";

export default function Home() {
  // --- CMS state ---
  const [hero, setHero] = useState(null);
  const [services, setServices] = useState(null);

  // Tawk.to
  useEffect(() => {
    var Tawk_API = Tawk_API || {},
      Tawk_LoadStart = new Date();
    (function () {
      var s1 = document.createElement("script"),
        s0 = document.getElementsByTagName("script")[0];
      s1.async = true;
      s1.src = "https://embed.tawk.to/68fe73d5f84a8619519af3dd/1j8gv8uuk";
      s1.charset = "UTF-8";
      s1.setAttribute("crossorigin", "*");
      s0.parentNode.insertBefore(s1, s0);
    })();
  }, []);

  // Load CMS blocks (hero + services) for 'home'
  useEffect(() => {
    (async () => {
      const pg = await supabase.from("cms_pages").select("id").eq("slug", "home").maybeSingle();
      const pageId = pg.data?.id;
      if (!pageId) return;

      const { data: blocks } = await supabase
        .from("cms_blocks")
        .select("key,data")
        .eq("page_id", pageId);

      const map = Object.fromEntries((blocks || []).map((b) => [b.key, b.data]));

      if (map.hero) setHero(map.hero);
      if (map.services) setServices(map.services);
    })();
  }, []);

  // derive hero values
  const heroHeadline = (hero?.headline || "Your Shepherd|to the Light").split("|");
  const heroBg = hero?.background_image_url || homeCloud;
  const heroCtaLabel = hero?.cta_label || "Begin Arrangements";
  const heroCtaHref = hero?.cta_href || "/login";

  // fallback cards if CMS not set
  const fallbackCards = [
    {
      title: "Funeral Service",
      text:
        "Compassionate, end-to-end support for families during life’s most difficult moments. We take care of the details from preparation to ceremony so you can focus on remembrance and healing.",
      href: "/catalog",
      image_url: svcFuneral,
    },
    {
      title: "Chapels",
      text:
        "Thoughtfully arranged spaces support quiet reflection, heartfelt tributes, and togetherness. Choose a setting that feels right for your family’s moment of remembrance.",
      href: "/chapels",
      image_url: svcChapel,
    },
  ];

  const cards = services?.cards?.length ? services.cards : fallbackCards;

  return (
    <div className="home">
      <Header />

      {/* HERO */}
      <section className="hero" style={{ "--hero-h": "1080px" }}>
        <div className="hero__bg" style={{ backgroundImage: `url(${heroBg})` }} role="img" aria-label="Clouds background" />
        <div className="hero__overlay" aria-hidden="true" />
        <div className="hero__content">
          <h1 className="hero__title">
            <span>{heroHeadline[0] || ""}</span>
            <span>{heroHeadline[1] || ""}</span>
          </h1>

          <Button id="hero-get-started" type="secondary" label={heroCtaLabel} to={heroCtaHref} externalStyles="hero__cta" />
        </div>
      </section>

      {/* SERVICES */}
      <section className="section services">
        <div className="container">
          <h2 className="section-title">Services</h2>

          <div className="card-grid">
            {cards.map((c, idx) => (
              <Link key={idx} to={c.href || "#"} className="service-card" aria-label={c.title || "Service"}>
                <img src={c.image_url || svcFuneral} alt="" className="service-card__img" />
                <div className="service-card__shade" aria-hidden="true" />
                <div className="service-card__content">
                  <h3 className="service-card__title">{c.title || "Service"}</h3>
                  <p className="service-card__text">{c.text || ""}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* OUR COMMITMENTS (unchanged) */}
      <section className="section commitments">
        <div className="container">
          <h2 className="section-title">Our Commitments</h2>
          <p className="commitments__intro">
            We are dedicated to providing support that is both professional and profoundly personal. Our promise is to stand by you with empathy and
            respect.
          </p>

          <div className="values-grid">
            <div className="value-item">
              <div className="value-item__icon">1</div>
              <h3 className="value-item__title">Compassionate Guidance</h3>
              <p className="value-item__text">
                We listen with empathy and walk alongside you, offering gentle guidance and understanding during every step of the journey.
              </p>
            </div>

            <div className="value-item">
              <div className="value-item__icon">2</div>
              <h3 className="value-item__title">Dignified Services</h3>
              <p className="value-item__text">
                Every detail is handled with the utmost respect and care, ensuring a service that honors the life and legacy of your loved one.
              </p>
            </div>

            <div className="value-item">
              <div className="value-item__icon">3</div>
              <h3 className="value-item__title">Lifelong Support</h3>
              <p className="value-item__text">
                Our commitment doesn't end with the service. We provide resources and support for grief and healing for as long as you need us.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

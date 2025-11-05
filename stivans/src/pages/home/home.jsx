import "./home.css";
import Header from "../../components/header/header";
import Footer from "../../components/footer/footer";
import Button from "../../components/button/button";
import { Link } from "react-router-dom";
// 1) React hooks
import React, { useEffect, useState } from "react";
// 2) Supabase client for CMS fetch
import { supabase } from "../../supabaseClient";

import homeCloud from "../../assets/home-cloud.jpg";
import svcFuneral from "../../assets/funeral.jpg";
import svcInsurance from "../../assets/insurance.jpg"; // kept as-is even if unused
import svcChapel from "../../assets/chapel.jpg";

export default function Home() {
  // Tawk.to (kept exactly as you had it)
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

  // ── NEW: minimal CMS state
  const [hero, setHero] = useState(null);

  // ── NEW: fetch only the 'home' hero block; fall back to your current content if none
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data: page, error: pErr } = await supabase
          .from("cms_pages")
          .select("id")
          .eq("slug", "home")
          .maybeSingle();
        if (pErr || !page?.id) return;

        const { data: blocks, error: bErr } = await supabase
          .from("cms_blocks")
          .select("key,data,sort_order")
          .eq("page_id", page.id)
          .order("sort_order", { ascending: true });

        if (bErr || !blocks) return;
        const heroBlock = blocks.find((b) => b.key === "hero");
        if (alive) setHero(heroBlock?.data || null);
      } catch {
        // swallow; fallbacks below will be used
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // ── NEW: derive hero values with fallbacks to your current hard-coded UI
  const bgUrl = hero?.background_image_url || homeCloud;
  const ctaLabel = hero?.cta_label || "Begin Arrangements";
  const ctaHref = hero?.cta_href || "/login";

  // Keep your 2-line title; if CMS headline contains "|" or line breaks, split into two lines.
  let line1 = "Your Shepherd";
  let line2 = "to the Light";
  if (hero?.headline) {
    const raw = String(hero.headline);
    if (raw.includes("|")) {
      const [a, b] = raw.split("|");
      line1 = (a || "").trim() || line1;
      line2 = (b || "").trim() || "";
    } else if (raw.includes("\n")) {
      const [a, ...rest] = raw.split("\n");
      line1 = (a || "").trim() || line1;
      line2 = rest.join(" ").trim();
    } else {
      // single-line headline => show it as the first line and keep your second line
      line1 = raw.trim() || line1;
    }
  }

  return (
    <div className="home">
      <Header />

      {/* HERO */}
      <section className="hero" style={{ "--hero-h": "1080px" }}>
        <div
          className="hero__bg"
          style={{ backgroundImage: `url(${bgUrl})` }}
          role="img"
          aria-label="Clouds background"
        />
        <div className="hero__overlay" aria-hidden="true" />
        <div className="hero__content">
          <h1 className="hero__title">
            <span>{line1}</span>
            <span>{line2}</span>
          </h1>

          <Button
            id="hero-get-started"
            type="secondary"
            label={ctaLabel}
            to={ctaHref}
            externalStyles="hero__cta"
          />
        </div>
      </section>

      {/* SERVICES (Original Layout) */}
      <section className="section services">
        <div className="container">
          <h2 className="section-title">Services</h2>

          <div className="card-grid">
            {/* Funeral */}
            <Link to="/catalog" className="service-card" aria-label="Funeral Service">
              <img src={svcFuneral} alt="" className="service-card__img" />
              <div className="service-card__shade" aria-hidden="true" />
              <div className="service-card__content">
                <h3 className="service-card__title">Funeral Service</h3>
                <p className="service-card__text">
                  Compassionate, end-to-end support for families during life’s most difficult
                  moments. We take care of the details from preparation to ceremony so you can
                  focus on remembrance and healing.
                </p>
              </div>
            </Link>

            {/* Chapels */}
            <Link to="/chapels" className="service-card" aria-label="Chapels">
              <img src={svcChapel} alt="" className="service-card__img" />
              <div className="service-card__shade" aria-hidden="true" />
              <div className="service-card__content">
                <h3 className="service-card__title">Chapels</h3>
                <p className="service-card__text">
                  Thoughtfully arranged spaces support quiet reflection, heartfelt tributes, and
                  togetherness. Choose a setting that feels right for your family’s moment of
                  remembrance.
                </p>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* OUR COMMITMENTS */}
      <section className="section commitments">
        <div className="container">
          <h2 className="section-title">Our Commitments</h2>
          <p className="commitments__intro">
            We are dedicated to providing support that is both professional and profoundly
            personal. Our promise is to stand by you with empathy and respect.
          </p>

          <div className="values-grid">
            {/* Value 1 */}
            <div className="value-item">
              <div className="value-item__icon">1</div>
              <h3 className="value-item__title">Compassionate Guidance</h3>
              <p className="value-item__text">
                We listen with empathy and walk alongside you, offering gentle guidance and
                understanding during every step of the journey.
              </p>
            </div>

            {/* Value 2 */}
            <div className="value-item">
              <div className="value-item__icon">2</div>
              <h3 className="value-item__title">Dignified Services</h3>
              <p className="value-item__text">
                Every detail is handled with the utmost respect and care, ensuring a service that
                honors the life and legacy of your loved one.
              </p>
            </div>

            {/* Value 3 */}
            <div className="value-item">
              <div className="value-item__icon">3</div>
              <h3 className="value-item__title">Lifelong Support</h3>
              <p className="value-item__text">
                Our commitment doesn't end with the service. We provide resources and support for
                grief and healing for as long as you need us.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

import { useEffect } from "react";
import "./insurance.css";
import Header from "../../components/header/header";
import Footer from "../../components/footer/footer";
import Button from "../../components/button/button";

import bgBasic from "../../assets/ins-basic.jpg";
import bgFamily from "../../assets/ins-family.jpg";
import bgPremium from "../../assets/ins-premium.jpg";

export default function Insurance() {
  useEffect(() => {
    // Reveal-on-scroll for elements with data-reveal
    const revealEls = Array.from(document.querySelectorAll("[data-reveal]"));
    const revealObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("is-revealed");
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.08 }
    );
    revealEls.forEach((el) => revealObs.observe(el));

    // Zoom background when section is in view
    const offerSections = Array.from(document.querySelectorAll(".offer"));
    const offerObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          entry.target.classList.toggle("is-inview", entry.isIntersecting);
        });
      },
      { threshold: 0.35 }
    );
    offerSections.forEach((sec) => offerObs.observe(sec));

    return () => {
      revealObs.disconnect();
      offerObs.disconnect();
    };
  }, []);

  return (
    <div className="insurance">
      <Header />

      {/* INTRO */}
      <section className="ins-intro">
        <div className="ins-container">
          <h1 className="ins-intro__title" data-reveal style={{ "--d": "0ms" }}>
            Life Insurance (Micro-Insurance)
          </h1>
          <p className="ins-intro__text" data-reveal style={{ "--d": "80ms" }}>
            Practical, affordable protection tailored for real families. St. Ivans micro-insurance
            plans pair seamlessly with our funeral services—keeping support simple when it matters most.
          </p>

          <nav className="ins-intro__nav" aria-label="Insurance sections" data-reveal style={{ "--d": "160ms" }}>
            <a href="#basic" className="ins-intro__link">Basic Protection</a>
            <a href="#family" className="ins-intro__link">Family Protection</a>
            <a href="#premium" className="ins-intro__link">Premium Legacy</a>
          </nav>
        </div>
      </section>

      {/* BASIC PROTECTION */}
      <section
        id="basic"
        className="offer offer--basic"
        style={{ backgroundImage: `url(${bgBasic})` }}
        aria-labelledby="offer-basic-title"
        role="region"
      >
        <div className="offer__overlay" aria-hidden="true" />
        <div className="offer__content">
          <h2 id="offer-basic-title" className="offer__title" data-reveal style={{ "--d": "0ms" }}>
            Basic Protection
          </h2>
          <p className="offer__subtitle" data-reveal style={{ "--d": "80ms" }}>
            Entry-level coverage for individuals who want simple, essential protection.
          </p>

          <ul className="offer__benefits" data-reveal style={{ "--d": "140ms" }}>
            <li>✔ Low monthly premium, straightforward enrollment</li>
            <li>✔ Coverage for natural and accidental death</li>
            <li>✔ Bundled guidance with St. Ivans funeral services</li>
            <li>✔ Fast claims support with minimal paperwork</li>
          </ul>

          <div className="offer__actions" data-reveal style={{ "--d": "200ms" }}>
            <Button id="basic-learn" type="secondary" label="Learn More" to="/contact" />
            <Button id="basic-start" type="secondary" label="Get Started" to="/signup" />
          </div>
        </div>
      </section>

      {/* FAMILY PROTECTION */}
      <section
        id="family"
        className="offer offer--family"
        style={{ backgroundImage: `url(${bgFamily})` }}
        aria-labelledby="offer-family-title"
        role="region"
      >
        <div className="offer__overlay" aria-hidden="true" />
        <div className="offer__content">
          <h2 id="offer-family-title" className="offer__title" data-reveal style={{ "--d": "0ms" }}>
            Family Protection
          </h2>
          <p className="offer__subtitle" data-reveal style={{ "--d": "80ms" }}>
            Practical coverage for households—flexible beneficiaries and smooth support.
          </p>

          <ul className="offer__benefits" data-reveal style={{ "--d": "140ms" }}>
            <li>✔ Affordable rates for couples or small families</li>
            <li>✔ Add beneficiaries without complex forms</li>
            <li>✔ Seamless coordination with funerals and memorial needs</li>
            <li>✔ Guidance from a dedicated St. Ivans coordinator</li>
          </ul>

          <div className="offer__actions" data-reveal style={{ "--d": "200ms" }}>
            <Button id="family-learn" type="secondary" label="Learn More" to="/contact" />
            <Button id="family-start" type="secondary" label="Get Started" to="/signup" />
          </div>
        </div>
      </section>

      {/* PREMIUM LEGACY */}
      <section
        id="premium"
        className="offer offer--premium"
        style={{ backgroundImage: `url(${bgPremium})` }}
        aria-labelledby="offer-premium-title"
        role="region"
      >
        <div className="offer__overlay" aria-hidden="true" />
        <div className="offer__content">
          <h2 id="offer-premium-title" className="offer__title" data-reveal style={{ "--d": "0ms" }}>
            Premium Legacy
          </h2>
          <p className="offer__subtitle" data-reveal style={{ "--d": "80ms" }}>
            Elevated protection with enhanced assistance for planning, tribute, and continuity.
          </p>

          <ul className="offer__benefits" data-reveal style={{ "--d": "140ms" }}>
            <li>✔ Higher coverage while staying budget-friendly</li>
            <li>✔ Priority claims handling and support</li>
            <li>✔ Enhanced memorial coordination with add-on tributes</li>
            <li>✔ Flexible options for legacy and remembrance needs</li>
          </ul>

          <div className="offer__actions" data-reveal style={{ "--d": "200ms" }}>
            <Button id="premium-learn" type="secondary" label="Learn More" to="/contact" />
            <Button id="premium-start" type="secondary" label="Get Started" to="/signup" />
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

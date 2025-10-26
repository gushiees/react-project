import "./home.css";
import Header from "../../components/header/header";
import Footer from "../../components/footer/footer";
import Button from "../../components/button/button";
import { Link } from "react-router-dom";
// 1. Import 'useEffect'
import React, { useEffect } from 'react'; 

import homeCloud from "../../assets/home-cloud.jpg";
import svcFuneral from "../../assets/funeral.jpg";
import svcInsurance from "../../assets/insurance.jpg"; // Nakita kong hindi ginamit pero import, okay lang.
import svcChapel from "../../assets/chapel.jpg";

// 2. Palitan ang 'export default function Home()' ng 'export default function Home()' na may 'React' import.
export default function Home() {
    // 3. I-paste ang tawk.to code sa loob ng useEffect
    useEffect(() => {
        var Tawk_API = Tawk_API || {},
            Tawk_LoadStart = new Date();
        (function () {
            var s1 = document.createElement("script"),
                s0 = document.getElementsByTagName("script")[0];
            s1.async = true;
            s1.src = 'https://embed.tawk.to/68fe73d5f84a8619519af3dd/1j8gv8uuk';
            s1.charset = 'UTF-8';
            s1.setAttribute('crossorigin', '*');
            s0.parentNode.insertBefore(s1, s0);
        })();
    }, []); // Ang empty array '[]' ay nagsisigurong isang beses lang ito lalabas (pagkatapos ng initial render).

    return (
        <div className="home">
            <Header />

            {/* HERO */}
            {/* ... (Yung iba pang code mo dito) ... */}

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
                        <span>Your Shepherd</span>
                        <span>to the Light</span>
                    </h1>

                    <Button
                        id="hero-get-started"
                        type="secondary"
                        label="Begin Arrangements"
                        to="/login"
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
                                    Compassionate, end-to-end support for families during life’s most difficult moments.
                                    We take care of the details from preparation to ceremony so you can focus on
                                    remembrance and healing.
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

            {/* ======================================= */}
            {/* OUR COMMITMENTS */}
            {/* ======================================= */}
            <section className="section commitments">
                <div className="container">
                    <h2 className="section-title">Our Commitments</h2>
                    <p className="commitments__intro">
                        We are dedicated to providing support that is both professional and profoundly personal. 
                        Our promise is to stand by you with empathy and respect.
                    </p>
                    
                    <div className="values-grid">
                        {/* Value 1 */}
                        <div className="value-item">
                            <div className="value-item__icon">1</div>
                            <h3 className="value-item__title">Compassionate Guidance</h3>
                            <p className="value-item__text">
                                We listen with empathy and walk alongside you, offering gentle guidance and understanding 
                                during every step of the journey.
                            </p>
                        </div>

                        {/* Value 2 */}
                        <div className="value-item">
                            <div className="value-item__icon">2</div>
                            <h3 className="value-item__title">Dignified Services</h3>
                            <p className="value-item__text">
                                Every detail is handled with the utmost respect and care, ensuring a service that honors 
                                the life and legacy of your loved one.
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
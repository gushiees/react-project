import "./insurance.css";
import Header from "../../components/header/header";
import Footer from "../../components/footer/footer";

export default function Insurance() {
  return (
    <div className="insurance">
      <Header />

      {/* Top band */}
      <section className="insurance__hero">
        <div className="insurance__container">
          <h1 className="insurance__title">Life Insurance</h1>
          <p className="insurance__intro">
            Affordable protection designed for students and families—small premiums,
            meaningful coverage. Our micro-insurance pairs seamlessly with our services
            to make support simple when it matters most.
          </p>
        </div>
      </section>

      {/* Content area (fill in with plans, FAQs, etc.) */}
      <section className="insurance__content">
        <div className="insurance__container">
          <div className="insurance__placeholder">
            <p>Add plan cards, coverage info, and FAQs here.</p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

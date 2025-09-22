import "./chapel.css";
import Header from "../../components/header/header";
import Footer from "../../components/footer/footer";

export default function Chapel() {
  return (
    <div className="chapel">
      <Header />

      {/* Simple header band */}
      <section className="chapel__hero">
        <div className="chapel__container">
          <h1 className="chapel__title">Chapels</h1>
          <p className="chapel__intro">
            A serene, welcoming chapel designed to bring comfort and calm to your gathering.
            Thoughtfully arranged spaces support quiet reflection, heartfelt tributes, and togetherness.
          </p>
        </div>
      </section>

      {/* Content area (fill in later with real chapels, photos, map, etc.) */}
      <section className="chapel__content">
        <div className="chapel__container">
          <div className="chapel__placeholder">
            <p>Start building your chapel list or details here.</p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

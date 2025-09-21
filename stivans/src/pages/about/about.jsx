import Footer from "../../components/footer/footer";
import Header from "../../components/header/header"
import "./about.css";

export default function About() {
  console.log("Rendering ABOUT");     // quick debug
  return (
    <div className="about">
      <Header/>
      <h1>About page content</h1>
      <Footer/>
    </div>
  );
}

import "./home.css";
import Header from "../../components/header/header";
import Footer from "../../components/footer/footer";

export default function Home() {
  console.log("Rendering HOME");
  return (
    <div className="home">
      <Header/>
      <h1>This is home</h1>
      <Footer/>
    </div>
  );
}

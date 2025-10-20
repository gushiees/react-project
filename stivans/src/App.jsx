// src/App.jsx
import { Outlet } from "react-router-dom";
import ScrollToTop from "./routes/ScrollToTop";
import ChatbotLauncher from "./components/Chatbot/ChatbotLauncher.jsx";
import ToasterComponent from "./components/Toaster/Toaster.jsx"; // Import the Toaster

export default function App() {
  return (
    <>
      <ScrollToTop />
      {/* Add the ToasterComponent here so it's available everywhere */}
      <ToasterComponent />
      <main className="page">
        <Outlet />
        <ChatbotLauncher />
      </main>
    </>
  );
}

// src/App.jsx
import { Outlet } from "react-router-dom";
import ScrollToTop from "./routes/ScrollToTop";
import ChatbotLauncher from "./components/Chatbot/ChatbotLauncher.jsx";

export default function App() {
  return (
    <>
      <ScrollToTop />
      <main className="page">
        <Outlet />
        <ChatbotLauncher />
      </main>
    </>
  );
}

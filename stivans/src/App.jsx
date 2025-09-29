// src/App.jsx
import { Outlet } from "react-router-dom";
import ScrollToTop from "./routes/ScrollToTop";

export default function App() {
  return (
    <>
      <ScrollToTop />
      <main className="page">
        <Outlet />
      </main>
    </>
  );
}

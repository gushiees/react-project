import { Outlet } from "react-router-dom";
import ScrollToTop from "./routes/ScrollToTop";

export default function App() {
  return (
    <div>
      {/* Ensure window scrolls to top on every route change */}
      <ScrollToTop />
      <main>
        <Outlet />
      </main>
    </div>
  );
}

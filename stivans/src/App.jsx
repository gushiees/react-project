import { Outlet } from "react-router-dom";

export default function App() {
  return (
    <div>
      <main>
        <Outlet />   {/* Home or About renders here */}
      </main>
    </div>
  );
}

// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import App from "./App.jsx";
import "./index.css";

// Pages
import Home from "./pages/home/home.jsx";
import About from "./pages/about/about.jsx";
import Login from "./pages/login/login.jsx";
import Profile from "./pages/profile/profile.jsx";
import Signup from "./pages/signup/signup.jsx";
import Chapel from "./pages/chapel/chapel.jsx"
import Insurance from "./pages/insurance/insurance.jsx";

// Auth
import { AuthProvider } from "./AuthContext.jsx";
import ProtectedRoute from "./routes/ProtectedRoute.jsx";

// ✅ Add this line to enable dynamic user context
import { UserProvider } from "./contexts/UserContext.jsx";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />, // your layout with <Outlet />
    children: [
      // ✅ Default route → Home
      { index: true, element: <Home /> },

      // Public routes
      { path: "about", element: <About /> },
      { path: "login", element: <Login /> },
      { path: "chapels", element: <Chapel /> },
      { path: "signup", element: <Signup /> },
      { path: "profile", element: <Profile /> },
      { path: "insurance", element: <Insurance /> },

      // ✅ Protected wrapper: everything inside requires auth
      {
        element: <ProtectedRoute />,
        children: [
          { path: "profile/*", element: <Profile /> },
          // add more private routes here
        ],
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {/* ✅ Wrap with both Auth and User context */}
    <AuthProvider>
      <UserProvider>
        <RouterProvider router={router} />
      </UserProvider>
    </AuthProvider>
  </React.StrictMode>
);

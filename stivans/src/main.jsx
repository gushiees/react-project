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
import Profile from "./pages/account/profile.jsx";

// Auth
import { AuthProvider } from "./AuthContext.jsx";
import ProtectedRoute from "./routes/ProtectedRoute.jsx";

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

      // ✅ Protected wrapper: everything inside requires auth
      {
        element: <ProtectedRoute />,
        children: [
          { path: "profile", element: <Profile /> },
          // add more private routes here
        ],
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {/* Wrap the entire router so all routes can use useAuth() */}
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </React.StrictMode>
);

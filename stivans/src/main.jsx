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
import Chapel from "./pages/chapel/chapel.jsx";
import Insurance from "./pages/insurance/insurance.jsx";
import Admin from "./pages/admin/admin.jsx";
import AdminLogin from "./pages/admin/adminlogin.jsx";
import Cart from "./pages/cart/cart.jsx";
import Checkout from "./pages/checkout/checkout.jsx";
import Catalog from "./pages/catalog/catalog.jsx";
import ProductDetail from "./pages/product/productdetail.jsx";

// Auth / Context
import { AuthProvider } from "./AuthContext.jsx";
import ProtectedRoute from "./routes/ProtectedRoute.jsx";
import { UserProvider } from "./contexts/UserContext.jsx";
import { CartProvider } from "./contexts/cartContext.jsx";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <Home /> },

      // Public routes
      { path: "catalog", element: <Catalog /> },
      { path: "catalog/:id", element: <ProductDetail /> },
      { path: "about", element: <About /> },
      { path: "login", element: <Login /> },
      { path: "signup", element: <Signup /> },
      { path: "chapels", element: <Chapel /> },
      { path: "insurance", element: <Insurance /> },
      { path: "admin/login", element: <AdminLogin /> },
      { path: "cart", element: <Cart /> },
      { path: "checkout", element: <Checkout /> }, // ✅ added properly

      // Protected routes
      {
        element: <ProtectedRoute />,
        children: [
          { path: "profile/*", element: <Profile /> },
          { path: "admin", element: <Admin /> },
          // If you want checkout to require login later, move it here:
          // { path: "checkout", element: <Checkout /> },
        ],
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <UserProvider>
        <CartProvider>
          <RouterProvider router={router} />
        </CartProvider>
      </UserProvider>
    </AuthProvider>
  </React.StrictMode>
);

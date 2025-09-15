🕊️ St. Ivans — Funeral Services & Insurance (React + Vite)

This project is a web application built with React, powered by Vite for fast development, and React Router for navigation.
It provides the foundation for St. Ivans’ funeral service & insurance platform with modular pages and reusable components.



📦 Tech Stack

⚛️ React — UI library

⚡ Vite — build tool & dev server

🔀 React Router — routing system for multiple pages

🎨 CSS Modules — custom styling per component/page



🛠️ Git & GitHub — version control

🚀 Getting Started
1. Clone the repository
git clone https://github.com/<your-org>/<your-repo>.git
cd <your-repo>

2. Install dependencies
npm install

3. Run the development server
npm run dev


Then open http://localhost:5173
 in your browser.

🔀 Project Structure
src/
 ┣ components/        # Reusable UI (e.g., Header, Footer)
 ┣ pages/             # Individual pages
 ┃ ┣ home/            # Home page (Home.jsx + home.css)
 ┃ ┣ about/           # About page
 ┃ ┣ contact/         # Contact page
 ┃ ┗ insurance/       # Insurance bundles page
 ┣ App.jsx            # Layout wrapper (includes <Outlet/>)
 ┣ main.jsx           # Router setup & app entry
 ┗ index.css          # Global styles / reset

🛣️ Routing Setup

We use React Router v6 with createBrowserRouter.

main.jsx

import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import App from "./App.jsx";
import Home from "./pages/home/Home.jsx";
import About from "./pages/about/About.jsx";
import Contact from "./pages/contact/Contact.jsx";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <Home /> },
      { path: "about", element: <About /> },
      { path: "contact", element: <Contact /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);


App.jsx

import { Outlet } from "react-router-dom";
import Header from "./components/header/Header";
import Footer from "./components/footer/Footer";

export default function App() {
  return (
    <div>
      <Header />
      <main>
        <Outlet /> {/* page content here */}
      </main>
      <Footer />
    </div>
  );
}

🖥️ Git Workflow
Stage → Commit → Push

Stage all changes

git add .




Commit with a message

git commit -m "Add Home page and Footer component"




Push to GitHub

git push origin main

Common commands

git status → check modified files

git pull → get the latest changes from remote

git log → see commit history



📄 Conventions

Components live in src/components with their own CSS file.

Pages live in src/pages/<PageName>/<PageName>.jsx.

Use PascalCase for React components (Home.jsx, Header.jsx).

Use kebab-case for CSS files (home.css, footer.css).



✅ Next Steps

Add API integrations (Supabase, payment APIs).

Setup authentication (login → profile page).

Add unit tests.

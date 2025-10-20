// src/App.jsx
import { Outlet } from "react-router-dom";
import ScrollToTop from "./routes/ScrollToTop";
import ChatbotLauncher from "./components/Chatbot/ChatbotLauncher.jsx";
import { Toaster } from 'react-hot-toast'; // Import Toaster

export default function App() {
  return (
    <>
      <ScrollToTop />
      {/* --- Updated Toaster Configuration --- */}
      <Toaster
        position="bottom-left" // Position toasts at the bottom-left
        toastOptions={{
          // Default options for all toasts
          duration: 4000, // Show for 4 seconds
          style: {
            // --- Increased Size ---
            fontSize: '1rem', // Larger font size (e.g., 16px)
            padding: '1rem 1.5rem', // More padding
            minWidth: '300px', // Adjusted minimum width
            // --- End Increased Size ---
            background: '#333', // Dark background
            color: '#fff', // White text
            borderRadius: '6px',
            boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
          },
          // Default options for specific types
          success: {
            style: {
              background: '#16a34a', // Green background for success
              color: '#ffffff',
              // Inherits size adjustments from default style above
              fontSize: '1rem',
              padding: '1rem 1.5rem',
            },
            iconTheme: {
                primary: '#ffffff', // White checkmark
                secondary: '#16a34a', // Green circle
            },
          },
          error: {
            style: {
              background: '#e53e3e', // Red background for error
              color: '#ffffff',
               // Inherits size adjustments from default style above
              fontSize: '1rem',
              padding: '1rem 1.5rem',
            },
             iconTheme: {
                primary: '#ffffff', // White X
                secondary: '#e53e3e', // Red circle
            },
          },
        }}
      />
      {/* --- End Toaster --- */}

      <main className="page">
        <Outlet />
        <ChatbotLauncher />
      </main>
    </>
  );
}
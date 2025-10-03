import { lazy, Suspense, useEffect, useState } from "react";

// ✅ case-sensitive path, and the file must default-export the component
const Chatbot = lazy(() => import("./Chatbot.jsx"));

export default function ChatbotLauncher() {
  const [open, setOpen] = useState(false);

  // Preload the bundle when idle so the first open is instant
  useEffect(() => {
    const preload = () => import("./Chatbot.jsx");
    if ("requestIdleCallback" in window) {
      // @ts-ignore
      requestIdleCallback(preload, { timeout: 2000 });
    } else {
      setTimeout(preload, 1500);
    }
  }, []);

  return (
    <>
      {/* Floating action button */}
      <button
        className="cbt-fab"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <span className="cbt-fab-dot" />
        Chat
      </button>

      {/* Modal + overlay */}
      {open && (
        <Suspense
          fallback={
            <div className="cbt-modal cbt-skel" role="dialog" aria-label="Loading chat…">
              <div className="cbt-head"><div className="cbt-title">Loading…</div></div>
              <div className="cbt-body" />
              <div className="cbt-foot" />
            </div>
          }
        >
          <div className="cbt-overlay" onClick={() => setOpen(false)} />
          <Chatbot onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </>
  );
}

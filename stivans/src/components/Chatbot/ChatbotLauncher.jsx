import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import "./chatbot.css";

// Lazy import
const LazyChatbot = lazy(() => import("./Chatbot.jsx"));

export default function ChatbotLauncher() {
  const [open, setOpen] = useState(false);

  // ✅ Preload the module when the browser is idle (or after a small timeout fallback)
  useEffect(() => {
    const preload = () => import("./Chatbot.jsx");
    if ("requestIdleCallback" in window) {
      // @ts-ignore
      requestIdleCallback(preload, { timeout: 2000 });
    } else {
      setTimeout(preload, 1200);
    }
  }, []);

  const toggle = () => setOpen((v) => !v);
  const close = () => setOpen(false);

  // Keep the button instance stable
  const button = useMemo(
    () => (
      <button className="chat-fab" onClick={toggle} aria-label="Open chat">
        💬
      </button>
    ),
    [] // eslint-disable-line
  );

  return (
    <>
      {button}
      {open && (
        <Suspense fallback={null}>
          <LazyChatbot open={open} onClose={close} />
        </Suspense>
      )}
    </>
  );
}

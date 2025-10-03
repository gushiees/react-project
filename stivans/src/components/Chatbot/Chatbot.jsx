import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Minimal, safe Chatbot panel (modal) with:
 * - interval cleanup on unmount
 * - abortable fetch for messages
 * - ESC to close, click-outside to close
 * - simple body scroll lock
 */
export default function Chatbot({ open, onClose }) {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hi! How can I help you today?" },
  ]);
  const [input, setInput] = useState("");
  const abortRef = useRef(null);
  const modalRef = useRef(null);

  // Body scroll lock
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Interval (e.g., keepalive/ping) – cleaned up on unmount
  useEffect(() => {
    if (!open) return;
    const t = setInterval(() => {
      // example: ping or analytics heartbeat
      // console.debug("chat heartbeat");
    }, 30000);
    return () => clearInterval(t);
  }, [open]);

  // ESC to close + click-outside to close
  useEffect(() => {
    if (!open) return;

    const onKey = (e) => e.key === "Escape" && onClose?.();
    const onClick = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) onClose?.();
    };

    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open, onClose]);

  // Abort any inflight request when closing/unmounting
  useEffect(() => {
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, []);

  async function handleSend(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;

    // add user message
    setMessages((m) => [...m, { role: "user", content: text }]);
    setInput("");

    // abort any previous
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      // Replace this with your real endpoint
      const res = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, { role: "user", content: text }] }),
        signal: ctrl.signal,
      });

      if (!res.ok) throw new Error("Failed to get reply");
      const data = await res.json();

      setMessages((m) => [
        ...m,
        { role: "assistant", content: data.reply ?? "Thanks! Noted." },
      ]);
    } catch (err) {
      if (err.name === "AbortError") return; // user closed or new send
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Sorry—something went wrong. Please try again." },
      ]);
    }
  }

  if (!open) return null;

  return createPortal(
    <div className="chat-overlay" aria-modal="true" role="dialog">
      <div className="chat-modal" ref={modalRef} role="document">
        <header className="chat-head">
          <div className="chat-title">St. Ivans Support</div>
          <button className="chat-x" onClick={onClose} aria-label="Close">×</button>
        </header>

        <div className="chat-body">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`chat-msg ${m.role === "user" ? "me" : "bot"}`}
            >
              {m.content}
            </div>
          ))}
        </div>

        <form className="chat-form" onSubmit={handleSend}>
          <input
            className="chat-input"
            placeholder="Ask about plans, pricing, chapels…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button className="chat-send" type="submit">Send</button>
        </form>
      </div>
    </div>,
    document.body
  );
}

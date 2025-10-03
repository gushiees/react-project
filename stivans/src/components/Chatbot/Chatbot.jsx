import { useEffect, useMemo, useRef, useState } from "react";
import "./chatbot.css"; // keep whatever styles you already have

const SITE = {
  name: "St. Ivans",
  catalogUrl: "/catalog",
  chapelsUrl: "/chapels",
  supportEmail: "support@stivans.ph",
};

const COPY = {
  intro:
    "Hi! I’m St. Ivans Support. Ask me about our funeral bundles, chapels, prices, how to book, or payments.",
  mission:
    "To provide compassionate, dignified, and affordable funeral services that honor the life of every individual.",
  vision:
    "To be the most trusted funeral service provider in the country, embracing innovation while preserving tradition.",
  values: [
    "Compassion & Respect — We treat every family with empathy and honor the dignity of every life.",
    "Professionalism & Integrity — We uphold high standards with honesty and transparency.",
    "Affordability & Accessibility — We make meaningful services within reach for all families.",
    "Innovation with Tradition — We use technology to improve services while respecting culture.",
  ],
  services:
    "We offer funeral arrangements, cremation, memorial planning, chapel bookings, and online tribute options.",
  planning:
    "You can plan a service online, call our hotline, or visit us. Online: add a bundle from the Catalog, proceed to Checkout, and complete details.",
  nationwide:
    "Yes. We’ve expanded across multiple regions in the country. Availability may vary by chapel.",
  booking:
    "To book a chapel, go to the Chapels page, pick a location and schedule, then follow the prompts.",
  pricing:
    "Browse the Catalog for current bundle prices. Each product page shows inclusions and monthly estimates.",
  payments:
    "We accept flexible modes via Xendit (cards, e-wallets, etc.). You’ll be redirected to a secure Xendit invoice to pay.",
  faqs: [
    "• What services do you offer? — Funeral arrangements, cremation, memorial planning, chapels, online tributes.",
    "• How do I plan a funeral? — Use our website, call us, or visit in person.",
    "• Are you nationwide? — Yes, in multiple regions.",
    "• How do I book a chapel? — Go to Chapels, pick a branch/date, and book.",
    "• How do I pay? — Secure Xendit invoice (cards, e-wallets, etc.).",
  ],
};

function normalize(s) {
  return (s || "").toLowerCase();
}

function makeReply(userText) {
  const t = normalize(userText);

  // quick intents
  const has = (...keys) => keys.some(k => t.includes(k));

  if (has("mission")) {
    return `Our Mission\n${COPY.mission}`;
  }
  if (has("vision")) {
    return `Our Vision\n${COPY.vision}`;
  }
  if (has("value", "values")) {
    return `Our Values\n${COPY.values.join("\n")}`;
  }
  if (has("service", "offer", "what do you do")) {
    return COPY.services;
  }
  if (has("plan", "planning", "how to start")) {
    return COPY.planning;
  }
  if (has("nationwide", "country", "regions", "available everywhere")) {
    return COPY.nationwide;
  }
  if (has("chapel", "chapels", "wake", "venue")) {
    return `You can browse and book chapels here: ${SITE.chapelsUrl}`;
  }
  if (has("plan", "bundle", "package", "price", "cost")) {
    return `For plans and pricing, visit our Catalog: ${SITE.catalogUrl}`;
  }
  if (has("book", "booking", "reserve", "schedule")) {
    return COPY.booking;
  }
  if (has("pay", "payment", "xendit", "gcash", "card", "wallet")) {
    return COPY.payments;
  }
  if (has("faq", "faqs", "question", "help")) {
    return `FAQs\n${COPY.faqs.join("\n")}`;
  }
  if (has("contact", "email", "support", "helpdesk")) {
    return `You can reply here or email us at ${SITE.supportEmail}.`;
  }

  // gentle default
  return (
    "Here’s a quick overview:\n" +
    `• Catalog & pricing: ${SITE.catalogUrl}\n` +
    `• Book a chapel: ${SITE.chapelsUrl}\n` +
    "• Payments: Secure via Xendit (cards/e-wallets)\n" +
    "You can also ask about: mission, vision, values, services, FAQs."
  );
}

export default function Chatbot({ onClose }) {
  const [open, setOpen] = useState(true);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    { role: "assistant", text: "St. Ivans Support\n" + COPY.intro },
  ]);
  const listRef = useRef(null);

  // scroll to bottom on new message
  useEffect(() => {
    listRef.current?.scrollTo({ top: 999999, behavior: "smooth" });
  }, [messages]);

  // cleanup example (no timers here, but keeping pattern)
  useEffect(() => {
    return () => {
      /* if you add timers/fetch, clean up here */
    };
  }, []);

  const disabled = useMemo(() => !input.trim(), [input]);

  const send = (e) => {
    e?.preventDefault?.();
    const q = input.trim();
    if (!q) return;

    // push user msg
    setMessages((m) => [...m, { role: "user", text: q }]);
    setInput("");

    try {
      // purely local reply
      const answer = makeReply(q);
      setMessages((m) => [...m, { role: "assistant", text: answer }]);
    } catch (err) {
      console.error("Chatbot error:", err);
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text:
            "Sorry—something went wrong while composing a reply. Please try again.",
        },
      ]);
    }
  };

  if (!open) return null;

  return (
    <div className="cbt-wrap" role="dialog" aria-label="St. Ivans Support">
      <div className="cbt-head">
        <div className="cbt-title">St. Ivans Support</div>
        <button className="cbt-x" onClick={() => (setOpen(false), onClose?.())} aria-label="Close chat">
          ×
        </button>
      </div>

      <div className="cbt-body" ref={listRef}>
        {messages.map((m, i) => (
          <div key={i} className={`cbt-msg ${m.role}`}>
            <div className="cbt-bubble">{m.text}</div>
          </div>
        ))}
      </div>

      <form className="cbt-foot" onSubmit={send}>
        <input
          className="cbt-input"
          placeholder="Type your message…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          aria-label="Message"
        />
        <button className="cbt-send" disabled={disabled}>
          Send
        </button>
      </form>
    </div>
  );
}

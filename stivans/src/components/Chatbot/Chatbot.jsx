import { useEffect, useMemo, useRef, useState } from "react";
import "./chatbot.css";

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
    "Plan online by adding a bundle from the Catalog, proceeding to Checkout, and completing details — or call/visit us.",
  nationwide:
    "Yes. We’ve expanded across multiple regions in the country. Availability may vary by chapel.",
  booking:
    "To book a chapel, go to the Chapels page, pick a location & schedule, then follow the prompts.",
  pricing:
    "Browse the Catalog for current bundle prices. Each product page shows inclusions and monthly estimates.",
  payments:
    "We accept flexible modes via Xendit (cards, e-wallets, etc.). You’ll be redirected to a secure Xendit invoice.",
  faqs: [
    "• Services — Funeral arrangements, cremation, memorial planning, chapels, online tributes.",
    "• Plan a funeral — Use our website, call us, or visit in person.",
    "• Coverage — Yes, multiple regions nationwide.",
    "• Book a chapel — Go to Chapels, choose a branch/date, and book.",
    "• Payments — Secure Xendit invoice (cards/e-wallets, etc.).",
  ],
};

function norm(s) { return (s || "").toLowerCase(); }
const hasAny = (t, ...keys) => keys.some(k => t.includes(k));

function makeReply(q) {
  const t = norm(q);
  if (hasAny(t, "mission")) return `Our Mission\n${COPY.mission}`;
  if (hasAny(t, "vision")) return `Our Vision\n${COPY.vision}`;
  if (hasAny(t, "value")) return `Our Values\n${COPY.values.join("\n")}`;
  if (hasAny(t, "service", "offer")) return COPY.services;
  if (hasAny(t, "plan", "planning", "start")) return COPY.planning;
  if (hasAny(t, "nationwide", "regions")) return COPY.nationwide;
  if (hasAny(t, "chapel", "wake", "venue")) return `Browse/Book chapels: ${SITE.chapelsUrl}`;
  if (hasAny(t, "bundle", "package", "price", "cost", "plans")) return `Plans & pricing: ${SITE.catalogUrl}`;
  if (hasAny(t, "book", "booking", "reserve")) return COPY.booking;
  if (hasAny(t, "pay", "payment", "xendit", "gcash", "card", "wallet")) return COPY.payments;
  if (hasAny(t, "faq", "faqs", "question", "help")) return `FAQs\n${COPY.faqs.join("\n")}`;
  if (hasAny(t, "contact", "email", "support", "helpdesk")) return `You can reply here or email ${SITE.supportEmail}.`;

  return (
    "Here’s a quick overview:\n" +
    `• Catalog & pricing: ${SITE.catalogUrl}\n` +
    `• Book a chapel: ${SITE.chapelsUrl}\n` +
    "• Payments: Secure via Xendit (cards/e-wallets)\n" +
    "Ask about: mission, vision, values, services, or FAQs."
  );
}

export default function Chatbot({ onClose }) {
  const [open, setOpen] = useState(true);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    { role: "assistant", text: "St. Ivans Support\n" + COPY.intro },
  ]);
  const listRef = useRef(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: 1e9, behavior: "smooth" });
  }, [messages]);

  // example cleanup for timers/fetch if you add any
  useEffect(() => () => {}, []);

  const disabled = useMemo(() => !input.trim(), [input]);

  const send = (e) => {
    e?.preventDefault?.();
    const q = input.trim();
    if (!q) return;
    setMessages((m) => [...m, { role: "user", text: q }]);
    setInput("");
    try {
      const a = makeReply(q);
      setMessages((m) => [...m, { role: "assistant", text: a }]);
    } catch (err) {
      console.error(err);
      setMessages((m) => [...m, { role: "assistant", text: "Sorry—something went wrong. Please try again." }]);
    }
  };

  if (!open) return null;

  return (
    <div className="cbt-modal" role="dialog" aria-label="St. Ivans Support">
      <div className="cbt-head">
        <div className="cbt-title">St. Ivans Support</div>
        <button className="cbt-x" onClick={() => (setOpen(false), onClose?.())} aria-label="Close">×</button>
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
        />
        <button className="cbt-send" disabled={disabled}>Send</button>
      </form>
    </div>
  );
}

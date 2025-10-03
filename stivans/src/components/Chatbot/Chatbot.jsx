import { useEffect, useMemo, useRef, useState } from "react";
import "./chatbot.css";

/* --------- Config you can tweak --------- */
const SITE = {
  name: "St. Ivans",
  catalogUrl: "/catalog",
  chapelsUrl: "/chapels",
  supportEmail: "support@stivans.ph",
};

const COPY = {
  intro:
    "Hi! I’m St. Ivans Support. I can help with funeral bundles, chapels, pricing, how to book, and payments.",
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
    "Plan online by picking a bundle in the Catalog, proceeding to Checkout, and completing details — or call/visit us.",
  nationwide:
    "Yes. We’ve expanded across multiple regions in the country. Availability may vary by chapel.",
  booking:
    "To book a chapel: go to the Chapels page, choose a location/date, and follow the prompts.",
  pricing:
    "Browse the Catalog for current bundle prices. Each product page shows inclusions and monthly estimates.",
  payments:
    "We accept flexible modes via Xendit (cards, e-wallets, etc.). You’ll be redirected to a secure Xendit invoice.",
  faqs: [
    "• Services — Funeral arrangements, cremation, memorial planning, chapels, online tributes.",
    "• Plan a funeral — Use our website, call us, or visit in person.",
    "• Coverage — Yes, multiple regions nationwide.",
    "• Book a chapel — Go to Chapels, choose a branch/date, and book.",
    "• Payments — Secure Xendit invoice (cards/e-wallets).",
  ],
  chapelsList:
    "You can browse and book chapels here: /chapels. Availability updates live on that page.",
};

const QUICK_SUGGEST = [
  "Show plans & prices",
  "Book a chapel",
  "How do payments work?",
  "Mission & Vision",
  "Our Values",
  "FAQs",
];

/* ---------- Tiny NLU helpers ---------- */
const N = (s) => (s || "").toLowerCase().replace(/[^a-z0-9\s/.-]/gi, " ").replace(/\s+/g, " ").trim();
const has = (t, ...words) => words.some((w) => t.includes(w));

const PROFANITY = /\b(hell|damn|shit|fuck|stupid|dumb)\b/i;

/* Map of intents with regex/synonym coverage */
const INTENTS = [
  {
    id: "who",
    test: (t) =>
      has(t, "who are you", "what are you", "what is this", "are you a bot", "assistant", "support agent"),
    reply: () =>
      `I’m the virtual assistant for ${SITE.name}. I can help you explore bundles, book chapels, understand pricing, and guide payments. Ask me anything!`,
  },
  {
    id: "mission",
    test: (t) => /mission/.test(t),
    reply: () => `Our Mission\n${COPY.mission}`,
  },
  {
    id: "vision",
    test: (t) => /vision/.test(t),
    reply: () => `Our Vision\n${COPY.vision}`,
  },
  {
    id: "values",
    test: (t) => /value|ethic|principle/.test(t),
    reply: () => `Our Values\n${COPY.values.join("\n")}`,
  },
  {
    id: "services",
    test: (t) => /service|offer|what do you do|do you offer/.test(t),
    reply: () => COPY.services,
  },
  {
    id: "planning",
    test: (t) => /(plan|planning|start).*(funeral|service)/.test(t) || /how.*plan/.test(t),
    reply: () => COPY.planning,
  },
  {
    id: "nationwide",
    test: (t) => /nationwide|region|area|cover|available.*country/.test(t),
    reply: () => COPY.nationwide,
  },
  {
    id: "chapels",
    test: (t) => /chapel|venue|wake|location|branch/.test(t),
    reply: () => COPY.chapelsList,
  },
  {
    id: "pricing",
    test: (t) => /price|cost|rate|plan|bundle/.test(t),
    reply: () => `Plans & pricing: ${SITE.catalogUrl}\n\n${COPY.pricing}`,
  },
  {
    id: "payments",
    test: (t) => /pay|payment|xendit|gcash|card|wallet|installment/.test(t),
    reply: () => COPY.payments,
  },
  {
    id: "booking",
    test: (t) => /book|booking|reserve/.test(t),
    reply: () => COPY.booking,
  },
  {
    id: "faqs",
    test: (t) => /faq|faqs|question|help/.test(t),
    reply: () => `FAQs\n${COPY.faqs.join("\n")}`,
  },
  {
    id: "contact",
    test: (t) => /contact|email|call|phone|hotline|support/.test(t),
    reply: () => `You can reply here or email us at ${SITE.supportEmail}.`,
  },
];

/* Fallback generator with suggestions */
function fallback() {
  return (
    "Here’s a quick guide:\n" +
    `• Catalog & pricing: ${SITE.catalogUrl}\n` +
    `• Book a chapel: ${SITE.chapelsUrl}\n` +
    "• Payments: Secure via Xendit (cards / e-wallets)\n\n" +
    "You can also ask about: Mission, Vision, Values, Services, or FAQs."
  );
}

/* --------- Component --------- */
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

  const disabled = useMemo(() => !input.trim(), [input]);

  function replyFor(q) {
    const t = N(q);

    // simple civility filter
    if (PROFANITY.test(q)) {
      return "I’m here to help—let’s keep things respectful 🙏. How can I assist you with bundles, chapels, or payments?";
    }

    for (const intent of INTENTS) {
      try {
        if (intent.test(t)) return intent.reply(t);
      } catch {
        // ignore
      }
    }
    return fallback();
  }

  const send = (e) => {
    e?.preventDefault?.();
    const q = input.trim();
    if (!q) return;
    setMessages((m) => [...m, { role: "user", text: q }]);
    setInput("");
    try {
      const a = replyFor(q);
      setMessages((m) => [...m, { role: "assistant", text: a }]);
    } catch (err) {
      console.error(err);
      setMessages((m) => [
        ...m,
        { role: "assistant", text: "Sorry—something went wrong. Please try again." },
      ]);
    }
  };

  // quick replies
  const ask = (q) => {
    setMessages((m) => [...m, { role: "user", text: q }]);
    const a = replyFor(q);
    setMessages((m) => [...m, { role: "assistant", text: a }]);
  };

  if (!open) return null;

  return (
    <div className="cbt-modal" role="dialog" aria-label="St. Ivans Support">
      <div className="cbt-head">
        <div className="cbt-title">St. Ivans Support</div>
        <button
          className="cbt-x"
          onClick={() => (setOpen(false), onClose?.())}
          aria-label="Close"
        >
          ×
        </button>
      </div>

      <div className="cbt-body" ref={listRef}>
        {messages.map((m, i) => (
          <div key={i} className={`cbt-msg ${m.role}`}>
            <div className="cbt-bubble">{m.text}</div>
          </div>
        ))}

        {/* Quick suggestions (only show when the last message is assistant) */}
        {messages[messages.length - 1]?.role === "assistant" && (
          <div className="cbt-quick">
            {QUICK_SUGGEST.map((q) => (
              <button key={q} className="cbt-chip" onClick={() => ask(q)}>
                {q}
              </button>
            ))}
          </div>
        )}
      </div>

      <form className="cbt-foot" onSubmit={send}>
        <input
          className="cbt-input"
          placeholder="Type your message…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button className="cbt-send" disabled={disabled}>
          Send
        </button>
      </form>
    </div>
  );
}

// src/pages/anywhere/with-chatbot.jsx (example usage)
import Chatbot from "../../components/Chatbot/Chatbot";

const BOT_PROMPT = `
You are St. Ivans’ virtual assistant. Be concise, warm, and professional.
Always stay within St. Ivans services (bundles, chapel bookings, planning, documents, payments via Xendit).
If you don’t know, offer to connect the user to support.
Tone: calm, reassuring, helpful. 
`;

const botRules = [
  // What St. Ivans is
  {
    test: /(what|who).*st(\.| )?ivans|about you|what do you do/i,
    reply: () =>
      "St. Ivans provides compassionate, dignified, and affordable funeral services. We offer practical bundles, chapel bookings, and flexible payments via Xendit—combining technology with tradition to make arrangements simpler.",
  },

  // Mission / Vision / Values
  {
    test: /(mission|vision|values)/i,
    reply: () =>
      "• Mission: To provide compassionate, dignified, and affordable funeral services that honor every life.\n" +
      "• Vision: To be the most trusted funeral service provider in the country—embracing innovation while preserving tradition.\n" +
      "• Values: Compassion & Respect; Professionalism & Integrity; Affordability & Accessibility; Innovation with Tradition.",
  },

  // Services
  {
    test: /(services|offer|do you have|what do you provide)/i,
    reply: () =>
      "We provide complete funeral arrangements, cremation services, memorial planning, chapel bookings, and online tribute options.",
  },

  // Planning
  {
    test: /(plan|arrange|set up).*funeral|how to start/i,
    reply: () =>
      "You can plan everything online through our website, call us for guided assistance, or visit us in person—whichever you prefer. I can point you to our bundles if you'd like.",
  },

  // Payment / Xendit
  {
    test: /(pay|payment|xendit|gcash|card|installment|monthly)/i,
    reply: () =>
      "We support secure payments via Xendit (cards, e-wallets like GCash/GrabPay, and bank transfer). We also provide flexible installment displays on product pages and at checkout.",
  },

  // Coverage / Regions
  {
    test: /(nationwide|coverage|available.*where|regions|areas)/i,
    reply: () =>
      "Yes. We serve Metro Manila and nearby regions directly, and we’re expanding nationwide through partner networks.",
  },

  // Chapels
  {
    test: /(chapel|book.*chapel|venue|location|branch)/i,
    reply: () =>
      "You can book chapels through our website. We serve Metro Manila locations (e.g., Kamuning, Commonwealth, Cubao) and are adding more venues.",
  },

  // Human handoff
  {
    test: /(talk to|agent|human|representative|contact|phone|email)/i,
    reply: () =>
      "I can connect you to our team. Please email support@stivans.ph or call +63 900 000 0000. If you share your name and number, we’ll reach out promptly.",
  },
];

const botFAQs = [
  {
    q: "What services do you offer?",
    a: "We provide funeral arrangements, cremation services, memorial planning, chapel bookings, and online tribute options.",
    tags: ["services", "offer", "funeral", "cremation", "chapel", "memorial"],
  },
  {
    q: "How do I plan a funeral with St. Ivans?",
    a: "Plan directly online, call for guided help, or visit us in person—whatever’s most comfortable for you.",
    tags: ["plan", "arrange", "start", "setup"],
  },
  {
    q: "Are your services available nationwide?",
    a: "Yes. We serve Metro Manila and nearby regions, and we’re expanding nationwide through partner networks.",
    tags: ["nationwide", "coverage", "areas", "regions", "where"],
  },
  {
    q: "Do you offer installment payments?",
    a: "Yes. We display 12/6/3-month breakdowns on bundles and at checkout through Xendit.",
    tags: ["installment", "monthly", "payments", "xendit"],
  },
];

export default function PageWithBot() {
  return (
    <>
      {/* … your page content … */}
      <Chatbot
        systemPrompt={BOT_PROMPT}
        rules={botRules}
        faqs={botFAQs}
        greeting="Hi, I’m the St. Ivans assistant. Ask me about services, chapel bookings, prices, or payments."
        fallback={(q) =>
          `I’m not fully certain about “${q}”. I can connect you with our team at support@stivans.ph or +63 900 000 0000.`
        }
        context={{ site: "https://stivans.vercel.app" }}
      />
    </>
  );
}

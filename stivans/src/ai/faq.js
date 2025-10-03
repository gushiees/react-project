// src/ai/faq.js
// Simple, editable Q&A map. Exact/contains match before calling the LLM.
export const FAQ = [
  {
    q: /shipping|deliver(y|ies)/i,
    a: "We deliver within Metro Manila in 1–3 days. Outside MM typically 3–7 days."
  },
  {
    q: /refund|return/i,
    a: "We accept returns within 7 days if items are unused and in original condition."
  },
  {
    q: /payment|xendit|pay/i,
    a: "We accept cards and e-wallets via Xendit. You’ll be redirected to a secure hosted page."
  },
  // Add more!
];

export function matchFaq(userText) {
  if (!userText) return null;
  for (const item of FAQ) {
    if (item.q.test(userText)) return item.a;
  }
  return null;
}

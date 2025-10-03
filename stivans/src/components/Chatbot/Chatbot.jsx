import { useEffect, useRef, useState } from 'react';
import { matchFaq } from '../../ai/faq';
import './chatbot.css';

export default function ChatBot({
  systemPrompt = "You are St. Ivans' helpful support assistant. Be concise and friendly. If unsure, ask for clarification.",
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState('');
  const [msgs, setMsgs] = useState([
    { role: 'assistant', text: "Hi! I’m here to help. Ask me about products, orders, or payments." }
  ]);
  const scroller = useRef(null);

  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight;
  }, [msgs, open]);

  async function askLLM(userText) {
    // 1) Try FAQ
    const faq = matchFaq(userText);
    if (faq) return faq;

    // 2) Fallback to LLM via your serverless proxy
    const body = {
      system: systemPrompt,
      messages: [
        ...msgs.map(m => ({ role: m.role, content: m.text })),
        { role: 'user', content: userText }
      ],
      // model: 'llama-3.1-8b-instant', // optional override
      temperature: 0.2
    };

    const r = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data?.details || data?.error || 'Chat failed');
    return data.text || "Sorry, I couldn’t find that.";
  }

  const onSend = async (e) => {
    e?.preventDefault?.();
    const text = input.trim();
    if (!text || busy) return;

    setMsgs(m => [...m, { role: 'user', text }]);
    setInput('');
    setBusy(true);

    try {
      const reply = await askLLM(text);
      setMsgs(m => [...m, { role: 'assistant', text: reply }]);
    } catch (err) {
      console.error(err);
      setMsgs(m => [...m, { role: 'assistant', text: "Oops—I'm having trouble answering that right now." }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button className="cb-launch" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        {open ? '×' : 'Chat'}
      </button>

      {open && (
        <div className="cb-wrap" role="dialog" aria-label="Support chat" aria-modal="false">
          <div className="cb-head">St. Ivans Support</div>
          <div className="cb-body" ref={scroller}>
            {msgs.map((m, i) => (
              <div key={i} className={`cb-msg ${m.role}`}>
                <div className="cb-bubble">{m.text}</div>
              </div>
            ))}
            {busy && <div className="cb-typing">…</div>}
          </div>
          <form className="cb-inputrow" onSubmit={onSend}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your question…"
              disabled={busy}
            />
            <button disabled={busy || !input.trim()}>Send</button>
          </form>
        </div>
      )}
    </>
  );
}

// /api/ai/chat.js
export const config = { runtime: 'nodejs' }; // Vercel Node runtime

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'Missing GROQ_API_KEY' });

    const { messages, system, model = 'llama-3.1-8b-instant', temperature = 0.2 } = req.body || {};
    if (!Array.isArray(messages)) return res.status(400).json({ error: 'messages[] required' });

    const payload = {
      model,
      temperature,
      messages: [
        ...(system ? [{ role: 'system', content: system }] : []),
        ...messages,
      ],
    };

    const r = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await r.json();
    if (!r.ok) {
      console.error('Groq error', data);
      return res.status(400).json({ error: 'Groq error', details: data });
    }

    const text = data?.choices?.[0]?.message?.content ?? '';
    return res.status(200).json({ text });
  } catch (e) {
    console.error('chat error', e);
    return res.status(500).json({ error: 'Server error' });
  }
}

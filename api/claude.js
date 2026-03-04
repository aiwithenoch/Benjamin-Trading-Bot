// Vercel Serverless Function: /api/claude
// This runs server-side on Vercel — no CORS issues
// Set ANTHROPIC_API_KEY in your Vercel dashboard > Settings > Environment Variables

export default async function handler(req, res) {
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
    if (!ANTHROPIC_API_KEY) {
        return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured in Vercel env vars' });
    }

    try {
        const { symbol, bid, ask, change, spread, high, low } = req.body;

        const systemPrompt = `You are AURUM's elite quantitative trading analyst. Respond ONLY with raw JSON — no markdown, no text outside the JSON object.`;

        const userPrompt = `Analyze ${symbol} and generate a precise trading signal.

LIVE MARKET DATA:
- Symbol: ${symbol}
- Bid: ${bid}, Ask: ${ask}
- Spread: ${spread}
- 24h Change: ${change}%
- Daily High: ${high}, Daily Low: ${low}
- Time: ${new Date().toUTCString()}

Respond with ONLY this JSON:
{"type":"BUY"|"SELL"|"HOLD","decision":"VALIDATED"|"REJECTED"|"WATCHING","reasoning":"<one sentence max 150 chars citing specific price levels>","confidence":<integer 30-95>,"sl_pips":<integer>,"tp_pips":<integer>}`;

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: 'claude-opus-4-5',
                max_tokens: 256,
                system: systemPrompt,
                messages: [{ role: 'user', content: userPrompt }],
            }),
        });

        if (!response.ok) {
            const err = await response.text();
            return res.status(response.status).json({ error: err });
        }

        const data = await response.json();
        const text = data?.content?.[0]?.text ?? '';
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No JSON in Claude response');
        const parsed = JSON.parse(jsonMatch[0]);

        return res.status(200).json(parsed);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}

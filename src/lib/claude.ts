/// <reference types="vite/client" />
// ─── Claude claude-opus-4-5 AI Client ────────────────────────────────────────────────
// Calls /api/claude — a Vercel serverless function that proxies to Anthropic.
// The API key lives on the server, never exposed to the browser.

export interface ClaudeSignalResult {
    type: 'BUY' | 'SELL' | 'HOLD';
    decision: 'VALIDATED' | 'REJECTED' | 'WATCHING';
    reasoning: string;
    confidence: number;
    sl_pips: number;
    tp_pips: number;
}

export async function generateClaudeSignal(
    symbol: 'XAUUSD' | 'BTCUSD',
    bid: number,
    ask: number,
    change: number,
    spread: number,
    high: number,
    low: number
): Promise<ClaudeSignalResult> {
    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;

    // In local dev with an API key, use the Vite proxy to call Anthropic directly
    if (import.meta.env.DEV && apiKey) {
        const systemPrompt = `You are AURUM's elite quantitative trading analyst. Respond ONLY with raw JSON — no markdown, no text outside the JSON object.`;
        const userPrompt = `Analyze ${symbol} and generate a precise trading signal.\n\nLIVE MARKET DATA:\n- Symbol: ${symbol}\n- Bid: ${bid}, Ask: ${ask}\n- Spread: ${spread}\n- 24h Change: ${change}%\n- Daily High: ${high}, Daily Low: ${low}\n- Time: ${new Date().toUTCString()}\n\nRespond with ONLY this JSON:\n{"type":"BUY"|"SELL"|"HOLD","decision":"VALIDATED"|"REJECTED"|"WATCHING","reasoning":"<one sentence max 150 chars citing specific price levels>","confidence":<integer 30-95>,"sl_pips":<integer>,"tp_pips":<integer>}`;

        const response = await fetch('/api/claude/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
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
            const errText = await response.text();
            throw new Error(`Anthropic API error ${response.status}: ${errText}`);
        }

        const data = await response.json();
        const text = data?.content?.[0]?.text ?? '';
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No JSON in Claude response');

        const parsed = JSON.parse(jsonMatch[0]);
        return {
            type: parsed.type || 'HOLD',
            decision: parsed.decision || 'WATCHING',
            reasoning: parsed.reasoning || 'Analysis complete.',
            confidence: Math.max(30, Math.min(95, parseInt(parsed.confidence) || 60)),
            sl_pips: parseInt(parsed.sl_pips) || 20,
            tp_pips: parseInt(parsed.tp_pips) || 40,
        };
    }

    // Production Vercel function
    const response = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, bid, ask, change, spread, high, low }),
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(err?.error || `API error ${response.status}`);
    }

    const parsed = await response.json();
    return {
        type: parsed.type || 'HOLD',
        decision: parsed.decision || 'WATCHING',
        reasoning: parsed.reasoning || 'Analysis complete.',
        confidence: Math.max(30, Math.min(95, parseInt(parsed.confidence) || 60)),
        sl_pips: parseInt(parsed.sl_pips) || 20,
        tp_pips: parseInt(parsed.tp_pips) || 40,
    };
}

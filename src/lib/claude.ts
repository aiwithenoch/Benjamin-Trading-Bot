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

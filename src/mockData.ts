import type { Trade, Signal, Prices } from './types';


export const MOCK_HISTORY: Trade[] = Array.from({ length: 30 }).map((_, i) => {
    const isGold = Math.random() > 0.5;
    const isWin = Math.random() > 0.3;
    const pnl = isWin ? Math.random() * 65 + 10 : -(Math.random() * 25 + 5);
    const entry = isGold ? 2340 + Math.random() * 20 : 64000 + Math.random() * 2000;
    const diff = isWin ? Math.random() * 10 : -(Math.random() * 5);
    return {
        id: `TRD-${1000 + i}`,
        date: new Date(Date.now() - i * 3600000 * 1.5).toLocaleString(),
        symbol: isGold ? 'XAUUSD' : 'BTCUSD',
        direction: Math.random() > 0.5 ? 'BUY' : 'SELL',
        lot: isGold ? 0.1 : 0.05,
        entry,
        exit: entry + diff,
        pips: isWin ? Math.floor(Math.random() * 60 + 10) : -Math.floor(Math.random() * 30 + 5),
        pnl: parseFloat(pnl.toFixed(2)),
        status: 'CLOSED',
        sl: entry - 5,
        tp: entry + 10,
    };
});

export const INITIAL_SIGNALS: Signal[] = [
    {
        id: '1', time: '10:42 AM', model: 'Gemini Flash', symbol: 'XAUUSD',
        type: 'BUY', decision: 'VALIDATED',
        reasoning: 'EMA21 crossed above EMA50 on H1. RSI at 58 — momentum confirmed. Signal validated. Watching for entry above 2341.50. Deriv feed stable.',
        confidence: 85
    },
    {
        id: '2', time: '09:15 AM', model: 'Gemini Pro', symbol: 'BTCUSD',
        type: 'SELL', decision: 'REJECTED',
        reasoning: 'Volume profile indicates strong support at 63,500. Risk/reward unfavorable at current levels. Waiting for a cleaner setup.',
        confidence: 42
    },
    {
        id: '3', time: '08:30 AM', model: 'Gemini Flash', symbol: 'XAUUSD',
        type: 'HOLD', decision: 'WATCHING',
        reasoning: 'Price consolidating near major resistance. Waiting for clear breakout above 2350. Hourly candle structure indecisive.',
        confidence: 65
    },
    {
        id: '4', time: '07:00 AM', model: 'Gemini Pro', symbol: 'BTCUSD',
        type: 'BUY', decision: 'VALIDATED',
        reasoning: 'Weekly structural shift confirmed. Momentum building after consolidation. Risk/reward at 1:2.5 — trade executed via IC Markets MT5.',
        confidence: 91
    },
];

// No mock news — app always fetches real live RSS feeds


export const SPARKLINE_DATA = [
    { value: 0 }, { value: 1.5 }, { value: 0.8 }, { value: 3.2 }, { value: 2.1 }, { value: 4.4 }, { value: 3.8 }, { value: 6.4 }
];

export const INITIAL_PRICES: Prices = {
    XAUUSD: { bid: 2341.50, ask: 2341.80, change: 0.45, flash: '', high: 2358.00, low: 2332.10, spread: 0.30 },
    BTCUSD: { bid: 64250.00, ask: 64265.00, change: -1.2, flash: '', high: 65800.00, low: 63400.00, spread: 15.00 },
};

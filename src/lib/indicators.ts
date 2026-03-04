// ─── Technical Indicators ────────────────────────────────────────────────────
// Pure functions — no side effects. Used by the scalping engine.

export interface Candle {
    epoch: number;
    open: number;
    high: number;
    low: number;
    close: number;
}

// ─── Exponential Moving Average ───────────────────────────────────────────────
export function calcEMA(closes: number[], period: number): number[] {
    if (closes.length < period) return [];
    const k = 2 / (period + 1);
    const emas: number[] = [];
    // Seed with simple moving average of first `period` values
    let seed = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
    emas.push(seed);
    for (let i = period; i < closes.length; i++) {
        seed = closes[i] * k + seed * (1 - k);
        emas.push(seed);
    }
    return emas;
}

// ─── RSI ──────────────────────────────────────────────────────────────────────
export function calcRSI(closes: number[], period = 7): number[] {
    if (closes.length < period + 1) return [];
    const rsis: number[] = [];
    let gains = 0;
    let losses = 0;
    for (let i = 1; i <= period; i++) {
        const diff = closes[i] - closes[i - 1];
        if (diff > 0) gains += diff;
        else losses -= diff;
    }
    let avgGain = gains / period;
    let avgLoss = losses / period;
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsis.push(100 - 100 / (1 + rs));
    for (let i = period + 1; i < closes.length; i++) {
        const diff = closes[i] - closes[i - 1];
        const gain = diff > 0 ? diff : 0;
        const loss = diff < 0 ? -diff : 0;
        avgGain = (avgGain * (period - 1) + gain) / period;
        avgLoss = (avgLoss * (period - 1) + loss) / period;
        const rsI = avgLoss === 0 ? 100 : avgGain / avgLoss;
        rsis.push(100 - 100 / (1 + rsI));
    }
    return rsis;
}

// ─── Signal Detection ─────────────────────────────────────────────────────────
export interface ScalpSignal {
    type: 'BUY' | 'SELL' | null;
    ema9: number;
    ema21: number;
    rsi: number;
    reason: string;
}

export function detectSignal(candles: Candle[]): ScalpSignal {
    if (candles.length < 25) {
        return { type: null, ema9: 0, ema21: 0, rsi: 50, reason: 'Insufficient candle data' };
    }
    const closes = candles.map(c => c.close);
    const ema9arr = calcEMA(closes, 9);
    const ema21arr = calcEMA(closes, 21);
    const rsiArr = calcRSI(closes, 7);

    if (ema9arr.length < 2 || ema21arr.length < 2 || rsiArr.length < 1) {
        return { type: null, ema9: 0, ema21: 0, rsi: 50, reason: 'Not enough data for indicators' };
    }

    // Use last two values to check crossover
    const ema9Now = ema9arr[ema9arr.length - 1];
    const ema9Prev = ema9arr[ema9arr.length - 2];
    const ema21Now = ema21arr[ema21arr.length - 1];
    const ema21Prev = ema21arr[ema21arr.length - 2];
    const rsiNow = rsiArr[rsiArr.length - 1];

    // Bullish crossover: EMA9 crosses above EMA21
    if (ema9Prev <= ema21Prev && ema9Now > ema21Now) {
        if (rsiNow >= 45 && rsiNow <= 65) {
            return {
                type: 'BUY',
                ema9: ema9Now,
                ema21: ema21Now,
                rsi: rsiNow,
                reason: `EMA9 (${ema9Now.toFixed(2)}) crossed above EMA21 (${ema21Now.toFixed(2)}) on M5. RSI(7): ${rsiNow.toFixed(1)} — momentum zone confirmed.`,
            };
        }
        return { type: null, ema9: ema9Now, ema21: ema21Now, rsi: rsiNow, reason: `EMA crossover detected but RSI ${rsiNow.toFixed(1)} out of range (45-65)` };
    }

    // Bearish crossover: EMA9 crosses below EMA21
    if (ema9Prev >= ema21Prev && ema9Now < ema21Now) {
        if (rsiNow >= 35 && rsiNow <= 55) {
            return {
                type: 'SELL',
                ema9: ema9Now,
                ema21: ema21Now,
                rsi: rsiNow,
                reason: `EMA9 (${ema9Now.toFixed(2)}) crossed below EMA21 (${ema21Now.toFixed(2)}) on M5. RSI(7): ${rsiNow.toFixed(1)} — bearish momentum confirmed.`,
            };
        }
        return { type: null, ema9: ema9Now, ema21: ema21Now, rsi: rsiNow, reason: `EMA crossover detected but RSI ${rsiNow.toFixed(1)} out of range (35-55)` };
    }

    return { type: null, ema9: ema9Now, ema21: ema21Now, rsi: rsiNow, reason: 'No crossover detected' };
}

// ─── Session Check ────────────────────────────────────────────────────────────
export type TradingSession = 'LONDON' | 'NEW_YORK' | 'OVERLAP' | 'CLOSED';

export function getCurrentSession(): TradingSession {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const london = utcHour >= 8 && utcHour < 16;
    const newYork = utcHour >= 13 && utcHour < 21;
    if (london && newYork) return 'OVERLAP';
    if (london) return 'LONDON';
    if (newYork) return 'NEW_YORK';
    return 'CLOSED';
}

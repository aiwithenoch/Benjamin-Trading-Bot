// ─── AURUM Scalping Engine ────────────────────────────────────────────────────
// Auto-trades XAUUSD and BTCUSD on Deriv using EMA9/21 M5 + RSI7 + Claude

import { detectSignal, getCurrentSession, type Candle } from './indicators';
import { getDerivTradingClient } from './deriv-trading';
import { generateClaudeSignal } from './claude';
import type { Signal, Trade, Settings } from '../types';

export interface EngineState {
    running: boolean;
    // Candles buffer per symbol
    candles: Record<string, Candle[]>;
    consecutiveLosses: number;
    pausedUntil: number | null; // epoch ms
    tradesToday: number;
    lossTodayUSD: number;
}

export interface EngineCallbacks {
    onSignal: (signal: Signal) => void;
    onTradeOpened: (trade: Trade) => void;
    onTradeClosed: (contractId: number, pnl: number) => void;
    onLog: (msg: string) => void;
    showToast: (msg: string, type?: 'success' | 'error' | 'warning') => void;
    getSettings: () => Settings | null;
    getLossTodayUSD: () => number;
    getTradesToday: () => number;
    getConsecutiveLosses: () => number;
}

const SYMBOL_MAP: Record<string, string> = {
    XAUUSD: 'frxXAUUSD',
    BTCUSD: 'cryBTCUSD',
};

const DERIV_SYMBOL_TO_APP: Record<string, 'XAUUSD' | 'BTCUSD'> = {
    frxXAUUSD: 'XAUUSD',
    cryBTCUSD: 'BTCUSD',
};

// Pending proposals: proposalId → { symbol, direction, bid, ask }
const pendingProposals: Map<string, {
    symbol: 'XAUUSD' | 'BTCUSD';
    direction: 'BUY' | 'SELL';
    bid: number;
    ask: number;
    slPips: number;
    tpPips: number;
    reasoning: string;
    confidence: number;
}> = new Map();

let state: EngineState = {
    running: false,
    candles: { frxXAUUSD: [], cryBTCUSD: [] },
    consecutiveLosses: 0,
    pausedUntil: null,
    tradesToday: 0,
    lossTodayUSD: 0,
};

let callbacks: EngineCallbacks | null = null;
let unsubscribe: (() => void) | null = null;
// Track last crossover epoch to avoid duplicate signals
const lastSignalEpoch: Record<string, number> = { frxXAUUSD: 0, cryBTCUSD: 0 };

export function startScalpingEngine(cbs: EngineCallbacks) {
    if (state.running) return;
    state.running = true;
    callbacks = cbs;

    const client = getDerivTradingClient();

    // Subscribe to events
    unsubscribe = client.on(async (event) => {
        if (!state.running || !callbacks) return;

        if (event.type === 'authorize') {
            // Request candle history for both symbols
            client.getCandles('frxXAUUSD', 60);
            client.getCandles('cryBTCUSD', 60);
            callbacks.onLog('Engine authorized — subscribed to M5 candles for XAUUSD & BTCUSD');
        }

        if (event.type === 'candles') {
            // Initial candle batch
            const sym = event.data?.[0]?.symbol ?? '';
            if (!sym || !state.candles[sym]) return;
            state.candles[sym] = event.data.map((c: any) => ({
                epoch: c.epoch,
                open: parseFloat(c.open),
                high: parseFloat(c.high),
                low: parseFloat(c.low),
                close: parseFloat(c.close),
            }));
            callbacks.onLog(`Loaded ${state.candles[sym].length} M5 candles for ${DERIV_SYMBOL_TO_APP[sym] || sym}`);
        }

        if (event.type === 'ohlc') {
            // Live M5 candle update
            const d = event.data;
            const sym: string = d.symbol ?? '';
            if (!sym || !state.candles[sym]) return;
            const candle: Candle = {
                epoch: d.epoch,
                open: parseFloat(d.open),
                high: parseFloat(d.high),
                low: parseFloat(d.low),
                close: parseFloat(d.close),
            };
            // Append or update last candle
            const arr = state.candles[sym];
            if (arr.length && arr[arr.length - 1].epoch === candle.epoch) {
                arr[arr.length - 1] = candle;
            } else {
                arr.push(candle);
                if (arr.length > 100) arr.shift(); // keep last 100
                // New candle formed — run signal check
                await checkAndTrade(sym, callbacks);
            }
        }

        if (event.type === 'proposal') {
            const d = event.data;
            const pending = pendingProposals.get(String(d.id ?? ''));
            if (!pending) return;
            pendingProposals.delete(String(d.id));
            // Execute buy
            client.buyContract(d.id, parseFloat(d.ask_price ?? '1'));
            callbacks.onLog(`Buying contract: ${pending.symbol} ${pending.direction} @ ${pending.bid.toFixed(2)}`);
        }

        if (event.type === 'buy') {
            const d = event.data;
            if (!d?.contract_id) {
                callbacks.onLog(`Buy failed: ${JSON.stringify(d)}`);
                return;
            }
            const now = new Date();
            const appSym = DERIV_SYMBOL_TO_APP[d.underlying_symbol] as 'XAUUSD' | 'BTCUSD' || 'XAUUSD';
            const newTrade: Trade = {
                id: String(d.contract_id),
                symbol: appSym,
                direction: d.contract_type === 'MULTUP' ? 'BUY' : 'SELL',
                lot: 0.01,
                entry: parseFloat(d.buy_price ?? '0'),
                sl: 0,
                tp: 0,
                pnl: 0,
                status: 'OPEN',
                openTime: now.toISOString(),
                date: now.toLocaleDateString(),
            };
            state.tradesToday++;
            callbacks.onTradeOpened(newTrade);
            callbacks.showToast(`✅ ${appSym} ${newTrade.direction} trade opened`, 'success');
            callbacks.onLog(`Trade opened: ${appSym} ${newTrade.direction} | Contract ${d.contract_id}`);

            // Schedule auto-close after 15 min (max trade duration for scalping)
            setTimeout(() => {
                if (state.running) {
                    client.sellContract(d.contract_id);
                    callbacks?.onLog(`Auto-closing contract ${d.contract_id} — max duration reached`);
                }
            }, 15 * 60 * 1000);
        }

        if (event.type === 'sell') {
            const d = event.data;
            if (!d?.sold_for) return;
            const pnl = parseFloat(d.sold_for) - parseFloat(d.buy_price ?? '0');
            if (pnl < 0) {
                state.consecutiveLosses++;
                state.lossTodayUSD += Math.abs(pnl);
                if (state.consecutiveLosses >= 3) {
                    state.pausedUntil = Date.now() + 30 * 60 * 1000;
                    callbacks.showToast('⚠️ 3 consecutive losses — bot paused for 30 min', 'warning');
                    callbacks.onLog('PAUSED: 3 consecutive losses. Resuming in 30 minutes.');
                }
            } else {
                state.consecutiveLosses = 0;
            }
            callbacks.onTradeClosed(d.contract_id, pnl);
            callbacks.onLog(`Trade closed: Contract ${d.contract_id} | P&L: ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}`);
        }

        if (event.type === 'error') {
            callbacks.onLog(`Deriv error: ${event.data?.message || JSON.stringify(event.data)}`);
        }
    });

    callbacks.onLog('AURUM Scalping Engine started');
}

export function stopScalpingEngine() {
    state.running = false;
    if (unsubscribe) { unsubscribe(); unsubscribe = null; }
    callbacks?.onLog('Scalping engine stopped');
    callbacks = null;
}

export function resetDailyState() {
    state.tradesToday = 0;
    state.lossTodayUSD = 0;
    state.consecutiveLosses = 0;
    state.pausedUntil = null;
}

export function getEngineState(): EngineState {
    return state;
}

// ─── Core signal → trade logic ────────────────────────────────────────────────
async function checkAndTrade(derivSymbol: string, cbs: EngineCallbacks) {
    if (!state.running) return;

    const settings = cbs.getSettings();
    const maxLoss = settings?.maxDailyLoss ?? 10;
    const maxTrades = 30;
    const useAI = settings?.aiValidation !== false; // default true

    // Guard: daily loss limit
    const totalLoss = cbs.getLossTodayUSD();
    if (totalLoss >= maxLoss) {
        cbs.onLog(`Daily loss limit $${maxLoss} reached — skipping signal`);
        return;
    }

    // Guard: max trades
    if (cbs.getTradesToday() >= maxTrades) {
        cbs.onLog(`Max ${maxTrades} trades reached for today — skipping`);
        return;
    }

    // Guard: pause after consecutive losses
    if (state.pausedUntil && Date.now() < state.pausedUntil) {
        const resumeIn = Math.ceil((state.pausedUntil - Date.now()) / 60000);
        cbs.onLog(`Bot paused — resumes in ~${resumeIn} min`);
        return;
    }
    if (state.pausedUntil && Date.now() >= state.pausedUntil) {
        state.pausedUntil = null;
        state.consecutiveLosses = 0;
        cbs.onLog('Bot resumed after pause');
    }

    // Session filter removed — bot trades 24/7

    const candles = state.candles[derivSymbol];
    if (!candles || candles.length < 25) return;

    // Detect technical signal
    const rawSignal = detectSignal(candles);
    if (!rawSignal.type) return;

    const lastEpoch = lastSignalEpoch[derivSymbol] ?? 0;
    const latestEpoch = candles[candles.length - 1].epoch;
    if (latestEpoch === lastEpoch) return; // already processed this candle
    lastSignalEpoch[derivSymbol] = latestEpoch;

    const appSymbol = DERIV_SYMBOL_TO_APP[derivSymbol] as 'XAUUSD' | 'BTCUSD';

    // Get current price from last candle
    const lastCandle = candles[candles.length - 1];
    const bid = lastCandle.close;
    const ask = lastCandle.close * 1.0002; // approximate spread
    const spread = parseFloat((ask - bid).toFixed(2));

    // Get recent high/low (last 20 candles)
    const recent = candles.slice(-20);
    const high = Math.max(...recent.map(c => c.high));
    const low = Math.min(...recent.map(c => c.low));
    const change24h = parseFloat((((bid - candles[0].close) / candles[0].close) * 100).toFixed(2));

    // Default SL/TP based on raw signal if Claude is not used
    let slPips = appSymbol === 'XAUUSD' ? 15 : 200;
    let tpPips = appSymbol === 'XAUUSD' ? 30 : 400;
    let reasoning = rawSignal.reason;
    let confidence = 70;
    let decision: 'VALIDATED' | 'WATCHING' = 'VALIDATED';

    // ─── Claude AI Validation (optional) ────────────────────────────────────────
    if (useAI) {
        cbs.onLog(`📡 Signal detected: ${appSymbol} ${rawSignal.type} — sending to Claude...`);
        try {
            const claudeResult = await generateClaudeSignal(appSymbol, bid, ask, change24h, spread, high, low);
            slPips = claudeResult.sl_pips;
            tpPips = claudeResult.tp_pips;
            reasoning = claudeResult.reasoning;
            confidence = claudeResult.confidence;
            decision = claudeResult.decision === 'VALIDATED' ? 'VALIDATED' : 'WATCHING';

            // Log the Claude signal
            const signal: Signal = {
                id: `${Date.now()}`,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                model: 'Claude claude-opus-4-5',
                symbol: appSymbol,
                type: rawSignal.type,
                decision: claudeResult.decision,
                reasoning,
                confidence,
            };
            cbs.onSignal(signal);

            if (claudeResult.decision !== 'VALIDATED' || confidence < 70) {
                cbs.onLog(`⏭ Signal ${claudeResult.decision} (${confidence}% confidence) — skipping trade`);
                return;
            }
            cbs.onLog(`✅ Claude VALIDATED ${appSymbol} ${rawSignal.type} (${confidence}%) — placing trade...`);
        } catch (e: any) {
            // Claude failed — fall back to TA-only trading instead of blocking
            cbs.onLog(`⚠️ Claude unavailable (${e?.message?.slice(0, 60) || 'error'}) — trading on TA signal`);
            decision = 'VALIDATED';

            // Still log a TA signal entry
            const signal: Signal = {
                id: `${Date.now()}`,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                model: 'TA Only (EMA9/21 + RSI7)',
                symbol: appSymbol,
                type: rawSignal.type,
                decision: 'VALIDATED',
                reasoning: rawSignal.reason,
                confidence: 70,
            };
            cbs.onSignal(signal);
            cbs.onLog(`📊 EMA9/21 crossover confirmed — placing TA trade on ${appSymbol} ${rawSignal.type}`);
        }
    } else {
        // AI validation disabled — trade straight on the EMA/RSI signal
        cbs.onLog(`📊 TA Signal: ${appSymbol} ${rawSignal.type} | EMA9=${rawSignal.ema9.toFixed(2)} EMA21=${rawSignal.ema21.toFixed(2)} RSI=${rawSignal.rsi.toFixed(1)}`);
        const signal: Signal = {
            id: `${Date.now()}`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            model: 'TA Only (EMA9/21 + RSI7)',
            symbol: appSymbol,
            type: rawSignal.type,
            decision: 'VALIDATED',
            reasoning: rawSignal.reason,
            confidence: 70,
        };
        cbs.onSignal(signal);
        cbs.onLog(`🚀 AI validation OFF — placing trade directly on ${appSymbol} ${rawSignal.type}`);
    }

    // ─── Execute Trade ───────────────────────────────────────────────────────────
    const client = getDerivTradingClient();
    const proposalId = String(Date.now());
    pendingProposals.set(proposalId, {
        symbol: appSymbol,
        direction: rawSignal.type,
        bid,
        ask,
        slPips,
        tpPips,
        reasoning,
        confidence,
    });
    client.getProposal(derivSymbol, rawSignal.type, 1, slPips, tpPips);
}



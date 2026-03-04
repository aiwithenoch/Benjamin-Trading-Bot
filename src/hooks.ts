import { useState, useEffect, useCallback, useRef } from 'react';
import type { Prices, Trade, Settings } from './types';
import { INITIAL_PRICES } from './mockData';

// ─── useDerivPrices: real WebSocket prices via Deriv API ─────────────────────
const DERIV_WS = 'wss://ws.binaryws.com/websockets/v3?app_id=1089';
const DERIV_TOKEN = typeof process !== 'undefined'
    ? (process.env.DERIV_API_TOKEN || 'd2XG7nqyVOKFfam')
    : 'd2XG7nqyVOKFfam';

export function useDerivPrices() {
    const [prices, setPrices] = useState<Prices>(INITIAL_PRICES);
    const [connected, setConnected] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const connect = useCallback(() => {
        try {
            const ws = new WebSocket(DERIV_WS);
            wsRef.current = ws;

            ws.onopen = () => {
                setConnected(true);
                // Authorize with API token
                ws.send(JSON.stringify({ authorize: DERIV_TOKEN }));
            };

            ws.onmessage = (evt) => {
                const msg = JSON.parse(evt.data);

                if (msg.msg_type === 'authorize') {
                    // Subscribe to XAU/USD (frxXAUUSD) and BTC/USD (cryBTCUSD) ticks
                    ws.send(JSON.stringify({ ticks: 'frxXAUUSD', subscribe: 1 }));
                    ws.send(JSON.stringify({ ticks: 'cryBTCUSD', subscribe: 1 }));
                }

                if (msg.msg_type === 'tick') {
                    const { symbol, bid, ask, quote } = msg.tick;
                    const price = bid ?? quote;
                    const askPrice = ask ?? quote;

                    if (symbol === 'frxXAUUSD') {
                        setPrices(prev => {
                            const old = prev.XAUUSD;
                            const isUp = price > old.bid;
                            return {
                                ...prev,
                                XAUUSD: {
                                    ...old,
                                    bid: price,
                                    ask: askPrice,
                                    flash: price !== old.bid ? (isUp ? 'green' : 'red') : '',
                                    change: parseFloat(((price - 2341.50) / 2341.50 * 100).toFixed(2)),
                                    spread: parseFloat((askPrice - price).toFixed(2)),
                                }
                            };
                        });
                        // Clear flash after 600ms
                        setTimeout(() => setPrices(p => ({ ...p, XAUUSD: { ...p.XAUUSD, flash: '' } })), 600);
                    }

                    if (symbol === 'cryBTCUSD') {
                        setPrices(prev => {
                            const old = prev.BTCUSD;
                            const isUp = price > old.bid;
                            return {
                                ...prev,
                                BTCUSD: {
                                    ...old,
                                    bid: price,
                                    ask: askPrice,
                                    flash: price !== old.bid ? (isUp ? 'green' : 'red') : '',
                                    change: parseFloat(((price - 64250) / 64250 * 100).toFixed(2)),
                                    spread: parseFloat((askPrice - price).toFixed(2)),
                                }
                            };
                        });
                        setTimeout(() => setPrices(p => ({ ...p, BTCUSD: { ...p.BTCUSD, flash: '' } })), 600);
                    }
                }
            };

            ws.onerror = () => setConnected(false);
            ws.onclose = () => {
                setConnected(false);
                // Reconnect in 5s
                reconnectTimer.current = setTimeout(connect, 5000);
            };
        } catch {
            setConnected(false);
            reconnectTimer.current = setTimeout(connect, 5000);
        }
    }, []);

    useEffect(() => {
        connect();
        return () => {
            wsRef.current?.close();
            if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
        };
    }, [connect]);

    // Fallback simulation if WebSocket not connected after 5s
    useEffect(() => {
        if (connected) return;
        const sim = setInterval(() => {
            setPrices(prev => {
                const xau = prev.XAUUSD;
                const btc = prev.BTCUSD;
                const xauChange = (Math.random() - 0.5) * 0.6;
                const btcChange = (Math.random() - 0.5) * 60;
                return {
                    XAUUSD: { ...xau, bid: +(xau.bid + xauChange).toFixed(2), ask: +(xau.ask + xauChange).toFixed(2), flash: xauChange > 0 ? 'green' : 'red' },
                    BTCUSD: { ...btc, bid: +(btc.bid + btcChange).toFixed(2), ask: +(btc.ask + btcChange).toFixed(2), flash: btcChange > 0 ? 'green' : 'red' },
                };
            });
            setTimeout(() => setPrices(p => ({
                XAUUSD: { ...p.XAUUSD, flash: '' },
                BTCUSD: { ...p.BTCUSD, flash: '' },
            })), 600);
        }, 2500);
        return () => clearInterval(sim);
    }, [connected]);

    return { prices, connected };
}

// ─── useLivePnL: update open trade PnL from live prices ─────────────────────
export function useLivePnL(
    trades: Trade[],
    setTrades: React.Dispatch<React.SetStateAction<Trade[]>>,
    prices: Prices
) {
    useEffect(() => {
        const id = setInterval(() => {
            setTrades(prev => prev.map(trade => {
                if (trade.status !== 'OPEN') return trade;
                const current = trade.symbol === 'XAUUSD' ? prices.XAUUSD.bid : prices.BTCUSD.bid;
                const diff = trade.direction === 'BUY' ? current - trade.entry : trade.entry - current;
                const pips = trade.symbol === 'XAUUSD' ? diff * 10 : diff * 0.01;
                const pnl = pips * trade.lot * (trade.symbol === 'XAUUSD' ? 1 : 10);
                return { ...trade, pips: Math.floor(pips), pnl: parseFloat(pnl.toFixed(2)) };
            }));
        }, 3000);
        return () => clearInterval(id);
    }, [prices, setTrades]);
}

// ─── useSettings: settings with autosave toast ───────────────────────────────
export function useSettings(initial: Settings, showToast: (msg: string, type?: 'success' | 'error' | 'warning') => void) {
    const [settings, setSettings] = useState<Settings>(initial);
    const save = useCallback((key: keyof Settings, value: Settings[keyof Settings]) => {
        setSettings(prev => ({ ...prev, [key]: value }));
        showToast('Settings saved', 'success');
    }, [showToast]);
    return { settings, setSettings, save };
}

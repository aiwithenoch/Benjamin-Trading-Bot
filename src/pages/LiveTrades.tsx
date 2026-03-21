import { Activity, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, Badge, LiveTradeTimer, EmptyState } from '../components';
import type { Prices, Trade } from '../types';

interface LiveTradesProps {
    trades: Trade[];
    prices: Prices;
    onClose: (id: string) => void;
}

export function LiveTrades({ trades, prices, onClose }: LiveTradesProps) {
    return (
        <div className="space-y-6 page-enter">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-semibold">Open Positions</h2>
                    <p className="text-sm text-aurum-text-muted mt-0.5">Real-time via Deriv API · IC Markets MT5</p>
                </div>
                <Badge variant={trades.length > 0 ? 'green' : 'neutral'}>{trades.length} Active</Badge>
            </div>

            {trades.length === 0 ? (
                <EmptyState icon={Activity} message="Bot is scanning for signals..." />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {trades.map(trade => {
                        const current = trade.symbol === 'XAUUSD' ? prices.XAUUSD.bid : prices.BTCUSD.bid;
                        const slPrice = trade.entry - (trade.symbol === 'XAUUSD' ? 5 : 200);
                        const tpPrice = trade.entry + (trade.symbol === 'XAUUSD' ? 10 : 400);
                        const range = tpPrice - slPrice;
                        const pos = range > 0 ? ((current - slPrice) / range) * 100 : 50;
                        const clampedPos = Math.min(99, Math.max(1, pos));

                        return (
                            <Card key={trade.id} accent className="p-5 flex flex-col">
                                {/* Header */}
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-2xl font-bold font-mono">{trade.symbol}</h3>
                                        <p className="text-xs text-aurum-text-muted mt-0.5">
                                            <LiveTradeTimer openTime={trade.openTime} date={trade.date} />
                                        </p>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <Badge variant={trade.direction === 'BUY' ? 'green' : 'red'}>{trade.direction}</Badge>
                                        <span className="text-xs text-aurum-text-muted font-mono">{trade.lot} lot</span>
                                    </div>
                                </div>

                                {/* Price Grid */}
                                <div className="grid grid-cols-2 gap-4 mb-4 font-mono text-sm">
                                    <div>
                                        <p className="text-aurum-text-muted text-xs font-sans mb-1">Entry</p>
                                        <p className="font-semibold">{trade.entry.toFixed(2)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-aurum-text-muted text-xs font-sans mb-1">Current</p>
                                        <p className={`font-semibold ${trade.pnl >= 0 ? 'text-aurum-green' : 'text-aurum-red'}`}>{current.toFixed(2)}</p>
                                    </div>
                                </div>

                                {/* SL/TP Progress */}
                                <div className="mb-5">
                                    <div className="flex justify-between text-xs mb-1.5">
                                        <span className="text-aurum-red font-mono">SL {slPrice.toFixed(2)}</span>
                                        <span className="text-aurum-text-muted text-[10px]">Price Position</span>
                                        <span className="text-aurum-green font-mono">TP {tpPrice.toFixed(2)}</span>
                                    </div>
                                    <div className="h-2 bg-aurum-surface3 rounded-full overflow-hidden relative">
                                        <div
                                            className="h-full bg-gradient-to-r from-aurum-red via-aurum-gold to-aurum-green rounded-full transition-all duration-1000"
                                            style={{ width: '100%', opacity: 0.4 }}
                                        />
                                        <div
                                            className="absolute top-0 bottom-0 w-1 bg-white rounded-full shadow-lg shadow-white/30 transition-all duration-1000"
                                            style={{ left: `calc(${clampedPos}% - 2px)` }}
                                        />
                                    </div>
                                </div>

                                {/* Pips + PnL */}
                                <div className="flex justify-between items-center mb-4">
                                    <div>
                                        <p className="text-xs text-aurum-text-muted mb-0.5">Pips</p>
                                        <p className={`font-mono font-semibold ${trade.pips >= 0 ? 'text-aurum-green' : 'text-aurum-red'}`}>
                                            {trade.pips >= 0 ? '+' : ''}{trade.pips}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-aurum-text-muted mb-0.5">Unrealized P&L</p>
                                        <p className={`text-2xl font-mono font-bold ${trade.pnl >= 0 ? 'text-aurum-green' : 'text-aurum-red'}`}>
                                            {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                                        </p>
                                    </div>
                                </div>

                                {/* Trend icon */}
                                <div className="flex items-center gap-2 text-xs text-aurum-text-muted mb-4">
                                    {trade.pnl >= 0
                                        ? <TrendingUp size={14} className="text-aurum-green" />
                                        : <TrendingDown size={14} className="text-aurum-red" />}
                                    <span>{trade.direction === 'BUY' ? 'Long' : 'Short'} position running</span>
                                </div>

                                {/* Close Button */}
                                <button
                                    onClick={() => onClose(trade.id)}
                                    className="w-full py-2.5 rounded-lg border border-aurum-red text-aurum-red text-sm font-semibold hover:bg-aurum-red hover:text-white transition-all duration-200 active:scale-95 mt-auto"
                                >
                                    Close Position
                                </button>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

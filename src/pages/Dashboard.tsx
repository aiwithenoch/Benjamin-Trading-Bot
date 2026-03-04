import React from 'react';
import {
    LayoutDashboard, Activity, TrendingUp, TrendingDown,
    ChevronUp, ChevronDown, BrainCircuit
} from 'lucide-react';
import {
    ResponsiveContainer, YAxis, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { Card, Badge, SectionHeader } from '../components';
import type { Prices, Trade, Signal } from '../types';

interface DashboardProps {
    prices: Prices;
    liveTrades: Trade[];
    signals: Signal[];
    todayLoss: number;
    maxDailyLoss: number;
    dailyLossPercent: number;
    lossColorClass: string;
    onViewAll: () => void;
    tradeHistory: Trade[];
}



export function Dashboard({
    prices, liveTrades, signals, todayLoss, maxDailyLoss,
    dailyLossPercent, lossColorClass, onViewAll, tradeHistory
}: DashboardProps) {
    const totalPnl = liveTrades.reduce((s, t) => s + t.pnl, 0);
    const today = (tradeHistory || []).slice(0, 5);
    const dayPnl = today.reduce((s, t) => s + t.pnl, 0);
    const wins = (tradeHistory || []).filter(t => t.pnl > 0);
    const winRate = (tradeHistory || []).length > 0 ? ((wins.length / tradeHistory.length) * 100).toFixed(0) : '0';
    const latestSignal = signals.find(s => s.decision === 'VALIDATED') || signals[0];

    return (
        <div className="space-y-6 page-enter">
            {/* Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <Card accent className="p-5">
                    <p className="text-xs text-aurum-text-muted font-medium uppercase tracking-wider mb-2">Today's P&L</p>
                    <div className="flex items-end justify-between">
                        <h3 className={`text-3xl font-mono font-bold ${dayPnl >= 0 ? 'text-aurum-green' : 'text-aurum-red'}`}>
                            {dayPnl >= 0 ? '+' : ''}${dayPnl.toFixed(2)}
                        </h3>
                        <div className="w-20 h-10">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={today.map((t, i) => ({ value: today.slice(0, i + 1).reduce((s, x) => s + x.pnl, 0) }))}>
                                    <defs>
                                        <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={dayPnl >= 0 ? '#00E676' : '#FF4444'} stopOpacity={0.25} />
                                            <stop offset="95%" stopColor={dayPnl >= 0 ? '#00E676' : '#FF4444'} stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <Area type="monotone" dataKey="value" stroke={dayPnl >= 0 ? '#00E676' : '#FF4444'} strokeWidth={2} fill="url(#pnlGrad)" dot={false} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    <div className="flex items-center gap-1 mt-2">
                        {dayPnl >= 0 ? <TrendingUp size={12} className="text-aurum-green" /> : <TrendingDown size={12} className="text-aurum-red" />}
                        <span className="text-xs text-aurum-text-muted">{today.length} trades today</span>
                    </div>
                </Card>

                <Card className="p-5">
                    <p className="text-xs text-aurum-text-muted font-medium uppercase tracking-wider mb-2">Open Positions</p>
                    <div className="flex items-end justify-between">
                        <h3 className="text-3xl font-mono font-bold">{liveTrades.length}</h3>
                        <div className={`text-xs flex items-center gap-1 ${totalPnl >= 0 ? 'text-aurum-green' : 'text-aurum-red'}`}>
                            {totalPnl >= 0 ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            <span className="font-mono">{totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}</span>
                        </div>
                    </div>
                </Card>

                <Card className="p-5 flex items-center gap-4">
                    <div className="w-14 h-14 shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={[{ value: +winRate }, { value: 100 - +winRate }]} innerRadius={20} outerRadius={27} dataKey="value" stroke="none" startAngle={90} endAngle={-270}>
                                    <Cell fill="#5A8A00" />
                                    <Cell fill="#1C2330" />
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div>
                        <p className="text-xs text-aurum-text-muted font-medium uppercase tracking-wider mb-1">Win Rate</p>
                        <h3 className="text-3xl font-mono font-bold">{winRate}%</h3>
                    </div>
                </Card>

                <Card className="p-5">
                    <p className="text-xs text-aurum-text-muted font-medium uppercase tracking-wider mb-2">Daily Loss Guard</p>
                    <div className="flex justify-between font-mono text-sm mb-3">
                        <span className={lossColorClass === 'bg-aurum-red' ? 'text-aurum-red' : 'text-aurum-text'}>${todayLoss.toFixed(2)}</span>
                        <span className="text-aurum-text-muted">/ ${maxDailyLoss.toFixed(0)}</span>
                    </div>
                    <div className="h-2 bg-aurum-surface3 rounded-full overflow-hidden">
                        <div className={`h-full ${lossColorClass} transition-all duration-700`} style={{ width: `${dailyLossPercent}%` }} />
                    </div>
                </Card>
            </div>

            {/* Price Feed + AI Signal */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="space-y-4">
                    <SectionHeader title="Live Feed" />
                    {Object.entries(prices).map(([symbol, data]) => (
                        <Card key={symbol} className={`p-4 ${data.flash === 'green' ? 'flash-green' : data.flash === 'red' ? 'flash-red' : ''}`}>
                            <div className="flex justify-between items-center mb-3">
                                <span className="font-bold font-mono">{symbol}</span>
                                <Badge variant={data.change >= 0 ? 'green' : 'red'}>{data.change >= 0 ? '+' : ''}{data.change}%</Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-sm font-mono">
                                <div><p className="text-aurum-text-muted text-[10px] mb-0.5 uppercase">Bid</p><p className="text-lg font-bold">{data.bid.toFixed(2)}</p></div>
                                <div className="text-right"><p className="text-aurum-text-muted text-[10px] mb-0.5 uppercase">Ask</p><p className="text-lg font-bold">{data.ask.toFixed(2)}</p></div>
                            </div>
                        </Card>
                    ))}
                </div>

                <Card accent accentColor="bg-aurum-cyan" className="lg:col-span-2 p-6 flex flex-col">
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-2">
                            <BrainCircuit className="text-aurum-cyan" size={22} />
                            <h3 className="text-lg font-semibold">AI Intelligence</h3>
                        </div>
                        <Badge variant={latestSignal?.type === 'BUY' ? 'green' : latestSignal?.type === 'SELL' ? 'red' : 'gold'}>
                            {latestSignal?.type === 'BUY' ? 'BULLISH' : 'BEARISH'}
                        </Badge>
                    </div>
                    <div className="flex-1 bg-aurum-surface2 rounded-xl p-5 border border-aurum-border mb-5">
                        <p className="text-sm font-medium leading-relaxed italic">"{latestSignal?.reasoning || 'Analyzing market data...'}"</p>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs"><span className="text-aurum-text-muted">Confidence</span><span className="font-mono text-aurum-cyan">{latestSignal?.confidence || 0}%</span></div>
                        <div className="h-2 bg-aurum-surface3 rounded-full overflow-hidden"><div className="h-full bg-aurum-cyan transition-all duration-700" style={{ width: `${latestSignal?.confidence || 0}%` }} /></div>
                    </div>
                </Card>
            </div>

            {/* Recent Trades Table */}
            <Card>
                <div className="p-4 border-b border-aurum-border flex justify-between items-center">
                    <h3 className="font-semibold flex items-center gap-2"><LayoutDashboard size={16} /> Recent Activity</h3>
                    <button onClick={onViewAll} className="text-xs text-aurum-primary font-bold">VIEW ALL →</button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-[10px] text-aurum-text-muted uppercase bg-aurum-surface2">
                            <tr><th className="px-4 py-3">Symbol</th><th className="px-4 py-3">Direction</th><th className="px-4 py-3">Entry</th><th className="px-4 py-3">Exit</th><th className="px-4 py-3 text-right">P&L</th></tr>
                        </thead>
                        <tbody>
                            {tradeHistory.slice(0, 6).map((trade) => (
                                <tr key={trade.id} className="border-b border-aurum-border/40 font-mono text-xs hover:bg-aurum-surface2 transition-colors">
                                    <td className="px-4 py-3 font-bold">{trade.symbol}</td>
                                    <td className={`px-4 py-3 ${trade.direction === 'BUY' ? 'text-aurum-green' : 'text-aurum-red'}`}>{trade.direction}</td>
                                    <td className="px-4 py-3">{trade.entry.toFixed(2)}</td>
                                    <td className="px-4 py-3">{trade.exit?.toFixed(2)}</td>
                                    <td className={`px-4 py-3 text-right font-bold ${trade.pnl >= 0 ? 'text-aurum-green' : 'text-aurum-red'}`}>{trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}

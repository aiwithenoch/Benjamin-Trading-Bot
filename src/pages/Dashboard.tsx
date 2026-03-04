import React from 'react';
import {
    LayoutDashboard, Activity, TrendingUp, TrendingDown,
    ChevronUp, ChevronDown, BrainCircuit, Zap
} from 'lucide-react';
import {
    LineChart, Line, ResponsiveContainer, YAxis, PieChart, Pie, Cell, Tooltip, AreaChart, Area
} from 'recharts';
import { Card, Badge, SectionHeader } from '../components';
import type { Prices, Trade, Signal } from '../types';
import { SPARKLINE_DATA } from '../mockData';

interface DashboardProps {
    prices: Prices;
    liveTrades: Trade[];
    signals: Signal[];
    todayLoss: number;
    maxDailyLoss: number;
    dailyLossPercent: number;
    lossColorClass: string;
    onViewAll: () => void;
    mockHistory: Trade[];
}

const PnLHistoryData = SPARKLINE_DATA;

export function Dashboard({
    prices, liveTrades, signals, todayLoss, maxDailyLoss,
    dailyLossPercent, lossColorClass, onViewAll, mockHistory
}: DashboardProps) {
    const totalPnl = liveTrades.reduce((s, t) => s + t.pnl, 0);
    const today = mockHistory.slice(0, 5);
    const dayPnl = today.reduce((s, t) => s + t.pnl, 0);
    const wins = mockHistory.filter(t => t.pnl > 0);
    const winRate = mockHistory.length > 0 ? ((wins.length / mockHistory.length) * 100).toFixed(0) : '0';
    const latestSignal = signals.find(s => s.decision === 'VALIDATED') || signals[0];

    return (
        <div className="space-y-6 page-enter">

            {/* Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {/* P&L Card */}
                <Card accent className="p-5">
                    <p className="text-xs text-aurum-text-muted font-medium uppercase tracking-wider mb-2">Today's P&L</p>
                    <div className="flex items-end justify-between">
                        <h3 className={`text-3xl font-mono font-bold ${dayPnl >= 0 ? 'text-aurum-green' : 'text-aurum-red'}`}>
                            {dayPnl >= 0 ? '+' : ''}${dayPnl.toFixed(2)}
                        </h3>
                        <div className="w-20 h-10">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={PnLHistoryData}>
                                    <defs>
                                        <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--color-aurum-green)" stopOpacity={0.25} />
                                            <stop offset="95%" stopColor="var(--color-aurum-green)" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <Area type="monotone" dataKey="value" stroke="var(--color-aurum-green)" strokeWidth={2} fill="url(#pnlGrad)" dot={false} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    <div className="flex items-center gap-1 mt-2">
                        {dayPnl >= 0 ? <TrendingUp size={12} className="text-aurum-green" /> : <TrendingDown size={12} className="text-aurum-red" />}
                        <span className="text-xs text-aurum-text-muted">{mockHistory.slice(0, 5).length} trades today</span>
                    </div>
                </Card>

                {/* Open Positions */}
                <Card className="p-5">
                    <p className="text-xs text-aurum-text-muted font-medium uppercase tracking-wider mb-2">Open Positions</p>
                    <div className="flex items-end justify-between">
                        <h3 className="text-3xl font-mono font-bold">{liveTrades.length}</h3>
                        <div className={`text-xs flex items-center gap-1 ${totalPnl >= 0 ? 'text-aurum-green' : 'text-aurum-red'}`}>
                            {totalPnl >= 0 ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            <span className="font-mono">{totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)} unrealized</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-1 mt-2">
                        <Activity size={12} className="text-aurum-text-muted" />
                        <span className="text-xs text-aurum-text-muted">XAUUSD / BTCUSD</span>
                    </div>
                </Card>

                {/* Win Rate */}
                <Card className="p-5 flex items-center gap-4">
                    <div className="w-14 h-14 flex-shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={[{ value: +winRate }, { value: 100 - +winRate }]} innerRadius={20} outerRadius={27} dataKey="value" stroke="none" startAngle={90} endAngle={-270}>
                                    <Cell fill="var(--color-aurum-primary)" />
                                    <Cell fill="var(--color-aurum-surface3)" />
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div>
                        <p className="text-xs text-aurum-text-muted font-medium uppercase tracking-wider mb-1">Win Rate</p>
                        <h3 className="text-3xl font-mono font-bold">{winRate}%</h3>
                        <p className="text-xs text-aurum-text-muted">{wins.length}/{mockHistory.length} trades</p>
                    </div>
                </Card>

                {/* Daily Loss Guard */}
                <Card className="p-5">
                    <p className="text-xs text-aurum-text-muted font-medium uppercase tracking-wider mb-2">Daily Loss Guard</p>
                    <div className="flex justify-between font-mono text-sm mb-3">
                        <span className={lossColorClass === 'bg-aurum-red' ? 'text-aurum-red' : 'text-aurum-text'}>${todayLoss.toFixed(2)}</span>
                        <span className="text-aurum-text-muted">/ ${maxDailyLoss.toFixed(2)}</span>
                    </div>
                    <div className="h-2 bg-aurum-surface3 rounded-full overflow-hidden">
                        <div className={`h-full ${lossColorClass} transition-all duration-700`} style={{ width: `${dailyLossPercent}%` }} />
                    </div>
                    <p className="text-xs text-aurum-text-muted mt-2">{dailyLossPercent.toFixed(0)}% consumed</p>
                </Card>
            </div>

            {/* Middle — Live Feed + AI Signal */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Live Prices */}
                <div className="space-y-4">
                    <SectionHeader title="Live Feed" />
                    {(Object.entries(prices) as [string, Prices[keyof Prices]][]).map(([symbol, data]) => (
                        <Card
                            key={symbol}
                            className={`p-4 transition-all duration-500 ${data.flash === 'green' ? 'flash-green' : data.flash === 'red' ? 'flash-red' : ''}`}
                        >
                            <div className="flex justify-between items-center mb-3">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-base font-mono">{symbol}</span>
                                    <div className="w-1.5 h-1.5 rounded-full bg-aurum-green status-pulse" />
                                </div>
                                <Badge variant={data.change >= 0 ? 'green' : 'red'}>
                                    {data.change >= 0 ? '+' : ''}{data.change}%
                                </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-sm font-mono">
                                <div>
                                    <p className="text-aurum-text-muted text-xs mb-0.5">BID</p>
                                    <p className={`text-lg font-semibold ${data.flash === 'red' ? 'text-aurum-red' : ''}`}>{data.bid.toFixed(symbol === 'XAUUSD' ? 2 : 2)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-aurum-text-muted text-xs mb-0.5">ASK</p>
                                    <p className={`text-lg font-semibold ${data.flash === 'green' ? 'text-aurum-green' : ''}`}>{data.ask.toFixed(2)}</p>
                                </div>
                            </div>
                            <div className="flex justify-between text-xs text-aurum-text-muted mt-2 pt-2 border-t border-aurum-border/40">
                                <span>H: {data.high.toFixed(2)}</span>
                                <span>Spread: {data.spread.toFixed(2)}</span>
                                <span>L: {data.low.toFixed(2)}</span>
                            </div>
                        </Card>
                    ))}
                </div>

                {/* AI Signal Panel */}
                <Card accent accentColor="bg-aurum-cyan" className="lg:col-span-2 p-6 flex flex-col">
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-2">
                            <BrainCircuit className="text-aurum-cyan" size={22} />
                            <h3 className="text-lg font-semibold">AI Intelligence</h3>
                            <div className="w-2 h-2 rounded-full bg-aurum-cyan animate-pulse ml-1" />
                        </div>
                        <div className="text-right">
                            <Badge variant={latestSignal?.type === 'BUY' ? 'green' : latestSignal?.type === 'SELL' ? 'red' : 'gold'}>
                                {latestSignal?.type === 'BUY' ? 'BULLISH BIAS' : latestSignal?.type === 'SELL' ? 'BEARISH BIAS' : 'NEUTRAL'}
                            </Badge>
                            <p className="text-xs text-aurum-text-muted mt-1">Last: {latestSignal?.time}</p>
                        </div>
                    </div>

                    <div className="flex-1 bg-aurum-surface2 rounded-xl p-5 border border-aurum-border mb-5">
                        <p className="text-aurum-text leading-relaxed text-sm font-medium">
                            "{latestSignal?.reasoning}"
                        </p>
                    </div>

                    <div>
                        <div className="flex justify-between text-xs mb-1.5">
                            <span className="text-aurum-text-muted">Confidence Score</span>
                            <span className="font-mono text-aurum-cyan font-semibold">{latestSignal?.confidence}%</span>
                        </div>
                        <div className="h-2 bg-aurum-surface3 rounded-full overflow-hidden mb-3">
                            <div className="h-full bg-aurum-cyan rounded-full transition-all duration-700" style={{ width: `${latestSignal?.confidence}%` }} />
                        </div>
                        <div className="flex items-center justify-between">
                            <p className="text-[10px] text-aurum-text-muted uppercase tracking-widest flex items-center gap-1">
                                <Zap size={10} className="text-aurum-cyan" /> Powered by {latestSignal?.model}
                            </p>
                            <Badge variant="cyan">{latestSignal?.symbol}</Badge>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Recent Trades */}
            <Card className="overflow-hidden">
                <div className="p-4 border-b border-aurum-border flex justify-between items-center">
                    <h3 className="font-semibold flex items-center gap-2">
                        <LayoutDashboard size={16} className="text-aurum-text-muted" /> Recent Trades
                    </h3>
                    <button onClick={onViewAll} className="text-sm text-aurum-primary hover:text-aurum-primary-light transition-colors font-medium">
                        View All →
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-aurum-text-muted uppercase bg-aurum-surface2">
                            <tr>
                                {['Symbol', 'Dir', 'Lot', 'Entry', 'Exit', 'Pips', 'P&L'].map(h => (
                                    <th key={h} className={`px-4 py-3 ${h === 'P&L' ? 'text-right' : ''}`}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {mockHistory.slice(0, 6).map((trade, i) => (
                                <tr key={trade.id} className={`border-b border-aurum-border/40 font-mono text-xs ${i % 2 === 0 ? 'bg-aurum-surface' : 'bg-aurum-surface2/40'} hover:bg-aurum-surface3/50 transition-colors`}>
                                    <td className="px-4 py-3 font-sans font-semibold text-sm">{trade.symbol}</td>
                                    <td className="px-4 py-3">
                                        <span className={trade.direction === 'BUY' ? 'text-aurum-green' : 'text-aurum-red'}>{trade.direction}</span>
                                    </td>
                                    <td className="px-4 py-3">{trade.lot}</td>
                                    <td className="px-4 py-3">{trade.entry.toFixed(2)}</td>
                                    <td className="px-4 py-3">{trade.exit?.toFixed(2)}</td>
                                    <td className={`px-4 py-3 ${trade.pips >= 0 ? 'text-aurum-green' : 'text-aurum-red'}`}>{trade.pips >= 0 ? '+' : ''}{trade.pips}</td>
                                    <td className={`px-4 py-3 text-right font-semibold ${trade.pnl >= 0 ? 'text-aurum-green' : 'text-aurum-red'}`}>
                                        {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}

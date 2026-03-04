import { useState, useEffect } from 'react';
import { Filter, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, StatCard } from '../components';
import type { Trade } from '../types';

interface TradeHistoryProps {
    history: Trade[];
    showToast: (msg: string, type?: 'success' | 'error' | 'warning') => void;
}

const ROWS = 10;

export function TradeHistory({ history, showToast }: TradeHistoryProps) {
    const [page, setPage] = useState(1);
    const [filterSymbol, setFilterSymbol] = useState('All');
    const [filterDir, setFilterDir] = useState('All');

    const filtered = history.filter(t => {
        return (filterSymbol === 'All' || t.symbol === filterSymbol)
            && (filterDir === 'All' || t.direction === filterDir);
    });

    const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS));
    const displayed = filtered.slice((page - 1) * ROWS, page * ROWS);

    useEffect(() => { setPage(1); }, [filterSymbol, filterDir]);

    const totalPnl = history.reduce((s, t) => s + t.pnl, 0);
    const wins = history.filter(t => t.pnl > 0);
    const winRate = history.length > 0 ? ((wins.length / history.length) * 100).toFixed(0) : '0';
    const best = history.length > 0 ? Math.max(...history.map(t => t.pnl)) : 0;
    const worst = history.length > 0 ? Math.min(...history.map(t => t.pnl)) : 0;

    const exportCSV = () => {
        const header = 'Date,Symbol,Direction,Lot,Entry,Exit,Pips,P&L\n';
        const rows = history.map(t =>
            `${t.date},${t.symbol},${t.direction},${t.lot},${t.entry.toFixed(2)},${t.exit?.toFixed(2)},${t.pips},${t.pnl.toFixed(2)}`
        ).join('\n');
        const blob = new Blob([header + rows], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'aurum_trades.csv'; a.click();
        URL.revokeObjectURL(url);
        showToast('Trade history exported!', 'success');
    };

    return (
        <div className="space-y-6 page-enter">

            {/* Filters + Export */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-aurum-text-muted" size={14} />
                        <select value={filterSymbol} onChange={e => setFilterSymbol(e.target.value)}
                            className="bg-aurum-surface border border-aurum-border rounded-lg pl-8 pr-4 py-2 text-sm focus:outline-none focus:border-aurum-primary appearance-none cursor-pointer">
                            <option value="All">All Symbols</option>
                            <option value="XAUUSD">XAUUSD</option>
                            <option value="BTCUSD">BTCUSD</option>
                        </select>
                    </div>
                    <select value={filterDir} onChange={e => setFilterDir(e.target.value)}
                        className="bg-aurum-surface border border-aurum-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-aurum-primary appearance-none cursor-pointer">
                        <option value="All">All Directions</option>
                        <option value="BUY">BUY</option>
                        <option value="SELL">SELL</option>
                    </select>
                    <span className="text-xs text-aurum-text-muted ml-1">{filtered.length} results</span>
                </div>
                <button onClick={exportCSV}
                    className="flex items-center gap-2 px-4 py-2 bg-aurum-surface border border-aurum-border rounded-lg text-sm hover:bg-aurum-surface2 transition-colors active:scale-95 font-medium">
                    <Download size={15} /> Export CSV
                </button>
            </div>

            {/* Table */}
            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-aurum-text-muted uppercase bg-aurum-surface2">
                            <tr>
                                {['Date', 'Symbol', 'Dir', 'Lot', 'Entry', 'Exit', 'Pips', 'P&L'].map(h => (
                                    <th key={h} className={`px-4 py-3 font-semibold tracking-wider ${h === 'P&L' ? 'text-right' : ''}`}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {displayed.length === 0 ? (
                                <tr><td colSpan={8} className="text-center py-12 text-aurum-text-muted">No trades match filters</td></tr>
                            ) : displayed.map((t, i) => (
                                <tr key={t.id} className={`border-b border-aurum-border/40 font-mono text-xs ${i % 2 === 0 ? 'bg-aurum-surface' : 'bg-aurum-surface2/30'} hover:bg-aurum-surface3/50 transition-colors`}>
                                    <td className="px-4 py-3 text-aurum-text-muted font-sans text-xs">{t.date}</td>
                                    <td className="px-4 py-3 font-sans font-semibold text-sm">{t.symbol}</td>
                                    <td className="px-4 py-3">
                                        <span className={t.direction === 'BUY' ? 'text-aurum-green' : 'text-aurum-red'}>{t.direction}</span>
                                    </td>
                                    <td className="px-4 py-3">{t.lot}</td>
                                    <td className="px-4 py-3">{t.entry.toFixed(2)}</td>
                                    <td className="px-4 py-3">{t.exit?.toFixed(2)}</td>
                                    <td className={`px-4 py-3 ${t.pips >= 0 ? 'text-aurum-green' : 'text-aurum-red'}`}>{t.pips >= 0 ? '+' : ''}{t.pips}</td>
                                    <td className={`px-4 py-3 text-right font-semibold ${t.pnl >= 0 ? 'text-aurum-green' : 'text-aurum-red'}`}>
                                        {t.pnl >= 0 ? '+' : ''}${t.pnl.toFixed(2)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="p-4 border-t border-aurum-border flex items-center justify-between bg-aurum-surface2">
                    <span className="text-sm text-aurum-text-muted">
                        {filtered.length > 0 ? `${(page - 1) * ROWS + 1}–${Math.min(page * ROWS, filtered.length)} of ${filtered.length}` : '0 results'}
                    </span>
                    <div className="flex gap-2">
                        {[{ icon: ChevronLeft, fn: () => setPage(p => Math.max(1, p - 1)), dis: page === 1 },
                        { icon: ChevronRight, fn: () => setPage(p => Math.min(totalPages, p + 1)), dis: page === totalPages }
                        ].map(({ icon: Icon, fn, dis }, idx) => (
                            <button key={idx} onClick={fn} disabled={dis}
                                className="p-1.5 rounded border border-aurum-border disabled:opacity-30 hover:bg-aurum-surface3 transition-colors">
                                <Icon size={16} />
                            </button>
                        ))}
                    </div>
                </div>
            </Card>

            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <StatCard label="Total Trades" value={history.length.toString()} />
                <StatCard label="Total P&L" value={`${totalPnl >= 0 ? '+' : ''}$${totalPnl.toFixed(2)}`} color={totalPnl >= 0 ? 'text-aurum-green' : 'text-aurum-red'} />
                <StatCard label="Win Rate" value={`${winRate}%`} color="text-aurum-primary" />
                <StatCard label="Best Trade" value={`+$${best.toFixed(2)}`} color="text-aurum-green" />
                <StatCard label="Worst Trade" value={`$${worst.toFixed(2)}`} color="text-aurum-red" />
            </div>
        </div>
    );
}

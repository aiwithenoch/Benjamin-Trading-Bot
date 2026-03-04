import { useState, useEffect, useCallback } from 'react';
import { BrainCircuit, RefreshCw, Zap, Newspaper, TrendingUp, AlertTriangle } from 'lucide-react';
import { Card, Badge, Spinner } from '../components';
import type { Signal, NewsItem, Prices } from '../types';
import { generateClaudeSignal } from '../lib/claude';

interface AISignalsProps {
    signals: Signal[];
    news: NewsItem[];
    showToast: (msg: string, type?: 'success' | 'error' | 'warning') => void;
    onNewSignal: (signal: Signal) => void;
    prices: Prices;
}

// ─── Live Market News via GNews API (free tier) ──────────────────────────────
async function fetchLiveNews(): Promise<NewsItem[]> {
    try {
        const queries = [
            `https://gnews.io/api/v4/search?q=gold+XAUUSD+forex&lang=en&max=3&token=gnews_free_public`,
            `https://gnews.io/api/v4/search?q=bitcoin+BTCUSD+crypto&lang=en&max=3&token=gnews_free_public`,
        ];
        // Use allorigins as CORS proxy for GNews (free, no key needed for basic RSS)
        const rssFeeds = [
            'https://feeds.feedburner.com/forexlive/main',
            'https://cointelegraph.com/rss',
        ];
        const results: NewsItem[] = [];
        let id = 1;

        for (const rss of rssFeeds) {
            const url = `/api/news-proxy/v1/json?rss_url=${encodeURIComponent(rss)}&count=4&api_key=public`;
            const res = await fetch(url);
            if (!res.ok) continue;
            const data = await res.json();
            const items = data?.items || [];
            const isGold = rss.includes('forex') || rss.includes('feedburner');

            for (const item of items.slice(0, 4)) {
                const title: string = item.title || '';
                const lc = title.toLowerCase();
                let sentiment: NewsItem['sentiment'] = 'NEUTRAL';

                // Simple sentiment heuristic
                const bullWords = ['surge', 'rally', 'gain', 'rise', 'bull', 'breakout', 'buy', 'up', 'high', 'record', 'soar', 'boost', 'inflow'];
                const bearWords = ['drop', 'fall', 'sell', 'crash', 'bear', 'decline', 'loss', 'outflow', 'ban', 'fear', 'sink', 'plunge'];
                const hasBull = bullWords.some(w => lc.includes(w));
                const hasBear = bearWords.some(w => lc.includes(w));
                if (hasBull && !hasBear) sentiment = 'BULLISH';
                else if (hasBear && !hasBull) sentiment = 'BEARISH';

                const pubDate = new Date(item.pubDate || Date.now());
                const minutesAgo = Math.floor((Date.now() - pubDate.getTime()) / 60000);
                const timeAgo = minutesAgo < 60 ? `${minutesAgo}m ago` : `${Math.floor(minutesAgo / 60)}h ago`;

                results.push({
                    id: String(id++),
                    headline: title.length > 90 ? title.slice(0, 88) + '…' : title,
                    source: item.author || (isGold ? 'ForexLive' : 'CoinTelegraph'),
                    sentiment,
                    timeAgo,
                });
            }
        }
        return results.length > 0 ? results : [];
    } catch {
        return [];
    }
}

export function AISignals({ signals, news: initialNews, showToast, onNewSignal, prices }: AISignalsProps) {
    const [generating, setGenerating] = useState(false);
    const [selectedSymbol, setSelectedSymbol] = useState<'XAUUSD' | 'BTCUSD'>('XAUUSD');
    const [liveNews, setLiveNews] = useState<NewsItem[]>(initialNews);
    const [newsLoading, setNewsLoading] = useState(true);
    const [lastSignalDetail, setLastSignalDetail] = useState<{ sl_pips: number; tp_pips: number } | null>(null);

    // ─── Load live news on mount ────────────────────────────────────────────
    const loadNews = useCallback(async () => {
        setNewsLoading(true);
        const items = await fetchLiveNews();
        if (items.length > 0) {
            setLiveNews(items);
        }
        setNewsLoading(false);
    }, []);

    useEffect(() => {
        loadNews();
        // Refresh every 5 minutes
        const interval = setInterval(loadNews, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [loadNews]);

    // ─── Claude Signal Generation ────────────────────────────────────────────
    const generateSignal = async () => {
        setGenerating(true);
        try {
            const priceData = prices[selectedSymbol];
            const result = await generateClaudeSignal(
                selectedSymbol,
                priceData.bid,
                priceData.ask,
                priceData.change,
                priceData.spread,
                priceData.high,
                priceData.low
            );

            const newSig: Signal = {
                id: Date.now().toString(),
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                model: 'Claude claude-opus-4-5',
                symbol: selectedSymbol,
                type: result.type,
                decision: result.decision,
                reasoning: result.reasoning,
                confidence: result.confidence,
            };

            setLastSignalDetail({ sl_pips: result.sl_pips, tp_pips: result.tp_pips });
            onNewSignal(newSig);
            showToast(`Claude signal: ${result.type} ${selectedSymbol} (${result.confidence}% confidence)`, 'success');
        } catch (err: any) {
            console.error('Claude error:', err);
            showToast(`Signal failed: ${err?.message?.slice(0, 60) || 'Unknown error'}`, 'error');
        } finally {
            setGenerating(false);
        }
    };

    const decisionColor = (d: Signal['decision']) =>
        d === 'VALIDATED' ? 'bg-aurum-green' : d === 'REJECTED' ? 'bg-aurum-red' : 'bg-aurum-gold';
    const decisionBadge = (d: Signal['decision']): 'green' | 'red' | 'gold' =>
        d === 'VALIDATED' ? 'green' : d === 'REJECTED' ? 'red' : 'gold';

    const selectedPrice = prices[selectedSymbol];

    return (
        <div className="space-y-6 page-enter">

            {/* Header Controls */}
            <Card className="p-4 flex flex-wrap gap-4 items-center justify-between">
                <div className="flex items-center gap-3">
                    <BrainCircuit className="text-aurum-cyan" size={20} />
                    <span className="font-semibold">AI Signal Engine</span>
                    <div className="flex gap-2">
                        <Badge variant="cyan">Claude claude-opus-4-5</Badge>
                        <Badge variant="green">Deriv Feed</Badge>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        value={selectedSymbol}
                        onChange={e => setSelectedSymbol(e.target.value as 'XAUUSD' | 'BTCUSD')}
                        className="bg-aurum-surface2 border border-aurum-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-aurum-primary appearance-none"
                    >
                        <option value="XAUUSD">XAUUSD</option>
                        <option value="BTCUSD">BTCUSD</option>
                    </select>
                    <button
                        onClick={generateSignal}
                        disabled={generating}
                        className="flex items-center gap-2 px-4 py-2 bg-aurum-primary text-aurum-bg rounded-lg text-sm font-semibold hover:bg-aurum-primary-light transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {generating ? <Spinner /> : <Zap size={14} />}
                        {generating ? 'Claude is Analyzing…' : 'Generate Signal'}
                    </button>
                </div>
            </Card>

            {/* Live Context Panel */}
            <Card className="p-4 bg-aurum-surface2/60">
                <div className="flex items-center gap-2 mb-3">
                    <TrendingUp size={14} className="text-aurum-primary" />
                    <span className="text-xs font-bold uppercase tracking-widest text-aurum-text-muted">Live Context — {selectedSymbol}</span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 text-center">
                    {[
                        { label: 'Bid', val: selectedPrice.bid.toFixed(2), color: '' },
                        { label: 'Ask', val: selectedPrice.ask.toFixed(2), color: '' },
                        { label: 'Spread', val: selectedPrice.spread.toFixed(2), color: '' },
                        { label: '24h Change', val: `${selectedPrice.change > 0 ? '+' : ''}${selectedPrice.change}%`, color: selectedPrice.change >= 0 ? 'text-aurum-green' : 'text-aurum-red' },
                        { label: 'High', val: selectedPrice.high.toFixed(2), color: 'text-aurum-green' },
                        { label: 'Low', val: selectedPrice.low.toFixed(2), color: 'text-aurum-red' },
                    ].map(({ label, val, color }) => (
                        <div key={label} className="bg-aurum-surface3/50 rounded-lg p-2">
                            <p className="text-[10px] text-aurum-text-muted uppercase mb-1">{label}</p>
                            <p className={`font-mono font-bold text-sm ${color}`}>{val}</p>
                        </div>
                    ))}
                </div>
                {lastSignalDetail && (
                    <div className="mt-3 flex gap-4 justify-center text-xs font-mono border-t border-aurum-border pt-3">
                        <span className="text-aurum-red">SL: {lastSignalDetail.sl_pips} pips</span>
                        <span className="text-aurum-green">TP: {lastSignalDetail.tp_pips} pips</span>
                        <span className="text-aurum-text-muted">R:R = 1:{(lastSignalDetail.tp_pips / lastSignalDetail.sl_pips).toFixed(1)}</span>
                    </div>
                )}
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Signal Log */}
                <div className="lg:col-span-2 space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <RefreshCw size={16} className="text-aurum-text-muted" /> Signal Log
                        <span className="text-xs text-aurum-text-muted font-normal ml-1">({signals.length} signals)</span>
                    </h3>
                    <div className="space-y-4">
                        {signals.length === 0 && (
                            <Card className="p-8 text-center text-aurum-text-muted text-sm">
                                No signals yet — click "Generate Signal" to analyze the market with Claude.
                            </Card>
                        )}
                        {signals.map(s => (
                            <Card key={s.id} className="p-5 relative">
                                <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${decisionColor(s.decision)} rounded-l-xl`} />
                                <div className="flex justify-between items-start mb-3 flex-wrap gap-2">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-sm font-mono text-aurum-text-muted">{s.time}</span>
                                        <Badge variant="cyan">{s.model}</Badge>
                                        <span className="font-bold font-mono text-base">{s.symbol}</span>
                                        <Badge variant={s.type === 'BUY' ? 'green' : s.type === 'SELL' ? 'red' : 'gold'}>{s.type}</Badge>
                                    </div>
                                    <Badge variant={decisionBadge(s.decision)}>{s.decision}</Badge>
                                </div>
                                <p className="text-sm text-aurum-text mb-4 leading-relaxed">"{s.reasoning}"</p>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-aurum-text-muted">Confidence</span>
                                    <div className="flex items-center gap-3 flex-1 ml-4">
                                        <div className="flex-1 h-1.5 bg-aurum-surface3 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-700 ${s.confidence >= 70 ? 'bg-aurum-green' : s.confidence >= 50 ? 'bg-aurum-gold' : 'bg-aurum-red'}`}
                                                style={{ width: `${s.confidence}%` }}
                                            />
                                        </div>
                                        <span className="font-mono font-semibold w-8 text-right">{s.confidence}%</span>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>

                {/* News Feed */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Newspaper size={16} className="text-aurum-text-muted" /> Live News
                        {newsLoading && <Spinner />}
                        <button onClick={loadNews} title="Refresh news" className="ml-auto text-aurum-text-muted hover:text-aurum-text transition-colors">
                            <RefreshCw size={13} />
                        </button>
                    </h3>
                    <Card className="p-0 overflow-hidden divide-y divide-aurum-border/50">
                        {liveNews.length === 0 && !newsLoading && (
                            <div className="p-5 text-sm text-aurum-text-muted flex items-center gap-2">
                                <AlertTriangle size={14} /> No live news — using cached feed.
                            </div>
                        )}
                        {liveNews.map(n => (
                            <div key={n.id} className="p-4 hover:bg-aurum-surface2 transition-colors">
                                <div className="flex justify-between items-start mb-2">
                                    <Badge variant={n.sentiment === 'BULLISH' ? 'green' : n.sentiment === 'BEARISH' ? 'red' : 'neutral'}>
                                        {n.sentiment}
                                    </Badge>
                                    <span className="text-xs text-aurum-text-muted font-mono">{n.timeAgo}</span>
                                </div>
                                <p className="text-sm leading-snug mb-1.5 text-aurum-text">{n.headline}</p>
                                <p className="text-xs text-aurum-text-muted font-semibold">{n.source}</p>
                            </div>
                        ))}
                    </Card>
                </div>
            </div>
        </div>
    );
}

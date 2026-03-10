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

// ─── Live Market News — real RSS feeds via allorigins.win (free, no key) ─────
const BULL_WORDS = ['surge', 'rally', 'gain', 'rise', 'bull', 'breakout', 'buy', 'high', 'record', 'soar', 'boost', 'inflow', 'jump', 'climb', 'rebound', 'recovery'];
const BEAR_WORDS = ['drop', 'fall', 'sell', 'crash', 'bear', 'decline', 'loss', 'outflow', 'ban', 'fear', 'sink', 'plunge', 'dump', 'slide', 'tumble', 'pressure'];

function parseSentiment(title: string): NewsItem['sentiment'] {
    const lc = title.toLowerCase();
    const bull = BULL_WORDS.some(w => lc.includes(w));
    const bear = BEAR_WORDS.some(w => lc.includes(w));
    if (bull && !bear) return 'BULLISH';
    if (bear && !bull) return 'BEARISH';
    return 'NEUTRAL';
}

function timeAgoStr(pubDate: string): string {
    const mins = Math.floor((Date.now() - new Date(pubDate).getTime()) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

// Each entry: [rssUrl, defaultSource]
const RSS_SOURCES: [string, string][] = [
    ['https://cointelegraph.com/rss', 'CoinTelegraph'],
    ['https://cryptonews.com/news/feed/', 'CryptoNews'],
    ['https://www.forexlive.com/feed/news', 'ForexLive'],
    ['https://www.investing.com/rss/news_25.rss', 'Investing.com'],
];

async function fetchRssViaProxy(rssUrl: string, source: string, count: number): Promise<NewsItem[]> {
    // allorigins.win: free, no key, parses RSS to JSON, works from browser
    const proxy = `https://api.allorigins.win/get?url=${encodeURIComponent(rssUrl)}`;
    const res = await fetch(proxy, { signal: AbortSignal.timeout(7000) });
    if (!res.ok) return [];
    const { contents } = await res.json();
    if (!contents) return [];

    // Parse XML manually — allorigins returns raw XML
    const parser = new DOMParser();
    const xml = parser.parseFromString(contents, 'text/xml');
    const items = Array.from(xml.querySelectorAll('item')).slice(0, count);

    return items.map((item, i) => {
        const title = item.querySelector('title')?.textContent?.trim() ?? '';
        const pubDate = item.querySelector('pubDate')?.textContent?.trim() ?? new Date().toUTCString();
        const link = item.querySelector('link')?.textContent?.trim() ?? '#';
        return {
            id: `${source}-${i}-${Date.now()}`,
            headline: title.length > 100 ? title.slice(0, 98) + '…' : title,
            source,
            sentiment: parseSentiment(title),
            timeAgo: timeAgoStr(pubDate),
            link,
        };
    }).filter(n => n.headline.length > 10);
}

async function fetchLiveNews(): Promise<NewsItem[]> {
    const results: NewsItem[] = [];
    // Try all sources in parallel; skip any that fail
    const fetches = RSS_SOURCES.map(([url, src]) =>
        fetchRssViaProxy(url, src, 3).catch(() => [] as NewsItem[])
    );
    const batches = await Promise.all(fetches);
    for (const batch of batches) results.push(...batch);

    // Sort by recency (timeAgo heuristic: earlier entries from RSS = newer)
    return results.slice(0, 12);
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
                                <AlertTriangle size={14} /> Unable to load live news — check your connection and refresh.
                            </div>
                        )}
                        {liveNews.map(n => (
                            <a
                                key={n.id}
                                href={n.link || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block p-4 hover:bg-aurum-surface2 transition-colors"
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <Badge variant={n.sentiment === 'BULLISH' ? 'green' : n.sentiment === 'BEARISH' ? 'red' : 'neutral'}>
                                        {n.sentiment}
                                    </Badge>
                                    <span className="text-xs text-aurum-text-muted font-mono">{n.timeAgo}</span>
                                </div>
                                <p className="text-sm leading-snug mb-1.5 text-aurum-text">{n.headline}</p>
                                <p className="text-xs text-aurum-text-muted font-semibold">{n.source}</p>
                            </a>
                        ))}
                    </Card>
                </div>
            </div>
        </div>
    );
}

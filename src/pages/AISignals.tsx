import { useState } from 'react';
import { BrainCircuit, RefreshCw, Zap, Newspaper } from 'lucide-react';
import { Card, Badge, Spinner } from '../components';
import type { Signal, NewsItem } from '../types';

interface AISignalsProps {
    signals: Signal[];
    news: NewsItem[];
    showToast: (msg: string, type?: 'success' | 'error' | 'warning') => void;
    onNewSignal: (signal: Signal) => void;
}

const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

export function AISignals({ signals, news, showToast, onNewSignal }: AISignalsProps) {
    const [generating, setGenerating] = useState(false);
    const [selectedSymbol, setSelectedSymbol] = useState<'XAUUSD' | 'BTCUSD'>('XAUUSD');

    const generateSignal = async () => {
        setGenerating(true);
        try {
            if (GEMINI_KEY) {
                const { GoogleGenAI } = await import('@google/genai');
                const ai = new GoogleGenAI({ apiKey: GEMINI_KEY });
                const prompt = `You are an expert forex and crypto trader. Analyze ${selectedSymbol} current market conditions and provide a trading signal. Return a JSON object with: { type: "BUY"|"SELL"|"HOLD", decision: "VALIDATED"|"REJECTED"|"WATCHING", reasoning: "string (max 120 chars)", confidence: number (0-100) }. Be precise and professional.`;
                const result = await ai.models.generateContent({ model: 'gemini-2.0-flash', contents: prompt });
                const text = result.text || '';
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    const newSig: Signal = {
                        id: Date.now().toString(),
                        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        model: 'Gemini Flash',
                        symbol: selectedSymbol,
                        type: parsed.type || 'HOLD',
                        decision: parsed.decision || 'WATCHING',
                        reasoning: parsed.reasoning || 'Analysis complete.',
                        confidence: parsed.confidence || 70,
                    };
                    onNewSignal(newSig);
                    showToast(`Signal generated for ${selectedSymbol}`, 'success');
                } else {
                    throw new Error('No JSON in response');
                }
            } else {
                // Fallback mock
                await new Promise(r => setTimeout(r, 1500));
                const types = ['BUY', 'SELL', 'HOLD'] as const;
                const decisions = ['VALIDATED', 'REJECTED', 'WATCHING'] as const;
                const reasonings = [
                    `${selectedSymbol} showing bullish divergence on RSI. EMA crossover imminent. Entry window: next 2 candles.`,
                    `${selectedSymbol} hitting strong resistance. Volume declining — bearish reversal likely.`,
                    `${selectedSymbol} consolidating. Waiting for breakout confirmation before executing.`,
                ];
                const idx = Math.floor(Math.random() * 3);
                const newSig: Signal = {
                    id: Date.now().toString(),
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    model: 'Gemini Flash',
                    symbol: selectedSymbol,
                    type: types[idx],
                    decision: decisions[idx],
                    reasoning: reasonings[idx],
                    confidence: Math.floor(Math.random() * 40 + 55),
                };
                onNewSignal(newSig);
                showToast('Signal generated successfully', 'success');
            }
        } catch {
            showToast('Signal generation failed', 'error');
        } finally {
            setGenerating(false);
        }
    };

    const decisionColor = (d: Signal['decision']) =>
        d === 'VALIDATED' ? 'bg-aurum-green' : d === 'REJECTED' ? 'bg-aurum-red' : 'bg-aurum-gold';
    const decisionBadge = (d: Signal['decision']): 'green' | 'red' | 'gold' =>
        d === 'VALIDATED' ? 'green' : d === 'REJECTED' ? 'red' : 'gold';

    return (
        <div className="space-y-6 page-enter">

            {/* Header Controls */}
            <Card className="p-4 flex flex-wrap gap-4 items-center justify-between">
                <div className="flex items-center gap-3">
                    <BrainCircuit className="text-aurum-cyan" size={20} />
                    <span className="font-semibold">AI Signal Engine</span>
                    <div className="flex gap-2">
                        <Badge variant="green">Gemini Flash</Badge>
                        <Badge variant="cyan">Deriv Feed</Badge>
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
                        {generating ? 'Analyzing...' : 'Generate Signal'}
                    </button>
                </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Signal Log */}
                <div className="lg:col-span-2 space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <RefreshCw size={16} className="text-aurum-text-muted" /> Signal Log
                    </h3>
                    <div className="space-y-4">
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
                                <p className="text-sm text-aurum-text mb-4 leading-relaxed">{s.reasoning}</p>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-aurum-text-muted">Confidence</span>
                                    <div className="flex items-center gap-3 flex-1 ml-4">
                                        <div className="flex-1 h-1.5 bg-aurum-surface3 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${s.confidence >= 70 ? 'bg-aurum-green' : s.confidence >= 50 ? 'bg-aurum-gold' : 'bg-aurum-red'}`}
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
                        <Newspaper size={16} className="text-aurum-text-muted" /> Sentiment Feed
                    </h3>
                    <Card className="p-0 overflow-hidden divide-y divide-aurum-border/50">
                        {news.map(n => (
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

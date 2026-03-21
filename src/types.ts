export type Page = 'dashboard' | 'live' | 'history' | 'signals' | 'settings';
export type BotStatus = 'LIVE' | 'PAUSED' | 'STOPPED';
export type Direction = 'BUY' | 'SELL';
export type TradeStatus = 'OPEN' | 'CLOSED';
export type SignalDecision = 'VALIDATED' | 'REJECTED' | 'WATCHING';
export type Sentiment = 'BULLISH' | 'BEARISH' | 'NEUTRAL';
export type ToastType = 'success' | 'error' | 'warning';

export interface Trade {
    id: string;
    date: string;
    symbol: string;
    direction: Direction;
    lot: number;
    entry: number;
    exit?: number | null;
    pips?: number;
    pnl: number;
    status: TradeStatus;
    sl?: number;
    tp?: number;
    openTime?: string; // ISO string for when trade was opened
}

export interface Signal {
    id: string;
    time: string;
    model: string;
    symbol: string;
    type: Direction | 'HOLD';
    decision: SignalDecision;
    reasoning: string;
    confidence: number;
}

export interface NewsItem {
    id: string;
    headline: string;
    source: string;
    sentiment: Sentiment;
    timeAgo: string;
    link?: string;
}

export interface PriceData {
    bid: number;
    ask: number;
    change: number;
    flash: 'green' | 'red' | '';
    high: number;
    low: number;
    spread: number;
}

export interface Prices {
    XAUUSD: PriceData;
    BTCUSD: PriceData;
}

export interface Settings {
    maxDailyLoss: number;
    lotSize: number;
    riskReward: string;
    tradeXAU: boolean;
    tradeBTC: boolean;
    notifOpen: boolean;
    notifClose: boolean;
    notifLimit: boolean;
    notifSignal: boolean;
    aiValidation: boolean; // When false, trade on TA signal alone without Claude
}

export interface ToastState {
    message: string;
    type: ToastType;
    id: number;
}

export interface ModalState {
    title: string;
    message: string;
    onConfirm: () => void;
}

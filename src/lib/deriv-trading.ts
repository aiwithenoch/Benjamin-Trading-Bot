// ─── Deriv Trading WebSocket Client ──────────────────────────────────────────
// Handles: candle data, contract proposals, buy, sell, portfolio monitoring

const DERIV_WS = 'wss://ws.binaryws.com/websockets/v3?app_id=1089';
const DERIV_TOKEN = import.meta.env.VITE_DERIV_API_TOKEN || 'd2XG7nqyVOKFfam';

export interface DerivCandle {
    epoch: number;
    open: number;
    high: number;
    low: number;
    close: number;
}

export interface DerivContract {
    contract_id: number;
    symbol: string;
    contract_type: string;
    buy_price: number;
    current_spot: number;
    profit: number;
    date_start: number;
    is_sold: number;
}

export type DerivEventCallback = (event: DerivEvent) => void;

export interface DerivEvent {
    type: 'candles' | 'ohlc' | 'proposal' | 'buy' | 'sell' | 'portfolio' | 'authorize' | 'error';
    data: any;
}

class DerivTradingClient {
    private ws: WebSocket | null = null;
    private authorized = false;
    private pendingQueue: string[] = [];
    private listeners: DerivEventCallback[] = [];
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private requestId = 1;

    constructor() {
        this.connect();
    }

    private connect() {
        try {
            this.ws = new WebSocket(DERIV_WS);
            this.ws.onopen = () => {
                this.emit({ type: 'error', data: { message: 'WS Connected — authorizing...' } });
                this.send({ authorize: DERIV_TOKEN });
            };
            this.ws.onmessage = (evt) => {
                const msg = JSON.parse(evt.data);
                if (msg.error) {
                    this.emit({ type: 'error', data: msg.error });
                    return;
                }
                if (msg.msg_type === 'authorize') {
                    this.authorized = true;
                    // Flush pending queue
                    while (this.pendingQueue.length) {
                        this.ws!.send(this.pendingQueue.shift()!);
                    }
                    this.emit({ type: 'authorize', data: msg.authorize });
                } else if (msg.msg_type === 'candles') {
                    this.emit({ type: 'candles', data: msg.candles });
                } else if (msg.msg_type === 'ohlc') {
                    this.emit({ type: 'ohlc', data: msg.ohlc });
                } else if (msg.msg_type === 'proposal') {
                    this.emit({ type: 'proposal', data: msg.proposal });
                } else if (msg.msg_type === 'buy') {
                    this.emit({ type: 'buy', data: msg.buy });
                } else if (msg.msg_type === 'sell') {
                    this.emit({ type: 'sell', data: msg.sell });
                } else if (msg.msg_type === 'portfolio') {
                    this.emit({ type: 'portfolio', data: msg.portfolio });
                }
            };
            this.ws.onerror = (e) => {
                this.emit({ type: 'error', data: { message: 'WebSocket network error.' } });
                this.scheduleReconnect();
            };
            this.ws.onclose = (e) => {
                this.emit({ type: 'error', data: { message: `WebSocket closed (code: ${e.code}). Reconnecting in 5s...` } });
                this.scheduleReconnect();
            };
        } catch (err: any) {
            this.emit({ type: 'error', data: { message: `Failed to open WS: ${err?.message}` } });
            this.scheduleReconnect();
        }
    }

    private scheduleReconnect() {
        this.authorized = false;
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
        this.reconnectTimer = setTimeout(() => this.connect(), 5000);
    }

    private send(payload: Record<string, any>) {
        const msg = JSON.stringify({ ...payload, req_id: this.requestId++ });
        if (this.ws?.readyState === WebSocket.OPEN && this.authorized) {
            this.ws.send(msg);
        } else {
            this.pendingQueue.push(msg);
        }
    }

    private emit(event: DerivEvent) {
        this.listeners.forEach(cb => cb(event));
    }

    on(cb: DerivEventCallback) {
        this.listeners.push(cb);
        return () => { this.listeners = this.listeners.filter(l => l !== cb); };
    }

    /** Fetch last N M5 candles (granularity=300 seconds) */
    getCandles(symbol: string, count = 50) {
        this.send({
            ticks_history: symbol,
            end: 'latest',
            count,
            granularity: 300, // 5 minutes
            style: 'candles',
            subscribe: 1,
        });
    }

    /** Get a multiplier contract proposal */
    getProposal(symbol: string, direction: 'BUY' | 'SELL', amount: number, slPips: number, tpPips: number) {
        const contractType = direction === 'BUY' ? 'MULTUP' : 'MULTDOWN';
        // For XAUUSD, 1 pip ≈ $0.01 per lot. Adjust as needed.
        const pipValue = symbol === 'frxXAUUSD' ? 0.01 : 1;
        this.send({
            proposal: 1,
            amount,
            basis: 'stake',
            contract_type: contractType,
            currency: 'USD',
            symbol,
            multiplier: 10,
            limit_order: {
                stop_loss: parseFloat((slPips * pipValue * amount).toFixed(2)),
                take_profit: parseFloat((tpPips * pipValue * amount).toFixed(2)),
            },
        });
    }

    /** Buy a contract from a proposal ID */
    buyContract(proposalId: string, price: number) {
        this.send({ buy: proposalId, price });
    }

    /** Sell (close) an open contract */
    sellContract(contractId: number) {
        this.send({ sell: contractId, price: 0 });
    }

    /** Get all open positions */
    getPortfolio() {
        this.send({ portfolio: 1, contract_type: ['MULTUP', 'MULTDOWN'] });
    }

    destroy() {
        this.ws?.close();
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
        this.listeners = [];
    }
}

// Singleton instance
let _client: DerivTradingClient | null = null;
export function getDerivTradingClient(): DerivTradingClient {
    if (!_client) _client = new DerivTradingClient();
    return _client;
}

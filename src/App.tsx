import { useState, useEffect, useCallback } from 'react';
import {
    LayoutDashboard, Activity, History, BrainCircuit,
    Settings as SettingsIcon, Menu, X, Clock, Power, AlertCircle, CheckCircle2, LogOut
} from 'lucide-react';
import { Dashboard } from './pages/Dashboard';
import { LiveTrades } from './pages/LiveTrades';
import { TradeHistory } from './pages/TradeHistory';
import { AISignals } from './pages/AISignals';
import { SettingsPage } from './pages/Settings';
import { Auth } from './pages/Auth';
import { Badge, Spinner } from './components';
import { useDerivPrices, useLivePnL, useSettings } from './hooks';
import { MOCK_HISTORY, MOCK_NEWS } from './mockData';
import { supabase } from './lib/supabase';
import { fetchTrades, fetchSignals, fetchSettings, saveSignal, saveSettings as dbSaveSettings, closeTrade as dbCloseTrade } from './lib/db';
import type { Page, Trade, Signal, ToastState, ModalState, Settings } from './types';

const INITIAL_SETTINGS: Settings = {
    maxDailyLoss: 10, lotSize: 0.1, riskReward: '1:2',
    tradeXAU: true, tradeBTC: true,
    notifOpen: true, notifClose: true, notifLimit: true, notifSignal: false,
};

export default function App() {
    const [session, setSession] = useState<any>(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [page, setPage] = useState<Page>('dashboard');
    const [mobileOpen, setMobileOpen] = useState(false);
    const [botStatus, setBotStatus] = useState<'LIVE' | 'PAUSED' | 'STOPPED'>('LIVE');
    const [clock, setClock] = useState(new Date());
    const [toast, setToast] = useState<ToastState | null>(null);
    const [modal, setModal] = useState<ModalState | null>(null);
    const [liveTrades, setLiveTrades] = useState<Trade[]>([]);
    const [tradeHistory, setTradeHistory] = useState<Trade[]>([]);
    const [signals, setSignals] = useState<Signal[]>([]);
    const [dataLoading, setDataLoading] = useState(false);

    const showToast = useCallback((message: string, type: ToastState['type'] = 'success') => {
        setToast({ message, type, id: Date.now() });
        setTimeout(() => setToast(null), 3500);
    }, []);

    const { settings, setSettings, save: updateSettings } = useSettings(INITIAL_SETTINGS, showToast);
    const { prices, connected } = useDerivPrices();
    useLivePnL(liveTrades, setLiveTrades, prices);

    // 🔐 Auth Listener
    useEffect(() => {
        if (!supabase) {
            setAuthLoading(false);
            return;
        }
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setAuthLoading(false);
        });
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });
        return () => subscription.unsubscribe();
    }, []);

    // 📥 Load Data on Auth
    useEffect(() => {
        if (!session?.user || !supabase) return;
        const loadData = async () => {
            setDataLoading(true);
            try {
                const [trades, sigs, dbSettings] = await Promise.all([
                    fetchTrades(session.user.id),
                    fetchSignals(session.user.id),
                    fetchSettings(session.user.id)
                ]);
                const open = (trades || []).filter(t => t.status === 'OPEN');
                const closed = (trades || []).filter(t => t.status === 'CLOSED');
                setLiveTrades(open);
                setTradeHistory(closed.length > 0 ? closed : MOCK_HISTORY);
                setSignals(sigs.length > 0 ? sigs : []);
                if (dbSettings) setSettings(dbSettings);
            } catch (e) {
                showToast('Error syncing with database', 'error');
            } finally {
                setDataLoading(false);
            }
        };
        loadData();
    }, [session, setSettings, showToast]);

    useEffect(() => {
        const id = setInterval(() => setClock(new Date()), 1000);
        return () => clearInterval(id);
    }, []);

    const todayLoss = liveTrades.filter(t => t.pnl < 0).reduce((s, t) => s + Math.abs(t.pnl), 0);
    const dailyLossPercent = Math.min((todayLoss / (settings?.maxDailyLoss || 10)) * 100, 100);
    const lossColorClass = dailyLossPercent >= 90 ? 'bg-aurum-red' : dailyLossPercent >= 70 ? 'bg-yellow-500' : 'bg-aurum-primary';

    useEffect(() => {
        if (dailyLossPercent >= 100 && botStatus === 'LIVE') {
            setBotStatus('STOPPED');
            showToast('Daily loss limit reached — bot stopped.', 'error');
        }
    }, [dailyLossPercent, botStatus, showToast]);

    const closeTradeAction = useCallback((id: string) => {
        const trade = liveTrades.find(t => t.id === id);
        if (!trade) return;
        setModal({
            title: 'Close Position',
            message: 'Close this position at current market price?',
            onConfirm: async () => {
                const exit = prices[trade.symbol as keyof typeof prices]?.bid || trade.entry;
                const pnl = trade.pnl;
                const pips = trade.pips;
                if (session?.user && supabase) {
                    await dbCloseTrade(id, exit, pips, pnl);
                }
                setLiveTrades(p => p.filter(t => t.id !== id));
                setTradeHistory(p => [{ ...trade, status: 'CLOSED', exit, pips, pnl }, ...p]);
                showToast('Position closed', 'success');
                setModal(null);
            },
        });
    }, [liveTrades, prices, session, showToast]);

    const toggleBot = useCallback(() => {
        if (botStatus === 'LIVE') {
            setModal({
                title: 'Stop Bot',
                message: 'Stop the bot? No new trades will open until restarted.',
                onConfirm: () => { setBotStatus('STOPPED'); showToast('Bot stopped', 'warning'); setModal(null); },
            });
        } else {
            setBotStatus('LIVE');
            showToast('Bot started — scanning...', 'success');
        }
    }, [botStatus, showToast]);

    const addSignalAction = useCallback(async (s: Signal) => {
        if (session?.user && supabase) {
            await saveSignal(s, session.user.id);
        }
        setSignals(prev => [s, ...prev]);
    }, [session]);

    const handleSettingsSave = useCallback(async (key: keyof Settings, value: any) => {
        const newSettings = { ...settings, [key]: value };
        updateSettings(key, value);
        if (session?.user && supabase) {
            await dbSaveSettings(newSettings, session.user.id);
        }
    }, [settings, updateSettings, session]);

    const handleLogout = async () => {
        if (supabase) await supabase.auth.signOut();
        setSession(null);
        showToast('Logged out successfully', 'success');
    };

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-aurum-bg">
                <Spinner />
            </div>
        );
    }

    // Never block the user with an error screen, just fallback to Auth or Guest
    if (!session) {
        return <Auth onSession={setSession} showToast={showToast} />;
    }

    const navItems = [
        { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { id: 'live', icon: Activity, label: 'Live Trades', badge: liveTrades.length },
        { id: 'history', icon: History, label: 'Trade History' },
        { id: 'signals', icon: BrainCircuit, label: 'AI Signals' },
        { id: 'settings', icon: SettingsIcon, label: 'Settings' },
    ] as const;

    return (
        <div className="min-h-screen flex bg-aurum-bg text-aurum-text font-sans selection:bg-aurum-primary/30">
            {mobileOpen && (
                <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
            )}
            <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-aurum-surface2 border-r border-aurum-border flex flex-col transform transition-transform duration-300 ease-in-out ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
                <div className="p-6 flex items-center justify-between border-b border-aurum-border/50">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-aurum-text to-aurum-primary-light bg-clip-text text-transparent">AURUM</h1>
                        <p className="text-xs text-aurum-text-muted mt-0.5">by Riverside AI</p>
                    </div>
                    <button className="lg:hidden text-aurum-text-muted hover:text-aurum-text" onClick={() => setMobileOpen(false)}><X size={20} /></button>
                </div>
                <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                    {navItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => { setPage(item.id as Page); setMobileOpen(false); }}
                            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl transition-all duration-200 text-sm ${page === item.id ? 'bg-aurum-primary/15 text-aurum-primary font-semibold' : 'text-aurum-text-muted hover:bg-aurum-surface3 hover:text-aurum-text'}`}
                        >
                            <div className="flex items-center gap-3"><item.icon size={17} /><span>{item.label}</span></div>
                            {'badge' in item && item.badge !== undefined && item.badge > 0 && <span className="bg-aurum-primary text-aurum-bg text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">{item.badge}</span>}
                        </button>
                    ))}
                </nav>
                <div className="p-4 border-t border-aurum-border space-y-3">
                    <div>
                        <div className="flex justify-between text-xs mb-1">
                            <span className="text-aurum-text-muted">Daily Loss</span>
                            <span className="font-mono text-aurum-text">${todayLoss.toFixed(2)} / ${settings?.maxDailyLoss || 10}</span>
                        </div>
                        <div className="h-1.5 bg-aurum-surface3 rounded-full overflow-hidden">
                            <div className={`h-full ${lossColorClass} transition-all duration-700`} style={{ width: `${dailyLossPercent}%` }} />
                        </div>
                    </div>
                    <div className="flex items-center justify-between bg-aurum-surface3 px-3 py-2.5 rounded-xl border border-aurum-border">
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${botStatus === 'LIVE' ? 'bg-aurum-green status-pulse' : 'bg-aurum-red'}`} />
                            <span className="text-sm font-medium">{botStatus === 'LIVE' ? 'Bot Active' : 'Bot Stopped'}</span>
                        </div>
                        <button onClick={toggleBot} className="text-aurum-text-muted hover:text-aurum-text transition-colors p-1 rounded"><Power size={15} /></button>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-aurum-text-muted">
                        <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-aurum-cyan' : 'bg-aurum-gold'}`} />
                        <span>{connected ? 'Deriv WS Connected' : 'Simulated Feed'}</span>
                    </div>
                </div>
            </aside>
            <div className="flex-1 flex flex-col lg:ml-64 min-h-screen">
                <header className="h-16 bg-aurum-bg/80 backdrop-blur-md border-b border-aurum-border flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30">
                    <div className="flex items-center gap-4">
                        <button className="lg:hidden text-aurum-text hover:text-aurum-text-muted transition-colors" onClick={() => setMobileOpen(true)}><Menu size={24} /></button>
                        <h2 className="text-base font-semibold capitalize hidden sm:block">{page.replace('-', ' ')}</h2>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex items-center gap-2 text-sm text-aurum-text-muted font-mono"><Clock size={13} /><span>{clock.toLocaleTimeString()}</span></div>
                        {dataLoading && <Spinner />}
                        <button onClick={handleLogout} className="p-2 hover:bg-aurum-surface2 rounded-lg text-aurum-text-muted hover:text-aurum-red transition-all" title="Logout"><LogOut size={18} /></button>
                        <Badge variant={botStatus === 'LIVE' ? 'green' : 'red'}>{botStatus === 'LIVE' ? '● LIVE' : '■ STOPPED'}</Badge>
                    </div>
                </header>
                <main className="flex-1 p-4 lg:p-8 overflow-x-hidden">
                    {dailyLossPercent >= 100 && (
                        <div className="mb-6 bg-aurum-red/10 border border-aurum-red/30 text-aurum-red px-4 py-3 rounded-xl flex items-center gap-3">
                            <AlertCircle size={18} />
                            <span className="font-medium text-sm">Daily loss limit reached — bot paused automatically.</span>
                        </div>
                    )}
                    {page === 'dashboard' && <Dashboard prices={prices} liveTrades={liveTrades} signals={signals} todayLoss={todayLoss} maxDailyLoss={settings?.maxDailyLoss || 10} dailyLossPercent={dailyLossPercent} lossColorClass={lossColorClass} onViewAll={() => setPage('history')} tradeHistory={tradeHistory} />}
                    {page === 'live' && <LiveTrades trades={liveTrades} prices={prices} onClose={closeTradeAction} />}
                    {page === 'history' && <TradeHistory history={tradeHistory} showToast={showToast} />}
                    {page === 'signals' && <AISignals signals={signals} news={MOCK_NEWS} showToast={showToast} onNewSignal={addSignalAction} prices={prices} />}
                    {page === 'settings' && <SettingsPage settings={settings} botStatus={botStatus} todayLoss={todayLoss} dailyLossPercent={dailyLossPercent} lossColorClass={lossColorClass} onToggleBot={toggleBot} onSave={handleSettingsSave} />}
                </main>
            </div>
            {toast && (
                <div className="fixed bottom-6 right-6 z-[200] animate-fadeIn">
                    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border ${toast.type === 'success' ? 'bg-aurum-surface border-aurum-green/30' : toast.type === 'error' ? 'bg-aurum-surface border-aurum-red/30' : 'bg-aurum-surface border-aurum-gold/30'}`}>
                        {toast.type === 'success' && <CheckCircle2 size={17} className="text-aurum-green shrink-0" />}
                        <span className="text-sm font-medium">{toast.message}</span>
                    </div>
                </div>
            )}
            {modal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) setModal(null); }}>
                    <div className="bg-aurum-surface border border-aurum-border rounded-2xl p-7 max-w-sm w-full shadow-2xl animate-fadeIn">
                        <h3 className="text-xl font-bold mb-2">{modal.title}</h3>
                        <p className="text-aurum-text-muted text-sm mb-7">{modal.message}</p>
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setModal(null)} className="px-5 py-2.5 rounded-xl font-medium text-sm hover:bg-aurum-surface3 transition-colors">Cancel</button>
                            <button onClick={modal.onConfirm} className="px-5 py-2.5 rounded-xl font-semibold text-sm bg-aurum-primary text-aurum-bg hover:bg-aurum-primary-light transition-colors active:scale-95">Confirm</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

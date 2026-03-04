import { supabase } from './supabase';
import type { Trade, Signal, Settings } from '../types';

// ─── TRADES ──────────────────────────────────────────────────────────────────

export async function saveTrade(trade: Trade, userId: string) {
    const { error } = await supabase.from('trades').upsert({
        id: trade.id,
        user_id: userId,
        date: trade.date,
        symbol: trade.symbol,
        direction: trade.direction,
        lot: trade.lot,
        entry: trade.entry,
        exit: trade.exit,
        pips: trade.pips,
        pnl: trade.pnl,
        status: trade.status,
        sl: trade.sl,
        tp: trade.tp,
    });
    if (error) console.error('saveTrade:', error.message);
}

export async function fetchTrades(userId: string): Promise<Trade[]> {
    const { data, error } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(100);
    if (error) { console.error('fetchTrades:', error.message); return []; }
    return (data || []).map((r: any) => ({
        id: r.id, date: r.date, symbol: r.symbol, direction: r.direction,
        lot: r.lot, entry: r.entry, exit: r.exit, pips: r.pips,
        pnl: r.pnl, status: r.status, sl: r.sl, tp: r.tp,
    }));
}

export async function closeTrade(id: string, exit: number, pips: number, pnl: number) {
    const { error } = await supabase
        .from('trades')
        .update({ status: 'CLOSED', exit, pips, pnl })
        .eq('id', id);
    if (error) console.error('closeTrade:', error.message);
}

// ─── SIGNALS ─────────────────────────────────────────────────────────────────

export async function saveSignal(signal: Signal, userId: string) {
    const { error } = await supabase.from('signals').insert({
        id: signal.id,
        user_id: userId,
        time: signal.time,
        model: signal.model,
        symbol: signal.symbol,
        type: signal.type,
        decision: signal.decision,
        reasoning: signal.reasoning,
        confidence: signal.confidence,
        created_at: new Date().toISOString(),
    });
    if (error) console.error('saveSignal:', error.message);
}

export async function fetchSignals(userId: string): Promise<Signal[]> {
    const { data, error } = await supabase
        .from('signals')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);
    if (error) { console.error('fetchSignals:', error.message); return []; }
    return (data || []).map((r: any) => ({
        id: r.id, time: r.time, model: r.model, symbol: r.symbol,
        type: r.type, decision: r.decision, reasoning: r.reasoning,
        confidence: r.confidence,
    }));
}

// ─── SETTINGS ────────────────────────────────────────────────────────────────

export async function saveSettings(settings: Settings, userId: string) {
    const { error } = await supabase.from('settings').upsert({
        user_id: userId, ...settings, updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });
    if (error) console.error('saveSettings:', error.message);
}

export async function fetchSettings(userId: string): Promise<Settings | null> {
    const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('user_id', userId)
        .single();
    if (error || !data) return null;
    return {
        maxDailyLoss: data.maxDailyLoss, lotSize: data.lotSize,
        riskReward: data.riskReward, tradeXAU: data.tradeXAU,
        tradeBTC: data.tradeBTC, notifOpen: data.notifOpen,
        notifClose: data.notifClose, notifLimit: data.notifLimit,
        notifSignal: data.notifSignal,
    };
}

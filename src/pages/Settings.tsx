import { Card, Toggle, ProgressBar } from '../components';
import type { Settings } from '../types';
import { Power, Shield, BarChart2, Bell, Server } from 'lucide-react';

interface SettingsPageProps {
    settings: Settings;
    botStatus: 'LIVE' | 'PAUSED' | 'STOPPED';
    todayLoss: number;
    dailyLossPercent: number;
    lossColorClass: string;
    onToggleBot: () => void;
    onSave: (key: keyof Settings, value: Settings[keyof Settings]) => void;
}

export function SettingsPage({
    settings, botStatus, todayLoss, dailyLossPercent, lossColorClass,
    onToggleBot, onSave
}: SettingsPageProps) {
    return (
        <div className="max-w-3xl space-y-8 page-enter pb-12">

            {/* Broker Info */}
            <section>
                <h3 className="text-sm font-semibold text-aurum-text-muted uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Server size={14} /> Broker Connection
                </h3>
                <Card className="p-0 divide-y divide-aurum-border/50">
                    <div className="p-5 flex items-center justify-between">
                        <div>
                            <h4 className="font-semibold mb-0.5">Deriv API</h4>
                            <p className="text-sm text-aurum-text-muted font-mono">d2XG7••••••••</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-aurum-green animate-pulse" />
                            <span className="text-xs text-aurum-green font-semibold">Connected</span>
                        </div>
                    </div>
                    <div className="p-5 flex items-center justify-between">
                        <div>
                            <h4 className="font-semibold mb-0.5">IC Markets MT5</h4>
                            <p className="text-sm text-aurum-text-muted">Login: 11587275 · ICMarkertsSC-MT5-4</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-aurum-gold animate-pulse" />
                            <span className="text-xs text-aurum-gold font-semibold">Standby</span>
                        </div>
                    </div>
                </Card>
            </section>

                {/* Bot Controls */}
            <section>
                <h3 className="text-sm font-semibold text-aurum-text-muted uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Power size={14} /> Bot Controls
                </h3>
                <Card className="p-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="font-semibold mb-0.5">Master Switch</h4>
                            <p className="text-sm text-aurum-text-muted">Start or stop all automated trading</p>
                        </div>
                        <button
                            onClick={onToggleBot}
                            className={`px-6 py-2.5 rounded-lg font-bold text-sm transition-all active:scale-95 ${botStatus === 'LIVE'
                                    ? 'bg-aurum-red/10 text-aurum-red border border-aurum-red/30 hover:bg-aurum-red/20'
                                    : 'bg-aurum-primary text-aurum-bg hover:bg-aurum-primary-light'
                                }`}
                        >
                            {botStatus === 'LIVE' ? '⏹ STOP BOT' : '▶ START BOT'}
                        </button>
                    </div>
                    <div className="pt-4 border-t border-aurum-border flex items-center justify-between">
                        <div>
                            <h4 className="font-semibold mb-0.5">AI Signal Validation</h4>
                            <p className="text-sm text-aurum-text-muted">Require Claude AI to validate before placing any trade</p>
                            <p className="text-xs text-aurum-gold mt-1">Turn OFF to trade on EMA/RSI signals instantly — no AI key needed</p>
                        </div>
                        <Toggle
                            checked={settings.aiValidation !== false}
                            onChange={() => onSave('aiValidation', !settings.aiValidation)}
                        />
                    </div>
                    <div className="pt-4 border-t border-aurum-border flex items-center justify-between">
                        <div>
                            <h4 className="font-semibold mb-0.5">Trading Hours</h4>
                            <p className="text-sm text-aurum-text-muted">Session schedule</p>
                        </div>
                        <select className="bg-aurum-surface2 border border-aurum-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-aurum-primary appearance-none">
                            <option>24/5 (Mon–Fri)</option>
                            <option>London Session</option>
                            <option>New York Session</option>
                            <option>Asia Session</option>
                            <option>Custom</option>
                        </select>
                    </div>
                </Card>
            </section>

            {/* Risk Management */}
            <section>
                <h3 className="text-sm font-semibold text-aurum-text-muted uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Shield size={14} /> Risk Management
                </h3>
                <Card className="p-6 space-y-6">
                    <div>
                        <div className="flex justify-between mb-3">
                            <h4 className="font-semibold">Max Daily Loss</h4>
                            <span className="font-mono text-aurum-primary font-bold">${settings.maxDailyLoss}.00</span>
                        </div>
                        <input
                            type="range" min="1" max="100" value={settings.maxDailyLoss}
                            onChange={e => onSave('maxDailyLoss', parseInt(e.target.value))}
                            className="w-full mb-2"
                        />
                        <div className="flex justify-between text-xs text-aurum-text-muted mb-3">
                            <span>$1</span><span>$100</span>
                        </div>
                        <ProgressBar
                            value={dailyLossPercent}
                            color={lossColorClass}
                            label={`Today: $${todayLoss.toFixed(2)} used`}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-5 pt-4 border-t border-aurum-border">
                        <div>
                            <h4 className="font-semibold mb-2">Default Lot Size</h4>
                            <input
                                type="number" step="0.01" min="0.01" max="5.00"
                                value={settings.lotSize}
                                onChange={e => onSave('lotSize', parseFloat(e.target.value))}
                                className="w-full bg-aurum-surface2 border border-aurum-border rounded-lg px-4 py-2.5 font-mono focus:outline-none focus:border-aurum-primary text-sm"
                            />
                        </div>
                        <div>
                            <h4 className="font-semibold mb-2">Risk/Reward</h4>
                            <select
                                value={settings.riskReward}
                                onChange={e => onSave('riskReward', e.target.value)}
                                className="w-full bg-aurum-surface2 border border-aurum-border rounded-lg px-4 py-2.5 focus:outline-none focus:border-aurum-primary text-sm appearance-none"
                            >
                                {['1:1', '1:1.5', '1:2', '1:2.5', '1:3'].map(r => <option key={r}>{r}</option>)}
                            </select>
                        </div>
                    </div>
                </Card>
            </section>

            {/* Trading Pairs */}
            <section>
                <h3 className="text-sm font-semibold text-aurum-text-muted uppercase tracking-widest mb-4 flex items-center gap-2">
                    <BarChart2 size={14} /> Trading Pairs
                </h3>
                <Card className="p-0 divide-y divide-aurum-border/50">
                    {[
                        { key: 'tradeXAU' as const, label: 'XAUUSD', sub: 'Gold / US Dollar', checked: settings.tradeXAU },
                        { key: 'tradeBTC' as const, label: 'BTCUSD', sub: 'Bitcoin / US Dollar', checked: settings.tradeBTC },
                    ].map(item => (
                        <div key={item.key} className="p-5 flex items-center justify-between">
                            <div>
                                <h4 className="font-semibold font-mono">{item.label}</h4>
                                <p className="text-sm text-aurum-text-muted">{item.sub}</p>
                            </div>
                            <Toggle checked={item.checked} onChange={() => onSave(item.key, !item.checked)} />
                        </div>
                    ))}
                </Card>
            </section>

            {/* Notifications */}
            <section>
                <h3 className="text-sm font-semibold text-aurum-text-muted uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Bell size={14} /> Notifications
                </h3>
                <Card className="p-0 divide-y divide-aurum-border/50">
                    {[
                        { id: 'notifOpen' as const, label: 'Trade Opened', desc: 'Notify when bot enters a position' },
                        { id: 'notifClose' as const, label: 'Trade Closed', desc: 'Notify on SL/TP hit or manual close' },
                        { id: 'notifLimit' as const, label: 'Daily Limit Reached', desc: 'Alert when max daily loss is hit' },
                        { id: 'notifSignal' as const, label: 'AI Signal Generated', desc: 'Alert for every validated signal' },
                    ].map(item => (
                        <div key={item.id} className="p-4 flex items-center justify-between">
                            <div>
                                <h4 className="font-semibold text-sm mb-0.5">{item.label}</h4>
                                <p className="text-xs text-aurum-text-muted">{item.desc}</p>
                            </div>
                            <Toggle
                                checked={settings[item.id] as boolean}
                                onChange={() => onSave(item.id, !settings[item.id])}
                            />
                        </div>
                    ))}
                </Card>
            </section>

            {/* Version */}
            <p className="text-xs text-aurum-text-muted text-center pt-4">AURUM by Riverside AI · v1.0.0 · IC Markets MT5 + Deriv API</p>
        </div>
    );
}

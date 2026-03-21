import React from 'react';

// ─── Card ────────────────────────────────────────────────────────────────────
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    className?: string;
    accent?: boolean;
    accentColor?: string;
}
export const Card = ({ children, className = '', accent = false, accentColor = 'bg-aurum-primary', ...props }: CardProps) => (
    <div
        className={`bg-aurum-surface border border-aurum-border rounded-xl overflow-hidden relative transition-all duration-300 hover:border-aurum-border/80 ${className}`}
        {...props}
    >
        {accent && <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${accentColor}`} />}
        {children}
    </div>
);

// ─── Badge ───────────────────────────────────────────────────────────────────
interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    children: React.ReactNode;
    variant?: 'green' | 'red' | 'cyan' | 'gold' | 'neutral';
}
export const Badge = ({ children, variant = 'neutral', ...props }: BadgeProps) => {
    const colors = {
        green: 'bg-aurum-green/10  text-aurum-green  border-aurum-green/20',
        red: 'bg-aurum-red/10    text-aurum-red    border-aurum-red/20',
        cyan: 'bg-aurum-cyan/10   text-aurum-cyan   border-aurum-cyan/20',
        gold: 'bg-aurum-gold/10   text-aurum-gold   border-aurum-gold/20',
        neutral: 'bg-aurum-surface3  text-aurum-text-muted border-aurum-border',
    };
    return (
        <span className={`px-2 py-0.5 rounded text-xs font-semibold border tracking-wide ${colors[variant]}`} {...props}>
            {children}
        </span>
    );
};

// ─── LiveTradeTimer ──────────────────────────────────────────────────────────
export const LiveTradeTimer = ({ openTime, date }: { openTime?: string; date: string }) => {
    const [duration, setDuration] = React.useState('');
    React.useEffect(() => {
        const update = () => {
            // Prefer openTime (ISO 8601) for reliable parsing; fall back to date
            const ref = openTime || date;
            const diff = Math.max(0, Date.now() - new Date(ref).getTime());
            const h = Math.floor(diff / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            setDuration(h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`);
        };
        update();
        const id = setInterval(update, 1000);
        return () => clearInterval(id);
    }, [openTime, date]);
    return <span>Open {duration}</span>;
};

// ─── StatCard ────────────────────────────────────────────────────────────────
interface StatCardProps { label: string; value: string; color?: string; sub?: React.ReactNode; }
export const StatCard = ({ label, value, color = 'text-aurum-text', sub }: StatCardProps) => (
    <Card className="p-4 text-center">
        <p className="text-xs text-aurum-text-muted mb-1">{label}</p>
        <p className={`text-lg font-mono font-semibold ${color}`}>{value}</p>
        {sub && <div className="mt-1">{sub}</div>}
    </Card>
);

// ─── SectionHeader ───────────────────────────────────────────────────────────
export const SectionHeader = ({ title, action }: { title: string; action?: React.ReactNode }) => (
    <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-aurum-text">{title}</h3>
        {action}
    </div>
);

// ─── EmptyState ──────────────────────────────────────────────────────────────
export const EmptyState = ({ icon: Icon, message }: { icon: React.ElementType; message: string }) => (
    <div className="flex flex-col items-center justify-center py-20 text-aurum-text-muted gap-4">
        <Icon size={48} className="opacity-20" />
        <p className="text-sm">{message}</p>
    </div>
);

// ─── Spinner ─────────────────────────────────────────────────────────────────
export const Spinner = () => (
    <div className="w-4 h-4 border-2 border-aurum-primary/30 border-t-aurum-primary rounded-full animate-spin" />
);

// ─── Toggle ──────────────────────────────────────────────────────────────────
export const Toggle = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
    <button
        onClick={onChange}
        className={`w-11 h-6 rounded-full relative transition-colors duration-300 focus:outline-none ${checked ? 'bg-aurum-primary' : 'bg-aurum-surface3'}`}
        role="switch"
        aria-checked={checked}
    >
        <div className={`w-4 h-4 rounded-full bg-white absolute top-1 shadow transition-transform duration-300 ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
);

// ─── ProgressBar ─────────────────────────────────────────────────────────────
export const ProgressBar = ({ value, color = 'bg-aurum-primary', label }: { value: number; color?: string; label?: string }) => (
    <div>
        {label && <div className="flex justify-between text-xs mb-1"><span className="text-aurum-text-muted">{label}</span><span className="font-mono text-aurum-text">{value.toFixed(0)}%</span></div>}
        <div className="h-1.5 bg-aurum-surface3 rounded-full overflow-hidden">
            <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${Math.min(100, value)}%` }} />
        </div>
    </div>
);

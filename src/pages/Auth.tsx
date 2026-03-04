import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Card, Spinner } from '../components';
import { Mail, Lock, User, LogIn, UserPlus, AlertCircle } from 'lucide-react';

interface AuthProps {
    onSession: (session: any) => void;
    showToast: (msg: string, type?: 'success' | 'error' | 'warning') => void;
}

export function Auth({ onSession, showToast }: AuthProps) {
    const [loading, setLoading] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supabase) {
            showToast('Supabase not configured. Check Vercel environment variables.', 'error');
            return;
        }

        setLoading(true);
        try {
            if (isSignUp) {
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: { data: { full_name: fullName } }
                });
                if (error) throw error;
                showToast('Check your email for the confirmation link!', 'success');
            } else {
                const { data, error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                onSession(data.session);
                showToast('Welcome back!', 'success');
            }
        } catch (error: any) {
            showToast(error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-aurum-bg">
            <div className="w-full max-w-md page-enter">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold tracking-tighter bg-gradient-to-r from-aurum-text to-aurum-primary-light bg-clip-text text-transparent mb-2">AURUM</h1>
                    <p className="text-aurum-text-muted text-sm uppercase tracking-widest font-semibold">The Golden Standard of Trading</p>
                </div>
                <Card className="p-8 shadow-2xl border-aurum-primary/10">
                    <div className="flex gap-4 mb-8 p-1 bg-aurum-surface2 rounded-xl">
                        <button onClick={() => setIsSignUp(false)} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${!isSignUp ? 'bg-aurum-surface3 text-aurum-primary shadow-lg' : 'text-aurum-text-muted hover:text-aurum-text'}`}><LogIn size={16} /> Sign In</button>
                        <button onClick={() => setIsSignUp(true)} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${isSignUp ? 'bg-aurum-surface3 text-aurum-primary shadow-lg' : 'text-aurum-text-muted hover:text-aurum-text'}`}><UserPlus size={16} /> Sign Up</button>
                    </div>
                    <form onSubmit={handleAuth} className="space-y-5">
                        {isSignUp && (
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-aurum-text-muted uppercase tracking-wider ml-1">Full Name</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-aurum-text-muted" size={18} />
                                    <input type="text" required placeholder="Enter your name" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full bg-aurum-surface2 border border-aurum-border rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-aurum-primary transition-colors text-sm" />
                                </div>
                            </div>
                        )}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-aurum-text-muted uppercase tracking-wider ml-1">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-aurum-text-muted" size={18} />
                                <input type="email" required placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-aurum-surface2 border border-aurum-border rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-aurum-primary transition-colors text-sm" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-aurum-text-muted uppercase tracking-wider ml-1">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-aurum-text-muted" size={18} />
                                <input type="password" required placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-aurum-surface2 border border-aurum-border rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-aurum-primary transition-colors text-sm" />
                            </div>
                        </div>
                        <button type="submit" disabled={loading} className="w-full bg-aurum-primary text-aurum-bg font-bold py-4 rounded-xl flex items-center justify-center gap-3 hover:bg-aurum-primary-light transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed mt-4 shadow-xl shadow-aurum-primary/10">
                            {loading ? <Spinner /> : isSignUp ? 'Create Account' : 'Sign In Now'}
                        </button>
                    </form>
                    <div className="mt-8 pt-6 border-t border-aurum-border flex items-start gap-3 bg-aurum-surface2/50 p-4 rounded-xl">
                        <AlertCircle className="text-aurum-gold shrink-0" size={18} />
                        <p className="text-[10px] leading-relaxed text-aurum-text-muted italic">AURUM uses end-to-end encrypted sessions via Supabase. Your trading credentials and strategies are secured using industry-standard AES-256 protocols.</p>
                    </div>
                </Card>
                <p className="text-center mt-8 text-xs text-aurum-text-muted">RiverSide AI Systems · {new Date().getFullYear()} · All Rights Reserved</p>
            </div>
        </div>
    );
}

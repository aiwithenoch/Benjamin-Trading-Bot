-- AURUM SUPABASE SCHEMA (RUN IN SQL EDITOR)

-- 1. TRADES TABLE
CREATE TABLE IF NOT EXISTS public.trades (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date TIMESTAMPTZ NOT NULL,
    symbol TEXT NOT NULL,
    direction TEXT NOT NULL,
    lot DECIMAL NOT NULL,
    entry DECIMAL NOT NULL,
    exit DECIMAL,
    pips DECIMAL,
    pnl DECIMAL,
    status TEXT NOT NULL, -- 'OPEN', 'CLOSED'
    sl DECIMAL,
    tp DECIMAL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. SIGNALS TABLE
CREATE TABLE IF NOT EXISTS public.signals (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    time TEXT NOT NULL,
    model TEXT NOT NULL,
    symbol TEXT NOT NULL,
    type TEXT NOT NULL,
    decision TEXT NOT NULL,
    reasoning TEXT NOT NULL,
    confidence INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    "maxDailyLoss" DECIMAL DEFAULT 10,
    "lotSize" DECIMAL DEFAULT 0.1,
    "riskReward" TEXT DEFAULT '1:2',
    "tradeXAU" BOOLEAN DEFAULT TRUE,
    "tradeBTC" BOOLEAN DEFAULT TRUE,
    "notifOpen" BOOLEAN DEFAULT TRUE,
    "notifClose" BOOLEAN DEFAULT TRUE,
    "notifLimit" BOOLEAN DEFAULT TRUE,
    "notifSignal" BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ENABLE RLS
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- 5. POLICIES (USER CAN ONLY SEE THEIR OWN DATA)
CREATE POLICY "Users can only access their own trades" ON public.trades
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only access their own signals" ON public.signals
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only access their own settings" ON public.settings
    FOR ALL USING (auth.uid() = user_id);

-- 6. GRANT PERMISSIONS
GRANT ALL ON public.trades TO authenticated;
GRANT ALL ON public.signals TO authenticated;
GRANT ALL ON public.settings TO authenticated;

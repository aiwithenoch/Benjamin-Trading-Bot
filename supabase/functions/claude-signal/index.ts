// Supabase Edge Function: /functions/v1/claude-signal
// Deploy with: supabase functions deploy claude-signal
// Set secret: supabase secrets set ANTHROPIC_API_KEY=sk-ant-api03-...

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { symbol, bid, ask, change, spread, high, low } = await req.json();
        const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? '';

        if (!ANTHROPIC_KEY) throw new Error('Missing ANTHROPIC_API_KEY');

        const systemPrompt = `You are AURUM's elite quantitative trading analyst. Respond ONLY with raw JSON — no markdown, no prose outside the JSON.`;

        const userPrompt = `Analyze ${symbol} and generate a precise trading signal.

LIVE DATA: Bid=${bid}, Ask=${ask}, Spread=${spread}, 24h Change=${change}%, High=${high}, Low=${low}

Respond with ONLY:
{"type":"BUY"|"SELL"|"HOLD","decision":"VALIDATED"|"REJECTED"|"WATCHING","reasoning":"<150 chars citing exact levels>","confidence":<30-95>,"sl_pips":<int>,"tp_pips":<int>}`;

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': ANTHROPIC_KEY,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: 'claude-opus-4-5',
                max_tokens: 256,
                system: systemPrompt,
                messages: [{ role: 'user', content: userPrompt }],
            }),
        });

        if (!response.ok) throw new Error(`Anthropic ${response.status}`);
        const data = await response.json();
        const text = data?.content?.[0]?.text ?? '';
        const json = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? '{}');

        return new Response(JSON.stringify(json), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});

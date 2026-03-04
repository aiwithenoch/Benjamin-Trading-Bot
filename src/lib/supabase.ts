import { createClient } from '@supabase/supabase-js';

// AURUM Production Keys - Hardcoded as fallbacks for zero-setup deployment
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://uoltjdgaoerzzdxldala.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvbHRqZGdhb2VyenpkeGxkYWxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2MTcyNjEsImV4cCI6MjA4ODE5MzI2MX0.NGwH6s2CfyHW1rX4oc6hpxfUBEo_wpVm6Y9th1g_N08';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export type { User, Session } from '@supabase/supabase-js';

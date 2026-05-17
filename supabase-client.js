// supabase-client.js
const SUPABASE_URL = "https://xdnmaqjqufeelrjbheky.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_t1w477Z6EHsGWpWZEJfY0Q_xzx4KOXN";

// Globale Supabase-Instanz
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Globaler Währungs-Formatter
const formatter = new Intl.NumberFormat('de-DE', { 
    style: 'currency', 
    currency: 'EUR', 
    maximumFractionDigits: 0 
});
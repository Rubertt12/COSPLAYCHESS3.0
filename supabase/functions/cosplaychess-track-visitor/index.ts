import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const botPattern = /(bot|crawler|spider|slurp|bingpreview|facebookexternalhit|headless|lighthouse|uptimerobot|pingdom|monitoring)/i;

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'method_not_allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  const userAgent = req.headers.get('user-agent') || '';
  if (!userAgent || botPattern.test(userAgent)) {
    return new Response(JSON.stringify({ ok: true, ignored: 'bot_or_missing_ua' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const ip = req.headers.get('cf-connecting-ip') || req.headers.get('x-real-ip') || forwarded || '';
  if (!ip) return new Response(JSON.stringify({ ok: true, ignored: 'no_ip' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const secret = Deno.env.get('VISITOR_HASH_SECRET') || serviceRole;
  const ipHash = await sha256(`${secret}:${ip}`);

  const db = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });
  const { error } = await db.rpc('register_cosplay_site_visitor', { p_ip_hash: ipHash });
  if (error) {
    console.error('visitor tracking failed', error.message);
    return new Response(JSON.stringify({ error: 'tracking_failed' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
});

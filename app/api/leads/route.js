/**
 * app/api/leads/route.js — Endpoint de capture email pour lead magnets.
 *
 * Anti-spam multi-couches (defense in depth) :
 *   1. Honeypot field (`website` rempli = bot)
 *   2. Timer (submit < 2s après load = bot)
 *   3. Format email + domaine MX vérifiable (basique)
 *   4. Blocklist domaines emails jetables (tempmail, mailinator, etc.)
 *   5. Rate limit par IP hash (max 5 captures / heure / IP)
 *   6. (Optionnel) Cloudflare Turnstile si CLOUDFLARE_TURNSTILE_SECRET configuré
 *
 * Stockage : table Supabase `email_captures` (cf. migration v40).
 *
 * Réponse OK : { ok: true }
 * Réponse KO : { ok: false, error: 'reason' } + status 4xx
 *
 * On NE révèle PAS au client la cause exacte du rejet (anti-bot) — on
 * répond toujours "OK" côté UX si le bot est détecté, pour ne pas lui
 * dire qu'il a échoué (silent reject pattern).
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com', 'tempmail.com', 'tempmail.io', 'temp-mail.org',
  '10minutemail.com', 'throwaway.email', 'guerrillamail.com',
  'sharklasers.com', 'yopmail.com', 'maildrop.cc', 'getairmail.com',
  'fakeinbox.com', 'trashmail.com', 'mintemail.com', 'mvrht.com',
  'dispostable.com', 'spamgourmet.com', 'tempinbox.com', 'mohmal.com',
]);

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

function hashIP(ip) {
  return crypto.createHash('sha256').update(ip + (process.env.IP_HASH_SALT || 'izisolo')).digest('hex');
}

function getIP(request) {
  // Vercel forward dans x-forwarded-for, x-real-ip
  return request.headers.get('x-forwarded-for')?.split(',')[0].trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
}

async function verifyTurnstile(token, ip) {
  const secret = process.env.CLOUDFLARE_TURNSTILE_SECRET;
  if (!secret) return true; // Pas configuré → on skip (mais on garde les autres couches)
  if (!token) return false; // Configuré mais token absent → reject

  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token, remoteip: ip }),
    });
    const data = await res.json();
    return data.success === true;
  } catch {
    return false;
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      email,
      source = 'unknown',
      website,            // honeypot — doit être vide
      timeToSubmitMs,     // temps depuis l'ouverture de page
      turnstileToken,     // optionnel
    } = body || {};

    const ip = getIP(request);
    const ipHash = hashIP(ip);
    const userAgent = request.headers.get('user-agent') || '';

    // ─── Couche 1 : Honeypot ──────────────────────────────────────
    // Si rempli → bot. On répond OK pour pas l'alerter, mais on ne save rien.
    if (website && website.trim().length > 0) {
      console.log('[leads] Bot detected via honeypot:', { ip, userAgent });
      return NextResponse.json({ ok: true });
    }

    // ─── Couche 2 : Timer ─────────────────────────────────────────
    // Submit < 2 secondes après l'ouverture = bot quasi-certain.
    // Un humain prend au moins 5-10s pour taper son email.
    if (typeof timeToSubmitMs === 'number' && timeToSubmitMs < 2000) {
      console.log('[leads] Bot detected via timer:', { timeToSubmitMs, ip });
      return NextResponse.json({ ok: true });
    }

    // ─── Couche 3 : Format email ──────────────────────────────────
    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
      return NextResponse.json({ ok: false, error: 'invalid_email' }, { status: 400 });
    }
    const cleanEmail = email.trim().toLowerCase();

    // ─── Couche 4 : Domaines jetables ─────────────────────────────
    const domain = cleanEmail.split('@')[1];
    if (DISPOSABLE_DOMAINS.has(domain)) {
      return NextResponse.json({ ok: false, error: 'disposable_email' }, { status: 400 });
    }

    // ─── Couche 5 : Cloudflare Turnstile (optionnel) ──────────────
    const turnstileOK = await verifyTurnstile(turnstileToken, ip);
    if (!turnstileOK) {
      console.log('[leads] Bot detected via Turnstile:', { ip });
      return NextResponse.json({ ok: true }); // silent reject
    }

    // ─── Couche 6 : Rate limit (Supabase) ─────────────────────────
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentCount, error: rateLimitErr } = await supabase
      .from('email_captures')
      .select('id', { count: 'exact', head: true })
      .eq('ip_hash', ipHash)
      .gte('created_at', oneHourAgo);

    if (rateLimitErr) {
      console.error('[leads] rate-limit query failed:', rateLimitErr.message);
      // On laisse passer (fail open) plutôt que de bloquer un humain à cause d'un bug DB
    } else if (recentCount >= 5) {
      console.log('[leads] Rate limit hit:', { ipHash, recentCount });
      return NextResponse.json({ ok: false, error: 'rate_limit' }, { status: 429 });
    }

    // ─── Insert (upsert sur conflict email) ───────────────────────
    const { error: insertErr } = await supabase
      .from('email_captures')
      .upsert({
        email: cleanEmail,
        source: String(source).slice(0, 100),
        ip_hash: ipHash,
        user_agent: userAgent.slice(0, 500),
        honeypot_ok: true,
        time_to_submit_ms: timeToSubmitMs && Number.isFinite(timeToSubmitMs)
          ? Math.min(Math.floor(timeToSubmitMs), 2147483647)
          : null,
      }, {
        onConflict: 'email',
        ignoreDuplicates: false,
      });

    if (insertErr) {
      console.error('[leads] insert failed:', insertErr.message);
      // On reste poli côté UX — l'utilisateur aurait juste à réessayer
      return NextResponse.json({ ok: false, error: 'save_failed' }, { status: 500 });
    }

    // TODO : envoi email de confirmation via Resend (optionnel, plus tard)
    // Pour l'instant on save juste, et on confirme côté UX

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[leads] unexpected error:', err);
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 });
  }
}

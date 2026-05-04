/**
 * lib/antibot.js — Protection anti-bot multi-couches
 *
 * 3 couches activables indépendamment :
 *   1. Honeypot          : champ caché qui DOIT rester vide (filtre les bots naïfs)
 *   2. Cloudflare Turnstile : challenge invisible côté client + vérif backend
 *      (activé via env var NEXT_PUBLIC_TURNSTILE_SITE_KEY + TURNSTILE_SECRET_KEY)
 *   3. Rate limit IP     : N requêtes max par IP par heure (LRU mémoire)
 *
 * Usage :
 *   const check = await checkAntiBot(request, { honeypot: body.website });
 *   if (!check.ok) return Response.json({ error: check.reason }, { status: 429 });
 */

// ─── Rate limit IP en mémoire (best effort, single-instance) ───────────────
// En serverless, chaque instance a sa propre mémoire — c'est imparfait mais
// suffit pour bloquer les bots qui hammer depuis une IP unique.
const RATE_LIMIT_MAX     = 5;     // max requêtes
const RATE_LIMIT_WINDOW  = 3600;  // par fenêtre de N secondes (1h)
const ipBuckets = new Map();      // ip -> { count, resetAt }

function checkRateLimit(ip) {
  if (!ip) return { ok: true };
  const now = Math.floor(Date.now() / 1000);
  const bucket = ipBuckets.get(ip);
  if (!bucket || bucket.resetAt < now) {
    ipBuckets.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return { ok: true };
  }
  if (bucket.count >= RATE_LIMIT_MAX) {
    return { ok: false, reason: 'Trop de tentatives, réessaie plus tard.', code: 'RATE_LIMITED' };
  }
  bucket.count++;
  return { ok: true };
}

// Cleanup périodique des buckets expirés (évite leak mémoire)
function cleanupBuckets() {
  const now = Math.floor(Date.now() / 1000);
  for (const [ip, b] of ipBuckets.entries()) {
    if (b.resetAt < now) ipBuckets.delete(ip);
  }
}
setInterval(cleanupBuckets, 5 * 60 * 1000); // toutes les 5min

// ─── Cloudflare Turnstile ──────────────────────────────────────────────────
async function verifyTurnstile(token, ip) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return { ok: true, skipped: true }; // pas configuré = skip
  if (!token) return { ok: false, reason: 'Vérification anti-bot manquante', code: 'TURNSTILE_MISSING' };
  try {
    const formData = new URLSearchParams();
    formData.append('secret', secret);
    formData.append('response', token);
    if (ip) formData.append('remoteip', ip);
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
    });
    const json = await res.json();
    if (!json.success) {
      console.warn('[antibot] turnstile rejected:', json['error-codes']);
      return { ok: false, reason: 'Vérification anti-bot échouée', code: 'TURNSTILE_INVALID' };
    }
    return { ok: true };
  } catch (err) {
    console.error('[antibot] turnstile err:', err);
    // En cas d'erreur réseau, on laisse passer (fail-open) — le doublon-email
    // et le rate limit gèrent en backup
    return { ok: true, skipped: true };
  }
}

// ─── Honeypot ──────────────────────────────────────────────────────────────
function checkHoneypot(value) {
  if (value && value.trim().length > 0) {
    return { ok: false, reason: 'Requête invalide', code: 'HONEYPOT_TRIGGERED' };
  }
  return { ok: true };
}

// ─── IP extraction depuis la requête ───────────────────────────────────────
export function ipFromRequest(request) {
  // Vercel/Cloudflare/proxies populaires
  const headers = request.headers;
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    headers.get('cf-connecting-ip') ||
    null
  );
}

/**
 * Pipeline complet : honeypot → rate limit → Turnstile.
 * Renvoie { ok: true } ou { ok: false, reason, code }.
 *
 * @param request               Next Request
 * @param opts.honeypot         valeur du champ honeypot envoyé par le client
 * @param opts.turnstileToken   token Turnstile envoyé par le client
 */
export async function checkAntiBot(request, opts = {}) {
  // 1. Honeypot
  const hp = checkHoneypot(opts.honeypot);
  if (!hp.ok) return hp;

  // 2. Rate limit IP
  const ip = ipFromRequest(request);
  const rl = checkRateLimit(ip);
  if (!rl.ok) return rl;

  // 3. Turnstile (si configuré)
  const ts = await verifyTurnstile(opts.turnstileToken, ip);
  if (!ts.ok) return ts;

  return { ok: true };
}

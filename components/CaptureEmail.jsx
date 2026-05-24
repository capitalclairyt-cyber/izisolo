'use client';

import { useState, useEffect, useRef } from 'react';

/**
 * <CaptureEmail source="..." /> — composant de capture email douce.
 *
 * Anti-bot multi-couches côté client (+ validation serveur dans /api/leads) :
 *   - Honeypot field `website` caché en CSS
 *   - Timer : on enregistre l'ouverture et on calcule le délai au submit
 *   - Format email basique
 *
 * Le serveur applique en plus :
 *   - Rate limit par IP (5/heure)
 *   - Blocklist domaines jetables
 *   - Cloudflare Turnstile si configuré (env CLOUDFLARE_TURNSTILE_SECRET)
 *
 * Pattern UX : silent reject — si le serveur détecte un bot, il répond
 * "OK" sans rien faire (pour ne pas révéler l'astuce au bot).
 *
 * Props :
 *   - source : string identifiant le lead magnet (ex: 'outils.calculateur-revenu')
 *   - title : titre du bandeau (override le default)
 *   - subtitle : sous-titre
 */
export default function CaptureEmail({
  source = 'unknown',
  title = 'Tu veux être prévenu·e quand le prochain outil sort ?',
  subtitle = "Calculateur de statut juridique, comparateur de logiciels, grille tarifaire personnalisable... Un email par mois maximum. Désinscription en 1 clic, RGPD-friendly.",
}) {
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState(''); // honeypot
  const [state, setState] = useState('idle'); // idle | submitting | success | error
  const [errorMsg, setErrorMsg] = useState('');
  const mountedAtRef = useRef(Date.now());

  // Reset le timestamp au montage (utile en client navigation)
  useEffect(() => {
    mountedAtRef.current = Date.now();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (state === 'submitting' || state === 'success') return;

    const timeToSubmitMs = Date.now() - mountedAtRef.current;
    setState('submitting');
    setErrorMsg('');

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email,
          source,
          website,           // honeypot
          timeToSubmitMs,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.ok) {
        setState('success');
      } else if (res.status === 429) {
        setState('error');
        setErrorMsg('Trop de tentatives depuis ton réseau. Réessaie dans 1h.');
      } else if (data?.error === 'invalid_email') {
        setState('error');
        setErrorMsg('Email invalide.');
      } else if (data?.error === 'disposable_email') {
        setState('error');
        setErrorMsg("Cet email semble être une boîte temporaire. Essaie avec ton email habituel.");
      } else {
        setState('error');
        setErrorMsg('Petit problème — réessaie dans un instant.');
      }
    } catch (err) {
      setState('error');
      setErrorMsg('Pas de connexion ? Réessaie.');
    }
  }

  if (state === 'success') {
    return (
      <div className="capture-email capture-email-success">
        <div className="capture-email-inner">
          <span className="capture-icon">🌿</span>
          <div>
            <strong>Merci !</strong>
            <p>
              On t&apos;envoie un email dès la sortie du prochain outil
              (sans spam, promis).
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="capture-email">
      <div className="capture-email-inner">
        <div className="capture-email-content">
          <span className="eyebrow">Newsletter outils</span>
          <h3 className="serif">{title}</h3>
          <p>{subtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="capture-email-form" noValidate>
          {/* Honeypot — caché en CSS, invisible aux humains, rempli par les bots */}
          <div className="capture-honeypot" aria-hidden="true">
            <label htmlFor="ce-website">Site web (laisser vide)</label>
            <input
              type="text"
              id="ce-website"
              name="website"
              tabIndex="-1"
              autoComplete="off"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </div>

          <div className="capture-email-row">
            <input
              type="email"
              name="email"
              required
              placeholder="ton@email.fr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={state === 'submitting'}
              autoComplete="email"
              className="capture-email-input"
              aria-label="Adresse email"
            />
            <button
              type="submit"
              disabled={state === 'submitting' || !email}
              className="btn btn-primary capture-email-btn"
            >
              {state === 'submitting' ? 'Envoi...' : 'Me prévenir'}
            </button>
          </div>

          {state === 'error' && errorMsg && (
            <div className="capture-email-error">{errorMsg}</div>
          )}

          <p className="capture-email-legal">
            On ne partage pas ton email. Désinscription en 1 clic.
            Hébergé en France (Supabase Frankfurt). Cf. <a href="/legal/rgpd">RGPD</a>.
          </p>
        </form>
      </div>
    </div>
  );
}

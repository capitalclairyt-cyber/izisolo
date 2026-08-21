'use client';

import { useState } from 'react';

/**
 * Actions concierge sur la fiche studio : lien de connexion une-fois
 * (impersonation admin-gated, tracée) et renvoi du lien d'appropriation
 * (choix du mot de passe). Les routes refusent hors admin.
 */
export default function ConciergeActions({ profileId }) {
  const [etat, setEtat] = useState({}); // { login: '...', appro: '...' }

  const loginLink = async () => {
    setEtat(s => ({ ...s, login: 'envoi' }));
    try {
      const res = await fetch('/api/admin/studios/login-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || `Erreur ${res.status}`);
      await navigator.clipboard.writeText(json.url).catch(() => {});
      window.open(json.url, '_blank', 'noopener');
      setEtat(s => ({ ...s, login: 'ok' }));
      setTimeout(() => setEtat(s => ({ ...s, login: '' })), 4000);
    } catch (err) {
      setEtat(s => ({ ...s, login: String(err.message || err) }));
    }
  };

  const appropriation = async () => {
    const sur = window.confirm('Envoyer à cette prof l\'email « ton studio est prêt » avec le lien pour choisir son mot de passe ?');
    if (!sur) return;
    setEtat(s => ({ ...s, appro: 'envoi' }));
    try {
      const res = await fetch('/api/admin/studios/appropriation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || `Erreur ${res.status}`);
      setEtat(s => ({ ...s, appro: 'ok' }));
    } catch (err) {
      setEtat(s => ({ ...s, appro: String(err.message || err) }));
    }
  };

  const btn = { padding: '6px 12px', borderRadius: '8px', border: '1px solid #2d2d3f', background: '#1a1a28', color: '#cbd5e1', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' };

  return (
    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
      <button type="button" style={btn} onClick={loginLink} disabled={etat.login === 'envoi'}>
        {etat.login === 'envoi' ? 'Génération…' : etat.login === 'ok' ? 'Ouvert + copié ✓' : '🔑 Se connecter à ce studio'}
      </button>
      <button type="button" style={btn} onClick={appropriation} disabled={etat.appro === 'envoi'}>
        {etat.appro === 'envoi' ? 'Envoi…' : etat.appro === 'ok' ? 'Email envoyé ✓' : '✉️ Renvoyer le lien d\'appropriation'}
      </button>
      {[etat.login, etat.appro].filter(v => v && !['envoi', 'ok'].includes(v)).map((v, i) => (
        <span key={i} style={{ color: '#f87171', fontSize: '0.75rem' }} role="alert">{v}</span>
      ))}
    </div>
  );
}

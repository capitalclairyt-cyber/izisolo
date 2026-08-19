'use client';

import { useState } from 'react';

// ─── /admin/demo — préparer une démo sans terminal (2026-08-18, pour Maude) ──
// Deux gestes : rafraîchir le compte vitrine Atelier Soleil (moteur partagé
// lib/demo-atelier-soleil, dates relatives au jour du run) et générer un lien
// de connexion une-fois pour ouvrir le compte Camille sur l'appareil de démo.
// Le déroulé complet de la démo vit dans DEMO-PROGRAMME-2026.md (hors app).

export default function AdminDemoPage() {
  const [refreshing, setRefreshing] = useState(false);
  const [logs, setLogs] = useState(null);
  const [refreshErr, setRefreshErr] = useState('');
  const [link, setLink] = useState('');
  const [linkBusy, setLinkBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const lancerRefresh = async () => {
    if (!confirm(
      'Rafraîchir le compte démo Atelier Soleil ?\n\n'
      + 'Toutes ses données fictives sont purgées puis re-semées, calées sur la date du jour '
      + '(pleine lune complète à ~2 semaines, anniversaires du jour, cloche vivante…).\n\n'
      + 'Compte à 1-2 minutes — ne ferme pas la page.'
    )) return;
    setRefreshing(true);
    setLogs(null);
    setRefreshErr('');
    try {
      const res = await fetch('/api/admin/demo/refresh', { method: 'POST' });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) throw new Error(j.error || `Erreur ${res.status}`);
      setLogs(j.logs || []);
    } catch (e) {
      setRefreshErr(e.message);
    } finally {
      setRefreshing(false);
    }
  };

  const genererLien = async () => {
    setLinkBusy(true);
    setLink('');
    setCopied(false);
    try {
      const res = await fetch('/api/admin/demo/login-link', { method: 'POST' });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) throw new Error(j.error || `Erreur ${res.status}`);
      setLink(j.url);
    } catch (e) {
      setLink('');
      alert('Génération impossible : ' + e.message);
    } finally {
      setLinkBusy(false);
    }
  };

  const copier = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch { /* clipboard indisponible : sélection manuelle */ }
  };

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 6px' }}>🎬 Compte démo</h1>
      <p style={{ color: '#64748b', margin: '0 0 24px', fontSize: '0.9rem' }}>
        Prépare une démo ou un tournage en deux clics — le déroulé complet est dans <code>DEMO-PROGRAMME-2026.md</code>.
      </p>

      {/* Étape 1 : refresh */}
      <div style={carte}>
        <h2 style={titreCarte}>1. Rafraîchir l&apos;Atelier Soleil</h2>
        <p style={texte}>
          Purge et re-sème le studio vitrine (Camille Leroux), calé sur <strong>aujourd&apos;hui</strong> :
          pleine lune complète + liste d&apos;attente, anniversaires du jour, 3 cas à traiter,
          2 messages non lus, paiements du mois. À lancer <strong>avant chaque démo</strong> —
          et après, si tu as ouvert la messagerie ou résolu des cas pendant l&apos;appel.
        </p>
        <button onClick={lancerRefresh} disabled={refreshing} style={btnPrimaire}>
          {refreshing ? '⏳ Refresh en cours (1-2 min)…' : '🔄 Rafraîchir le compte démo'}
        </button>
        {refreshErr && <p style={{ color: '#dc2626', fontSize: '0.85rem', marginTop: 10 }}>❌ {refreshErr} — relance simplement, le refresh est re-runnable.</p>}
        {logs && (
          <pre style={{
            marginTop: 14, padding: 12, background: '#0f172a', color: '#a5f3fc',
            borderRadius: 8, fontSize: '0.75rem', lineHeight: 1.5, maxHeight: 320, overflow: 'auto',
          }}>{logs.join('\n')}</pre>
        )}
      </div>

      {/* Étape 2 : lien de connexion */}
      <div style={carte}>
        <h2 style={titreCarte}>2. Ouvrir le compte Camille sur l&apos;appareil de démo</h2>
        <p style={texte}>
          Génère un <strong>lien de connexion à usage unique</strong> (aucun mot de passe) :
          ouvre-le sur le téléphone ou l&apos;ordinateur qui servira à la démo / au tournage.
          Il expire vite — génère-le au moment de t&apos;en servir.
        </p>
        <button onClick={genererLien} disabled={linkBusy} style={btnSecondaire}>
          {linkBusy ? '⏳ Génération…' : '🔑 Générer le lien de connexion'}
        </button>
        {link && (
          <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
            <input readOnly value={link} onFocus={e => e.target.select()} style={{
              flex: 1, padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 8,
              fontSize: '0.78rem', fontFamily: 'monospace', color: '#334155',
            }} />
            <button onClick={copier} style={btnSecondaire}>{copied ? '✓ Copié' : 'Copier'}</button>
          </div>
        )}
      </div>

      {/* Rappels */}
      <div style={{ ...carte, background: '#fffbeb', borderColor: '#fcd34d' }}>
        <h2 style={titreCarte}>Rappels d&apos;avant-démo</h2>
        <ul style={{ ...texte, margin: 0, paddingLeft: 18, display: 'grid', gap: 6 }}>
          <li>Fenêtre de navigateur propre, notifications de l&apos;appareil coupées.</li>
          <li>Un téléphone à portée avec le portail élève en navigation privée : <code>izisolo.fr/p/atelier-soleil</code>.</li>
          <li>Ne pas ouvrir la messagerie du démo avant l&apos;appel (ça marque « lu ») — sinon, re-refresh.</li>
        </ul>
      </div>
    </div>
  );
}

const carte = {
  background: 'white', border: '1px solid #e2e8f0', borderRadius: 12,
  padding: '18px 20px', marginBottom: 16, maxWidth: 720,
};
const titreCarte = { fontSize: '1rem', fontWeight: 700, margin: '0 0 8px', color: '#0f172a' };
const texte = { fontSize: '0.875rem', color: '#475569', lineHeight: 1.55, margin: '0 0 14px' };
const btnPrimaire = {
  padding: '10px 18px', background: '#b87333', color: 'white', border: 'none',
  borderRadius: 99, fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer',
};
const btnSecondaire = {
  padding: '9px 16px', background: 'white', color: '#334155', border: '1px solid #cbd5e1',
  borderRadius: 99, fontWeight: 600, fontSize: '0.8125rem', cursor: 'pointer', whiteSpace: 'nowrap',
};

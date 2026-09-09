'use client';

// ════════════════════════════════════════════════════════════════════════════
// Section "Notifications élèves" — emails automatiques que l'app envoie
// directement aux élèves. La prof coche ce qu'elle veut activer.
// Extrait de parametres/page.js en B2d. Le SMS a été RETIRÉ de l'écran le
// 2026-09-09 (décision Colin, plan « Paramètres qui respirent ») : la feature
// n'a jamais été livrée (SMS_ENABLED = false), et un bloc « bientôt » avec une
// grille tarifaire promettait un produit qui n'existe pas. Les préférences
// SMS déjà en base sont ignorées, rien n'est réécrit.
// ════════════════════════════════════════════════════════════════════════════

import { Bell, ToggleLeft, ToggleRight } from 'lucide-react';

const NOTIFS_TYPES = [
  { key: 'cours_annule',       label: 'Cours annulé par mes soins',          desc: "Email automatique aux inscrits quand j'annule un cours." },
  { key: 'annulation_tardive', label: 'Annulation tardive : séance comptée',  desc: "L'élève reçoit un rappel transparent : sa séance a été décomptée." },
  { key: 'credits_faibles',    label: 'Crédits faibles',                     desc: "Quand il reste peu de séances sur un carnet (seuil réglable dans « Seuils d'alerte »)." },
  { key: 'expiration_abo',     label: 'Expiration prochaine d\'abonnement',  desc: "X jours avant la date de fin (délai réglable dans « Seuils d'alerte »)." },
];

export default function NotifsElevesSection({ profile, setProfile, setDirty }) {
  const notifs = profile?.notifs_eleves || {};

  const toggle = (typeKey) => () => {
    const current = notifs[typeKey] || { email: false };
    setProfile(prev => ({
      ...prev,
      notifs_eleves: {
        ...(prev?.notifs_eleves || {}),
        [typeKey]: { ...current, email: !current.email },
      },
    }));
    setDirty(true);
  };

  return (
    <div className="section izi-card">
      <div className="section-top">
        <div className="section-icon"><Bell size={20} /></div>
        <h2>Notifications élèves automatiques</h2>
      </div>
      <p className="section-desc">
        L'app envoie ces emails <strong>directement à tes élèves</strong>, en ton nom.
        Tu n'as plus rien à faire à la main.
      </p>

      <table className="notifs-table">
        <thead>
          <tr>
            <th>Type</th>
            <th style={{ width: 80, textAlign: 'center' }}>Email</th>
          </tr>
        </thead>
        <tbody>
          {NOTIFS_TYPES.map(t => {
            const pref = notifs[t.key] || { email: false };
            return (
              <tr key={t.key}>
                <td>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{t.label}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>{t.desc}</div>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <button type="button" onClick={toggle(t.key)} className="toggle-btn-mini" aria-pressed={!!pref.email} aria-label={`${t.label} par email`}>
                    {pref.email ? <ToggleRight size={26} style={{ color: 'var(--brand)' }} /> : <ToggleLeft size={26} style={{ color: 'var(--text-muted)' }} />}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <style jsx global>{`
        .notifs-table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        .notifs-table th { font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; padding: 8px 0; border-bottom: 1px solid var(--border); text-align: left; }
        .notifs-table td { padding: 12px 0; border-bottom: 1px solid var(--border); vertical-align: middle; }
        .notifs-table tr:last-child td { border-bottom: none; }
        .toggle-btn-mini { background: none; border: none; cursor: pointer; padding: 0; display: inline-flex; }
        .toggle-btn-mini:disabled { cursor: not-allowed; }
      `}</style>
    </div>
  );
}

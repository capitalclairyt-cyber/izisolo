'use client';

// ════════════════════════════════════════════════════════════════════════════
// Section "Notifications élèves" — emails automatiques que l'app envoie
// directement aux élèves. Le SMS a été RETIRÉ de l'écran le 2026-09-09
// (décision Colin) : la feature n'a jamais été livrée (SMS_ENABLED = false).
// La carte (titre, résumé, bouton) est rendue par la rubrique (lot 2).
// ════════════════════════════════════════════════════════════════════════════

import { ToggleLeft, ToggleRight } from 'lucide-react';

const NOTIFS_TYPES = [
  { key: 'cours_annule',       label: 'Cours annulé par mes soins',          desc: "Aux inscrits, quand tu annules une séance." },
  { key: 'annulation_tardive', label: 'Annulation tardive : séance comptée',  desc: "L'élève sait que sa séance a été décomptée." },
  { key: 'credits_faibles',    label: 'Crédits faibles',                     desc: "Quand il reste peu de séances (seuil dans « Seuils d'alerte »)." },
  { key: 'expiration_abo',     label: 'Expiration prochaine d\'abonnement',  desc: "X jours avant la fin (délai dans « Seuils d'alerte »)." },
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
    <>
      <p className="section-desc">Envoyés en ton nom, sans rien faire à la main.</p>

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
        .notifs-table { width: 100%; border-collapse: collapse; margin-top: 4px; }
        .notifs-table th { font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; padding: 6px 0; border-bottom: 1px solid var(--border); text-align: left; }
        .notifs-table td { padding: 10px 0; border-bottom: 1px solid var(--border); vertical-align: middle; }
        .notifs-table tr:last-child td { border-bottom: none; }
        .toggle-btn-mini { background: none; border: none; cursor: pointer; padding: 0; display: inline-flex; }
        .toggle-btn-mini:disabled { cursor: not-allowed; }
      `}</style>
    </>
  );
}

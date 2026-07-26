'use client';

// ════════════════════════════════════════════════════════════════════════════
// Section "Notifications élèves" — emails/SMS automatiques que l'app envoie
// directement aux élèves. Le pro coche ce qu'il veut activer.
// Extrait de parametres/page.js en B2d (découpe mécanique, zéro changement).
// ════════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { Bell, ToggleLeft, ToggleRight } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { SMS_ENABLED, SMS_PRIX_UNITAIRE } from '@/lib/constantes';

const NOTIFS_TYPES = [
  { key: 'cours_annule',       label: 'Cours annulé par mes soins',       desc: "Email/SMS automatique aux inscrits quand j'annule un cours." },
  { key: 'annulation_tardive', label: 'Annulation tardive — séance comptée', desc: "L'élève reçoit un rappel transparent : sa séance a été décomptée." },
  { key: 'credits_faibles',    label: 'Crédits faibles',                  desc: "Quand il reste peu de séances sur un carnet (seuil réglable ci-dessous)." },
  { key: 'expiration_abo',     label: 'Expiration prochaine d\'abonnement', desc: "X jours avant la date de fin (délai réglable ci-dessous)." },
];

export default function NotifsElevesSection({ profile, setProfile, setDirty }) {
  const [smsConso, setSmsConso] = useState(null);
  const notifs = profile?.notifs_eleves || {};
  const smsGlobalOff = notifs.sms_global_off === true;
  const seuilMois = profile?.sms_seuil_mois ?? '';

  // Charger la conso SMS du mois pour info au pro
  useEffect(() => {
    if (!profile?.id) return;
    const supabase = createClient();
    const debutMois = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    supabase
      .from('notifications_eleves')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', profile.id)
      .eq('channel', 'sms')
      .eq('statut', 'sent')
      .gte('sent_at', debutMois)
      .then(({ count }) => setSmsConso(count || 0));
  }, [profile?.id]);

  const toggle = (typeKey, channel) => () => {
    const current = notifs[typeKey] || { email: false, sms: false };
    setProfile(prev => ({
      ...prev,
      notifs_eleves: {
        ...(prev?.notifs_eleves || {}),
        [typeKey]: { ...current, [channel]: !current[channel] },
      },
    }));
    setDirty(true);
  };

  const toggleSmsGlobalOff = () => {
    setProfile(prev => ({
      ...prev,
      notifs_eleves: {
        ...(prev?.notifs_eleves || {}),
        sms_global_off: !smsGlobalOff,
      },
    }));
    setDirty(true);
  };

  const updateSeuilMois = (val) => {
    setProfile(prev => ({ ...prev, sms_seuil_mois: val === '' ? null : Math.max(0, parseInt(val) || 0) }));
    setDirty(true);
  };

  // Alerte si on s'approche du seuil
  const alerteSeuil = seuilMois && smsConso !== null && smsConso >= (seuilMois * 0.8);
  const seuilAtteint = seuilMois && smsConso !== null && smsConso >= seuilMois;

  return (
    <div className="section izi-card">
      <div className="section-top">
        <div className="section-icon"><Bell size={20} /></div>
        <h2>Notifications élèves automatiques</h2>
      </div>
      <p className="section-desc">
        L'app envoie ces emails {SMS_ENABLED && <>(et SMS) </>}<strong>directement à tes élèves</strong>, en ton nom.
        Tu n'as plus rien à faire à la main.
      </p>

      {/* Bandeau global : SMS désactivés (en attendant validation OctoPush) */}
      {!SMS_ENABLED && (
        <div className="sms-globally-disabled">
          <div className="sms-globally-disabled-icon">📱</div>
          <div>
            <div className="sms-globally-disabled-title">SMS bientôt disponibles</div>
            <div className="sms-globally-disabled-desc">
              L'envoi SMS est temporairement désactivé. Seul le canal email est actif.
              Active-le quand on aura validé l'intégration en prod.
            </div>
          </div>
        </div>
      )}

      {/* Master kill-switch SMS — caché si SMS_ENABLED=false */}
      {SMS_ENABLED && (
        <div className={`sms-master ${smsGlobalOff ? 'off' : ''}`}>
          <div className="sms-master-left">
            <div style={{ fontSize: '0.875rem', fontWeight: 700 }}>
              {smsGlobalOff ? '🔇 Tous les SMS sont coupés' : '📱 SMS activés'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
              {smsGlobalOff
                ? 'Aucun SMS ne sera envoyé, même si tu coches une case ci-dessous.'
                : 'Master switch — coupe tout d\'un coup en cas de doute sur la facture.'}
            </div>
          </div>
          <button type="button" onClick={toggleSmsGlobalOff} className="toggle-btn-mini" aria-label={smsGlobalOff ? 'Réactiver les SMS' : 'Couper tous les SMS'}>
            {smsGlobalOff ? <ToggleLeft size={32} style={{ color: '#dc2626' }} /> : <ToggleRight size={32} style={{ color: 'var(--brand)' }} />}
          </button>
        </div>
      )}

      <table className="notifs-table">
        <thead>
          <tr>
            <th>Type</th>
            <th style={{ width: 80, textAlign: 'center' }}>Email</th>
            <th style={{ width: 80, textAlign: 'center' }}>SMS</th>
          </tr>
        </thead>
        <tbody>
          {NOTIFS_TYPES.map(t => {
            const pref = notifs[t.key] || { email: false, sms: false };
            return (
              <tr key={t.key}>
                <td>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{t.label}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>{t.desc}</div>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <button type="button" onClick={toggle(t.key, 'email')} className="toggle-btn-mini">
                    {pref.email ? <ToggleRight size={26} style={{ color: 'var(--brand)' }} /> : <ToggleLeft size={26} style={{ color: 'var(--text-muted)' }} />}
                  </button>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <button
                    type="button"
                    onClick={toggle(t.key, 'sms')}
                    className="toggle-btn-mini"
                    disabled={smsGlobalOff || !SMS_ENABLED}
                    style={{ opacity: (smsGlobalOff || !SMS_ENABLED) ? 0.3 : 1 }}
                    title={!SMS_ENABLED ? 'SMS bientôt disponibles' : undefined}
                  >
                    {pref.sms && SMS_ENABLED ? <ToggleRight size={26} style={{ color: 'var(--brand)' }} /> : <ToggleLeft size={26} style={{ color: 'var(--text-muted)' }} />}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div style={{
        marginTop: 16, padding: 14, background: 'var(--bg-soft, #faf8f5)',
        border: '1px dashed var(--border)', borderRadius: 12,
        display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>📱 SMS — facturation au volume</span>
          {smsConso !== null && (
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              <strong>{smsConso} SMS</strong> ce mois · <strong>{(smsConso * SMS_PRIX_UNITAIRE).toFixed(2).replace('.', ',')} €</strong>
            </span>
          )}
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
          Les SMS sont facturés <strong>{SMS_PRIX_UNITAIRE.toFixed(2).replace('.', ',')} € l'unité</strong> sur ta facture IziSolo. Les emails restent gratuits, illimités.
        </p>

        {/* Seuil mensuel optionnel */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <label htmlFor="sms_seuil" style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            🛡️ Bloquer après
          </label>
          <input
            id="sms_seuil"
            type="number"
            min="0"
            placeholder="illimité"
            value={seuilMois}
            onChange={(e) => updateSeuilMois(e.target.value)}
            style={{ width: 90, padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: '0.875rem', textAlign: 'right' }}
          />
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>SMS / mois</span>
        </div>
        {seuilAtteint && (
          <div style={{ fontSize: '0.75rem', background: '#fee2e2', color: '#991b1b', padding: '6px 10px', borderRadius: 8, fontWeight: 600 }}>
            ⛔ Seuil atteint — les nouveaux SMS sont bloqués jusqu'au mois prochain.
          </div>
        )}
        {alerteSeuil && !seuilAtteint && (
          <div style={{ fontSize: '0.75rem', background: '#fef3c7', color: '#854d0e', padding: '6px 10px', borderRadius: 8, fontWeight: 600 }}>
            ⚠️ Tu as utilisé {smsConso}/{seuilMois} SMS ce mois.
          </div>
        )}
      </div>

      <style jsx global>{`
        .notifs-table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        .notifs-table th { font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; padding: 8px 0; border-bottom: 1px solid var(--border); text-align: left; }
        .notifs-table td { padding: 12px 0; border-bottom: 1px solid var(--border); vertical-align: middle; }
        .notifs-table tr:last-child td { border-bottom: none; }
        .toggle-btn-mini { background: none; border: none; cursor: pointer; padding: 0; display: inline-flex; }
        .toggle-btn-mini:disabled { cursor: not-allowed; }

        .sms-master {
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px; padding: 12px 14px; border-radius: 12px;
          background: var(--brand-light); border: 1px solid var(--brand-200, #f0d0d0);
          margin: 12px 0;
        }
        .sms-master.off {
          background: #fef2f2; border-color: #fecaca;
        }
        .sms-master-left { flex: 1; }
      `}</style>
    </div>
  );
}

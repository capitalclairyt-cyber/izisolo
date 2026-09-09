'use client';

// ════════════════════════════════════════════════════════════════════════════
// Rubrique « Seuils d'alerte » : les trois nombres qui pilotent les alertes
// (carnet bientôt épuisé, abonnement bientôt expiré, paiement en attente).
// Avant, le premier vivait dans « Ce que je reçois » et les deux autres dans
// « Ce que tes élèves reçoivent » : trois réglages de même nature sur deux
// écrans (plan « Paramètres qui respirent », 2026-09-09). Deux cartes, deux
// boutons : les colonnes restent celles de CARTES.seuils / seuils_prof.
// ════════════════════════════════════════════════════════════════════════════

import { Bell } from 'lucide-react';
import { useParametres, BtnSauver } from '../ParametresContext';

export default function SeuilsCartes() {
  const { profile, handleChange } = useParametres();
  return (
    <>
      <div className="section izi-card">
        <div className="section-top">
          <div className="section-icon"><Bell size={20} /></div>
          <h2>Carnets et abonnements</h2>
        </div>
        <p className="section-desc">
          Ces deux seuils déclenchent les emails automatiques à tes élèves (s'ils sont activés
          dans « Ce que tes élèves reçoivent »), et les mêmes alertes sur ton tableau de bord.
        </p>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Carnet bientôt épuisé</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input className="izi-input" type="number" min="1" max="20" style={{ maxWidth: 100 }} value={profile.alerte_seances_seuil || 2} onChange={handleChange('alerte_seances_seuil')} />
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>séances ou moins</span>
            </div>
            <p className="form-hint">
              Ex. <strong>2</strong> → quand un élève n'a plus que 2 séances dans son
              carnet, tu vois une alerte « Caroline a 2 séances restantes » + (si activé)
              l'élève reçoit un email type « Plus que 2 séances dans ton carnet ».
            </p>
          </div>
          <div className="form-group">
            <label className="form-label">Abonnement bientôt expiré</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input className="izi-input" type="number" min="1" max="60" style={{ maxWidth: 100 }} value={profile.alerte_expiration_jours || 7} onChange={handleChange('alerte_expiration_jours')} />
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>jours avant la date de fin</span>
            </div>
            <p className="form-hint">
              Ex. <strong>7</strong> → 7 jours avant l'expiration d'un abonnement, tu vois
              une alerte sur le dashboard + (si activé) l'élève reçoit un rappel pour
              penser à renouveler.
            </p>
          </div>
        </div>
        <BtnSauver carte="seuils" />
      </div>

      {/* Seuil de l'alerte « paiement en attente » (cloche prof uniquement).
          B2e : branché de bout en bout (avant, ni sauvé ni lu). */}
      <div className="section izi-card">
        <div className="section-top">
          <div className="section-icon"><Bell size={20} /></div>
          <h2>Paiement en attente</h2>
        </div>
        <p className="section-desc">
          Quand un paiement (chèque, virement, espèces) reste marqué « en attente »
          trop longtemps, tu reçois une notification dans ta cloche pour penser à
          relancer. Rien n'est envoyé à l'élève : c'est à toi de choisir le ton.
        </p>
        <div className="form-group">
          <label className="form-label">Me prévenir après</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input className="izi-input" type="number" min="1" max="90" style={{ maxWidth: 100 }} value={profile.alerte_paiement_attente_jours || 14} onChange={handleChange('alerte_paiement_attente_jours')} />
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>jours d'attente</span>
          </div>
        </div>
        <BtnSauver carte="seuils_prof" />
      </div>
    </>
  );
}

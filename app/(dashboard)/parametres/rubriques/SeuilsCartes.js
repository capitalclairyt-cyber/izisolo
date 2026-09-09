'use client';

// ════════════════════════════════════════════════════════════════════════════
// Rubrique « Seuils d'alerte » : les trois nombres qui pilotent les alertes.
// Première carte ouverte (carnets et abonnements), seconde repliée (paiement
// en attente). Les colonnes restent celles de CARTES.seuils / seuils_prof.
// ════════════════════════════════════════════════════════════════════════════

import { Bell, Wallet } from 'lucide-react';
import { resumeCarte } from '@/lib/parametres-rubriques';
import { useParametres, BtnSauver } from '../ParametresContext';
import CarteReglage from '../CarteReglage';

export default function SeuilsCartes() {
  const { profile, handleChange } = useParametres();
  return (
    <>
      <CarteReglage id="seuils" titre="Carnets et abonnements" icone={Bell} resume={resumeCarte('seuils', profile)} ouverte>
        <p className="section-desc">
          Ces seuils déclenchent les emails à tes élèves (s&apos;ils sont activés) et les alertes de ton tableau de bord.
        </p>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Carnet bientôt épuisé</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input className="izi-input" type="number" min="1" max="20" style={{ maxWidth: 100 }} value={profile.alerte_seances_seuil || 2} onChange={handleChange('alerte_seances_seuil')} />
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>séances ou moins</span>
            </div>
            <p className="form-hint">Ex. 2 → « Caroline a 2 séances restantes ».</p>
          </div>
          <div className="form-group">
            <label className="form-label">Abonnement bientôt expiré</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input className="izi-input" type="number" min="1" max="60" style={{ maxWidth: 100 }} value={profile.alerte_expiration_jours || 7} onChange={handleChange('alerte_expiration_jours')} />
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>jours avant la date de fin</span>
            </div>
            <p className="form-hint">Ex. 7 → une alerte une semaine avant, et un rappel à l&apos;élève.</p>
          </div>
        </div>
        <BtnSauver carte="seuils" />
      </CarteReglage>

      {/* Seuil de l'alerte « paiement en attente » (cloche prof uniquement). */}
      <CarteReglage id="seuils_prof" titre="Paiement en attente" icone={Wallet} resume={resumeCarte('seuils_prof', profile)}>
        <p className="section-desc">
          Quand un chèque, un virement ou des espèces restent « en attente » trop longtemps, ta cloche te le rappelle. Rien n&apos;est envoyé à l&apos;élève.
        </p>
        <div className="form-group">
          <label className="form-label">Me prévenir après</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input className="izi-input" type="number" min="1" max="90" style={{ maxWidth: 100 }} value={profile.alerte_paiement_attente_jours || 14} onChange={handleChange('alerte_paiement_attente_jours')} />
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>jours d'attente</span>
          </div>
        </div>
        <BtnSauver carte="seuils_prof" />
      </CarteReglage>
    </>
  );
}

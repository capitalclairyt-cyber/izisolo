'use client';

// Carte « Facturation » (v84 + pays v105 + facture auto v106). Lot 2 : une
// ligne d'aide par champ, le reste derrière « En savoir plus ».
import { useState } from 'react';
import { FileText } from 'lucide-react';
import { useToast } from '@/components/ui/ToastProvider';
import { PAYS, CODES_PAYS, paysDe, validerIdentifiant, mentionSuggeree, aDeclarationAutomatisable } from '@/lib/pays';
import { resumeCarte } from '@/lib/parametres-rubriques';
import { useParametres, BtnSauver } from '../ParametresContext';
import CarteReglage, { EnSavoirPlus } from '../CarteReglage';

export default function FacturationCarte() {
  const { profile, setProfile, handleChange } = useParametres();
  const { toast } = useToast();
  const [factureAutoBusy, setFactureAutoBusy] = useState(false); // v106, route dédiée

  const pays = paysDe(profile);
  const siretCheck = validerIdentifiant(profile?.pays, profile.facturation_siret || '');
  const active = !!String(profile.facturation_siret || '').trim();

  return (
    <CarteReglage id="facturation" titre="Facturation" icone={FileText} resume={resumeCarte('facturation', profile)} ouverte>
      <p className="section-desc">
        Avec ton {pays.identifiant.label.toLowerCase()}, tes élèves téléchargent de <strong>vraies factures acquittées</strong> à la place du simple reçu.
      </p>
      <EnSavoirPlus>
        <p>Numérotation automatique et séquentielle (FAC-{new Date().getFullYear()}-0001), documents figés à l'émission, re-téléchargeables à l'identique depuis leur espace (CSE, mutuelles…) et depuis leur fiche.</p>
      </EnSavoirPlus>
      {/* Le pays d'exercice (v105) décide du libellé du numéro, de la mention
          sur les factures et de la présence de la déclaration URSSAF. */}
      <div className="form-group">
        <label className="form-label">Pays d&apos;exercice</label>
        <select className="izi-input" value={profile.pays || 'FR'} onChange={handleChange('pays')} style={{ maxWidth: 260 }}>
          {CODES_PAYS.map(c => (
            <option key={c} value={c}>{PAYS[c].drapeau} {PAYS[c].nom}</option>
          ))}
        </select>
        <p className="form-hint">
          {aDeclarationAutomatisable(profile?.pays)
            ? "En France, tu déclares toi-même ton chiffre d'affaires : la rubrique Déclaration URSSAF est là pour ça."
            : `Chez toi, c'est ${pays.declarationSociale.nom} qui appelle tes cotisations : aucune déclaration à préparer ici.`}
        </p>
      </div>
      <div className="form-group">
        <label className="form-label">Nom / raison sociale sur les factures</label>
        <input
          className="izi-input"
          value={profile.facturation_raison_sociale || ''}
          onChange={handleChange('facturation_raison_sociale')}
          placeholder={profile.studio_nom || 'Ton nom, ou celui de ta structure'}
        />
        <p className="form-hint">Vide = le nom de ton studio.</p>
      </div>
      <div className="form-group">
        <label className="form-label">{pays.identifiant.label}</label>
        <input
          className="izi-input"
          value={profile.facturation_siret || ''}
          onChange={handleChange('facturation_siret')}
          placeholder={pays.identifiant.exemple}
          inputMode={pays.code === 'LU' ? 'text' : 'numeric'}
        />
        {!siretCheck.valide ? (
          <p className="form-hint" style={{ color: '#dc2626' }}>{siretCheck.message}</p>
        ) : (
          <p className="form-hint">{active ? 'Facturation active ✓' : `${pays.identifiant.aide} Sans lui, simple reçu de paiement.`}</p>
        )}
      </div>
      <div className="form-group">
        <label className="form-label">Mention TVA</label>
        <input
          className="izi-input"
          value={profile.facturation_mention_tva || ''}
          onChange={handleChange('facturation_mention_tva')}
          placeholder={mentionSuggeree(profile?.pays)}
        />
        <p className="form-hint">
          {pays.mentionDefaut
            ? <>Vide = « {pays.mentionDefaut} » (franchise de TVA). Adapte si tu factures la TVA.</>
            : <>⚠️ Hors de France, rien n&apos;est écrit par défaut : <strong>vérifie la formulation exacte auprès de ton comptable</strong>, c&apos;est ta responsabilité qui est engagée.</>}
        </p>
      </div>
      {/* Facture automatique (v106). Route DÉDIÉE : un échec ne coûte que ce
          réglage et le dit, jamais la carte entière. */}
      <div className="form-group" style={{ marginTop: 6 }}>
        <label className="form-label" style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: active ? 'pointer' : 'not-allowed', opacity: active ? 1 : 0.6 }}>
          <input
            type="checkbox"
            checked={profile.facturation_auto === true}
            disabled={!active || factureAutoBusy}
            onChange={async (e) => {
              const actif = e.target.checked;
              setFactureAutoBusy(true);
              try {
                const res = await fetch('/api/profile/facturation-auto', {
                  method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ actif }),
                });
                const json = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(json.error || 'Réglage non enregistré');
                setProfile(p => ({ ...p, facturation_auto: json.actif === true }));
                toast.success(json.actif ? 'Chaque paiement encaissé enverra sa facture à l\'élève.' : 'Les factures restent disponibles au clic, sans envoi automatique.');
              } catch (err) {
                toast.error(err.message);
              } finally {
                setFactureAutoBusy(false);
              }
            }}
            style={{ marginTop: 3 }}
          />
          <span>
            <strong>Envoyer la facture à l&apos;élève par email à chaque encaissement</strong>
            <span className="form-hint" style={{ display: 'block', fontWeight: 400 }}>
              Dès qu&apos;un paiement passe « réglé », sa facture part en pièce jointe, enregistrée tout de suite.
              {!active && ' Renseigne d\'abord ton numéro d\'entreprise.'}
            </span>
          </span>
        </label>
        <EnSavoirPlus>
          <p>Bouton Encaisser, vente payée comptant ou paiement en ligne : c&apos;est le même document et le même numéro que celui qu&apos;elle télécharge dans son espace. Pour un abonnement au mois : un versement encaissé chaque mois, une facture qui part chaque mois.</p>
        </EnSavoirPlus>
      </div>
      <BtnSauver carte="facturation" />
    </CarteReglage>
  );
}

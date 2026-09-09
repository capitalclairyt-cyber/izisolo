'use client';

// Carte « Facturation » (v84 + pays v105 + facture auto v106). Découpe
// mécanique de page.js : mêmes champs, mêmes routes, mêmes garde-fous.
import { useState } from 'react';
import { FileText } from 'lucide-react';
import { useToast } from '@/components/ui/ToastProvider';
import { PAYS, CODES_PAYS, paysDe, validerIdentifiant, mentionSuggeree, aDeclarationAutomatisable } from '@/lib/pays';
import { useParametres, BtnSauver } from '../ParametresContext';

export default function FacturationCarte() {
  const { profile, setProfile, handleChange } = useParametres();
  const { toast } = useToast();
  const [factureAutoBusy, setFactureAutoBusy] = useState(false); // v106, route dédiée

  const pays = paysDe(profile);
  const siretCheck = validerIdentifiant(profile?.pays, profile.facturation_siret || '');
  const active = !!String(profile.facturation_siret || '').trim();

  return (
    <div className="section izi-card">
      <div className="section-top"><div className="section-icon"><FileText size={20} /></div><h2>Facturation</h2></div>
      <p className="section-desc">
        Avec ton {pays.identifiant.label.toLowerCase()} renseigné, tes élèves téléchargent de <strong>vraies factures acquittées</strong> depuis
        leur espace (CSE, mutuelles…), à la place du simple reçu. Numérotation automatique et séquentielle
        (FAC-{new Date().getFullYear()}-0001), documents figés à l'émission, re-téléchargeables à l'identique.
      </p>
      {/* Le pays d'exercice (v105) : il décide du libellé de ton numéro
          d'entreprise, de la mention sur tes factures, et de la présence
          du bloc de déclaration. Retour Melyflow (Belgique), 2026-08-25. */}
      <div className="form-group">
        <label className="form-label">Pays d&apos;exercice</label>
        <select className="izi-input" value={profile.pays || 'FR'} onChange={handleChange('pays')} style={{ maxWidth: 260 }}>
          {CODES_PAYS.map(c => (
            <option key={c} value={c}>{PAYS[c].drapeau} {PAYS[c].nom}</option>
          ))}
        </select>
        <p className="form-hint">
          {aDeclarationAutomatisable(profile?.pays)
            ? "En France, tu déclares toi-même ton chiffre d'affaires : le bloc URSSAF de Revenus est là pour ça."
            : `Chez toi, c'est ${pays.declarationSociale.nom} qui appelle tes cotisations : IziSolo ne te demande aucune déclaration, il te donne juste tes recettes au propre.`}
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
          <p className="form-hint">
            {active ? 'Facturation active ✓' : `${pays.identifiant.aide} Sans lui, tes élèves téléchargent un simple reçu de paiement.`}
          </p>
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
            ? <>Vide = « {pays.mentionDefaut} » (franchise de TVA, le cas micro-entreprise). Adapte si tu factures la TVA.</>
            : <>⚠️ Aucune mention n&apos;est écrite par défaut hors de France : nous ne devinons pas
               ce qui doit figurer sur ta facture. Souvent «&nbsp;{mentionSuggeree(profile?.pays)}&nbsp;»,
               mais <strong>vérifie la formulation exacte auprès de ton comptable</strong> : c&apos;est
               ta responsabilité qui est engagée, pas la nôtre.</>}
        </p>
      </div>
      {/* Facture automatique (v106). Route DÉDIÉE : la colonne est neuve, un
          échec ne coûte que ce réglage et le dit, jamais la carte entière. */}
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
              Dès qu&apos;un paiement passe « réglé » (bouton Encaisser, vente payée comptant, paiement en ligne), sa facture est émise et part en pièce jointe. C&apos;est le même document, le même numéro, que celui qu&apos;elle télécharge dans son espace. Pour un abonnement au mois : un versement encaissé chaque mois, une facture qui part chaque mois.
              {!active && ' Renseigne d\'abord ton numéro d\'entreprise.'}
            </span>
          </span>
        </label>
      </div>
      <BtnSauver carte="facturation" />
    </div>
  );
}

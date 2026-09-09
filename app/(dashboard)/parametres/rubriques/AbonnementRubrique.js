'use client';

// « Mon abonnement IziSolo » : le plan actuel (effectif, essai compris), la
// matrice des capacités (can() = source unique, B3a), les cartes de plans
// (AbonnementCheckout) et la note sur les frais. Découpe mécanique de page.js.
import { Crown } from 'lucide-react';
import { PLANS } from '@/lib/constantes';
import { getTrialStatus, effectivePlan as effectivePlanFromTrial } from '@/lib/trial';
import { can } from '@/lib/plan-guard';
import AbonnementCheckout from '../sections/AbonnementCheckout';
import { useParametres } from '../ParametresContext';

export default function AbonnementRubrique() {
  const { profile } = useParametres();
  const trial = getTrialStatus(profile);
  const currentPlanKey = effectivePlanFromTrial(profile);
  const currentPlan = PLANS[currentPlanKey] || PLANS.solo;
  const isFree = currentPlanKey === 'free';
  const isTrialActive = trial.active;
  // Matrice B3a (§5 plan de bataille) : chaque ligne = une capacité testée
  // par can() — LA source unique, plus de flags par plan.
  const featuresList = [
    { label: 'Élèves illimités · fiches · import/export CSV', included: true },
    { label: 'Cours, agenda, récurrences, lieux illimités', included: true },
    { label: 'Pointage 1-clic + carnets/abos gérés à la main', included: true },
    { label: 'Mini-compta : encaissements, « à percevoir », export comptable', included: true },
    { label: 'Réservation en ligne + annulation élève + règles d\'annulation', included: can(profile, 'reservation_en_ligne') },
    { label: 'Espace élève connecté (compte, historique, rappels J-1)', included: can(profile, 'espace_eleve') },
    { label: 'Cours d\'essai en ligne, liste d\'attente, cours privés', included: can(profile, 'cours_essai') },
    { label: 'Messagerie, mailing groupé, sondages planning', included: can(profile, 'messagerie') },
    { label: 'Paiement en ligne élèves (Stripe Payment Link)', included: can(profile, 'paiement_en_ligne') },
    { label: 'Import fiche par photo (IA)', included: can(profile, 'photo_import') },
  ];

  return (
    <>
      <div className="section izi-card">
        <div className="section-top">
          <div className="section-icon abo-icon"><Crown size={20} /></div>
          <h2>Mon abonnement IziSolo</h2>
        </div>

        <div className="abo-current">
          <div className="abo-badge">{currentPlan.nom}</div>
          <p className="abo-status">
            {isTrialActive ? (
              <>
                Tu profites d'un essai <strong>Complet</strong> : il te reste{' '}
                <strong>{trial.daysLeft} {trial.daysLeft > 1 ? 'jours' : 'jour'}</strong>.
                Choisis ton abonnement ci-dessous quand tu es prêt·e.
              </>
            ) : isFree ? (
              <>Tu utilises actuellement le plan <strong>{currentPlan.nom}</strong> (compte interne, full access).</>
            ) : trial.expired ? (
              <>Ton essai est terminé. Choisis ton plan ci-dessous pour continuer à utiliser IziSolo.</>
            ) : (
              <>
                Tu utilises actuellement le plan <strong>{currentPlan.nom}</strong>
                {currentPlan.prix > 0 && ` à ${currentPlan.prix} €/mois TTC`}.
              </>
            )}
          </p>
        </div>

        <div className="abo-features">
          {featuresList.map((f, i) => (
            <div key={i} className={`abo-feature ${f.included ? 'included' : 'locked'}`}>
              <span className={f.included ? 'abo-check' : 'abo-lock'}>{f.included ? '✓' : '🔒'}</span>
              <span>{f.label}</span>
            </div>
          ))}
        </div>

        {currentPlanKey !== 'pro' && !isFree && (
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: 12 }}>
            Tu peux changer de plan ci-dessous pour débloquer plus de fonctionnalités.
          </p>
        )}
      </div>

      <AbonnementCheckout currentPlan={profile?.plan || 'solo'} profile={profile} />

      <div className="section izi-card" style={{ background: 'var(--bg-soft, #faf8f5)', border: '1px dashed var(--border)' }}>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
          <strong>Frais de fonctionnement IziSolo</strong> : 1 % du volume payé en ligne via Stripe, ajoutés à ta facture mensuelle, jamais prélevés sur tes paiements. Tu encaisses sur ton propre compte Stripe, IziSolo ne touche jamais l'argent de tes élèves.
        </p>
      </div>
    </>
  );
}

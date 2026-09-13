import Link from 'next/link';
import { Lock } from 'lucide-react';
import { PLANS } from '@/lib/constantes';
import { plansPour, libellePlansPour } from '@/lib/plan-guard';

/**
 * PlanRequis — la page qu'une prof voit quand une fonction n'est pas dans
 * son plan (2026-09-07, lot « frontière des plans »).
 *
 * Avant : la barre latérale proposait Messagerie, Sondages, Essais, Liste
 * d'attente à une prof Essentiel, la page s'ouvrait, et c'est l'ACTION qui
 * échouait en 403. Une porte qui mène à un mur est un mensonge d'interface.
 * Ici la page dit ce qu'elle est, ce qu'elle fait, et où l'ouvrir.
 *
 * Composant SANS hook : rendu par des pages serveur.
 */
export default function PlanRequis({ capacite, titre, texte }) {
  // Les plans qui ouvrent cette capacité (lib/plan-guard, paliers non
  // linéaires depuis le 2026-09-13) : une capacité d'équipe nomme
  // « Association et Studio », jamais l'un pour l'autre.
  const plans = plansPour(capacite).filter(k => PLANS[k]?.public);
  const plan = PLANS[plans[0]] || PLANS.pro;
  const prixLisible = plans.length > 1
    ? plans.map(k => `${PLANS[k].nom} ${PLANS[k].prix} €`).join(' ou ')
    : (plan.prix ? `${plan.prix} €` : null);
  return (
    <div className="izi-card plan-requis" data-testid="plan-requis" data-capacite={capacite}>
      <div className="plan-requis-icone"><Lock size={22} /></div>
      <h1 className="plan-requis-titre">{titre}</h1>
      <p className="plan-requis-texte">{texte}</p>
      <p className="plan-requis-plan">
        Cette fonction fait partie <strong>{libellePlansPour(capacite)}</strong>{prixLisible ? <> ({prixLisible} par mois, sans engagement)</> : null}.
        Tu peux y passer à tout moment, et revenir sur Essentiel gratuit tout aussi simplement.
      </p>
      <Link href="/parametres/abonnement" className="izi-btn izi-btn-primary plan-requis-cta">
        Voir les plans
      </Link>
      <style>{`
        .plan-requis { max-width: 560px; margin: 32px auto; padding: 32px 28px; text-align: center; }
        .plan-requis-icone { width: 48px; height: 48px; border-radius: 14px; margin: 0 auto 14px; display: flex; align-items: center; justify-content: center; background: var(--c-bg-amber, #fdf3e2); color: var(--c-accent-deep, #8a5a44); }
        .plan-requis-titre { font-size: 1.35rem; margin: 0 0 8px; }
        .plan-requis-texte { color: var(--text-muted, #6b6560); margin: 0 0 14px; line-height: 1.5; }
        .plan-requis-plan { margin: 0 0 20px; line-height: 1.5; }
        .plan-requis-cta { display: inline-flex; }
      `}</style>
    </div>
  );
}

import Link from 'next/link';
import { Lock } from 'lucide-react';
import { CAPACITES, PLANS } from '@/lib/constantes';

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
  const planKey = CAPACITES[capacite] || 'pro';
  const plan = PLANS[planKey] || PLANS.pro;
  return (
    <div className="izi-card plan-requis" data-testid="plan-requis" data-capacite={capacite}>
      <div className="plan-requis-icone"><Lock size={22} /></div>
      <h1 className="plan-requis-titre">{titre}</h1>
      <p className="plan-requis-texte">{texte}</p>
      <p className="plan-requis-plan">
        Cette fonction fait partie du plan <strong>{plan.nom}</strong>{plan.prix ? <> ({plan.prix} € par mois, sans engagement)</> : null}.
        Tu peux y passer à tout moment, et revenir en arrière tout aussi simplement.
      </p>
      <Link href="/parametres?tab=abonnement" className="izi-btn izi-btn-primary plan-requis-cta">
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

// ════════════════════════════════════════════════════════════════════════════
// /parametres — la liste des rubriques (lot 1 « Paramètres qui respirent »,
// 2026-09-09). Remplace l'écran à 5 onglets × 13 sous-onglets.
//
// Compatibilité : les anciens deep-links `?tab=…&s=…` (17 sites du code, les
// URL de retour Stripe, l'email du cron de fin d'essai, les favoris des profs)
// sont redirigés côté SERVEUR vers la rubrique qui les remplace, en gardant
// les autres paramètres (`abo=success&session_id=…` au retour du checkout).
// ════════════════════════════════════════════════════════════════════════════
import { redirect } from 'next/navigation';
import { rubriqueDepuisAncienLien } from '@/lib/parametres-rubriques';
import RubriquesListe from './RubriquesListe';

export const dynamic = 'force-dynamic';

export default async function ParametresPage({ searchParams }) {
  const params = (await searchParams) || {};
  const tab = typeof params.tab === 'string' ? params.tab : null;
  const s = typeof params.s === 'string' ? params.s : null;
  if (tab) {
    const cible = rubriqueDepuisAncienLien(tab, s) || 'profil';
    const reste = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (k === 'tab' || k === 's' || typeof v !== 'string') continue;
      reste.set(k, v);
    }
    const qs = reste.toString();
    redirect(`/parametres/${cible}${qs ? `?${qs}` : ''}`);
  }
  return <RubriquesListe />;
}

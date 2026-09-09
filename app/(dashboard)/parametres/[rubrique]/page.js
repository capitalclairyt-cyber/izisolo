// /parametres/<rubrique> — une rubrique de Paramètres (lot 1, 2026-09-09).
// Le shell (layout) porte l'état ; ici on ne fait que choisir quoi rendre.
//
// Un id inconnu = un vrai 404 (statut HTTP compris). Sous le layout dashboard,
// qui est dynamique et STREAMÉ, un notFound() lancé pendant le rendu arrive
// après le premier flush et part en 200 ; la liste FERMÉE des segments
// (generateStaticParams + dynamicParams = false) est vérifiée par le routeur
// AVANT tout rendu, et c'est elle qui rend le 404.
import { RUBRIQUE_IDS, rubriqueParId } from '@/lib/parametres-rubriques';
import Rubrique from '../rubriques/Rubrique';

export const dynamicParams = false;

export function generateStaticParams() {
  return RUBRIQUE_IDS.filter(id => !rubriqueParId(id)?.lien).map(rubrique => ({ rubrique }));
}

export default async function RubriquePage({ params }) {
  const { rubrique } = await params;
  return <Rubrique id={rubrique} />;
}

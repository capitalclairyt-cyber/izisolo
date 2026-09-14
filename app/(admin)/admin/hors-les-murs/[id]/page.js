import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase-admin';
import { lireFiches } from '@/lib/hors-les-murs-service';
import { trier, idValide } from '@/lib/hors-les-murs';
import FicheClient from './FicheClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const { id } = await params;
  return { title: `Hors les murs · ${id}` };
}

/** Une piste : la fiche vérifiée, le mini-projet, l'email, et les gestes de Maude. */
export default async function FichePage({ params }) {
  const { id } = await params;
  if (!idValide(id)) notFound();
  const admin = createAdminClient();
  const { migration, fiches } = await lireFiches(admin);
  const fiche = fiches.find((f) => f.id === id);
  if (!fiche) notFound();
  // Précédente et suivante dans l'ordre de la liste, pour relire à la chaîne.
  const ordre = trier(fiches.filter((f) => f.statut !== 'ecarte'));
  const i = ordre.findIndex((f) => f.id === id);
  const voisins = {
    precedente: i > 0 ? { id: ordre[i - 1].id, nom: ordre[i - 1].nom } : null,
    suivante: i >= 0 && i < ordre.length - 1 ? { id: ordre[i + 1].id, nom: ordre[i + 1].nom } : null,
  };
  return <FicheClient fiche={fiche} voisins={voisins} migrationManquante={migration} />;
}

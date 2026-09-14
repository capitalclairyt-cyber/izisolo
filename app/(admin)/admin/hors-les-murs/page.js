import { createAdminClient } from '@/lib/supabase-admin';
import { lireFiches } from '@/lib/hors-les-murs-service';
import HorsLesMursClient from './HorsLesMursClient';

export const metadata = { title: 'Hors les murs' };
export const dynamic = 'force-dynamic';

/**
 * « Hors les murs » (v118) : les pistes d'événements de Maude, chacune avec son
 * mini-projet et un email prêt à partir de sa boîte. Cette page est la LISTE :
 * ce qui attend un geste d'abord, les occasions datées, les filtres. Le détail
 * (fiche, projet, texte, actions) vit sur /admin/hors-les-murs/[id].
 *
 * Lecture DÉFENSIVE : sans la table, tout se lit, rien ne s'enregistre, et
 * l'écran le dit.
 */
export default async function HorsLesMursPage() {
  const admin = createAdminClient();
  const { migration, erreur, fiches } = await lireFiches(admin);
  // La liste n'a pas besoin du corps des emails : on l'allège pour le navigateur.
  const legeres = fiches.map(({ corps: _corps, email: _email, projet, ...f }) => ({ ...f, titreProjet: projet?.titre || '', prixProjet: projet?.prix || '' }));
  return <HorsLesMursClient fiches={legeres} migrationManquante={migration} erreurLecture={erreur} />;
}

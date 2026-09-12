import { createAdminClient } from '@/lib/supabase-admin';
import { reconcilierProgrammes, migrationManquante } from '@/lib/prospection-service';
import ProspectionClient from './ProspectionClient';

export const metadata = { title: 'Prospection' };
export const dynamic = 'force-dynamic';

const COLS_PROSPECT = 'id, nom, prenom, email, ville, site, specialite, source, notes, statut, motif_ecart, repondu_at, created_at, updated_at';
const COLS_EMAIL = 'id, prospect_id, objet, corps, relance, statut, programme_at, envoye_at, resend_id, created_at, updated_at';

/**
 * La prospection à la main (v109) : le tirage du jour, la rédaction, l'envoi
 * (tout de suite ou décalé), la file et le compteur. Sans terminal : Maude
 * s'en sert depuis capsule. Lecture DÉFENSIVE : sans la table, la page le dit.
 */
export default async function ProspectionPage() {
  const admin = createAdminClient();
  let migration = false;
  let prospects = [];
  let emails = [];
  let compteurs = { a_contacter: 0, ecartee: 0 };
  try {
    await reconcilierProgrammes(admin);
    // Tout ce qui est en vie (à rédiger, contactée, a répondu) + les 40 dernières écartées.
    const [{ data: vivants, error: e1 }, { data: ecartees }, { count: pile }, { count: nbEcartees }] = await Promise.all([
      admin.from('prospects').select(COLS_PROSPECT).in('statut', ['en_cours', 'contactee', 'repondu']).order('updated_at', { ascending: false }).limit(400),
      admin.from('prospects').select(COLS_PROSPECT).eq('statut', 'ecartee').order('updated_at', { ascending: false }).limit(40),
      admin.from('prospects').select('id', { count: 'exact', head: true }).eq('statut', 'a_contacter'),
      admin.from('prospects').select('id', { count: 'exact', head: true }).eq('statut', 'ecartee'),
    ]);
    if (e1) throw e1;
    prospects = [...(vivants || []), ...(ecartees || [])];
    compteurs = { a_contacter: pile || 0, ecartee: nbEcartees || 0 };
    const ids = prospects.map((p) => p.id);
    if (ids.length) {
      const { data: mails, error: e2 } = await admin.from('prospection_emails').select(COLS_EMAIL).in('prospect_id', ids).order('created_at');
      if (e2) throw e2;
      emails = mails || [];
    }
    // Le compteur global (toutes les profs, pas seulement celles affichées).
    const [{ count: envoyes }, { count: repondus }] = await Promise.all([
      admin.from('prospects').select('id', { count: 'exact', head: true }).in('statut', ['contactee', 'repondu']),
      admin.from('prospects').select('id', { count: 'exact', head: true }).eq('statut', 'repondu'),
    ]);
    compteurs.envoyes = envoyes || 0;
    compteurs.repondus = repondus || 0;
  } catch (err) {
    if (!migrationManquante(err)) throw err;
    migration = true;
  }

  return <ProspectionClient prospects={prospects} emails={emails} compteurs={compteurs} migrationManquante={migration} />;
}

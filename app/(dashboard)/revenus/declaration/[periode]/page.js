import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase-server';
import { reportError } from '@/lib/report';
import {
  periodeParId, aujourdhuiParis, filtreDateComptable, totauxPaiements,
  dateComptable, sanitizeConfigUrssaf, estimationCotisations,
} from '@/lib/urssaf';
import { construireSnapshot, statutPeriode, ecartDepuisDeclaration } from '@/lib/declaration-archive';
import DeclarationClient from './DeclarationClient';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Ma déclaration URSSAF' };

/**
 * Le détail de ce qu'il y a à déclarer, À L'ÉCRAN (demande Colin 2026-08-22 :
 * « sans obligation de télécharger le CSV »). Page plutôt que modale : elle
 * s'imprime proprement, elle a une URL stable, et c'est vers elle que pointe
 * l'archive quand la prof veut retrouver une période des mois plus tard.
 *
 * Tout est calculé ICI, côté serveur, depuis les paiements — jamais depuis les
 * 12 mois chargés par la page Revenus, qui tronquerait un récap annuel.
 */
export default async function DeclarationPage({ params }) {
  const { periode: periodeId } = await params;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const today = aujourdhuiParis();
  const periode = periodeParId(periodeId, today);
  if (!periode) redirect('/revenus');

  // Réglages : lecture SÉPARÉE et défensive (urssaf_config naît avec v93).
  let config = null;
  try {
    const { data } = await supabase.from('profiles').select('urssaf_config').eq('id', user.id).single();
    config = sanitizeConfigUrssaf(data?.urssaf_config);
  } catch { /* pré-v93 : pas d'estimation, le détail reste utile */ }

  const { data: profil } = await supabase
    .from('profiles')
    .select('studio_nom, ville, facturation_raison_sociale, facturation_siret')
    .eq('id', user.id)
    .single();

  // Paiements RÉGLÉS de la période, bornés sur la date comptable. Paginé :
  // un total d'argent ne se tronque pas à 1000 lignes.
  const paiements = [];
  for (let page = 0; page < 20; page++) {
    const { data: lot, error } = await supabase
      .from('paiements')
      .select('id, montant, mode, date, date_encaissement, intitule, commission_montant, clients(prenom, nom, nom_structure)')
      .eq('profile_id', user.id)
      .eq('statut', 'paid')
      .or(filtreDateComptable(periode.from, periode.to))
      .order('date', { ascending: true })
      .order('id', { ascending: true })
      .range(page * 1000, page * 1000 + 999);
    if (error) {
      reportError('[declaration] lecture paiements', error, { route: '/revenus/declaration' });
      break;
    }
    paiements.push(...(lot || []));
    if (!lot || lot.length < 1000) break;
  }

  // Ordre chronologique sur la date qui fait foi (PostgREST ne trie pas un coalesce).
  const lignes = paiements
    .map(p => ({
      id: p.id,
      date: dateComptable(p, 'encaissement'),
      client: p.clients?.nom_structure
        || [p.clients?.prenom, p.clients?.nom].filter(Boolean).join(' ')
        || '',
      intitule: p.intitule || 'Prestation',
      mode: p.mode,
      montant: Number(p.montant) || 0,
      frais: Number(p.commission_montant) || 0,
    }))
    .sort((a, b) => (a.date === b.date ? String(a.id).localeCompare(String(b.id)) : String(a.date).localeCompare(String(b.date))));

  const totaux = totauxPaiements(paiements, 'encaissement');
  const estimation = config ? estimationCotisations(totaux.brut, config) : null;

  // Archive : lecture défensive (v94 peut ne pas être appliquée).
  let archive = null;
  try {
    const { data } = await supabase
      .from('declarations_urssaf')
      .select('periode_id, consultations, derniere_consultation_at, declaree_at, montant_declare, snapshot')
      .eq('profile_id', user.id)
      .eq('periode_id', periode.id)
      .maybeSingle();
    archive = data || null;
  } catch { /* pré-v94 : la page marche, sans historique */ }

  return (
    <DeclarationClient
      periode={periode}
      lignes={lignes}
      totaux={totaux}
      estimation={estimation}
      config={config}
      emetteur={{
        nom: profil?.facturation_raison_sociale || profil?.studio_nom || 'Mon studio',
        siret: profil?.facturation_siret || null,
        ville: profil?.ville || null,
      }}
      archive={archive}
      statut={statutPeriode(periode, archive, today)}
      ecart={ecartDepuisDeclaration(archive, totaux.brut)}
      snapshot={construireSnapshot({ periode, totaux, estimation, base: 'encaissement', config })}
    />
  );
}

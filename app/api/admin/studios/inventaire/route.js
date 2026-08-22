import { withRoute } from '@/lib/api-route';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { parseJsonBody, adminStudioCibleSchema } from '@/lib/validation';
import { reportError } from '@/lib/report';
import { estCompteTest } from '@/lib/admin-stats';
import { motifsDeRefus, avertissements, CE_QUI_RESTE } from '@/lib/admin-suppression';
import { emailsOrphelins } from '@/lib/admin-orphelins';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Tables comptées dans l'inventaire : celles qu'un humain reconnaît, pas les
// ~40 tables techniques qui partiront en cascade. La question à laquelle
// répond cet écran est « est-ce que ce studio est vivant ? », pas « combien de
// lignes SQL ».
const A_COMPTER = [
  ['clients',        'clients'],
  ['cours',          'cours'],
  ['offres',         'offres'],
  ['abonnements',    'abonnements'],
  ['presences',      'presences'],
  ['conversations',  'conversations'],
  ['factures',       'factures'],
];

/**
 * POST /api/admin/studios/inventaire — ce qui DISPARAÎTRAIT si on supprimait
 * ce studio. Lecture seule, appelée avant d'afficher le bouton rouge.
 *
 * Séparée de la route de suppression exprès : un inventaire ne doit jamais
 * pouvoir effacer quoi que ce soit, même sur une faute de frappe d'URL.
 */
export const POST = withRoute({ auth: 'admin' }, async ({ request, auth }) => {
  const { data, errorResponse } = await parseJsonBody(request, adminStudioCibleSchema);
  if (errorResponse) return errorResponse;
  const { profileId } = data;

  const { data: profil, error: eProfil } = await supabaseAdmin
    .from('profiles')
    .select('id, prenom, nom, studio_nom, studio_slug, plan, stripe_subscription_status, derniere_activite_at, created_at')
    .eq('id', profileId)
    .single();
  if (eProfil || !profil) {
    return Response.json({ error: 'Studio introuvable.' }, { status: 404 });
  }

  let email = null, derniereConnexion = null;
  try {
    const { data: u } = await supabaseAdmin.auth.admin.getUserById(profileId);
    email = u?.user?.email || null;
    derniereConnexion = u?.user?.last_sign_in_at || null;
  } catch { /* compte auth déjà absent : on continue, l'inventaire reste utile */ }

  const inventaire = {};
  for (const [cle, table] of A_COMPTER) {
    const { count, error } = await supabaseAdmin
      .from(table)
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', profileId);
    if (error) {
      // Un compte illisible est un compte qu'on n'affiche PAS à zéro : mieux
      // vaut dire « inconnu » que laisser croire que la table est vide.
      reportError('[admin/inventaire] compte impossible', `${table}: ${error.message}`, { route: '/api/admin/studios/inventaire' });
      inventaire[cle] = null;
      continue;
    }
    inventaire[cle] = count || 0;
  }

  // Argent réellement encaissé (pas les créances) — le signal le plus parlant
  // pour distinguer un studio d'entraînement d'un vrai studio.
  let encaisse = 0, paiements = 0;
  for (let page = 0; page < 20; page++) {
    const { data: lot, error } = await supabaseAdmin
      .from('paiements')
      .select('montant, statut')
      .eq('profile_id', profileId)
      .range(page * 1000, page * 1000 + 999);
    if (error) { encaisse = null; paiements = null; break; }
    paiements += lot.length;
    for (const p of lot) if (p.statut === 'paid') encaisse += parseFloat(p.montant) || 0;
    if (lot.length < 1000) break;
  }
  inventaire.paiements = paiements;
  inventaire.encaisse = encaisse === null ? null : Math.round(encaisse * 100) / 100;

  // Comptes élèves qui deviendraient orphelins : leur email n'est rattaché à
  // AUCUNE fiche en dehors de ce studio. C'est le vrai besoin des studios
  // d'entraînement, qui créent des comptes élèves fictifs à la chaîne.
  let orphelinsPotentiels = 0;
  try {
    orphelinsPotentiels = (await emailsOrphelins(profileId)).length;
  } catch (e) {
    orphelinsPotentiels = null;
    reportError('[admin/inventaire] orphelins', e?.message, { route: '/api/admin/studios/inventaire' });
  }

  const estTest = estCompteTest({ email, studio_slug: profil.studio_slug, studio_nom: profil.studio_nom });
  const derniereActivite = (profil.derniere_activite_at || derniereConnexion || '').slice(0, 10) || null;

  return Response.json({
    profil: {
      id: profil.id,
      email,
      studio_nom: profil.studio_nom,
      prenom: profil.prenom,
      nom: profil.nom,
      plan: profil.plan,
      cree_le: (profil.created_at || '').slice(0, 10),
      derniere_activite: derniereActivite,
      est_test: estTest,
    },
    inventaire: { ...inventaire, derniereActivite },
    orphelinsPotentiels,
    refus: motifsDeRefus({ profil, adminUserId: auth?.user?.id }),
    avertissements: avertissements({ inventaire: { ...inventaire, derniereActivite }, estTest }),
    ceQuiReste: CE_QUI_RESTE,
  });
});

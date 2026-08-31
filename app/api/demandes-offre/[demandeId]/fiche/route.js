import { withRoute } from '@/lib/api-route';
import { escapeIlike } from '@/lib/utils';
import { ficheDepuisDemande } from '@/lib/demande-offre';
import { reportError } from '@/lib/report';

/**
 * POST /api/demandes-offre/[demandeId]/fiche — donner une fiche à une
 * prospecte qui a demandé une offre depuis la page publique.
 *
 * LE TROU BOUCHÉ (31/08/2026, incident Maude) : une demande venue de la
 * grille publique n'a pas de fiche, par construction (v97 : « prénom + email
 * suffisent »). La file de /offres l'affichait donc avec un badge « pas encore
 * de fiche », sans jamais montrer l'email, et « Attribuer l'offre » ouvrait le
 * tunnel sur « Choisir un élève » — une liste où cette personne n'existe pas,
 * et un lien « Ajouter un élève » qui FERME la modale et perd la demande.
 * Autrement dit : un geste sans issue, sur une intention d'achat à 480 €.
 *
 * Cette route est le chaînon manquant. Elle ne vend rien (la vente reste au
 * tunnel unique, RPC vendre_offre) : elle crée l'identité, puis rend la main.
 *
 * DÉDUP PAR EMAIL, obligatoire : l'index UNIQUE clients(profile_id,
 * lower(email)) de v53 refuserait un doublon en 23505, et le geste mourrait
 * sur une erreur technique là où la bonne réponse est « cette fiche existe
 * déjà, prends-la ». C'est le même patron que `finaliserDemande` de lib/essai.
 */
export const POST = withRoute({ auth: 'active', perm: 'eleves_gerer' }, async ({ params, auth }) => {
  const { studioId, supabase } = auth;
  const { demandeId } = params;

  const { data: demande, error: lecture } = await supabase
    .from('demandes_offre')
    .select('id, client_id, prenom, nom, email, statut')
    .eq('id', demandeId)
    .eq('profile_id', studioId)
    .maybeSingle();

  if (lecture) {
    reportError('[demandes-offre fiche] lecture', lecture, { route: '/api/demandes-offre/[demandeId]/fiche' });
    return Response.json({ error: 'Demande illisible' }, { status: 500 });
  }
  if (!demande) return Response.json({ error: 'Demande introuvable' }, { status: 404 });

  // Déjà rattachée : on rend la fiche existante plutôt qu'une erreur. Deux
  // onglets ouverts, ou un double clic, ne doivent pas casser le geste.
  if (demande.client_id) {
    const { data: fiche } = await supabase
      .from('clients')
      .select('id, prenom, nom, email, telephone, type_client')
      .eq('id', demande.client_id)
      .eq('profile_id', studioId)
      .maybeSingle();
    if (fiche) return Response.json({ ok: true, client: fiche, creee: false });
  }

  const { ok, erreur, fiche: payload } = ficheDepuisDemande(demande);
  if (!ok) return Response.json({ error: erreur }, { status: 400 });

  // 1. La fiche existe-t-elle déjà sous cet email ? (jokers ilike échappés :
  // un `_` dans une adresse matcherait la MAUVAISE fiche du studio.)
  const { data: existante } = await supabase
    .from('clients')
    .select('id, prenom, nom, email, telephone, type_client')
    .eq('profile_id', studioId)
    .ilike('email', escapeIlike(payload.email))
    .maybeSingle();

  let client = existante || null;
  let creee = false;

  // 2. Sinon on la crée. `profile_id: studioId` et jamais `user.id` (v101) :
  // une prof invitée travaille dans le studio d'une autre.
  if (!client) {
    const { data: neuve, error: insertErr } = await supabase
      .from('clients')
      .insert({ profile_id: studioId, ...payload })
      .select('id, prenom, nom, email, telephone, type_client')
      .single();

    if (insertErr) {
      // 23505 : course entre deux onglets, ou index qu'on n'avait pas prévu.
      // On relit avant de crier : la fiche est peut-être là, et c'est tout ce
      // qui compte pour la suite du geste.
      if (insertErr.code === '23505') {
        const { data: rattrapee } = await supabase
          .from('clients')
          .select('id, prenom, nom, email, telephone, type_client')
          .eq('profile_id', studioId)
          .ilike('email', escapeIlike(payload.email))
          .maybeSingle();
        if (rattrapee) client = rattrapee;
      }
      if (!client) {
        reportError('[demandes-offre fiche] insert', insertErr, { route: '/api/demandes-offre/[demandeId]/fiche' });
        return Response.json({
          error: 'Fiche non créée : ' + (insertErr.message || 'erreur inconnue'),
        }, { status: 500 });
      }
    } else {
      client = neuve;
      creee = true;
    }
  }

  // 3. Rattacher la demande à la fiche. C'est ce qui la fait apparaître sur la
  // fiche de l'élève ET ce qui permet à `solderDemandesApresVente` de la
  // sortir de la file toute seule après la vente (leçon Cécile, 23/08).
  // Jamais bloquant : la fiche existe, c'est l'essentiel du geste.
  const { error: lienErr } = await supabase
    .from('demandes_offre')
    .update({ client_id: client.id })
    .eq('id', demandeId)
    .eq('profile_id', studioId);
  if (lienErr) reportError('[demandes-offre fiche] rattachement', lienErr, { demandeId });

  return Response.json({ ok: true, client, creee });
});

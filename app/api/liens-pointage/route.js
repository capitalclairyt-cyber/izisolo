import { z } from 'zod';
import { withRoute } from '@/lib/api-route';
import {
  genererToken, hashToken, urlLien, expirationPour,
  etatLien, sanitizeNomInvitee, DUREE_DEFAUT,
} from '@/lib/lien-pointage';

/**
 * /api/liens-pointage — les liens de pointage confiés par la prof (v100).
 *
 * GET  ?coursId=…  → la liste des liens de CETTE séance (sans jeton).
 * POST             → en crée un et renvoie l'URL complète, UNE SEULE FOIS.
 *
 * Le jeton n'est jamais relu : la table ne garde que son sha256. Si la prof
 * perd le lien, elle en refait un (et révoque l'ancien). C'est le même
 * contrat qu'une clé d'API, et c'est ce qui rend une fuite de la table
 * inoffensive.
 *
 * Les deux méthodes tournent sous la session de la prof, donc sous RLS : le
 * scoping tenant n'est pas laissé à un `.eq()` qu'on pourrait oublier.
 */

const creerSchema = z.object({
  coursId: z.string().uuid(),
  nom: z.string().trim().max(60).optional(),
  duree: z.enum(['fin_journee', 'j1', 'j7']).optional(),
});

/** Ce qu'on renvoie à la prof pour une ligne : jamais le hash, jamais le jeton. */
function lienPublic(lien, maintenant = new Date()) {
  return {
    id: lien.id,
    nom_invitee: lien.nom_invitee,
    expire_at: lien.expire_at,
    revoque_at: lien.revoque_at,
    etat: etatLien(lien, maintenant),
    nb_pointages: lien.nb_pointages || 0,
    derniere_utilisation_at: lien.derniere_utilisation_at,
    note_invitee: lien.note_invitee,
    created_at: lien.created_at,
  };
}

export const GET = withRoute({ auth: 'user', plan: 'lien_pointage' }, async ({ request, auth }) => {
  const { studioId, supabase } = auth;
  const coursId = new URL(request.url).searchParams.get('coursId');
  if (!coursId) return Response.json({ error: 'coursId manquant', code: 'BAD_REQUEST' }, { status: 400 });

  const { data, error } = await supabase
    .from('liens_pointage')
    .select('*')
    .eq('profile_id', studioId)
    .eq('cours_id', coursId)
    .order('created_at', { ascending: false });

  // Pré-migration v100 : la table n'existe pas encore (PGRST205). L'écran
  // doit le dire, pas afficher « aucun lien » comme si tout allait bien.
  if (error) {
    const absente = error.code === 'PGRST205' || error.code === '42P01';
    return Response.json(
      { liens: [], indisponible: absente, error: absente ? 'MIGRATION_V100_REQUISE' : 'Lecture impossible' },
      { status: absente ? 200 : 500 }
    );
  }

  const maintenant = new Date();
  return Response.json({ liens: (data || []).map(l => lienPublic(l, maintenant)) });
});

export const POST = withRoute(
  { auth: 'active', schema: creerSchema, plan: 'lien_pointage', perm: 'pointer' },
  async ({ request, auth, body }) => {
    const { studioId, user, supabase } = auth;

    // La séance doit appartenir à la prof. RLS + .eq() : ceinture et bretelles,
    // parce que c'est cette ligne qui décide de ce que le lien ouvrira.
    const { data: cours } = await supabase
      .from('cours')
      .select('id, nom, date, heure, est_annule')
      .eq('id', body.coursId)
      .eq('profile_id', studioId)
      .maybeSingle();

    if (!cours) {
      return Response.json({ error: 'Séance introuvable', code: 'NOT_FOUND' }, { status: 404 });
    }
    if (cours.est_annule) {
      return Response.json(
        { error: "Cette séance est annulée : il n'y a rien à faire pointer.", code: 'ANNULE' },
        { status: 400 }
      );
    }

    const expire = expirationPour(cours, body.duree || DUREE_DEFAUT);
    if (!expire) {
      return Response.json({ error: 'Séance sans date', code: 'SANS_DATE' }, { status: 400 });
    }

    const token = genererToken();
    const { data: lien, error } = await supabase
      .from('liens_pointage')
      .insert({
        profile_id: studioId,
        cours_id: cours.id,
        token_hash: hashToken(token),
        nom_invitee: sanitizeNomInvitee(body.nom),
        cree_par: user.id,
        expire_at: expire.toISOString(),
      })
      .select('*')
      .single();

    if (error) {
      const absente = error.code === 'PGRST205' || error.code === '42P01';
      return Response.json(
        {
          error: absente
            ? "Les liens de pointage arrivent très bientôt : cette mise à jour n'est pas encore appliquée."
            : "Le lien n'a pas pu être créé, réessaie.",
          code: absente ? 'MIGRATION_V100_REQUISE' : 'INSERT_FAILED',
        },
        { status: absente ? 503 : 500 }
      );
    }

    // L'URL est construite depuis l'origine de la REQUÊTE, jamais depuis un
    // champ éditable : un lien de pointage ne doit pas pouvoir pointer ailleurs.
    const origine = new URL(request.url).origin;

    return Response.json({
      lien: lienPublic(lien),
      // ⚠️ Unique occasion de voir le jeton. Ensuite, la table n'a que le hash.
      url: urlLien(origine, token),
    });
  }
);

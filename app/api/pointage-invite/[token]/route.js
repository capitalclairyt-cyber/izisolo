import { z } from 'zod';
import { withRoute } from '@/lib/api-route';
import { createAdminClient } from '@/lib/supabase-admin';
import { sendPushToUser } from '@/lib/push-server';
import { hashToken, verifierLien, coursPourInvitee, sanitizeNote } from '@/lib/lien-pointage';
import { chargerListeConfiee, pointerConfie } from '@/lib/pointage-confie';

/**
 * /api/pointage-invite/[token] — le chemin PUBLIC du lien confié (v100).
 *
 * ⚠️ C'est la surface la plus sensible du lot : elle s'exécute en
 * service_role (la personne invitée n'a et n'aura jamais de session Supabase),
 * donc la RLS ne protège RIEN ici. Trois règles, appliquées à chaque appel :
 *
 *   1. `verifierLien` d'abord, toujours : révoqué, expiré, séance annulée ou
 *      incohérente → on ferme avant de lire quoi que ce soit d'autre.
 *   2. Toute présence touchée est re-vérifiée contre `lien.cours_id` ET
 *      `lien.profile_id` (lib/pointage-confie). Un identifiant deviné ne
 *      donne rien.
 *   3. Ce qui sort passe par les filtres de lib/lien-pointage. Aucune requête
 *      ne renvoie sa data brute au client.
 *
 * Le pointage lui-même vit dans lib/pointage-confie (chemin partagé avec le
 * lien permanent d'intervenante, v111) : `seanceDelta` puis la RPC
 * `pointer_presence`, mêmes cas no_show. Un pointage confié produit exactement
 * les mêmes écritures qu'un pointage fait par la prof.
 */

const actionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('pointer'),
    presenceId: z.string().uuid(),
    statut: z.enum(['present', 'absent', 'excuse']),
  }),
  z.object({
    action: z.literal('note'),
    texte: z.string().max(2000),
  }),
]);

const RATE = { max: 240, windowSeconds: 3600, scope: 'pointage-invite' };

/** Charge et valide le lien + sa séance. Retourne { erreur } ou { admin, lien, cours, profile }. */
async function ouvrir(token) {
  const hash = hashToken(token);
  if (!hash) {
    return { erreur: Response.json({ error: 'Lien invalide', code: 'INTROUVABLE' }, { status: 404 }) };
  }

  const admin = createAdminClient();

  const { data: lien, error } = await admin
    .from('liens_pointage')
    .select('*')
    .eq('token_hash', hash)
    .maybeSingle();

  if (error) {
    const absente = error.code === 'PGRST205' || error.code === '42P01';
    return {
      erreur: Response.json(
        {
          error: absente
            ? "Les liens de pointage ne sont pas encore actifs sur cette installation."
            : 'Lien indisponible',
          code: absente ? 'MIGRATION_V100_REQUISE' : 'INDISPONIBLE',
        },
        { status: absente ? 503 : 500 }
      ),
    };
  }

  // Le cours est lu par l'id STOCKÉ dans le lien, jamais par un paramètre
  // d'URL : c'est ce qui fait qu'un lien ne peut pas être détourné.
  const { data: cours } = lien
    ? await admin.from('cours').select('*').eq('id', lien.cours_id).maybeSingle()
    : { data: null };

  const verdict = verifierLien(lien, cours, new Date());
  if (!verdict.ok) {
    // 404 partout : distinguer « expiré » de « inexistant » par le code HTTP
    // renseignerait un curieux. Le message, lui, reste honnête.
    return { erreur: Response.json({ error: verdict.message, code: verdict.code }, { status: 404 }) };
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('studio_nom, regles_metier')
    .eq('id', lien.profile_id)
    .maybeSingle();

  return { admin, lien, cours, profile: profile || {} };
}

export const GET = withRoute({ auth: 'public', rateLimit: RATE }, async ({ params }) => {
  const ouvert = await ouvrir(params.token);
  if (ouvert.erreur) return ouvert.erreur;
  const { admin, lien, cours, profile } = ouvert;

  return Response.json({
    cours: coursPourInvitee(cours, profile.studio_nom),
    presences: await chargerListeConfiee(admin, { profileId: lien.profile_id, coursId: lien.cours_id }),
    invitee: lien.nom_invitee,
    note: lien.note_invitee,
    expire_at: lien.expire_at,
  });
});

export const POST = withRoute(
  { auth: 'public', schema: actionSchema, rateLimit: RATE },
  async ({ params, body }) => {
    const ouvert = await ouvrir(params.token);
    if (ouvert.erreur) return ouvert.erreur;
    const { admin, lien, cours, profile } = ouvert;

    // ── Le mot laissé à la prof ────────────────────────────────────────────
    // La personne invitée ne peut ni ajouter ni retirer personne (c'est voulu :
    // inscrire quelqu'un touche aux carnets et à la capacité). Sans ce champ,
    // elle n'aurait aucun moyen de signaler « Léa est venue, pas sur la liste ».
    if (body.action === 'note') {
      const texte = sanitizeNote(body.texte);
      await admin.from('liens_pointage').update({ note_invitee: texte }).eq('id', lien.id);
      if (texte) await prevenirLaProf(admin, lien, cours, 'note', texte);
      return Response.json({ ok: true, note: texte });
    }

    // ── Le pointage, par le chemin commun ──────────────────────────────────
    const r = await pointerConfie(admin, {
      profileId: lien.profile_id,
      cours,
      reglesMetier: profile.regles_metier,
      presenceId: body.presenceId,
      statut: body.statut,
      source: 'lien_pointage',
      invitee: lien.nom_invitee || null,
    });
    if (!r.ok) return Response.json({ error: r.error, code: r.code }, { status: r.status });

    // Compteurs d'usage + première utilisation (qui déclenche l'alerte prof).
    const premiere = !lien.premiere_utilisation_at;
    const maintenant = new Date().toISOString();
    await admin.from('liens_pointage').update({
      nb_pointages: (lien.nb_pointages || 0) + 1,
      derniere_utilisation_at: maintenant,
      ...(premiere ? { premiere_utilisation_at: maintenant } : {}),
    }).eq('id', lien.id);

    // Une notification par LIEN, à la première utilisation. Une par tap
    // ferait 16 notifications pour un cours de 16 élèves.
    if (premiere) await prevenirLaProf(admin, lien, cours, 'debut');

    return Response.json({
      ok: true,
      presences: await chargerListeConfiee(admin, { profileId: lien.profile_id, coursId: lien.cours_id }),
    });
  }
);

/**
 * Cloche + push côté prof. Jamais bloquant : le pointage compte plus que son
 * accusé de réception.
 */
async function prevenirLaProf(admin, lien, cours, quoi, texte = '') {
  const qui = lien.nom_invitee || 'Une personne invitée';
  const quand = cours.date || '';
  const titre = quoi === 'note' ? 'Un mot sur ta séance ✍️' : 'Pointage confié en cours 🤝';
  const corps = quoi === 'note'
    ? `${qui} te laisse un message sur « ${cours.nom} » : ${texte.slice(0, 140)}`
    : `${qui} a commencé à pointer « ${cours.nom} » du ${quand}.`;

  try {
    await admin.from('notifications').upsert({
      profile_id: lien.profile_id,
      type: 'pointage_invite',
      titre,
      corps,
      data: { cours_id: cours.id, lien_id: lien.id, quoi },
      // Une ligne par lien ET par nature d'événement : le début et la note
      // sont deux informations distinctes, mais ni l'une ni l'autre ne
      // doit s'empiler à chaque tap.
      ref_key: `pointage_invite_${lien.id}_${quoi}`,
      expires_at: null,
    }, { onConflict: 'profile_id,ref_key', ignoreDuplicates: quoi !== 'note' });
  } catch { /* cloche décorative */ }

  sendPushToUser(lien.profile_id, {
    title: titre,
    body: corps,
    url: `/pointage/${cours.id}`,
    tag: `pointage-invite-${lien.id}-${quoi}`,
  }, { type: 'pointage_invite' }).catch(() => {});
}

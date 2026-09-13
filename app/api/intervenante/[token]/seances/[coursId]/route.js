import { z } from 'zod';
import { withRoute } from '@/lib/api-route';
import { sendPushToUser } from '@/lib/push-server';
import { coursPourInvitee } from '@/lib/lien-pointage';
import { ouvrirLienIntervenante, chargerSeanceIntervenante } from '@/lib/lien-intervenante-serveur';
import { chargerListeConfiee, pointerConfie } from '@/lib/pointage-confie';
import { labelIntervenante } from '@/lib/intervenante';

/**
 * /api/intervenante/[token]/seances/[coursId] — une séance sur le lien
 * permanent (v111) : sa liste d'appel, et le pointage.
 *
 * ⚠️ En service_role. La séance est chargée par `chargerSeanceIntervenante`,
 * qui exige qu'elle appartienne au studio DU LIEN et qu'elle soit la sienne
 * ou sans intervenante ; toute présence passe ensuite par `pointerConfie`,
 * qui la re-vérifie contre ce studio ET cette séance. Un identifiant deviné
 * ne donne rien.
 */
const RATE = { max: 240, windowSeconds: 3600, scope: 'intervenante' };

const actionSchema = z.object({
  action: z.literal('pointer'),
  presenceId: z.string().uuid(),
  statut: z.enum(['present', 'absent', 'excuse']),
});

async function ouvrirSeance(params) {
  const ouvert = await ouvrirLienIntervenante(params.token);
  if (ouvert.erreur) return ouvert;
  const cours = await chargerSeanceIntervenante(ouvert.admin, ouvert.membre, params.coursId);
  if (!cours) {
    return { erreur: Response.json({ error: "Cette séance n'est pas à toi, ou n'existe plus.", code: 'HORS_LIEN' }, { status: 404 }) };
  }
  return { ...ouvert, cours };
}

export const GET = withRoute({ auth: 'public', rateLimit: RATE }, async ({ params }) => {
  const ouvert = await ouvrirSeance(params);
  if (ouvert.erreur) return ouvert.erreur;
  const { admin, membre, cours, profile } = ouvert;
  return Response.json({
    cours: coursPourInvitee(cours, profile.studio_nom),
    presences: await chargerListeConfiee(admin, { profileId: membre.profile_id, coursId: cours.id }),
  });
});

export const POST = withRoute({ auth: 'public', schema: actionSchema, rateLimit: RATE }, async ({ params, body }) => {
  const ouvert = await ouvrirSeance(params);
  if (ouvert.erreur) return ouvert.erreur;
  const { admin, membre, cours, profile } = ouvert;

  const r = await pointerConfie(admin, {
    profileId: membre.profile_id,
    cours,
    reglesMetier: profile.regles_metier,
    presenceId: body.presenceId,
    statut: body.statut,
    source: 'lien_intervenante',
    invitee: labelIntervenante(membre),
  });
  if (!r.ok) return Response.json({ error: r.error, code: r.code }, { status: r.status });

  // Une notification par SÉANCE et par intervenante, au premier tap : la
  // prof sait qu'une séance se pointe sans elle, sans recevoir seize pushs.
  try {
    const qui = labelIntervenante(membre);
    await admin.from('notifications').upsert({
      profile_id: membre.profile_id,
      type: 'pointage_invite',
      titre: 'Pointage en cours 🤝',
      corps: `${qui} pointe « ${cours.nom} » du ${cours.date || ''} depuis son lien.`,
      data: { cours_id: cours.id, membre_id: membre.id, quoi: 'debut' },
      ref_key: `intervenante_${membre.id}_${cours.id}`,
      expires_at: null,
    }, { onConflict: 'profile_id,ref_key', ignoreDuplicates: true });
    sendPushToUser(membre.profile_id, {
      title: 'Pointage en cours 🤝',
      body: `${qui} pointe « ${cours.nom} » depuis son lien.`,
      url: `/pointage/${cours.id}`,
      tag: `intervenante-${membre.id}-${cours.id}`,
    }, { type: 'pointage_invite' }).catch(() => {});
  } catch { /* cloche décorative */ }

  return Response.json({
    ok: true,
    presences: await chargerListeConfiee(admin, { profileId: membre.profile_id, coursId: cours.id }),
  });
});

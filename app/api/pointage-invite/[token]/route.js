import { z } from 'zod';
import { withRoute } from '@/lib/api-route';
import { createAdminClient } from '@/lib/supabase-admin';
import { sendPushToUser } from '@/lib/push-server';
import { getRegle } from '@/lib/regles-metier';
import { seanceDelta } from '@/lib/pointage-delta';
import { reportError } from '@/lib/report';
import {
  hashToken, verifierLien, statutInviteValide,
  presencePourInvitee, coursPourInvitee, sanitizeNote,
} from '@/lib/lien-pointage';

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
 *      `lien.profile_id`. Un identifiant de présence deviné ne donne rien.
 *   3. Ce qui sort passe par les filtres de lib/lien-pointage. Aucune requête
 *      ne renvoie sa data brute au client.
 *
 * Le pointage lui-même emprunte le chemin normal : `seanceDelta` (la formule
 * unifiée) puis la RPC `pointer_presence` (v64/v70, résolution du carnet
 * applicable). Un pointage confié produit exactement les mêmes écritures
 * qu'un pointage fait par la prof, sinon les deux chemins divergeraient.
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

/** La liste d'appel, minimisée. Scopée cours ET studio (règle 2). */
async function chargerListe(admin, lien) {
  const { data: presences } = await admin
    .from('presences')
    .select('id, statut_pointage, pointee, type_presence, annulation_tardive, clients(prenom, nom)')
    .eq('cours_id', lien.cours_id)
    .eq('profile_id', lien.profile_id);

  return (presences || [])
    .map(presencePourInvitee)
    .sort((a, b) => (a.prenom || '').localeCompare(b.prenom || '', 'fr'));
}

export const GET = withRoute({ auth: 'public', rateLimit: RATE }, async ({ params }) => {
  const ouvert = await ouvrir(params.token);
  if (ouvert.erreur) return ouvert.erreur;
  const { admin, lien, cours, profile } = ouvert;

  return Response.json({
    cours: coursPourInvitee(cours, profile.studio_nom),
    presences: await chargerListe(admin, lien),
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

    // ── Le pointage ────────────────────────────────────────────────────────
    if (!statutInviteValide(body.statut)) {
      return Response.json({ error: 'Statut non autorisé', code: 'STATUT' }, { status: 400 });
    }

    // Règle 2 : la présence doit appartenir à CETTE séance et à CE studio.
    const { data: presence } = await admin
      .from('presences')
      .select('id, cours_id, profile_id, client_id, statut_pointage, pointee, type_presence, annulation_tardive, clients(prenom, nom)')
      .eq('id', body.presenceId)
      .eq('cours_id', lien.cours_id)
      .eq('profile_id', lien.profile_id)
      .maybeSingle();

    if (!presence) {
      return Response.json({ error: 'Cette personne ne fait pas partie de la séance.', code: 'HORS_SEANCE' }, { status: 404 });
    }

    const ancien = presence.statut_pointage || (presence.pointee ? 'present' : 'inscrit');
    if (presence.annulation_tardive || ['annule', 'declinee'].includes(ancien)) {
      return Response.json(
        { error: 'Cette ligne est une information : elle se règle côté studio.', code: 'LIGNE_INFO' },
        { status: 409 }
      );
    }

    // Même politique no-show que l'écran de la prof : l'absence ne décompte
    // que si le studio l'a décidé (auto + decompter_auto).
    const regleNoShow = getRegle({ regles_metier: profile.regles_metier }, 'no_show');
    const absenceCompte = regleNoShow.mode === 'auto' && regleNoShow.choix === 'decompter_auto';
    const delta = seanceDelta(ancien, body.statut, absenceCompte, presence.type_presence);
    const estPresent = body.statut === 'present';

    const { data: resultat, error: rpcErr } = await admin.rpc('pointer_presence', {
      p_presence_id: presence.id,
      p_statut: body.statut,
      p_pointee: estPresent,
      p_heure: estPresent ? new Date().toISOString() : null,
      p_delta: delta,
    });

    if (rpcErr || !resultat?.ok) {
      await reportError('[pointage-invite] RPC pointer_presence :', rpcErr || new Error(resultat?.reason || 'ko'), {
        lien: lien.id, presence: presence.id,
      });
      return Response.json({ error: "Pointage non enregistré, réessaie.", code: 'RPC' }, { status: 500 });
    }

    // Cas no_show : mêmes règles que PointageClient — on repart propre à
    // chaque entrée/sortie d'« absent », et on n'en crée qu'un seul.
    const estAbsent = body.statut === 'absent';
    const etaitAbsent = ancien === 'absent';
    if (estAbsent || etaitAbsent) {
      try {
        await admin.from('cas_a_traiter')
          .delete()
          .eq('presence_id', presence.id)
          .eq('case_type', 'no_show')
          .is('resolu_at', null);
        if (estAbsent && (regleNoShow.mode === 'manuel' || regleNoShow.notifProf)) {
          await admin.from('cas_a_traiter').insert({
            profile_id: lien.profile_id,
            case_type: 'no_show',
            client_id: presence.client_id,
            cours_id: cours.id,
            presence_id: presence.id,
            context: {
              mode: regleNoShow.mode,
              choix: regleNoShow.choix,
              seance_decomptee: delta > 0 && !!resultat?.abonnement_id,
              client_nom: `${presence.clients?.prenom || ''} ${presence.clients?.nom || ''}`.trim(),
              cours_nom: cours.nom,
              cours_date: cours.date,
              // D'où vient ce cas : la prof doit pouvoir le lire sans enquêter.
              source: 'lien_pointage',
              invitee: lien.nom_invitee || null,
            },
          });
        }
      } catch { /* non bloquant : le pointage, lui, est enregistré */ }
    }

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
      presences: await chargerListe(admin, lien),
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

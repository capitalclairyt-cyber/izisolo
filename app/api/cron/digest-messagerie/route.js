import { requireCronAuth } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase-admin';
import { sendEmail } from '@/lib/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Durée max explicite (fluid compute : 300 s = plafond Hobby)
export const maxDuration = 300;

/**
 * Cron quotidien (16h UTC = 18h Paris) qui envoie un digest des messages
 * non lus aux utilisateurs ayant la pref `notif_messagerie_canal='digest'`.
 *
 * Pour chaque utilisateur (pro ou élève) :
 *   - On compte ses messages non lus depuis la dernière exécution du digest
 *   - On envoie un email récap si count > 0
 *
 * Les utilisateurs en 'instant' reçoivent un email dès le push d'un message
 * (à câbler côté API messages dans une V2 — pour l'instant ils ne reçoivent
 * que le digest comme tout le monde).
 *
 * Variable d'env requise : RESEND_API_KEY
 */

export async function GET(request) {
  try {
    requireCronAuth(request);
  } catch (res) {
    return res;
  }

  const supabase = createAdminClient();

  const il24h = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  // Référence de dédup : un seul digest par destinataire et par jour (Paris).
  const refDate = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });

  let totalSent = 0;
  let totalErrors = 0;
  let totalSkipped = 0;

  // ─── Pros : récupérer ceux qui ont reçu au moins 1 message hier
  const { data: pros } = await supabase
    .from('profiles')
    .select('id, prenom, studio_nom, notif_messagerie_canal')
    .neq('notif_messagerie_canal', 'off');

  for (const pro of (pros || [])) {
    if (pro.notif_messagerie_canal === 'instant') {
      // V2 : envoi instantané déjà géré ailleurs. On skip.
      totalSkipped++;
      continue;
    }

    // Compter messages reçus hier dans ses conversations, où l'expéditeur est un élève
    const { data: convIds } = await supabase
      .from('conversations')
      .select('id')
      .eq('profile_id', pro.id);
    const ids = (convIds || []).map(c => c.id);
    if (ids.length === 0) continue;

    const { count: nbRecus } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .in('conversation_id', ids)
      .eq('sender_type', 'eleve')
      .gte('created_at', il24h);

    if (!nbRecus || nbRecus === 0) continue;

    // Récupérer email du pro via auth
    const { data: { user: authUser } } = await supabase.auth.admin.getUserById(pro.id).catch(() => ({ data: { user: null } }));
    const email = authUser?.email;
    if (!email) continue;

    // Dédup : claim avant envoi — un re-run du cron ne double-envoie pas.
    const claim = await claimEnvoi(supabase, email, refDate);
    if (!claim.claimed) { totalSkipped++; continue; }

    const success = await envoyerDigest({
      to: email,
      prenom: pro.prenom || 'là',
      nbRecus,
      url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.izisolo.fr'}/messagerie`,
      contexte: 'pro',
    });
    if (success) totalSent++;
    else {
      totalErrors++;
      // Échec d'envoi → on libère le claim pour permettre un retry.
      if (claim.persisted) await releaseEnvoi(supabase, email, refDate);
    }
  }

  // ─── Élèves : itérer sur les clients ayant reçu un message hier
  // On ne charge pas TOUS les clients (potentiellement >10k) — on part des
  // messages récents et on dérive les destinataires.
  const { data: msgsRecents } = await supabase
    .from('messages')
    .select('conversation_id, conversations(client_id, profile_id, type), created_at')
    .eq('sender_type', 'pro')
    .gte('created_at', il24h);

  // Grouper par client (ou cours)
  const eleveCount = new Map(); // clientId -> count
  for (const m of (msgsRecents || [])) {
    if (m.conversations?.type === 'client' && m.conversations.client_id) {
      const cid = m.conversations.client_id;
      eleveCount.set(cid, (eleveCount.get(cid) || 0) + 1);
    }
    // Pour les groupes-cours, on devrait fan-out vers les membres — V2 (sinon
    // on risque de spammer les clients sur de gros groupes).
  }

  // Pour chaque client : envoyer digest si pref != 'off'
  for (const [clientId, count] of eleveCount.entries()) {
    const { data: client } = await supabase
      .from('clients')
      .select('id, prenom, email, notif_messagerie_canal, profiles(studio_nom, studio_slug)')
      .eq('id', clientId)
      .maybeSingle();
    if (!client || !client.email) continue;
    if (client.notif_messagerie_canal === 'off') { totalSkipped++; continue; }
    if (client.notif_messagerie_canal === 'instant') { totalSkipped++; continue; }

    const studioNom = client.profiles?.studio_nom || 'Ton studio';
    const studioSlug = client.profiles?.studio_slug || '';
    const url = `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.izisolo.fr'}/p/${studioSlug}/espace/messages`;

    // Dédup : claim avant envoi — un re-run du cron ne double-envoie pas.
    const claim = await claimEnvoi(supabase, client.email, refDate);
    if (!claim.claimed) { totalSkipped++; continue; }

    const success = await envoyerDigest({
      to: client.email,
      prenom: client.prenom || 'là',
      nbRecus: count,
      url,
      contexte: 'eleve',
      studioNom,
    });
    if (success) totalSent++;
    else {
      totalErrors++;
      if (claim.persisted) await releaseEnvoi(supabase, client.email, refDate);
    }
  }

  return Response.json({
    ok: true,
    sent: totalSent,
    skipped: totalSkipped,
    errors: totalErrors,
    timestamp: new Date().toISOString(),
  });
}

// ─── Dédup des envois (table emails_envoyes, migration v52) ─────────────────
// Fail-open : si la table n'existe pas encore (migration non appliquée), on
// envoie sans dédup, comme avant — avec un warn pour ne pas l'oublier.

async function claimEnvoi(supabase, destinataire, refDate) {
  try {
    const { data, error } = await supabase
      .from('emails_envoyes')
      .upsert(
        { type: 'digest_messagerie', destinataire: destinataire.toLowerCase(), ref: refDate },
        { onConflict: 'type,destinataire,ref', ignoreDuplicates: true }
      )
      .select('id');
    if (error) throw error;
    // data vide = conflit unique = digest déjà envoyé aujourd'hui
    return { claimed: (data || []).length > 0, persisted: true };
  } catch (err) {
    console.warn('[cron digest] dédup indisponible (migration v52 appliquée ?) :', err?.message);
    return { claimed: true, persisted: false };
  }
}

async function releaseEnvoi(supabase, destinataire, refDate) {
  try {
    await supabase
      .from('emails_envoyes')
      .delete()
      .match({ type: 'digest_messagerie', destinataire: destinataire.toLowerCase(), ref: refDate });
  } catch {}
}

async function envoyerDigest({ to, prenom, nbRecus, url, contexte, studioNom }) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[cron digest] RESEND_API_KEY manquante');
    return false;
  }
  try {
    const sujet = contexte === 'pro'
      ? `${nbRecus} nouveau${nbRecus > 1 ? 'x' : ''} message${nbRecus > 1 ? 's' : ''} de tes élèves`
      : `${studioNom} t'a écrit`;

    const corps = contexte === 'pro'
      ? `Bonjour ${prenom},\n\nTu as ${nbRecus} message${nbRecus > 1 ? 's' : ''} non lu${nbRecus > 1 ? 's' : ''} dans ta messagerie IziSolo.\n\nJette un œil quand tu as un moment :`
      : `Bonjour ${prenom},\n\n${studioNom} t'a envoyé ${nbRecus} message${nbRecus > 1 ? 's' : ''}. Voici le lien pour le${nbRecus > 1 ? 's' : ''} consulter :`;

    // Pipeline central (Sprint 5) : blacklist respectée + List-Unsubscribe
    const r = await sendEmail({
      categorie: 'notification',
      to,
      subject: sujet,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #555; line-height: 1.6;">
          <p>${corps.replace(/\n/g, '<br/>')}</p>
          <p style="text-align: center; margin: 24px 0;">
            <a href="${url}" style="display: inline-block; padding: 10px 20px; background: #d4a0a0; color: white; text-decoration: none; border-radius: 99px; font-weight: 600;">
              Ouvrir ma messagerie
            </a>
          </p>
          <p style="color: #aaa; font-size: 0.8rem; margin: 32px 0 0; border-top: 1px solid #eee; padding-top: 16px; text-align: center;">
            Tu reçois ce digest 1×/jour. Tu peux changer ta préférence (instantané, digest ou off) dans tes paramètres.
            <br/>Propulsé par <a href="https://www.izisolo.fr" style="color: #d4a0a0;">IziSolo</a>
          </p>
        </div>
      `,
    });
    return r.ok;
  } catch (err) {
    console.error('[cron digest] envoi err:', err);
    return false;
  }
}

import { withRoute } from '@/lib/api-route';
import { createAdminClient } from '@/lib/supabase-admin';
import { sendEmail } from '@/lib/email';
import { wantsNotif } from '@/lib/notif-prefs';
import { reportError } from '@/lib/report';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Durée max explicite (fluid compute : 300 s = plafond Hobby)
export const maxDuration = 300;

/**
 * Cron quotidien (16h UTC = 18h Paris) : digest email des messages reçus la
 * veille, pour les pros et les élèves.
 *
 * Depuis le 2026-08-01 (incident pleine lune), les élèves reçoivent un email
 * INSTANTANÉ à chaque envoi de la prof (lib/messagerie-email, routes announce
 * + messages). La branche élève de ce cron n'est plus que le FILET : elle
 * skip quiconque a déjà reçu un email instantané de ce studio dans les 24 h
 * (marqueur emails_envoyes type 'message_instant', ref préfixée profileId)
 * et ne rattrape que les autres — échec d'envoi instantané, messages
 * antérieurs au déploiement. La branche PRO (élève → prof) est inchangée.
 *
 * Préférence : notif_prefs.message.email (catalogue lib/notif-prefs, défaut
 * ON) — le MÊME toggle « Messages » que le push, dans les réglages de notifs.
 * Audit 2026-07-25 : l'ancienne colonne `notif_messagerie_canal` n'avait ni
 * UI ni writer (promesse fantôme dans le pied de mail) ; la colonne reste en
 * DB, vestigiale.
 *
 * Variable d'env requise : RESEND_API_KEY
 */

export const GET = withRoute({ auth: 'cron' }, async () => {
  const supabase = createAdminClient();

  const il24h = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  // Référence de dédup : un seul digest par destinataire et par jour (Paris).
  const refDate = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });

  let totalSent = 0;
  let totalErrors = 0;
  let totalSkipped = 0;

  // ─── Pros : dérivés d'UNE requête messages cross-studio (AUDIT-PERF 2.2).
  // Avant : pour CHAQUE profil, 1 requête conversations + 1 requête messages
  // + 1 getUserById GoTrue, même sans le moindre message. Désormais : les
  // messages élève des 24 h (paginés), agrégés par studio, puis on ne charge
  // les profils/emails QUE des pros réellement concernés.
  const msgsEleve = [];
  for (let page = 0; page < 20; page++) {
    const { data: lot, error: meErr } = await supabase
      .from('messages')
      // media_urls chargées pour mentionner les pièces jointes dans l'email
      // (2026-07-31 : un digest « 1 message » qui cache 12 photos sous-vendait
      // le message — et un message photos-seules semblait vide).
      .select('media_urls, conversations!inner(profile_id)')
      .eq('sender_type', 'eleve')
      .gte('created_at', il24h)
      .order('created_at')
      .range(page * 1000, page * 1000 + 999);
    if (meErr) {
      reportError('[cron digest] messages eleve err:', meErr, { route: '/api/cron/digest-messagerie' });
      break;
    }
    msgsEleve.push(...(lot || []));
    if (!lot || lot.length < 1000) break;
  }
  const proCount = new Map(); // profileId -> { count, pieces }
  for (const m of msgsEleve) {
    const pid = m.conversations?.profile_id;
    if (!pid) continue;
    const cur = proCount.get(pid) || { count: 0, pieces: 0 };
    cur.count += 1;
    cur.pieces += Array.isArray(m.media_urls) ? m.media_urls.length : 0;
    proCount.set(pid, cur);
  }
  const proIds = [...proCount.keys()];
  const prosById = new Map();
  for (let i = 0; i < proIds.length; i += 200) {
    const { data: lot } = await supabase
      .from('profiles')
      .select('id, prenom, studio_nom, notif_prefs')
      .in('id', proIds.slice(i, i + 200));
    for (const p of lot || []) prosById.set(p.id, p);
  }

  for (const [proId, { count: nbRecus, pieces: nbPiecesPro }] of proCount.entries()) {
    const pro = prosById.get(proId);
    if (!pro) continue;
    if (!wantsNotif(pro.notif_prefs, 'message', 'prof', 'email')) { totalSkipped++; continue; }

    // Récupérer email du pro via auth — uniquement pour les pros qui ont
    // réellement un digest à recevoir (plus jamais 1 appel GoTrue par profil).
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
      nbPieces: nbPiecesPro,
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
  // messages récents et on dérive les destinataires. PAGINÉ (AUDIT-PERF 2.2 :
  // le cap 1000 silencieux faisait sauter des digests dès ~1000 messages/j).
  const msgsRecents = [];
  for (let page = 0; page < 20; page++) {
    const { data: lot, error: mrErr } = await supabase
      .from('messages')
      .select('conversation_id, media_urls, conversations(client_id, profile_id, type), created_at')
      .eq('sender_type', 'pro')
      .gte('created_at', il24h)
      .order('created_at')
      .range(page * 1000, page * 1000 + 999);
    if (mrErr) {
      reportError('[cron digest] messages pro err:', mrErr, { route: '/api/cron/digest-messagerie' });
      break;
    }
    msgsRecents.push(...(lot || []));
    if (!lot || lot.length < 1000) break;
  }

  // Grouper par client (ou cours) — messages ET pièces jointes (les photos
  // d'une annonce doivent se voir dans l'email, 2026-07-31).
  const eleveCount = new Map(); // clientId -> { count, pieces }
  for (const m of (msgsRecents || [])) {
    if (m.conversations?.type === 'client' && m.conversations.client_id) {
      const cid = m.conversations.client_id;
      const cur = eleveCount.get(cid) || { count: 0, pieces: 0 };
      cur.count += 1;
      cur.pieces += Array.isArray(m.media_urls) ? m.media_urls.length : 0;
      eleveCount.set(cid, cur);
    }
    // Pour les groupes-cours, on devrait fan-out vers les membres — V2 (sinon
    // on risque de spammer les clients sur de gros groupes).
  }

  // Fiches destinataires par LOTS de 200 (avant : 1 requête PAR client).
  const destIds = [...eleveCount.keys()];
  const clientDigestById = new Map();
  for (let i = 0; i < destIds.length; i += 200) {
    const { data: lot } = await supabase
      .from('clients')
      .select('id, prenom, email, notif_prefs, profile_id, profiles(studio_nom, studio_slug)')
      .in('id', destIds.slice(i, i + 200));
    for (const c of lot || []) clientDigestById.set(c.id, c);
  }

  // Pour chaque client : envoyer digest si pref != 'off'
  for (const [clientId, { count, pieces }] of eleveCount.entries()) {
    const client = clientDigestById.get(clientId);
    if (!client || !client.email) continue;
    if (!wantsNotif(client.notif_prefs, 'message', 'eleve', 'email')) { totalSkipped++; continue; }

    // FILET (2026-08-01) : déjà notifié·e en instantané pour ce studio dans
    // les 24 h → pas de re-nag. Fail-open : si la lecture échoue, on envoie
    // le digest (mieux vaut un double email qu'un silence).
    const { data: instant, error: instErr } = await supabase
      .from('emails_envoyes')
      .select('id')
      .eq('type', 'message_instant')
      .eq('destinataire', client.email.trim().toLowerCase())
      .gte('created_at', il24h)
      .like('ref', `${client.profile_id}:%`)
      .limit(1);
    if (!instErr && (instant || []).length > 0) { totalSkipped++; continue; }

    const studioNom = client.profiles?.studio_nom || 'Ton studio';
    const studioSlug = client.profiles?.studio_slug || '';
    const url = `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.izisolo.fr'}/p/${studioSlug}/espace/messages`;

    // Dédup : claim avant envoi — un re-run du cron ne double-envoie pas.
    // Le ref inclut le STUDIO : une élève inscrite dans 2 studios qui lui ont
    // écrit le même jour reçoit bien un digest PAR studio (avant : le 2e
    // studio était silencieusement perdu ce jour-là).
    const refEleve = `${refDate}:${client.profile_id || 'solo'}`;
    const claim = await claimEnvoi(supabase, client.email, refEleve);
    if (!claim.claimed) { totalSkipped++; continue; }

    const success = await envoyerDigest({
      to: client.email,
      prenom: client.prenom || 'là',
      nbRecus: count,
      nbPieces: pieces,
      url,
      contexte: 'eleve',
      studioNom,
    });
    if (success) totalSent++;
    else {
      totalErrors++;
      if (claim.persisted) await releaseEnvoi(supabase, client.email, refEleve);
    }
  }

  return Response.json({
    ok: true,
    sent: totalSent,
    skipped: totalSkipped,
    errors: totalErrors,
    timestamp: new Date().toISOString(),
  });
});

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
  } catch { /* release raté : le claim 'failed' sera re-clamé au prochain run (B1g) */ }
}

async function envoyerDigest({ to, prenom, nbRecus, nbPieces = 0, url, contexte, studioNom }) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[cron digest] RESEND_API_KEY manquante');
    return false;
  }
  try {
    const sujet = contexte === 'pro'
      ? `${nbRecus} nouveau${nbRecus > 1 ? 'x' : ''} message${nbRecus > 1 ? 's' : ''} de tes élèves`
      : `${studioNom} t'a écrit`;

    // Mention des pièces jointes (2026-07-31) : un message photos-seules
    // semblait vide dans l'email, et « 1 message » cachait les 12 photos
    // de la pleine lune.
    const mentionPieces = nbPieces > 0
      ? `, avec ${nbPieces} photo${nbPieces > 1 ? 's' : ''} ou fichier${nbPieces > 1 ? 's' : ''} joint${nbPieces > 1 ? 's' : ''}`
      : '';

    const corps = contexte === 'pro'
      ? `Bonjour ${prenom},\n\nTu as ${nbRecus} message${nbRecus > 1 ? 's' : ''} non lu${nbRecus > 1 ? 's' : ''}${mentionPieces} dans ta messagerie IziSolo.\n\nJette un œil quand tu as un moment :`
      : `Bonjour ${prenom},\n\n${studioNom} t'a envoyé ${nbRecus} message${nbRecus > 1 ? 's' : ''}${mentionPieces}. Voici le lien pour le${nbRecus > 1 ? 's' : ''} consulter :`;

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
            Tu reçois ce récap au maximum une fois par jour. Tu peux le désactiver dans tes réglages de notifications (section « Messages »).
            <br/>Propulsé par <a href="https://www.izisolo.fr" style="color: #d4a0a0;">IziSolo</a>
          </p>
        </div>
      `,
    });
    return r.ok;
  } catch (err) {
    reportError('[cron digest] envoi err:', err);
    return false;
  }
}

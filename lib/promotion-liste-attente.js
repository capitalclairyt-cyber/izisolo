// ============================================================================
// IziSolo — Promotion automatique de la liste d'attente (source unique)
// ----------------------------------------------------------------------------
// Quand une place se libère sur un cours, promeut le 1er de la file :
// trouve/crée la fiche client, crée la présence (RPC v53 atomique), marque la
// ligne notifiée, puis push + email « une place s'est libérée » (sauf si la
// personne était déjà inscrite par ailleurs, ou si `notifier: false`).
//
// Avant l'audit élèves (2026-07-22), cette logique vivait en DEUX copies
// divergentes (annuler/route.js + presences/liberer-serie/route.js), toutes
// deux sans statut/source sur la fiche créée et avec un ilike non échappé.
//
// Usage :
//   await promouvoirListeAttente(supabaseAdmin, profileId, cours, {
//     proEmail,          // reply-to de l'email élève (optionnel)
//     studioSlug,        // pour l'URL du push (optionnel)
//     notifier: true,    // false = promotion silencieuse (libération en masse)
//   });
// Retourne true si une personne a été promue, false sinon.
// ============================================================================

import { sendEmail } from '@/lib/email';
import { sendPushToEmail } from '@/lib/push-server';
import { wantsNotif } from '@/lib/notif-prefs';
import { escapeIlike } from '@/lib/utils';

export async function promouvoirListeAttente(supabaseAdmin, profileId, cours, { proEmail = null, studioSlug = null, notifier = true } = {}) {
  if (!cours?.id) return false;

  // Cherche le 1er de la liste (par position puis created_at)
  const { data: nextRow } = await supabaseAdmin
    .from('liste_attente')
    .select('id, email, nom, telephone, client_id')
    .eq('cours_id', cours.id)
    .eq('profile_id', profileId)
    .is('notified_at', null)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!nextRow) return false;

  // Trouver ou créer le client
  let clientId = nextRow.client_id;
  if (!clientId) {
    const { data: existingClient } = await supabaseAdmin
      .from('clients')
      .select('id')
      .eq('profile_id', profileId)
      .ilike('email', escapeIlike(nextRow.email))
      .maybeSingle();
    if (existingClient) {
      clientId = existingClient.id;
    } else {
      const nomParts = (nextRow.nom || '').split(' ');
      const prenom = nomParts[0] || nextRow.email.split('@')[0];
      const clientNom = nomParts.slice(1).join(' ') || '';
      const { data: newClient } = await supabaseAdmin
        .from('clients')
        .insert({
          profile_id: profileId,
          prenom,
          nom: clientNom,
          email: nextRow.email,
          telephone: nextRow.telephone || null,
          statut: 'prospect',
          source: 'Liste d\'attente',
        })
        .select('id')
        .single();
      clientId = newClient?.id;
    }
  }
  if (!clientId) return false;

  // Créer la presence (inscrit, pas pointé) — RPC v53 atomique.
  // NB : l'ancien insert utilisait des colonnes INEXISTANTES (present,
  // source) → il échouait systématiquement et la promotion était morte.
  const { data: resa, error: presErr } = await supabaseAdmin
    .rpc('reserver_place', {
      p_profile_id: profileId,
      p_cours_id: cours.id,
      p_client_id: clientId,
    });
  if (presErr || (!resa?.ok && resa?.reason !== 'doublon')) {
    // 'complet' = la place a été reprise entre-temps → on laisse la personne
    // dans la file pour la prochaine libération. 'doublon' = déjà inscrite
    // par ailleurs → on continue (marquage notifiée plus bas).
    console.error('promotion: create presence error:', presErr?.message || resa?.reason);
    return false;
  }

  // La personne était-elle DÉJÀ inscrite (doublon) ? Alors on la sort de la
  // file (notified_at) mais on NE lui envoie PAS l'email « une place s'est
  // libérée » : elle a déjà sa place, ce serait trompeur.
  const dejaInscrite = resa?.reason === 'doublon';

  // Marquer la ligne comme notifiée
  await supabaseAdmin
    .from('liste_attente')
    .update({ notified_at: new Date().toISOString() })
    .eq('id', nextRow.id);

  if (!notifier) return true;

  // Push « une place s'est libérée » (no-op si déjà inscrite ou pas d'abonnement)
  if (!dejaInscrite) {
    sendPushToEmail(nextRow.email, {
      title: `Une place s'est libérée 🎉`,
      body: `Ta place est réservée pour ${cours.nom || 'ton cours'}.`,
      url: studioSlug ? `/p/${studioSlug}/espace` : '/',
      tag: `la-${cours.id}`,
    }, { type: 'place_liberee', profileId }).catch(() => {});
  }

  // Email de notification — pipeline central (blacklist respectée), gaté sur
  // la pref élève place_liberee (email).
  let promuWantsEmail = true;
  try {
    const { data: cp } = await supabaseAdmin.from('clients').select('notif_prefs').eq('id', clientId).maybeSingle();
    promuWantsEmail = wantsNotif(cp?.notif_prefs, 'place_liberee', 'eleve', 'email');
  } catch {}
  try {
    if (process.env.RESEND_API_KEY && !dejaInscrite && promuWantsEmail) {
      const dateStr = cours.date
        ? new Date(cours.date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
        : 'la date prévue';
      await sendEmail({
        categorie: 'notification',
        replyTo: proEmail,
        to: nextRow.email,
        subject: `🎉 Une place s'est libérée !`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #d4a0a0; margin: 0 0 6px;">Bonne nouvelle !</h2>
            <p style="color: #555; margin: 0 0 14px;">Bonjour ${(nextRow.nom || '').split(' ')[0] || ''},</p>
            <p style="color: #555; margin: 0 0 14px;">Une place s'est libérée pour le cours auquel tu étais sur liste d'attente :</p>
            <div style="background: #faf8f5; border-radius: 12px; padding: 16px 20px; margin: 0 0 20px;">
              <strong style="font-size: 1.1rem; color: #1a1a2e;">${cours.nom || 'Ton cours'}</strong><br/>
              <span style="color: #888;">📅 ${dateStr}</span>
            </div>
            <p style="color: #555; margin: 0 0 20px;">Ta réservation est <strong>déjà enregistrée</strong>. Tu n'as rien à faire.</p>
            <p style="color: #aaa; font-size: 0.8rem; margin: 32px 0 0; border-top: 1px solid #eee; padding-top: 16px; text-align: center;">
              Propulsé par <a href="https://www.izisolo.fr" style="color: #d4a0a0;">IziSolo</a>
            </p>
          </div>
        `,
      });
    }
  } catch (emailErr) {
    console.error('promotion: email error (non-blocking):', emailErr);
  }
  return true;
}

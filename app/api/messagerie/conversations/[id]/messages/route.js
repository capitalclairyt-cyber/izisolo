import { after } from 'next/server';
import { withRoute } from '@/lib/api-route';
import { sendMessage, resolveClientFromUserEmail } from '@/lib/messagerie';
import { envoyerEmailsMessageInstant } from '@/lib/messagerie-email';
import { sendPushToUser, sendPushToEmail } from '@/lib/push-server';
import { reportError } from '@/lib/report';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Les emails instantanés d'un message de groupe partent en after().
export const maxDuration = 60;

/**
 * GET /api/messagerie/conversations/[id]/messages?before=ISO&limit=50
 * Liste les messages d'une conversation (paginé desc).
 *
 * POST /api/messagerie/conversations/[id]/messages
 * Body: { content?, message_type?, media_url?, media_urls?[], shared_ref_type?, shared_ref_id? }
 *   - Pro envoie en sender_type='pro'
 *   - Élève envoie en sender_type='eleve' (vérifie qu'il est membre + email match)
 */

export const GET = withRoute({ auth: 'user' }, async ({ request, params, auth }) => {
  const { supabase } = auth;
  const { id: conversationId } = params;
  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200);
  const before = url.searchParams.get('before');

  // Vérifier que le viewer a accès à cette conversation (RLS le couvre déjà mais on
  // préfère échouer fort pour le débug).
  const { data: conv } = await supabase
    .from('conversations')
    .select('id, type, profile_id, client_id, cours_id')
    .eq('id', conversationId)
    .maybeSingle();

  if (!conv) return Response.json({ error: 'Conversation introuvable' }, { status: 404 });

  let q = supabase
    .from('messages')
    .select('id, sender_type, sender_profile_id, sender_client_id, message_type, content, media_url, media_urls, shared_ref_type, shared_ref_id, announce_batch_id, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (before) q = q.lt('created_at', before);

  const { data: messages, error } = await q;
  if (error) {
    reportError('[messagerie] GET messages err:', error);
    return Response.json({ error: 'Erreur lecture messages' }, { status: 500 });
  }

  // Asc pour affichage (oldest → newest)
  return Response.json({ messages: (messages || []).reverse() });
});

export const POST = withRoute({ auth: 'user' }, async ({ request, params, auth }) => {
  const { user, profile, supabase } = auth;
  const { id: conversationId } = params;

  let body;
  try { body = await request.json(); } catch { return Response.json({ error: 'JSON invalide' }, { status: 400 }); }

  // Validation minimale : content OU media
  const hasContent = body.content && body.content.trim().length > 0;
  const hasMedia = (body.media_url && body.media_url.length > 0) ||
                   (Array.isArray(body.media_urls) && body.media_urls.length > 0);
  if (!hasContent && !hasMedia) {
    return Response.json({ error: 'Message vide' }, { status: 400 });
  }
  if (body.content && body.content.length > 4000) {
    return Response.json({ error: 'Message trop long (max 4000)' }, { status: 400 });
  }

  // Charger la conversation pour déterminer le rôle de l'expéditeur
  const { data: conv } = await supabase
    .from('conversations')
    .select('id, profile_id, type, client_id, cours_id')
    .eq('id', conversationId)
    .maybeSingle();
  if (!conv) return Response.json({ error: 'Conversation introuvable' }, { status: 404 });

  // L'expéditeur est-il le pro de cette conversation ?
  if (profile?.id === conv.profile_id) {
    try {
      const msg = await sendMessage(supabase, {
        conversationId,
        senderKind: 'pro',
        senderProfileId: profile.id,
        content: body.content || null,
        messageType: body.message_type || (hasMedia ? 'photo' : 'text'),
        mediaUrl: body.media_url || null,
        mediaUrls: body.media_urls || [],
        sharedRefType: body.shared_ref_type || null,
        sharedRefId: body.shared_ref_id || null,
      });
      // Push à l'élève (1-à-1) — no-op sans abonnement push
      if (conv.type === 'client' && conv.client_id) {
        (async () => {
          const { data: c } = await supabase.from('clients').select('email').eq('id', conv.client_id).maybeSingle();
          if (c?.email) {
            await sendPushToEmail(c.email, {
              title: `${profile.studio_nom || 'Ton studio'} t'a écrit`,
              body: (body.content || '').slice(0, 120) || 'Nouveau message',
              url: profile.studio_slug ? `/p/${profile.studio_slug}/espace/messages` : '/',
              tag: `msg-${conversationId}`,
            }, { type: 'message', profileId: profile.id });
          }
        })().catch(() => {});
      }
      // Push aux membres d'un GROUPE-COURS (audit 2026-07-25 : avant, un
      // message de groupe ne déclenchait AUCUN canal — ni push ni digest —
      // l'élève ne l'apprenait qu'en ouvrant l'app par hasard).
      else if (conv.type === 'cours') {
        (async () => {
          const { data: membres } = await supabase
            .from('conversation_members')
            .select('client_id')
            .eq('conversation_id', conversationId)
            .not('client_id', 'is', null);
          const ids = [...new Set((membres || []).map(m => m.client_id).filter(Boolean))];
          if (!ids.length) return;
          const { data: cls } = await supabase.from('clients').select('email').in('id', ids);
          await Promise.all((cls || []).filter(c => c.email).map(c =>
            sendPushToEmail(c.email, {
              title: `${profile.studio_nom || 'Ton studio'} — message au groupe`,
              body: (body.content || '').slice(0, 120) || 'Nouveau message',
              url: profile.studio_slug ? `/p/${profile.studio_slug}/espace/messages` : '/',
              tag: `msg-${conversationId}`,
            }, { type: 'message', profileId: profile.id })
          ));
        })().catch(() => {});
      }

      // Email instantané (2026-08-01) : l'élève est prévenue par mail dès le
      // message — cooldown 3-6 h par conversation dans la lib (un échange
      // actif ne mitraille pas sa boîte). En after() : réponse immédiate.
      const nbPieces = Array.isArray(body.media_urls) && body.media_urls.length > 0
        ? body.media_urls.length : (body.media_url ? 1 : 0);
      const paramsEmail = {
        profileId: profile.id,
        studioNom: profile.studio_nom || 'Ton studio',
        studioSlug: profile.studio_slug,
        replyTo: user?.email || null,
        contenu: body.content || '',
        nbPieces,
        conversationId,
      };
      after(async () => {
        try {
          let clientIds = [];
          if (conv.type === 'client' && conv.client_id) {
            clientIds = [conv.client_id];
          } else if (conv.type === 'cours') {
            const { data: membres } = await supabase
              .from('conversation_members')
              .select('client_id')
              .eq('conversation_id', conversationId)
              .not('client_id', 'is', null);
            clientIds = [...new Set((membres || []).map(m => m.client_id).filter(Boolean))];
          }
          if (clientIds.length > 0) {
            await envoyerEmailsMessageInstant({ ...paramsEmail, clientIds });
          }
        } catch (err) {
          reportError('[messagerie] email instant message err:', err);
        }
      });

      return Response.json({ message: msg });
    } catch (err) {
      reportError('[messagerie] pro send err:', err);
      return Response.json({ error: 'Erreur envoi' }, { status: 500 });
    }
  }

  // Sinon, est-ce un élève membre de cette conversation ?
  const client = await resolveClientFromUserEmail(supabase, conv.profile_id, user.email);
  if (!client) {
    return Response.json({ error: 'Non autorisé' }, { status: 403 });
  }

  // Vérifier que client est bien membre
  const { data: member } = await supabase
    .from('conversation_members')
    .select('client_id')
    .eq('conversation_id', conversationId)
    .eq('client_id', client.id)
    .maybeSingle();
  if (!member) {
    return Response.json({ error: 'Pas membre de cette conversation' }, { status: 403 });
  }

  try {
    const msg = await sendMessage(supabase, {
      conversationId,
      senderKind: 'eleve',
      senderClientId: client.id,
      content: body.content || null,
      messageType: body.message_type || (hasMedia ? 'photo' : 'text'),
      mediaUrl: body.media_url || null,
      mediaUrls: body.media_urls || [],
    });
    // Push au prof (no-op sans abonnement)
    sendPushToUser(conv.profile_id, {
      title: `${client.prenom || 'Un élève'} t'a écrit`,
      body: (body.content || '').slice(0, 120) || 'Nouveau message',
      url: '/messagerie',
      tag: `msg-${conversationId}`,
    }, { type: 'message' }).catch(() => {});
    return Response.json({ message: msg });
  } catch (err) {
    reportError('[messagerie] eleve send err:', err);
    return Response.json({ error: 'Erreur envoi' }, { status: 500 });
  }
});

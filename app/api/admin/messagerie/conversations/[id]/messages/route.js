import { after } from 'next/server';
import { withRoute } from '@/lib/api-route';
import { createAdminClient } from '@/lib/supabase-admin';
import { envoyerEmailReponseSupport } from '@/lib/messagerie-email';
import { estErreurMigrationV87, MESSAGE_MIGRATION_V87 } from '@/lib/messagerie-support';
import { reportError } from '@/lib/report';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// L'email « L'équipe IziSolo t'a répondu » part en after().
export const maxDuration = 60;

/**
 * Messagerie support (v87) — le fil vu et écrit par l'équipe IziSolo.
 *
 * GET  : messages du fil (asc). REFUSE toute conversation non-support :
 *        cette route ne doit jamais devenir une porte de lecture des fils
 *        privés prof ↔ élève.
 * POST : réponse de l'équipe — sender_type='izisolo', sender_profile_id NULL
 *        (personne en particulier : c'est l'équipe). Répondre vaut lecture →
 *        support_admin_last_read_at = now(). Email instantané à la prof en
 *        after(), dédupé par message (emails_envoyes type 'support_msg').
 */

async function chargerConvSupport(admin, conversationId) {
  const { data: conv, error } = await admin
    .from('conversations')
    .select('id, type, profile_id')
    .eq('id', conversationId)
    .eq('type', 'support')
    .maybeSingle();
  if (error) throw error;
  return conv;
}

export const GET = withRoute({ auth: 'admin' }, async ({ params }) => {
  const admin = createAdminClient();
  const { id: conversationId } = params;

  const conv = await chargerConvSupport(admin, conversationId);
  if (!conv) return Response.json({ error: 'Fil support introuvable' }, { status: 404 });

  const { data: messages, error } = await admin
    .from('messages')
    .select('id, sender_type, message_type, content, media_url, media_urls, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(500);
  if (error) {
    reportError('[admin/messagerie] GET messages err:', error, { route: '/api/admin/messagerie/conversations/[id]/messages' });
    return Response.json({ error: 'Lecture impossible' }, { status: 500 });
  }

  // Studio en header du fil
  const { data: prof } = await admin
    .from('profiles')
    .select('prenom, studio_nom, studio_slug')
    .eq('id', conv.profile_id)
    .maybeSingle();

  return Response.json({
    messages: messages || [],
    studio: {
      profile_id: conv.profile_id,
      prenom: prof?.prenom || '',
      studio_nom: prof?.studio_nom || 'Studio inconnu',
      studio_slug: prof?.studio_slug || '',
    },
  });
});

export const POST = withRoute({ auth: 'admin' }, async ({ request, params }) => {
  const admin = createAdminClient();
  const { id: conversationId } = params;

  let body;
  try { body = await request.json(); } catch { return Response.json({ error: 'JSON invalide' }, { status: 400 }); }
  const content = (body.content || '').trim();
  if (!content) return Response.json({ error: 'Message vide' }, { status: 400 });
  if (content.length > 4000) return Response.json({ error: 'Message trop long (max 4000)' }, { status: 400 });

  const conv = await chargerConvSupport(admin, conversationId);
  if (!conv) return Response.json({ error: 'Fil support introuvable' }, { status: 404 });

  const { data: msg, error } = await admin
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_type: 'izisolo',
      sender_profile_id: null,
      sender_client_id: null,
      message_type: 'text',
      content,
    })
    .select()
    .single();
  if (error) {
    // Pré-migration : le CHECK sender_type refuse 'izisolo' — dire pourquoi.
    if (estErreurMigrationV87(error)) {
      return Response.json({ error: MESSAGE_MIGRATION_V87 }, { status: 503 });
    }
    reportError('[admin/messagerie] POST err:', error, { route: '/api/admin/messagerie/conversations/[id]/messages' });
    return Response.json({ error: 'Envoi impossible' }, { status: 500 });
  }

  // Répondre vaut lecture. Erreur vérifiée : un non-lu faux ment à l'équipe.
  const { error: readErr } = await admin
    .from('conversations')
    .update({ support_admin_last_read_at: new Date().toISOString() })
    .eq('id', conversationId);
  if (readErr) {
    reportError('[admin/messagerie] maj last_read err:', readErr, { route: '/api/admin/messagerie/conversations/[id]/messages' });
  }

  after(async () => {
    try {
      await envoyerEmailReponseSupport({
        profileId: conv.profile_id,
        conversationId,
        messageId: msg.id,
        contenu: content,
      });
    } catch (err) {
      reportError('[admin/messagerie] email réponse err:', err);
    }
  });

  return Response.json({ message: msg });
});

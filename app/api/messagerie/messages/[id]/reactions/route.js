import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api-route';
import { escapeIlike } from '@/lib/utils';

/**
 * POST /api/messagerie/messages/[id]/reactions
 * Body : { emoji }
 *
 * Toggle : si l'user a déjà cet emoji sur ce message → supprime,
 * sinon → crée.
 *
 * Auth : user doit être membre de la conversation du message.
 */
export const POST = withRoute({ auth: 'user' }, async ({ request, params, auth }) => {
  const { id: messageId } = params;
  const { user, profile, supabase } = auth;

  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'JSON invalide' }, { status: 400 }); }
  const emoji = (body?.emoji || '').trim();
  if (!emoji || emoji.length > 16) {
    return NextResponse.json({ error: 'Emoji invalide' }, { status: 400 });
  }

  // Récupérer le message + la conversation
  const { data: message } = await supabase
    .from('messages')
    .select('id, conversation_id')
    .eq('id', messageId)
    .single();
  if (!message) return NextResponse.json({ error: 'Message introuvable' }, { status: 404 });

  // Déterminer le user_type + user_id du caller : profile chargé par
  // requireAuth (null pour un élève post-v57) → pro, sinon fiche client
  // par email (pas d'auth_user_id sur clients).
  let userType, userId;
  if (profile) {
    userType = 'pro';
    userId = profile.id;
  } else {
    // On prend le 1er match si plusieurs studios partagent le même email (cas rare).
    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .ilike('email', escapeIlike(user.email || ''))
      .limit(1)
      .maybeSingle();
    if (!client) return NextResponse.json({ error: 'Compte introuvable' }, { status: 403 });
    userType = 'eleve';
    userId = client.id;
  }

  // Toggle : check si déjà réagi
  const { data: existing } = await supabase
    .from('messages_reactions')
    .select('id')
    .eq('message_id', messageId)
    .eq('user_type', userType)
    .eq('user_id', userId)
    .eq('emoji', emoji)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('messages_reactions')
      .delete()
      .eq('id', existing.id);
    if (error) {
      return NextResponse.json({ error: humanizeReactionError(error) }, { status: 500 });
    }
    return NextResponse.json({ ok: true, action: 'removed' });
  }

  const { error: insertErr } = await supabase
    .from('messages_reactions')
    .insert({ message_id: messageId, user_type: userType, user_id: userId, emoji });
  if (insertErr) {
    return NextResponse.json({ error: humanizeReactionError(insertErr) }, { status: 500 });
  }

  return NextResponse.json({ ok: true, action: 'added' });
});

// Transforme les erreurs Postgres techniques en messages parlants
function humanizeReactionError(err) {
  if (!err) return 'Erreur inconnue';
  const msg = err.message || String(err);
  // 42P01 = relation does not exist → migration manquante
  if (err.code === '42P01' || /relation.*does not exist|messages_reactions.*not.*exist/i.test(msg)) {
    return 'Les réactions ne sont pas encore activées (migration v48 à appliquer en base).';
  }
  // 42501 = permission denied → RLS bloque
  if (err.code === '42501' || /permission denied|row-level security/i.test(msg)) {
    return 'Tu n\'as pas le droit de réagir à ce message.';
  }
  return msg;
}

/**
 * GET /api/messagerie/messages/[id]/reactions
 * Liste les réactions sur un message + indique si l'user courant les a posées.
 */
export const GET = withRoute({ auth: 'user' }, async ({ params, auth }) => {
  const { id: messageId } = params;
  const { user, profile, supabase } = auth;

  const { data: reactions } = await supabase
    .from('messages_reactions')
    .select('emoji, user_type, user_id')
    .eq('message_id', messageId);

  // Détecter celles du caller (profile = pro, cf. POST)
  let myType, myId;
  if (profile) {
    myType = 'pro'; myId = profile.id;
  } else {
    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .ilike('email', escapeIlike(user.email || ''))
      .limit(1)
      .maybeSingle();
    if (client) { myType = 'eleve'; myId = client.id; }
  }

  const decorated = (reactions || []).map(r => ({
    ...r,
    mine: r.user_type === myType && r.user_id === myId,
  }));

  return NextResponse.json({ reactions: decorated });
});

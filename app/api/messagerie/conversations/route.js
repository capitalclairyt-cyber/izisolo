import { requireAuth } from '@/lib/api-auth';
import {
  getOrCreateConversationClient,
  getOrCreateConversationCours,
  resolveClientFromUserEmail,
} from '@/lib/messagerie';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/messagerie/conversations
 *
 * - Auth pro : retourne toutes ses conversations (1-to-1 + cours)
 * - Auth élève : retourne les conversations dont il est membre
 *
 * Réponse :
 *   { conversations: [ {id, type, titre, last_message_at, unread_count, peer_label, peer_avatar } ] }
 */
export async function GET(request) {
  let user, profile, supabase;
  try {
    ({ user, profile, supabase } = await requireAuth());
  } catch (res) {
    return res;
  }

  // Détecter si l'user est un pro (a un profile) ou un élève (rattaché à au moins 1 client)
  if (profile && profile.id) {
    return getProConversations(supabase, profile.id);
  }
  // Sinon élève : on itère ses studios
  return getEleveConversations(supabase, user.email);
}

async function getProConversations(supabase, profileId) {
  // Récupère conversations + last message
  const { data: convs } = await supabase
    .from('conversations')
    .select(`
      id, type, titre, client_id, cours_id, last_message_at, archived,
      clients(id, prenom, nom, email),
      cours(id, nom, date, heure)
    `)
    .eq('profile_id', profileId)
    .eq('archived', false)
    .order('last_message_at', { ascending: false })
    .limit(100);

  // Charger last_read_at du pro pour calculer unread
  const ids = (convs || []).map(c => c.id);
  let memberMap = new Map();
  if (ids.length > 0) {
    const { data: members } = await supabase
      .from('conversation_members')
      .select('conversation_id, last_read_at')
      .eq('profile_id', profileId)
      .in('conversation_id', ids);
    (members || []).forEach(m => memberMap.set(m.conversation_id, m.last_read_at));
  }

  // Compter unread par conversation (count messages > last_read_at)
  const conversations = await Promise.all(
    (convs || []).map(async (c) => {
      const lastRead = memberMap.get(c.id) || '1970-01-01';
      const { count } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', c.id)
        .gt('created_at', lastRead)
        .neq('sender_type', 'pro'); // exclure ses propres msgs
      const peer_label = c.type === 'client'
        ? `${c.clients?.prenom || ''} ${c.clients?.nom || ''}`.trim() || 'Élève'
        : (c.titre || `${c.cours?.nom || 'Cours'}`);
      // Last message preview
      const { data: lastMsg } = await supabase
        .from('messages')
        .select('content, sender_type, message_type, created_at')
        .eq('conversation_id', c.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return {
        id: c.id,
        type: c.type,
        peer_label,
        last_message_at: c.last_message_at,
        unread_count: count || 0,
        last_message_preview: lastMsg?.content?.slice(0, 80) || (lastMsg?.message_type === 'photo' ? '📷 Photo' : ''),
        last_message_from: lastMsg?.sender_type || null,
      };
    })
  );

  return Response.json({ conversations, viewer: 'pro' });
}

async function getEleveConversations(supabase, userEmail) {
  // L'élève peut être client de plusieurs studios — on agrège
  const { data: clients } = await supabase
    .from('clients')
    .select('id, prenom, nom, profile_id, profiles(id, studio_nom, studio_slug)')
    .ilike('email', userEmail);

  if (!clients || clients.length === 0) {
    return Response.json({ conversations: [], viewer: 'eleve' });
  }

  // Récupère toutes les conversations dont l'élève est membre
  const clientIds = clients.map(c => c.id);
  const { data: members } = await supabase
    .from('conversation_members')
    .select('conversation_id, last_read_at, client_id, conversations(id, type, titre, profile_id, cours_id, last_message_at)')
    .in('client_id', clientIds);

  if (!members) return Response.json({ conversations: [], viewer: 'eleve' });

  const conversations = await Promise.all(
    members.map(async (m) => {
      const conv = m.conversations;
      if (!conv) return null;
      const client = clients.find(c => c.id === m.client_id);
      const studio = client?.profiles?.studio_nom || 'Studio';

      const lastRead = m.last_read_at || '1970-01-01';
      const { count } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', conv.id)
        .gt('created_at', lastRead)
        .neq('sender_type', 'eleve'); // exclure ses propres msgs

      const { data: lastMsg } = await supabase
        .from('messages')
        .select('content, sender_type, message_type, created_at')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      return {
        id: conv.id,
        type: conv.type,
        peer_label: conv.type === 'client' ? studio : (conv.titre || 'Cours'),
        studio_slug: client?.profiles?.studio_slug,
        last_message_at: conv.last_message_at,
        unread_count: count || 0,
        last_message_preview: lastMsg?.content?.slice(0, 80) || (lastMsg?.message_type === 'photo' ? '📷 Photo' : ''),
        last_message_from: lastMsg?.sender_type || null,
      };
    })
  );

  return Response.json({
    conversations: conversations.filter(Boolean).sort((a, b) =>
      (b.last_message_at || '').localeCompare(a.last_message_at || '')
    ),
    viewer: 'eleve',
  });
}

/**
 * POST /api/messagerie/conversations
 * Body: { type: 'client'|'cours', client_id?, cours_id? }
 * Crée (ou retrouve) une conversation. Réservé au pro.
 */
export async function POST(request) {
  let profile, supabase;
  try {
    ({ profile, supabase } = await requireAuth());
  } catch (res) {
    return res;
  }
  if (!profile?.id) {
    return Response.json({ error: 'Réservé aux pros' }, { status: 403 });
  }

  let body;
  try { body = await request.json(); } catch { return Response.json({ error: 'JSON invalide' }, { status: 400 }); }

  if (body.type === 'client' && body.client_id) {
    const conv = await getOrCreateConversationClient(supabase, profile.id, body.client_id);
    return Response.json({ conversation: conv });
  }
  if (body.type === 'cours' && body.cours_id) {
    const conv = await getOrCreateConversationCours(supabase, profile.id, body.cours_id);
    return Response.json({ conversation: conv });
  }
  return Response.json({ error: 'type + (client_id|cours_id) requis' }, { status: 400 });
}

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

  // Détecter pro vs élève. Note : le trigger Supabase crée un profile pour
  // chaque user (donc profile?.id est truthy même pour un élève). On distingue
  // un VRAI pro par la présence d'un studio_slug configuré.
  if (profile?.studio_slug) {
    return getProConversations(supabase, profile.id);
  }
  return getEleveConversations(supabase, user.email);
}

async function getProConversations(supabase, profileId) {
  try {
    // 1. Conversations brutes (sans join — plus robuste)
    const { data: convs, error: convsErr } = await supabase
      .from('conversations')
      .select('id, type, titre, client_id, cours_id, last_message_at, archived')
      .eq('profile_id', profileId)
      .eq('archived', false)
      .order('last_message_at', { ascending: false })
      .limit(100);
    if (convsErr) {
      console.error('[messagerie GET] convs err:', convsErr);
      return Response.json({ error: 'Erreur lecture conversations', detail: convsErr.message }, { status: 500 });
    }
    if (!convs || convs.length === 0) {
      return Response.json({ conversations: [], viewer: 'pro' });
    }

    const ids = convs.map(c => c.id);
    const clientIds = convs.filter(c => c.client_id).map(c => c.client_id);
    const coursIds  = convs.filter(c => c.cours_id).map(c => c.cours_id);

    // 2. Hydrater clients + cours en parallèle
    const [clientsRes, coursRes, membersRes] = await Promise.all([
      clientIds.length > 0
        ? supabase.from('clients').select('id, prenom, nom, email').in('id', clientIds)
        : Promise.resolve({ data: [] }),
      coursIds.length > 0
        ? supabase.from('cours').select('id, nom, date, heure').in('id', coursIds)
        : Promise.resolve({ data: [] }),
      supabase.from('conversation_members')
        .select('conversation_id, last_read_at')
        .eq('profile_id', profileId)
        .in('conversation_id', ids),
    ]);

    const clientById = new Map((clientsRes.data || []).map(c => [c.id, c]));
    const coursById  = new Map((coursRes.data  || []).map(c => [c.id, c]));
    const memberMap  = new Map((membersRes.data || []).map(m => [m.conversation_id, m.last_read_at]));

    // 3. Pour chaque conv : count unread + dernier message (en parallèle, sans laisser une erreur faire crasher tout)
    const conversations = await Promise.all(convs.map(async (c) => {
      const lastRead = memberMap.get(c.id) || '1970-01-01';
      const client = c.client_id ? clientById.get(c.client_id) : null;
      const cours  = c.cours_id  ? coursById.get(c.cours_id)   : null;

      const peer_label = c.type === 'client'
        ? `${client?.prenom || ''} ${client?.nom || ''}`.trim() || 'Élève'
        : (c.titre || cours?.nom || 'Cours');

      let unread_count = 0;
      let last_message_preview = '';
      let last_message_from = null;
      try {
        const { count } = await supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('conversation_id', c.id)
          .gt('created_at', lastRead)
          .neq('sender_type', 'pro');
        unread_count = count || 0;
      } catch (e) { console.warn('[messagerie GET] count unread err for', c.id, e?.message); }

      try {
        const { data: lastMsg } = await supabase
          .from('messages')
          .select('content, sender_type, message_type, created_at')
          .eq('conversation_id', c.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        last_message_preview = lastMsg?.content?.slice(0, 80) || (lastMsg?.message_type === 'photo' ? '📷 Photo' : '');
        last_message_from = lastMsg?.sender_type || null;
      } catch (e) { console.warn('[messagerie GET] last msg err for', c.id, e?.message); }

      return {
        id: c.id,
        type: c.type,
        peer_label,
        last_message_at: c.last_message_at,
        unread_count,
        last_message_preview,
        last_message_from,
      };
    }));

    return Response.json({ conversations, viewer: 'pro' });
  } catch (err) {
    console.error('[messagerie GET] unexpected err:', err);
    return Response.json({ error: 'Erreur serveur', detail: err?.message }, { status: 500 });
  }
}

async function getEleveConversations(supabase, userEmail) {
  try {
    // 1. Clients de l'élève (via email match) — sans embedded
    const { data: clients, error: clientsErr } = await supabase
      .from('clients')
      .select('id, prenom, nom, profile_id')
      .ilike('email', userEmail);
    if (clientsErr) {
      console.error('[messagerie GET eleve] clients err:', clientsErr);
      return Response.json({ error: 'Erreur lecture clients', detail: clientsErr.message }, { status: 500 });
    }
    if (!clients || clients.length === 0) {
      return Response.json({ conversations: [], viewer: 'eleve' });
    }

    // 2. Studios (profiles) liés aux clients
    const profileIds = [...new Set(clients.map(c => c.profile_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, studio_nom, studio_slug')
      .in('id', profileIds);
    const profileById = new Map((profiles || []).map(p => [p.id, p]));

    // 3. Conversation_members où l'élève est membre
    const clientIds = clients.map(c => c.id);
    const { data: members, error: memErr } = await supabase
      .from('conversation_members')
      .select('conversation_id, last_read_at, client_id')
      .in('client_id', clientIds);
    if (memErr) {
      console.error('[messagerie GET eleve] members err:', memErr);
      return Response.json({ error: 'Erreur lecture membres', detail: memErr.message }, { status: 500 });
    }
    if (!members || members.length === 0) {
      return Response.json({ conversations: [], viewer: 'eleve' });
    }

    // 4. Conversations correspondantes
    const convIds = [...new Set(members.map(m => m.conversation_id))];
    const { data: convs } = await supabase
      .from('conversations')
      .select('id, type, titre, profile_id, cours_id, last_message_at')
      .in('id', convIds);
    const convById = new Map((convs || []).map(c => [c.id, c]));

    // 5. Hydrater chaque membre → conversation enrichie
    const conversations = await Promise.all(members.map(async (m) => {
      const conv = convById.get(m.conversation_id);
      if (!conv) return null;
      const client = clients.find(c => c.id === m.client_id);
      const studio = profileById.get(client?.profile_id);
      const studioNom = studio?.studio_nom || 'Studio';
      const lastRead = m.last_read_at || '1970-01-01';

      let unread_count = 0;
      let last_message_preview = '';
      let last_message_from = null;
      try {
        const { count } = await supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('conversation_id', conv.id)
          .gt('created_at', lastRead)
          .neq('sender_type', 'eleve');
        unread_count = count || 0;
      } catch (e) { console.warn('[messagerie GET eleve] count unread err:', e?.message); }

      try {
        const { data: lastMsg } = await supabase
          .from('messages')
          .select('content, sender_type, message_type, created_at')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        last_message_preview = lastMsg?.content?.slice(0, 80) || (lastMsg?.message_type === 'photo' ? '📷 Photo' : '');
        last_message_from = lastMsg?.sender_type || null;
      } catch (e) { console.warn('[messagerie GET eleve] last msg err:', e?.message); }

      return {
        id: conv.id,
        type: conv.type,
        peer_label: conv.type === 'client' ? studioNom : (conv.titre || 'Cours'),
        studio_slug: studio?.studio_slug,
        last_message_at: conv.last_message_at,
        unread_count,
        last_message_preview,
        last_message_from,
      };
    }));

    return Response.json({
      conversations: conversations.filter(Boolean).sort((a, b) =>
        (b.last_message_at || '').localeCompare(a.last_message_at || '')
      ),
      viewer: 'eleve',
    });
  } catch (err) {
    console.error('[messagerie GET eleve] unexpected err:', err);
    return Response.json({ error: 'Erreur serveur', detail: err?.message }, { status: 500 });
  }
}

/**
 * POST /api/messagerie/conversations
 *
 * Mode pro :
 *   Body: { type: 'client'|'cours', client_id?, cours_id? }
 *   Crée ou retrouve une conversation côté pro.
 *
 * Mode élève :
 *   Body: { from: 'eleve', studio_slug: string }
 *   Crée ou retrouve la conversation 1-to-1 entre l'élève (résolu via auth.email)
 *   et le pro de ce studio.
 */
export async function POST(request) {
  let user, profile, supabase;
  try {
    ({ user, profile, supabase } = await requireAuth());
  } catch (res) {
    return res;
  }

  let body;
  try { body = await request.json(); } catch { return Response.json({ error: 'JSON invalide' }, { status: 400 }); }

  // ── Mode élève (priorité, intention explicite via from:'eleve') ──
  // Note : le trigger Supabase crée un profile pour chaque nouveau user, donc
  // profile?.id est truthy même pour un élève. On détecte le mode via body.from.
  if (body.from === 'eleve' && body.studio_slug) {
    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('studio_slug', body.studio_slug)
      .single();
    if (!targetProfile) {
      return Response.json({ error: 'Studio introuvable' }, { status: 404 });
    }
    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('profile_id', targetProfile.id)
      .ilike('email', user.email)
      .single();
    if (!client) {
      return Response.json({ error: 'Tu n\'es pas client·e de ce studio' }, { status: 403 });
    }
    // Créer ou retrouver la conv via service-role (RLS bloque l'INSERT par l'élève sinon)
    const { createClient: createAdminSupabase } = await import('@supabase/supabase-js');
    const supabaseAdmin = createAdminSupabase(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    const conv = await getOrCreateConversationClient(supabaseAdmin, targetProfile.id, client.id);
    return Response.json({ conversation: conv });
  }

  // ── Mode pro (par défaut, requiert un studio_slug réel sur le profil) ──
  // On vérifie que c'est un VRAI pro (a un studio_slug configuré).
  if (profile?.id && profile.studio_slug) {
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

  return Response.json({ error: 'Requête invalide' }, { status: 400 });
}

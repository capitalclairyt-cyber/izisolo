import { withRoute } from '@/lib/api-route';
import { createAdminClient } from '@/lib/supabase-admin';
import { estNonLuePourAdmin, getOrCreateConversationSupport, estErreurMigrationV87, MESSAGE_MIGRATION_V87 } from '@/lib/messagerie-support';
import { reportError } from '@/lib/report';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/messagerie/conversations — messagerie support (v87).
 * Liste les fils support de TOUS les studios (service_role : les convs
 * appartiennent aux profs, la RLS ne connaît pas l'équipe IziSolo).
 * Les fils sans aucun message sont masqués (une prof qui a juste ouvert le
 * fil sans écrire ne crée pas de bruit dans l'admin).
 *
 * Réponse : { conversations: [{ id, studio_nom, prenom, profile_id,
 *   last_message_at, dernier: {content, sender_type, created_at},
 *   non_lue }], migration_requise? }
 */
export const GET = withRoute({ auth: 'admin' }, async () => {
  const admin = createAdminClient();

  const { data: convs, error } = await admin
    .from('conversations')
    .select('id, profile_id, last_message_at, support_admin_last_read_at')
    .eq('type', 'support')
    .order('last_message_at', { ascending: false })
    .limit(200);

  if (error) {
    // 42703 = colonne support_admin_last_read_at absente : v87 pas appliquée.
    // Aucun fil support ne peut exister sans elle → liste vide + hint.
    if (error.code === '42703') {
      return Response.json({ conversations: [], migration_requise: true });
    }
    reportError('[admin/messagerie] liste err:', error, { route: '/api/admin/messagerie/conversations' });
    return Response.json({ error: 'Lecture impossible' }, { status: 500 });
  }
  if (!convs || convs.length === 0) {
    return Response.json({ conversations: [] });
  }

  // Studios en un seul appel
  const profileIds = [...new Set(convs.map(c => c.profile_id))];
  const { data: profiles, error: pErr } = await admin
    .from('profiles')
    .select('id, prenom, studio_nom, studio_slug')
    .in('id', profileIds);
  if (pErr) {
    reportError('[admin/messagerie] profiles err:', pErr, { route: '/api/admin/messagerie/conversations' });
    return Response.json({ error: 'Lecture impossible' }, { status: 500 });
  }
  const profById = new Map((profiles || []).map(p => [p.id, p]));

  const conversations = [];
  for (const c of convs) {
    // Dernier message (aperçu) + dernier message DE LA PROF (non-lu admin)
    const [{ data: dernier }, { data: dernierPro }] = await Promise.all([
      admin.from('messages')
        .select('content, message_type, sender_type, created_at')
        .eq('conversation_id', c.id)
        .order('created_at', { ascending: false })
        .limit(1).maybeSingle(),
      admin.from('messages')
        .select('created_at')
        .eq('conversation_id', c.id)
        .eq('sender_type', 'pro')
        .order('created_at', { ascending: false })
        .limit(1).maybeSingle(),
    ]);
    if (!dernier) continue; // fil ouvert mais jamais écrit : pas de bruit

    const prof = profById.get(c.profile_id);
    conversations.push({
      id: c.id,
      profile_id: c.profile_id,
      studio_nom: prof?.studio_nom || 'Studio inconnu',
      prenom: prof?.prenom || '',
      studio_slug: prof?.studio_slug || '',
      last_message_at: c.last_message_at,
      dernier: {
        content: dernier.content
          ? dernier.content.slice(0, 120)
          : (dernier.message_type === 'photo' ? '📷 Photo' : '📎 Fichier'),
        sender_type: dernier.sender_type,
        created_at: dernier.created_at,
      },
      non_lue: estNonLuePourAdmin(dernierPro?.created_at, c.support_admin_last_read_at),
    });
  }

  return Response.json({ conversations });
});

/**
 * POST /api/admin/messagerie/conversations — l'équipe INITIE un fil (2026-08-19,
 * retour Colin : « je suis obligé d'attendre qu'elle écrive »).
 * Body: { profile_id } — crée ou retrouve LE fil support de cette prof
 * (service_role : la conv appartient à la prof, l'équipe n'a pas sa RLS).
 * Réservé aux VRAIS profs (studio_slug configuré) : un fil support sur un
 * compte élève n'aurait aucune surface où s'afficher.
 */
export const POST = withRoute({ auth: 'admin' }, async ({ request }) => {
  const admin = createAdminClient();

  let body;
  try { body = await request.json(); } catch { return Response.json({ error: 'JSON invalide' }, { status: 400 }); }
  if (!body.profile_id) return Response.json({ error: 'profile_id requis' }, { status: 400 });

  const { data: prof, error: pErr } = await admin
    .from('profiles')
    .select('id, prenom, studio_nom, studio_slug')
    .eq('id', body.profile_id)
    .maybeSingle();
  if (pErr) {
    reportError('[admin/messagerie] POST profil err:', pErr, { route: '/api/admin/messagerie/conversations' });
    return Response.json({ error: 'Lecture impossible' }, { status: 500 });
  }
  if (!prof || !prof.studio_slug) {
    return Response.json({ error: 'Prof introuvable (ou compte sans studio)' }, { status: 404 });
  }

  try {
    const conv = await getOrCreateConversationSupport(admin, prof.id);
    return Response.json({
      conversation: conv,
      studio: { profile_id: prof.id, prenom: prof.prenom || '', studio_nom: prof.studio_nom || 'Studio' },
    });
  } catch (err) {
    if (err?.code === 'MIGRATION_V87_REQUISE' || estErreurMigrationV87(err)) {
      return Response.json({ error: MESSAGE_MIGRATION_V87 }, { status: 503 });
    }
    throw err;
  }
});

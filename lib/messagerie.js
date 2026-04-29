/**
 * lib/messagerie.js
 * ─────────────────────────────────────────────────────────────────
 * Helpers pour le hub de messagerie unifié.
 *
 * Concepts :
 *   - conversation = fil pro <-> élève (1-to-1) OU groupe pro -> élèves (cours)
 *   - message      = item dans la conversation, sender_type='pro'|'eleve'|'system'
 *   - announce     = message diffusé en fan-out à plusieurs conversations,
 *                    groupé par announce_batch_id pour traçabilité
 *
 * Helpers ici :
 *   - getOrCreateConversationClient(supabase, profileId, clientId)
 *   - getOrCreateConversationCours(supabase, profileId, coursId)
 *   - sendMessage(supabase, opts) → insert + maj last_message_at automatique (trigger)
 *   - announce(supabase, opts) → fan-out vers conversations cibles
 *   - markRead(supabase, conversationId, viewerKind, viewerId)
 *   - countUnread(supabase, viewerKind, viewerId) → nb messages non lus
 *   - resolveClientFromUserEmail(supabase, profileId, userEmail)
 * ─────────────────────────────────────────────────────────────────
 */

/**
 * Récupère ou crée la conversation 1-to-1 entre un pro et un élève.
 */
export async function getOrCreateConversationClient(supabase, profileId, clientId) {
  if (!profileId || !clientId) throw new Error('profileId et clientId requis');

  // Tenter de récupérer
  const { data: existing } = await supabase
    .from('conversations')
    .select('*')
    .eq('profile_id', profileId)
    .eq('type', 'client')
    .eq('client_id', clientId)
    .maybeSingle();

  if (existing) return existing;

  // Créer
  const { data: created, error } = await supabase
    .from('conversations')
    .insert({
      profile_id: profileId,
      type: 'client',
      client_id: clientId,
    })
    .select()
    .single();
  if (error) throw error;

  // Ajouter membres : pro + élève
  await supabase.from('conversation_members').insert([
    { conversation_id: created.id, profile_id: profileId },
    { conversation_id: created.id, client_id: clientId },
  ]);

  return created;
}

/**
 * Récupère ou crée la conversation de groupe pour un cours.
 * Tous les élèves inscrits (présences) deviennent automatiquement membres.
 */
export async function getOrCreateConversationCours(supabase, profileId, coursId) {
  if (!profileId || !coursId) throw new Error('profileId et coursId requis');

  const { data: existing } = await supabase
    .from('conversations')
    .select('*')
    .eq('profile_id', profileId)
    .eq('type', 'cours')
    .eq('cours_id', coursId)
    .maybeSingle();

  if (existing) return existing;

  // Charger le cours pour pré-remplir le titre
  const { data: cours } = await supabase
    .from('cours')
    .select('nom, date, heure')
    .eq('id', coursId)
    .single();

  const titre = cours
    ? `${cours.nom}${cours.date ? ' · ' + new Date(cours.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }) : ''}${cours.heure ? ' ' + cours.heure.slice(0, 5) : ''}`
    : 'Groupe cours';

  const { data: created, error } = await supabase
    .from('conversations')
    .insert({
      profile_id: profileId,
      type: 'cours',
      cours_id: coursId,
      titre,
    })
    .select()
    .single();
  if (error) throw error;

  // Membres : pro + tous les élèves inscrits via presences
  const { data: presences } = await supabase
    .from('presences')
    .select('client_id')
    .eq('cours_id', coursId);

  const membres = [
    { conversation_id: created.id, profile_id: profileId },
    ...(presences || []).map(p => ({
      conversation_id: created.id,
      client_id: p.client_id,
    })),
  ];

  // dedupe au cas où
  const seen = new Set();
  const uniqueMembres = membres.filter(m => {
    const key = `${m.profile_id || ''}|${m.client_id || ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (uniqueMembres.length > 0) {
    await supabase.from('conversation_members').insert(uniqueMembres).then(() => {}, () => {});
  }

  return created;
}

/**
 * Envoie un message dans une conversation.
 * @param opts.conversationId
 * @param opts.senderKind 'pro' | 'eleve' | 'system'
 * @param opts.senderProfileId  (si senderKind='pro')
 * @param opts.senderClientId   (si senderKind='eleve')
 * @param opts.content texte
 * @param opts.messageType 'text' | 'photo' | 'file' | 'system'
 * @param opts.mediaUrl
 * @param opts.mediaUrls
 * @param opts.sharedRefType 'cours' | 'offre' | 'abonnement'
 * @param opts.sharedRefId
 * @param opts.announceBatchId (annonce groupée)
 */
export async function sendMessage(supabase, opts) {
  const {
    conversationId, senderKind,
    senderProfileId = null, senderClientId = null,
    content = null, messageType = 'text',
    mediaUrl = null, mediaUrls = [],
    sharedRefType = null, sharedRefId = null,
    announceBatchId = null,
  } = opts;

  if (!conversationId || !senderKind) throw new Error('conversationId et senderKind requis');

  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id:    conversationId,
      sender_type:        senderKind,
      sender_profile_id:  senderKind === 'pro' ? senderProfileId : null,
      sender_client_id:   senderKind === 'eleve' ? senderClientId : null,
      message_type:       messageType,
      content,
      media_url:          mediaUrl,
      media_urls:         mediaUrls,
      shared_ref_type:    sharedRefType,
      shared_ref_id:      sharedRefId,
      announce_batch_id:  announceBatchId,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Diffuse une annonce à plusieurs cibles (clients ou cours).
 * Crée un message dans CHAQUE conversation cible avec le même announce_batch_id.
 *
 * @param supabase
 * @param opts.profileId
 * @param opts.targets [{type:'client', id} | {type:'cours', id}]
 * @param opts.content
 * @param opts.mediaUrls
 * @param opts.sharedRefType / sharedRefId
 * @returns { batchId, count }
 */
export async function announce(supabase, opts) {
  const { profileId, targets, content, mediaUrls = [], sharedRefType = null, sharedRefId = null } = opts;
  if (!profileId || !Array.isArray(targets) || targets.length === 0) {
    throw new Error('profileId + targets non vides requis');
  }

  // Génère un batchId
  const batchId = crypto.randomUUID();
  let count = 0;

  for (const t of targets) {
    let conv;
    if (t.type === 'client') {
      conv = await getOrCreateConversationClient(supabase, profileId, t.id);
    } else if (t.type === 'cours') {
      conv = await getOrCreateConversationCours(supabase, profileId, t.id);
    } else {
      continue;
    }

    await sendMessage(supabase, {
      conversationId: conv.id,
      senderKind: 'pro',
      senderProfileId: profileId,
      content,
      messageType: mediaUrls.length > 0 ? 'photo' : 'text',
      mediaUrls,
      sharedRefType, sharedRefId,
      announceBatchId: batchId,
    });
    count++;
  }

  return { batchId, count };
}

/**
 * Marque une conversation comme lue par un viewer.
 * @param viewerKind 'pro' | 'eleve'
 * @param viewerId   profileId ou clientId
 */
export async function markRead(supabase, conversationId, viewerKind, viewerId) {
  if (!conversationId || !viewerKind || !viewerId) return;
  const filterKey = viewerKind === 'pro' ? 'profile_id' : 'client_id';
  await supabase
    .from('conversation_members')
    .update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq(filterKey, viewerId);
}

/**
 * Compte les messages non lus pour un viewer toutes conversations confondues.
 */
export async function countUnread(supabase, viewerKind, viewerId) {
  if (!viewerKind || !viewerId) return 0;
  const filterKey = viewerKind === 'pro' ? 'profile_id' : 'client_id';

  // Récupère les conversations + last_read_at du viewer
  const { data: members } = await supabase
    .from('conversation_members')
    .select('conversation_id, last_read_at')
    .eq(filterKey, viewerId);

  if (!members || members.length === 0) return 0;

  let total = 0;
  for (const m of members) {
    const { count } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('conversation_id', m.conversation_id)
      .gt('created_at', m.last_read_at || '1970-01-01');
    // Exclure les messages envoyés par le viewer lui-même
    // (simplification : on compte tous les messages non lus, le client filtrera l'affichage)
    total += count || 0;
  }
  return total;
}

/**
 * Trouve le client d'un studio à partir de l'email d'un user authentifié.
 * Retourne null si l'email n'est pas dans la liste des clients du pro.
 */
export async function resolveClientFromUserEmail(supabase, profileId, userEmail) {
  if (!profileId || !userEmail) return null;
  const { data } = await supabase
    .from('clients')
    .select('id, prenom, nom, email, telephone')
    .eq('profile_id', profileId)
    .ilike('email', userEmail)
    .maybeSingle();
  return data || null;
}

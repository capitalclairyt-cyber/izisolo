import { escapeIlike } from '@/lib/utils';

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

  // Ajouter membres : pro + élève. ERREUR VÉRIFIÉE (avant : avalée → une conv
  // sans membres = invisible pour l'élève, messages perdus en silence).
  // 23505 toléré : course concurrente, les membres existent déjà.
  // ⚠️ last_read_at élève = NULL explicite (2026-08-01, incident « Lu fantôme »
  // pleine lune) : le DEFAULT now() de v24 faisait naître le membre « à jour de
  // lecture » — dans le fan-out d'annonce, l'élève apparaissait « Lu » à
  // l'heure d'envoi sans avoir jamais ouvert (4 destinataires de Maude), et sa
  // cloche espace ne comptait pas le message en non-lu. NULL = jamais lu
  // (countUnread retombe sur 1970). Le membre PRO garde le défaut : il crée la
  // conversation, il est à jour par définition.
  const { error: eMembres } = await supabase.from('conversation_members').insert([
    { conversation_id: created.id, profile_id: profileId },
    { conversation_id: created.id, client_id: clientId, last_read_at: null },
  ]);
  if (eMembres && eMembres.code !== '23505') throw eMembres;

  return created;
}

// ─── Membres d'une conversation de groupe ────────────────────────────────────

// Les présences VIVANTES du cours : une annulation (statut annule/declinee ou
// annulation tardive) ne doit plus recevoir « petit rappel pour mardi ».
async function membresAttendusCours(supabase, coursId) {
  const { data: presences, error } = await supabase
    .from('presences')
    .select('client_id, statut_pointage, annulation_tardive')
    .eq('cours_id', coursId);
  if (error) throw error;
  const vivants = (presences || []).filter(p =>
    p.client_id &&
    !['annule', 'declinee'].includes(p.statut_pointage) &&
    !p.annulation_tardive
  );
  return [...new Set(vivants.map(p => p.client_id))];
}

/**
 * Synchronise conversation_members avec les inscrits ACTUELS du cours.
 * Ajouts seulement (jamais de retrait : l'historique reste consultable par
 * celles et ceux qui étaient membres). Avant ce fix, les membres étaient
 * figés à la création de la conv : un élève inscrit ensuite ne voyait JAMAIS
 * les annonces de groupe.
 */
async function syncMembresCours(supabase, conversationId, profileId, coursId) {
  const clientIds = await membresAttendusCours(supabase, coursId);
  const { data: existants, error: eLecture } = await supabase
    .from('conversation_members')
    .select('client_id, profile_id')
    .eq('conversation_id', conversationId);
  if (eLecture) throw eLecture;

  const dejaClients = new Set((existants || []).map(m => m.client_id).filter(Boolean));
  const dejaPro = (existants || []).some(m => m.profile_id === profileId);

  // last_read_at d'un élève ajouté EN COURS DE ROUTE = date du dernier message
  // déjà envoyé (2026-08-01, fix « Lu fantôme ») : à jour de ce qui précède son
  // arrivée (pas 50 non-lus d'historique), vierge de ce qui suit. Avant, le
  // DEFAULT now() le faisait naître « lu » du message que l'annonce insérait
  // la milliseconde d'après. Conversation vierge → NULL (jamais lu).
  let dernierMessageAt = null;
  {
    const { data: dernier } = await supabase
      .from('messages')
      .select('created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    dernierMessageAt = dernier?.created_at || null;
  }

  const aAjouter = [
    ...(!dejaPro ? [{ conversation_id: conversationId, profile_id: profileId }] : []),
    ...clientIds.filter(id => !dejaClients.has(id))
      .map(id => ({ conversation_id: conversationId, client_id: id, last_read_at: dernierMessageAt })),
  ];
  if (!aAjouter.length) return;

  const { error } = await supabase.from('conversation_members').insert(aAjouter);
  if (error?.code === '23505') {
    // Course concurrente : on réinsère un par un en tolérant les doublons.
    for (const row of aAjouter) {
      const { error: e1 } = await supabase.from('conversation_members').insert(row);
      if (e1 && e1.code !== '23505') throw e1;
    }
  } else if (error) {
    throw error;
  }
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

  if (existing) {
    // Sync des membres à CHAQUE accès : les inscrits arrivés après la création
    // de la conv entrent dans le groupe (fix audit messagerie 2026-07-25).
    await syncMembresCours(supabase, existing.id, profileId, coursId);
    return existing;
  }

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

  // Membres : pro + inscrits vivants du cours — même chemin que la sync,
  // erreurs VÉRIFIÉES (avant : insert avalé → annonce envoyée à personne
  // pendant que l'UI affichait « Envoyé ! »).
  await syncMembresCours(supabase, created.id, profileId, coursId);

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
  const echecs = [];

  // Continue-on-error : un destinataire en échec ne bloque plus les suivants
  // (avant : throw au milieu → 500 → la prof re-cliquait → doublons pour les
  // N premiers). L'appelant reçoit le compte exact + les échecs.
  for (const t of targets) {
    try {
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
        messageType: typeForMedias(mediaUrls),
        mediaUrls,
        sharedRefType, sharedRefId,
        announceBatchId: batchId,
      });
      count++;
    } catch (err) {
      echecs.push({ type: t.type, id: t.id, message: err?.message || 'inconnu' });
    }
  }

  return { batchId, count, echecs };
}

// Un lot de PJ mixte (PDF + photo) n'est pas un message « photo » : les
// consommateurs (aperçus, rendu) s'appuient sur message_type.
const IMG_URL_RX = /\.(jpe?g|png|gif|webp|heic|avif)(\?|#|$)/i;
function typeForMedias(mediaUrls) {
  if (!mediaUrls || mediaUrls.length === 0) return 'text';
  const urls = mediaUrls.map(u => (typeof u === 'string' ? u : u?.url || ''));
  return urls.every(u => IMG_URL_RX.test(u)) ? 'photo' : 'file';
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
 * On exclut les messages envoyés par le viewer lui-même (sinon le pro voit
 * ses propres annonces comme "non lues" puisqu'elles sont plus récentes que
 * son last_read_at).
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
      .gt('created_at', m.last_read_at || '1970-01-01')
      .neq('sender_type', viewerKind);  // exclure ses propres msgs
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
    .ilike('email', escapeIlike(userEmail))
    .maybeSingle();
  return data || null;
}

/**
 * Résout la liste des cibles d'une annonce selon le scope — SOURCE UNIQUE
 * (2026-08-01, feature « décocher des destinataires ») : la route announce ET
 * la route preview (l'aperçu décochable du composeur) passent par ici. Toute
 * divergence entre « ce que Maude voit » et « ce qui part » serait un mensonge.
 *
 * @param body { scope, mode?, cours_id?, type_cours?, offre_id?, client_ids? }
 * @returns {Promise<{targets?: Array<{type:'client'|'cours', id:string}>, erreur?: {message:string, status:number}}>}
 */
export async function resoudreCiblesAnnonce(supabase, profileId, body) {
  const mode = body.mode === 'groupe' ? 'groupe' : 'individuel';
  const scope = body.scope || 'tous';
  let targets = [];

  if (scope === 'tous') {
    const { data: clients } = await supabase
      .from('clients')
      .select('id')
      .eq('profile_id', profileId)
      .in('statut', ['prospect', 'actif', 'fidele']);
    targets = (clients || []).map(c => ({ type: 'client', id: c.id }));
  }

  else if (scope === 'cours' && body.cours_id) {
    // OWNERSHIP : ce cours doit appartenir au pro connecté, sinon les présences
    // (et la conv de groupe) remonteraient les élèves d'un AUTRE studio.
    const { data: coursOwn } = await supabase
      .from('cours')
      .select('id')
      .eq('id', body.cours_id)
      .eq('profile_id', profileId)
      .maybeSingle();
    if (!coursOwn) return { erreur: { message: 'Cours introuvable', status: 404 } };

    if (mode === 'groupe') {
      targets = [{ type: 'cours', id: body.cours_id }];
    } else {
      // Fan-out individuel : 1 conv par inscrit VIVANT du cours — les
      // annulations (annule/declinee/tardive) ne reçoivent plus le rappel.
      const { data: presences } = await supabase
        .from('presences')
        .select('client_id, statut_pointage, annulation_tardive')
        .eq('cours_id', body.cours_id);
      targets = (presences || [])
        .filter(p => !['annule', 'declinee'].includes(p.statut_pointage) && !p.annulation_tardive)
        .map(p => ({ type: 'client', id: p.client_id }));
    }
  }

  else if (scope === 'type_cours' && body.type_cours) {
    // Tous les inscrits à des cours de ce type (90 derniers jours pour limiter)
    const ilYa90j = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
    const { data: cours } = await supabase
      .from('cours')
      .select('id')
      .eq('profile_id', profileId)
      .eq('type_cours', body.type_cours)
      .gte('date', ilYa90j);
    const coursIds = (cours || []).map(c => c.id);
    if (coursIds.length > 0) {
      const { data: presences } = await supabase
        .from('presences')
        .select('client_id, statut_pointage, annulation_tardive')
        .in('cours_id', coursIds);
      const clientIds = [...new Set((presences || [])
        .filter(p => !['annule', 'declinee'].includes(p.statut_pointage) && !p.annulation_tardive)
        .map(p => p.client_id))];
      targets = clientIds.map(id => ({ type: 'client', id }));
    }
  }

  else if (scope === 'abonnement' && body.offre_id) {
    // OWNERSHIP : l'offre doit appartenir au pro connecté.
    const { data: offreOwn } = await supabase
      .from('offres')
      .select('id')
      .eq('id', body.offre_id)
      .eq('profile_id', profileId)
      .maybeSingle();
    if (!offreOwn) return { erreur: { message: 'Offre introuvable', status: 404 } };

    const { data: abos } = await supabase
      .from('abonnements')
      .select('client_id')
      .eq('profile_id', profileId)
      .eq('offre_id', body.offre_id)
      .eq('statut', 'actif');
    const clientIds = [...new Set((abos || []).map(a => a.client_id))];
    targets = clientIds.map(id => ({ type: 'client', id }));
  }

  else if (scope === 'clients' && Array.isArray(body.client_ids)) {
    // Vérifier que tous les client_ids sont bien à ce pro
    const { data: clients } = await supabase
      .from('clients')
      .select('id')
      .eq('profile_id', profileId)
      .in('id', body.client_ids);
    targets = (clients || []).map(c => ({ type: 'client', id: c.id }));
  }

  return { targets };
}

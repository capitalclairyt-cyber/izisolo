import { withRoute } from '@/lib/api-route';
import { createAdminClient } from '@/lib/supabase-admin';
import { createServerClient } from '@/lib/supabase-server';
import { parseJsonBody, sondageReponseSchema } from '@/lib/validation';
import { createHash } from 'crypto';
import { escapeIlike } from '@/lib/utils';
import { reportError } from '@/lib/report';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/sondage/[sondageSlug]/repondre
 *
 * Body :
 *   {
 *     reponses: { creneau_id: 'oui'|'peut_etre'|'non', ... },
 *     email?: string,         // requis si visiteur anonyme
 *     prenom?: string,        // optionnel
 *     commentaire?: string,
 *     website?: ''            // honeypot — doit être vide
 *   }
 *
 * Comportement :
 *   - Si l'utilisateur est connecté ET trouvé dans clients du studio → réponse rattachée client_id
 *   - Sinon visiteur anonyme : email obligatoire (sondage.visibilite ∈ {mixte, public})
 *   - Honeypot website non vide → 422 spam
 *   - Rate limit : max N SOUMISSIONS par hash IP par heure (RPC v72, borne fixe)
 *   - Re-vote = remplacement complet du bulletin (tous les créneaux du sondage)
 */

const RATE_LIMIT_PAR_HEURE = 5;
const HASH_SECRET = process.env.RATE_LIMIT_SECRET || 'izisolo-default-salt-change-me';

function hashIp(req) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
          || req.headers.get('x-real-ip')
          || 'unknown';
  return createHash('sha256').update(ip + HASH_SECRET).digest('hex').slice(0, 32);
}

export const POST = withRoute({ auth: 'public' }, async ({ request, params }) => {
  const { sondageSlug } = params;

  const { data: body, errorResponse } = await parseJsonBody(request, sondageReponseSchema);
  if (errorResponse) return errorResponse;

  // Honeypot
  if (body.website && body.website.length > 0) {
    return Response.json({ error: 'spam' }, { status: 422 });
  }

  // Au moins une réponse non vide
  const reponses = Object.entries(body.reponses);
  if (reponses.length === 0) {
    return Response.json({ error: 'Aucune réponse fournie' }, { status: 400 });
  }

  // Service role pour bypasser RLS sur insert (pas de policy publique INSERT, exprès)
  const supabase = createAdminClient();

  // Charger sondage + créneaux pour valider que les ids appartiennent bien au sondage
  const { data: sondage } = await supabase
    .from('sondages_planning')
    .select('id, profile_id, visibilite, actif, date_fin')
    .eq('slug', sondageSlug)
    .maybeSingle();

  if (!sondage) return Response.json({ error: 'Sondage introuvable' }, { status: 404 });
  // Clôture en heure de PARIS (serveur UTC : un sondage fini le 25 acceptait
  // des votes jusqu'au 26 à 2 h du matin — B1c).
  const todayParis = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });
  if (!sondage.actif || (sondage.date_fin && sondage.date_fin < todayParis)) {
    return Response.json({ error: 'Sondage clos' }, { status: 410 });
  }

  const { data: creneaux } = await supabase
    .from('sondages_creneaux')
    .select('id')
    .eq('sondage_id', sondage.id);

  const creneauxValides = new Set((creneaux || []).map(c => c.id));
  const repFiltrees = reponses.filter(([cid]) => creneauxValides.has(cid));
  if (repFiltrees.length === 0) {
    return Response.json({ error: 'Aucun créneau valide' }, { status: 400 });
  }

  // Identifier le répondant : élève connecté du studio OU email anonyme
  let clientId = null;
  let clientEmail = null;
  let email = null;
  let prenom = body.prenom || null;

  try {
    const ssr = await createServerClient();
    const { data: { user } } = await ssr.auth.getUser();
    if (user) {
      // Chercher le client du studio lié à cet email
      const { data: client } = await supabase
        .from('clients')
        .select('id, prenom, email')
        .eq('profile_id', sondage.profile_id)
        .ilike('email', escapeIlike(user.email))
        .maybeSingle();
      if (client) {
        clientId = client.id;
        clientEmail = client.email || user.email || null;
        prenom = prenom || client.prenom || null;
      } else if (sondage.visibilite !== 'public') {
        // Visibilité 'inscrits' : refuser si pas dans la liste clients
        if (sondage.visibilite === 'inscrits') {
          return Response.json({ error: 'Sondage réservé aux élèves inscrits' }, { status: 403 });
        }
        // 'mixte' : on accepte avec email
        email = user.email.toLowerCase();
      }
    }
  } catch {
    // pas connecté, on continue en anonyme
  }

  if (!clientId && !email) {
    if (sondage.visibilite === 'inscrits') {
      return Response.json({ error: 'Connecte-toi pour répondre à ce sondage' }, { status: 401 });
    }
    if (!body.email) {
      return Response.json({ error: 'Email requis pour répondre' }, { status: 400 });
    }
    email = body.email.toLowerCase();
  }

  const ipHash = hashIp(request);

  // Rate limit : borne FIXE par soumission via la RPC partagée v72 (avant :
  // le seuil scalait avec la taille de la requête — « max 3/h » promis,
  // 4 bulletins complets passaient). Fail-open si la RPC manque.
  try {
    const { data: ok, error: rlErr } = await supabase
      .rpc('check_rate_limit', { p_cle: `sondage-vote:${ipHash}`, p_max: RATE_LIMIT_PAR_HEURE, p_fenetre_secondes: 3600 });
    if (!rlErr && ok === false) {
      return Response.json({ error: 'Trop de réponses récemment, réessaye plus tard' }, { status: 429 });
    }
  } catch { /* fail-open */ }

  // Re-vote = remplacement COMPLET du bulletin sur TOUS les créneaux du
  // sondage (B1c : avant, seuls les créneaux re-soumis étaient nettoyés →
  // les anciens votes persistaient ailleurs, impossible d'effacer un vote).
  // Et la même personne ne compte plus double : au vote connecté, on purge
  // aussi ses anciens bulletins anonymes (email prouvé par la session).
  const tousCreneaux = [...creneauxValides];
  if (clientId) {
    const { error: delErr } = await supabase.from('sondages_reponses').delete()
      .in('creneau_id', tousCreneaux)
      .eq('client_id', clientId);
    if (delErr) {
      reportError('[sondage/repondre] purge client err:', delErr);
      return Response.json({ error: 'Erreur enregistrement' }, { status: 500 });
    }
    if (clientEmail) {
      const { error: delErr2 } = await supabase.from('sondages_reponses').delete()
        .in('creneau_id', tousCreneaux)
        .ilike('email', escapeIlike(clientEmail))
        .is('client_id', null);
      if (delErr2) reportError('[sondage/repondre] purge email-anonyme err:', delErr2);
    }
  } else if (email) {
    const { error: delErr } = await supabase.from('sondages_reponses').delete()
      .in('creneau_id', tousCreneaux)
      .eq('email', email)
      .is('client_id', null);
    if (delErr) {
      reportError('[sondage/repondre] purge anonyme err:', delErr);
      return Response.json({ error: 'Erreur enregistrement' }, { status: 500 });
    }
  }

  const rows = repFiltrees.map(([creneau_id, valeur]) => ({
    creneau_id,
    client_id:   clientId,
    email:       clientId ? null : email,
    prenom,
    valeur,
    commentaire: body.commentaire || null,
    ip_hash:     ipHash,
  }));

  const { error: insErr } = await supabase
    .from('sondages_reponses')
    .insert(rows);

  if (insErr) {
    reportError('[sondage/repondre] insert err:', insErr);
    return Response.json({ error: 'Erreur enregistrement' }, { status: 500 });
  }

  return Response.json({ ok: true, enregistrees: rows.length });
});

import { createClient as createAdminSupabase } from '@supabase/supabase-js';
import { createServerClient } from '@/lib/supabase-server';
import { parseJsonBody, sondageReponseSchema } from '@/lib/validation';
import { createHash } from 'crypto';

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
 *   - Rate limit léger : max 3 réponses par hash IP par sondage par heure
 *   - Idempotent : on UPSERT par (creneau_id, client_id) ou (creneau_id, email)
 */

const RATE_LIMIT_PAR_HEURE = 3;
const HASH_SECRET = process.env.RATE_LIMIT_SECRET || 'izisolo-default-salt-change-me';

function hashIp(req) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
          || req.headers.get('x-real-ip')
          || 'unknown';
  return createHash('sha256').update(ip + HASH_SECRET).digest('hex').slice(0, 32);
}

export async function POST(request, { params }) {
  const { sondageSlug } = await params;

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
  const supabase = createAdminSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Charger sondage + créneaux pour valider que les ids appartiennent bien au sondage
  const { data: sondage } = await supabase
    .from('sondages_planning')
    .select('id, profile_id, visibilite, actif, date_fin')
    .eq('slug', sondageSlug)
    .maybeSingle();

  if (!sondage) return Response.json({ error: 'Sondage introuvable' }, { status: 404 });
  if (!sondage.actif || (sondage.date_fin && sondage.date_fin < new Date().toISOString().slice(0, 10))) {
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
        .ilike('email', user.email)
        .maybeSingle();
      if (client) {
        clientId = client.id;
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

  // Rate limit : max N réponses par IP/heure pour ce sondage (évite spam basique)
  const ilUneHeure = new Date(Date.now() - 3600 * 1000).toISOString();
  const { count: nbRecent } = await supabase
    .from('sondages_reponses')
    .select('id', { count: 'exact', head: true })
    .eq('ip_hash', ipHash)
    .gte('created_at', ilUneHeure)
    .in('creneau_id', [...creneauxValides]);

  if ((nbRecent || 0) > repFiltrees.length * RATE_LIMIT_PAR_HEURE) {
    return Response.json({ error: 'Trop de réponses récemment, réessaye plus tard' }, { status: 429 });
  }

  // Préparer les rows à upsert. UPSERT par (creneau_id, client_id) OU (creneau_id, email)
  // → on supprime d'abord les réponses existantes pour les mêmes (creneau, répondant) puis on insère.
  const creneauIds = repFiltrees.map(([cid]) => cid);
  if (clientId) {
    await supabase.from('sondages_reponses').delete()
      .in('creneau_id', creneauIds)
      .eq('client_id', clientId);
  } else if (email) {
    await supabase.from('sondages_reponses').delete()
      .in('creneau_id', creneauIds)
      .eq('email', email)
      .is('client_id', null);
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
    console.error('[sondage/repondre] insert err:', insErr);
    return Response.json({ error: 'Erreur enregistrement' }, { status: 500 });
  }

  return Response.json({ ok: true, enregistrees: rows.length });
}

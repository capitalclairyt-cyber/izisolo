import { withRoute } from '@/lib/api-route';
import { clientsImportSchema } from '@/lib/validation';
import { effectivePlan, planConfig } from '@/lib/plan-guard';

/**
 * POST /api/clients/import — Import en masse d'élèves (depuis un CSV mappé
 * côté client). Le « tueur de coût de changement » : une prof qui vient d'un
 * autre outil exporte sa base et la récupère ici en quelques secondes.
 *
 * Body : { clients: [{ prenom, nom, email, telephone, date_naissance, ville, notes }, ...] }
 *
 * Garanties :
 *   - auth: 'active' → bloque les comptes gelés (402)
 *   - dédup : par email (intra-fichier + vs base existante), via la contrainte
 *     UNIQUE(profile_id, lower(email)) de la migration v53 en filet ultime
 *   - respect du plan : un Solo plafonné (40 élèves) importe ce qui rentre,
 *     le reste est reporté « bloqué par la limite » (les triggers v54 = filet)
 *   - jamais d'écrasement : un email déjà présent est ignoré, pas mis à jour
 *
 * Réponse : { ok, total, importes, doublons, bloques_limite, invalides,
 *             invitables: [{ email, prenom }] }
 *   invitables = les élèves réellement insérés qui ont un email → utilisés
 *   par l'écran de fin d'import pour proposer l'invitation groupée
 *   (envoi de leur lien d'accès portail via POST /api/invite).
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Normalise une date vers YYYY-MM-DD (accepte aussi JJ/MM/AAAA, JJ-MM-AAAA,
// JJ.MM.AAAA). Renvoie null si on ne sait pas lire → on n'insère pas de date
// douteuse plutôt que de planter.
function normDate(s) {
  if (!s) return null;
  const v = s.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const m = v.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return null;
}

export const POST = withRoute({ auth: 'active', schema: clientsImportSchema }, async ({ auth, body }) => {
  const { user, profile, supabase } = auth;

  // 1. Nettoyage + validation ligne à ligne (rien ne fait échouer le lot)
  const cleaned = [];
  let invalides = 0;
  for (const r of body.clients) {
    const prenom = (r.prenom || '').trim();
    const nom = (r.nom || '').trim();
    let email = (r.email || '').trim().toLowerCase();
    if (email && !EMAIL_RE.test(email)) email = ''; // email douteux : on garde la personne, sans email
    // Une ligne doit avoir au moins un identifiant exploitable
    if (!prenom && !nom && !email) { invalides++; continue; }
    cleaned.push({
      prenom, nom, email,
      telephone: (r.telephone || '').trim(),
      ville: (r.ville || '').trim(),
      notes: (r.notes || '').trim(),
      date_naissance: normDate(r.date_naissance),
    });
  }
  if (cleaned.length === 0) {
    return Response.json({ ok: false, error: 'Aucune ligne valide à importer (prénom, nom ou email manquant partout).' }, { status: 400 });
  }

  // 2. Dédup par email : intra-fichier + contre la base existante
  const { data: existing } = await supabase
    .from('clients').select('email').eq('profile_id', user.id);
  const existingEmails = new Set((existing || []).map(c => (c.email || '').trim().toLowerCase()).filter(Boolean));

  const seen = new Set();
  let doublons = 0;
  const toInsert = [];
  for (const c of cleaned) {
    if (c.email) {
      if (existingEmails.has(c.email) || seen.has(c.email)) { doublons++; continue; }
      seen.add(c.email);
    }
    toInsert.push(c);
  }

  // 3. Limite de plan (plan EFFECTIF : trial = pro = illimité)
  const plan = planConfig(effectivePlan(profile));
  let bloques_limite = 0;
  let allowed = toInsert;
  if (plan.limiteClients != null) {
    const { count } = await supabase
      .from('clients').select('id', { count: 'exact', head: true })
      .eq('profile_id', user.id).in('statut', ['prospect', 'actif', 'fidele']);
    const remaining = Math.max(0, plan.limiteClients - (count || 0));
    if (toInsert.length > remaining) {
      allowed = toInsert.slice(0, remaining);
      bloques_limite = toInsert.length - remaining;
    }
  }

  // 4. Insertion. nom est NOT NULL → '' par défaut. statut/source posés.
  const payload = allowed.map(c => ({
    profile_id: user.id,
    prenom: c.prenom || null,
    nom: c.nom || '',
    email: c.email || null,
    telephone: c.telephone || null,
    ville: c.ville || null,
    notes: c.notes || null,
    date_naissance: c.date_naissance,
    statut: 'prospect',
    source: 'import',
  }));

  let importes = 0;
  const invitables = [];
  if (payload.length) {
    const { data, error } = await supabase.from('clients').insert(payload).select('id');
    if (error) {
      // Filet : un doublon concurrent (23505 = UNIQUE v53) ou un trigger plan
      // (P0001 = v54) ferait échouer tout le lot. On rejoue ligne à ligne pour
      // importer le maximum et compter précisément.
      for (const p of payload) {
        const { error: e1 } = await supabase.from('clients').insert(p);
        if (!e1) {
          importes++;
          if (p.email) invitables.push({ email: p.email, prenom: p.prenom || '' });
        }
        else if (e1.code === '23505') doublons++;
        else if (e1.code === 'P0001') bloques_limite++;
      }
    } else {
      importes = data?.length || 0;
      for (const p of payload) {
        if (p.email) invitables.push({ email: p.email, prenom: p.prenom || '' });
      }
    }
  }

  return Response.json({
    ok: true,
    total: body.clients.length,
    importes,
    doublons,
    bloques_limite,
    invalides,
    invitables,
  });
});

// ============================================================================
// IziSolo — Comptes élèves devenus orphelins (2026-08-22)
// ---------------------------------------------------------------------------
// Un compte élève est une identité GLOBALE : le même humain peut être inscrit
// dans deux studios. Supprimer un studio ne doit donc jamais supprimer ses
// élèves à l'aveugle — seulement ceux dont l'email ne reste rattaché à AUCUNE
// fiche, nulle part. C'est le cas des studios d'entraînement, qui fabriquent
// des comptes fictifs à la chaîne.
//
// Partagé par la route d'inventaire et celle de suppression : les deux DOIVENT
// compter la même chose, sinon l'écran annonce un nombre et la suppression en
// fait un autre.
// ============================================================================

import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * Emails d'élèves de CE studio qui possèdent un compte auth et n'ont de fiche
 * NULLE PART ailleurs. Exporté pour la route de suppression : les deux doivent
 * compter exactement la même chose, sinon l'écran promet un nombre et la
 * suppression en fait un autre.
 */
export async function emailsOrphelins(profileId) {
  // 1. Emails des fiches de ce studio
  const emailsStudio = new Set();
  for (let page = 0; page < 20; page++) {
    const { data: lot, error } = await supabaseAdmin
      .from('clients')
      .select('email')
      .eq('profile_id', profileId)
      .not('email', 'is', null)
      .range(page * 1000, page * 1000 + 999);
    if (error) throw error;
    for (const c of lot) if (c.email) emailsStudio.add(c.email.toLowerCase());
    if (lot.length < 1000) break;
  }
  if (emailsStudio.size === 0) return [];

  // 2. Ces mêmes emails, rattachés à une fiche d'un AUTRE studio
  const encoreAilleurs = new Set();
  const liste = [...emailsStudio];
  for (let i = 0; i < liste.length; i += 100) {
    const { data: lot, error } = await supabaseAdmin
      .from('clients')
      .select('email, profile_id')
      .neq('profile_id', profileId)
      .in('email', liste.slice(i, i + 100));
    if (error) throw error;
    for (const c of lot) if (c.email) encoreAilleurs.add(c.email.toLowerCase());
  }

  // 3. Parmi les emails qui ne restent nulle part, ceux qui ont un compte auth
  //    ET ne sont pas des profils prof (un prof n'est jamais un orphelin).
  const candidats = liste.filter(e => !encoreAilleurs.has(e));
  if (candidats.length === 0) return [];
  const cible = new Set(candidats);

  const orphelins = [];
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const users = data?.users || [];
    for (const u of users) {
      const mail = (u.email || '').toLowerCase();
      if (!mail || !cible.has(mail)) continue;
      orphelins.push({ id: u.id, email: mail });
    }
    if (users.length < 1000) break;   // paginé jusqu'au bout, pas 1 page en aveugle
  }
  if (orphelins.length === 0) return [];

  // Filet final : jamais un compte qui possède un profil prof.
  const { data: profs, error: eProfs } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .in('id', orphelins.map(o => o.id));
  if (eProfs) throw eProfs;
  const estProf = new Set((profs || []).map(p => p.id));
  return orphelins.filter(o => !estProf.has(o.id));
}

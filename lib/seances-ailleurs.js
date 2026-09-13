// ============================================================================
// IziSolo — L'agenda de la PERSONNE (pont 2, lot 1 Associations & Studios,
// 2026-09-13, PLAN-ASSOS-STUDIOS-2026.md §6.3)
// ----------------------------------------------------------------------------
// Une prof qui donne des cours ailleurs (une association, un studio) voit,
// dans SON IziSolo, les séances qu'elle y donne : des cartes taguées du nom
// de la structure, à côté de son « Aujourd'hui » et de son agenda. Un clic
// bascule sur la structure et ouvre la séance.
//
// Une seule requête avec son propre jeton : v101 lui donne la LECTURE du
// studio entier là où elle est membre, et `cours.intervenant_id` (v103) dit
// lesquelles sont à elle. Pré-v103 (colonne absente) : rien, et rien ne
// casse. Ce module ne lit JAMAIS les élèves ni l'argent d'une autre
// structure : seulement ses séances.
//
// ⚠️ SERVEUR (prend le client Supabase de la session).
// ============================================================================

const ABSENT = ['PGRST204', 'PGRST205', '42703', '42P01'];
const iso = (d) => d.toISOString().slice(0, 10);

/**
 * @param supabase   client session (RLS)
 * @param studioId   le studio AFFICHÉ (ses séances à lui ne sont pas « ailleurs »)
 * @param membres    ses appartenances actives (lib/studio-actif)
 * @param options    { jours = 14 } fenêtre en avant
 * @returns {Array<{ id, nom, date, heure, duree_minutes, lieu, format, type_cours, studio_id, studio_nom, nb_inscrites }>}
 */
export async function chargerSeancesAilleurs(supabase, studioId, membres, { jours = 14 } = {}) {
  const ailleurs = (membres || []).filter(m => m.profile_id && m.profile_id !== studioId && m.id);
  if (ailleurs.length === 0) return [];
  const studiosIds = [...new Set(ailleurs.map(m => m.profile_id))];
  const membreIds = ailleurs.map(m => m.id);
  const debut = iso(new Date());
  const fin = iso(new Date(Date.now() + jours * 86400000));

  try {
    const [{ data: cours, error }, { data: studios }] = await Promise.all([
      supabase
        .from('cours')
        .select('id, nom, date, heure, duree_minutes, lieu, format, type_cours, profile_id, intervenant_id, est_annule, presences(id, statut_pointage, annulation_tardive)')
        .in('profile_id', studiosIds)
        .in('intervenant_id', membreIds)
        .eq('est_annule', false)
        .gte('date', debut)
        .lte('date', fin)
        .order('date').order('heure')
        .limit(60),
      supabase.from('profiles').select('id, studio_nom').in('id', studiosIds),
    ]);
    if (error) {
      if (ABSENT.includes(error.code)) return [];
      return [];
    }
    const noms = Object.fromEntries((studios || []).map(s => [s.id, s.studio_nom || 'Studio']));
    return (cours || []).map(c => ({
      id: c.id,
      nom: c.nom,
      date: c.date,
      heure: c.heure ? String(c.heure).slice(0, 5) : null,
      duree_minutes: c.duree_minutes || null,
      lieu: c.lieu || null,
      en_ligne: c.format === 'visio' || c.format === 'hybride',
      type_cours: c.type_cours || null,
      studio_id: c.profile_id,
      studio_nom: noms[c.profile_id] || 'Studio',
      nb_inscrites: (c.presences || []).filter(p => !p.annulation_tardive && !['annule', 'declinee'].includes(p.statut_pointage)).length,
    }));
  } catch {
    return [];
  }
}

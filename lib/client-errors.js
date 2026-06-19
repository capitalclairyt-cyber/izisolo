import { createClient } from '@/lib/supabase';

/**
 * Transforme une erreur Supabase de création/édition de client en message
 * HUMAIN. En particulier, la violation de la contrainte v53
 * `uniq_clients_profile_email` (un même email ne peut pas exister 2× chez un
 * prof) renvoyait un « duplicate key value violates unique constraint … »
 * brut et incompréhensible — qui a poussé une prof à recréer une fiche
 * archivée invisible (bug Christel/Karine, 2026-06-17).
 *
 * On détecte le doublon d'email, on va chercher QUELLE fiche le porte (même
 * archivée), et on guide vers elle au lieu d'afficher du SQL.
 *
 * @param {object} err   l'erreur Supabase (a .code / .message)
 * @param {string} email l'email saisi dans le formulaire
 * @returns {Promise<string>} message prêt pour un toast
 */
export async function messageErreurClient(err, email) {
  const estDoublonEmail =
    err?.code === '23505' ||
    /uniq_clients_profile_email|duplicate key/i.test(err?.message || '');

  if (!estDoublonEmail) {
    return 'Erreur : ' + (err?.message || 'une erreur est survenue.');
  }

  const e = (email || '').trim().toLowerCase();
  let qui = '';
  if (e) {
    try {
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      const { data: ex } = await sb
        .from('clients')
        .select('prenom, nom, nom_structure, statut')
        .eq('profile_id', user.id)
        .ilike('email', e)
        .maybeSingle();
      if (ex) {
        const nom = [ex.prenom, ex.nom].filter(Boolean).join(' ').trim()
          || ex.nom_structure
          || 'une fiche existante';
        qui = ` : ${nom}${ex.statut === 'archive' ? ' (archivée — retrouve-la en cherchant son nom)' : ''}`;
      }
    } catch { /* lookup best-effort */ }
  }
  return `Un élève utilise déjà cet email${qui}. Ouvre sa fiche plutôt que d'en créer un doublon.`;
}

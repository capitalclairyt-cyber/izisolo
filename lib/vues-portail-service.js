/**
 * Les vues du portail, côté base (v119). Les règles vivent dans
 * lib/vues-portail.js ; ici, on écrit et on lit, jamais on ne décide.
 *
 * ⚠️ Rien de ce fichier ne doit pouvoir casser une page : le compteur est un
 * confort d'upsell, la page publique d'un studio est son gagne-pain. Toute
 * erreur (table absente avant v119, RPC non grantée, base lente) est avalée.
 */
import { estRobot, fenetre, FENETRE_JOURS } from './vues-portail';

/**
 * +1 sur le compteur du jour. À appeler en `after()`, jamais dans le rendu.
 * On ne compte pas : les robots, ni la prof qui regarde son propre portail
 * (sinon trois allers-retours dans ses réglages deviendraient « trois
 * visiteuses », et la carte mentirait au premier coup d'œil).
 */
export async function compterVue(admin, { profileId, userAgent, estLaProf = false }) {
  if (!profileId || estLaProf || estRobot(userAgent)) return { compte: false };
  try {
    const { error } = await admin.rpc('bump_vue_portail', { p_profile: profileId });
    // PGRST202 = fonction inconnue (v119 pas encore appliquée) : on se tait.
    if (error) return { compte: false, raison: error.code || 'erreur' };
    return { compte: true };
  } catch {
    return { compte: false, raison: 'exception' };
  }
}

/** Les lignes de la fenêtre, pour un studio. Jamais d'exception, jamais null. */
export async function lireVues(client, profileId, jours = FENETRE_JOURS) {
  if (!profileId) return [];
  const { debut, fin } = fenetre(jours);
  try {
    const { data, error } = await client
      .from('vues_portail')
      .select('jour, vues')
      .eq('profile_id', profileId)
      .gte('jour', debut)
      .lte('jour', fin);
    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
}

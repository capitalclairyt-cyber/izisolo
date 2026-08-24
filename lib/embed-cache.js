/**
 * lib/embed-cache.js — cache mémoire d'instance pour les blocs intégrables
 * (planning B2g, offres v99).
 *
 * Pourquoi : un bloc intégré vit sur le SITE de la prof. Chaque visiteur de son
 * site coûtait un render plus quelques requêtes DB. Ces vues sont anonymes par
 * design (aucun cookie, aucune personnalisation), donc parfaitement cachables.
 *
 * Mémoire d'instance lambda = best-effort assumé : une instance chaude sert la
 * quasi-totalité du trafic d'un site actif ; à froid on paie le chemin complet,
 * comme avant. Pas d'API framework ici : le cache survit aux changements de
 * Next, et quelques secondes de retard sur un planning hebdomadaire ou une
 * grille tarifaire sont invisibles.
 */

const STORES = new Map(); // nom du bloc -> Map(clé -> { at, data })

/**
 * @param {string} bloc      nom du bloc ('planning', 'offres') — un store par bloc
 * @param {string} cle       clé de cache (slug + options d'affichage)
 * @param {number} ttlMs     durée de vie
 * @param {() => Promise<any>} producteur  calcul complet en cas de manque
 * @param {number} [max]     nombre d'entrées avant purge
 */
export async function cacheEmbed(bloc, cle, ttlMs, producteur, max = 500) {
  let store = STORES.get(bloc);
  if (!store) { store = new Map(); STORES.set(bloc, store); }

  const hit = store.get(cle);
  if (hit && Date.now() - hit.at < ttlMs) return hit.data;

  const data = await producteur();

  if (store.size >= max) {
    // Purge simple : on jette les entrées périmées, sinon la plus vieille.
    for (const [k, v] of store) {
      if (Date.now() - v.at >= ttlMs) store.delete(k);
    }
    if (store.size >= max) store.delete(store.keys().next().value);
  }
  store.set(cle, { at: Date.now(), data });
  return data;
}

'use client';

// Récupération automatique des erreurs de chargement de chunk JS/CSS.
//
// Symptôme : une PWA installée garde un ancien service worker après un
// déploiement ; les fichiers hashés (_next/static/.../*.js) référencés par
// l'ancien build n'existent plus côté serveur → `ChunkLoadError` → l'écran
// « Une erreur est survenue ». Le correctif : recharger une fois sur un build
// frais. On désinscrit d'abord le SW périmé pour que le rechargement passe par
// le réseau (et non le cache du SW), garantissant une récupération en 1 essai.

export function isChunkLoadError(error) {
  if (!error) return false;
  const name = error.name || '';
  const msg = error.message || '';
  return (
    name === 'ChunkLoadError' ||
    /Loading chunk [\w-]+ failed/i.test(msg) ||
    /Loading CSS chunk [\w-]+ failed/i.test(msg) ||
    /Failed to fetch dynamically imported module/i.test(msg) ||   // Chrome
    /error loading dynamically imported module/i.test(msg) ||     // Firefox
    /importing a module script failed/i.test(msg)                 // Safari
  );
}

// Déclenche la récupération. Renvoie true si un rechargement a été lancé
// (l'appelant peut alors court-circuiter l'affichage de l'écran d'erreur).
// Garde-fou anti-boucle : un seul essai par fenêtre de 10 s. Si l'erreur
// persiste au-delà, on laisse l'écran d'erreur s'afficher (vrai souci serveur).
export function recoverFromChunkError() {
  if (typeof window === 'undefined') return false;

  const KEY = 'izi:last-chunk-recovery';
  const last = Number(window.sessionStorage.getItem(KEY) || '0');
  if (Date.now() - last < 10000) return false;
  window.sessionStorage.setItem(KEY, String(Date.now()));

  const reload = () => window.location.reload();
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
      .getRegistrations()
      .then((regs) => Promise.all(regs.map((r) => r.unregister())))
      .catch(() => {})
      .finally(reload);
  } else {
    reload();
  }
  return true;
}

/**
 * Custom service worker — handlers Web Push.
 *
 * next-pwa (customWorkerDir='worker' par défaut) compile ce fichier et
 * l'importe (importScripts) dans le sw.js généré. On y ajoute la réception
 * des push et le clic sur la notification (deep-link vers l'espace/dashboard).
 */

// Purge des caches TOXIQUES laissés par les défauts next-pwa 5.6 (règles
// 'others'/'apis'/'start-url'… retirées le 2026-08-24 : elles cachaient les
// documents, les navigations RSC et les réponses d'API authentifiées — le
// dashboard de Maude resservait un payload périmé, « une erreur est
// survenue »). Retirer une règle ne vide PAS son cache : on les supprime à
// l'activation, sinon l'espace reste occupé à vie sur chaque appareil.
const CACHES_TOXIQUES = [
  'start-url', 'apis', 'others', 'cross-origin', 'next-data',
  'static-data-assets', 'static-js-assets', 'static-style-assets',
  'static-font-assets', 'static-audio-assets', 'static-video-assets', 'pages',
];
self.addEventListener('activate', (event) => {
  event.waitUntil(Promise.all(CACHES_TOXIQUES.map((nom) => caches.delete(nom).catch(() => {}))));
});

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { /* payload non-JSON */ }

  const title = data.title || 'IziSolo';
  const options = {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { url: data.url || '/' },
    tag: data.tag || undefined,       // regroupe/remplace les notifs de même tag
    renotify: !!data.tag,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsList) => {
      // Si un onglet du portail est déjà ouvert sur la bonne page, on le focus.
      for (const client of clientsList) {
        if (client.url.includes(url) && 'focus' in client) return client.focus();
      }
      // Sinon on ouvre (ou on focus n'importe quel onglet puis navigue).
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});

/**
 * Custom service worker — handlers Web Push.
 *
 * next-pwa (customWorkerDir='worker' par défaut) compile ce fichier et
 * l'importe (importScripts) dans le sw.js généré. On y ajoute la réception
 * des push et le clic sur la notification (deep-link vers l'espace/dashboard).
 */

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

'use client';

/**
 * lib/push-client — helpers navigateur pour le Web Push (côté client).
 * Utilisé par components/push/PushToggle.
 */

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

export function isPushSupported() {
  return typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window
    && !!VAPID_PUBLIC;
}

// iOS n'autorise le push que pour une PWA installée (écran d'accueil).
export function isIosNonInstalled() {
  if (typeof window === 'undefined') return false;
  const iOS = /iP(hone|ad|od)/.test(navigator.userAgent);
  const standalone = window.matchMedia?.('(display-mode: standalone)')?.matches
    || window.navigator.standalone === true;
  return iOS && !standalone;
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

/**
 * Abonnement déjà actif sur cet appareil ?
 * ⚠️ getRegistration(), JAMAIS serviceWorker.ready : ready PEND tant qu'aucun
 * SW n'est actif — c'est ce qui a rendu PushToggle/PushPrompt invisibles
 * pendant 6 semaines (le SW n'était jamais enregistré, cf. RegisterSW.js).
 * getRegistration() répond toujours : pas de SW → pas d'abonnement → le
 * bouton « Activer » se rend, et c'est lui qui dira la vérité.
 */
export async function getExistingSubscription() {
  if (!isPushSupported()) return null;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return null;
    return await reg.pushManager.getSubscription();
  } catch {
    return null;
  }
}

/**
 * Demande la permission + crée l'abonnement + l'enregistre côté serveur.
 * @returns {'granted'|'denied'|'unsupported'|'sw-pending'|'error'}
 *   'sw-pending' = le service worker n'est pas encore ACTIF sur cet appareil :
 *   à la toute première visite, il précache le build entier (30-90 s en prod,
 *   pire en 4G) et subscribe EXIGE un worker actif. Réessayer un peu plus
 *   tard suffit — l'UI doit le DIRE (retour Maude 2026-08-24 : « ça mouline
 *   puis ça revient », l'échec était muet).
 */
export async function enablePush() {
  if (!isPushSupported()) return 'unsupported';
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return 'denied';

    // On SONDE getRegistration() (qui répond toujours) plutôt que d'attendre
    // `ready` (qui pend sans fin, §12) : jusqu'à 30 s pour laisser le premier
    // précache se terminer, puis on avoue 'sw-pending' au lieu d'échouer muet.
    let reg = null;
    const fin = Date.now() + 30000;
    for (;;) {
      reg = await navigator.serviceWorker.getRegistration();
      if (reg?.active) break;
      if (Date.now() > fin) return 'sw-pending';
      await new Promise(r => setTimeout(r, 500));
    }
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
      });
    }

    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: sub.toJSON() }),
    });
    if (!res.ok) return 'error';
    return 'granted';
  } catch (e) {
    console.error('[push-client] enablePush:', e);
    return 'error';
  }
}

/** Désabonne cet appareil (navigateur + serveur). */
export async function disablePush() {
  try {
    const sub = await getExistingSubscription();
    if (sub) {
      const endpoint = sub.endpoint;
      await sub.unsubscribe().catch(() => {});
      await fetch('/api/push/subscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint }),
      }).catch(() => {});
    }
    return true;
  } catch {
    return false;
  }
}

'use client';

/**
 * Filet de sécurité global : si l'URL courante contient un fragment
 * `#access_token=...` (lien Supabase legacy qui pointe vers la racine au
 * lieu de `/auth/callback`), on forward immédiatement vers `/auth/finaliser`
 * en préservant le fragment, pour que la session soit posée et l'user
 * redirigé vers `/onboarding` ou `/dashboard`.
 *
 * Posé dans le RootLayout → s'exécute sur TOUTES les pages, y compris la
 * home publique `/`. Coût quasi nul (un check de hash au mount).
 */

import { useEffect } from 'react';

export default function AuthFragmentCatcher() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const path = window.location.pathname || '';
    // NE PAS intercepter sur les pages d'auth elles-mêmes : /auth/finaliser
    // gère déjà le fragment et connaît le `next` cible. Si le catcher se
    // redéclenchait ici, il écraserait le next (ex: /p/[slug]/espace → /dashboard
    // → /onboarding pour un élève). C'était LA cause du "j'arrive sur création studio".
    if (path.startsWith('/auth/')) return;
    const hash = window.location.hash || '';
    // Heuristique : on intercepte UNIQUEMENT si le fragment ressemble à un
    // retour Supabase Auth (access_token / refresh_token / error_description).
    // Ne pas casser les ancres normales (#section-1, #faq, etc.)
    if (
      hash.includes('access_token=') ||
      hash.includes('refresh_token=') ||
      hash.includes('error_description=')
    ) {
      const params = new URLSearchParams(hash.replace(/^#/, ''));
      const type = params.get('type');
      const path = window.location.pathname || '';
      // CONTEXTE PORTAIL ÉLÈVE : si le fragment arrive sur une page /p/[slug]/...
      // (magic link élève), on doit rester dans le portail et router vers
      // l'espace élève — surtout PAS vers /onboarding (création studio prof).
      let next;
      if (path.startsWith('/p/')) {
        const slug = path.split('/')[2];
        next = slug ? `/p/${slug}/espace` : '/dashboard';
      } else {
        next = type === 'signup' ? '/onboarding' : '/dashboard';
      }
      // On préserve le hash en construisant l'URL nous-mêmes (router.replace
      // efface parfois le fragment). La session est posée sur /auth/finaliser.
      const target = `/auth/finaliser?next=${encodeURIComponent(next)}${hash}`;
      window.location.replace(target);
    }
  }, []);

  return null;
}

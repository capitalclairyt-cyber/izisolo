'use client';

/**
 * Page cliente "fallback fragment URL"
 *
 * Cas d'usage : un lien email Supabase legacy redirige le navigateur sur
 * `https://izisolo.fr/#access_token=xxx&refresh_token=yyy&type=signup`
 * (tokens dans le fragment URL `#`).
 *
 * Le serveur Next.js ne voit jamais le fragment (HTTP standard), donc
 * `/auth/callback` route handler ne peut rien faire. Il nous renvoie ici.
 *
 * Cette page lit `window.location.hash` côté client, pose la session via
 * `supabase.auth.setSession()`, puis redirige vers `next` (ou /dashboard).
 *
 * À terme, mieux vaut éditer les templates email Supabase pour utiliser
 * `?token_hash={{ .TokenHash }}&type=signup` (gestion serveur dans le
 * callback). Cette page reste utile en filet de sécurité.
 */

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Sparkles, Loader2, AlertCircle } from 'lucide-react';

// Next.js 16 : useSearchParams() force le bailout CSR et exige un <Suspense>
// boundary parent, sinon le build de prerendering échoue. On force aussi
// dynamic pour cette page : elle ne doit JAMAIS être servie depuis le cache
// (chaque visite a un fragment / next param différent).
export const dynamic = 'force-dynamic';

export default function FinaliserAuthPageWrapper() {
  return (
    <Suspense fallback={<FinaliserLoading />}>
      <FinaliserAuthPage />
    </Suspense>
  );
}

function FinaliserLoading() {
  return (
    <div className="finaliser-container">
      <div className="finaliser-card">
        <div className="finaliser-icon"><Sparkles size={28} /></div>
        <h1 className="finaliser-title">Connexion en cours…</h1>
        <p className="finaliser-text">On finalise ton authentification, un instant.</p>
        <div className="finaliser-loader"><Loader2 size={20} className="spin" /></div>
      </div>
      <FinaliserStyles />
    </div>
  );
}

// Empêche les open redirects : `next` doit être une URL relative interne.
// Bloque //evil.com, /\evil.com, et toute valeur qui n'est pas relative.
function safeNext(raw) {
  if (!raw || !raw.startsWith('/')) return '/dashboard';
  if (raw.startsWith('//') || raw.startsWith('/\\')) return '/dashboard';
  if (/[\x00-\x1f\x7f]/.test(raw)) return '/dashboard';
  return raw;
}

function FinaliserAuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const next = safeNext(searchParams.get('next'));

      // Lire le fragment URL : #access_token=...&refresh_token=...&type=signup
      // Le hash commence par '#', on l'enlève puis on parse comme query string.
      const hash = (typeof window !== 'undefined' ? window.location.hash : '').replace(/^#/, '');

      if (!hash) {
        setError("Lien d'authentification invalide ou expiré.");
        setTimeout(() => router.push('/login'), 2500);
        return;
      }

      const params = new URLSearchParams(hash);
      const accessToken  = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      const type         = params.get('type'); // signup | recovery | magiclink | invite
      const errorDesc    = params.get('error_description');

      if (errorDesc) {
        setError(decodeURIComponent(errorDesc.replace(/\+/g, ' ')));
        setTimeout(() => router.push('/login'), 3500);
        return;
      }

      if (!accessToken || !refreshToken) {
        setError("Lien d'authentification incomplet.");
        setTimeout(() => router.push('/login'), 2500);
        return;
      }

      // Établir la session côté client → Supabase écrit les cookies via @supabase/ssr
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (sessionError) {
        setError(sessionError.message);
        setTimeout(() => router.push('/login'), 3000);
        return;
      }

      // Reset password → page dédiée
      if (type === 'recovery') {
        router.replace('/nouveau-mot-de-passe');
        return;
      }

      // Sinon redirection vers la cible (par défaut /onboarding pour signup,
      // /dashboard sinon — géré par le param `next`)
      router.replace(next);
      router.refresh();
    })();
  }, []);

  return (
    <div className="finaliser-container">
      <div className="finaliser-card">
        <div className="finaliser-icon">
          {error ? <AlertCircle size={28} /> : <Sparkles size={28} />}
        </div>
        <h1 className="finaliser-title">
          {error ? 'Oups...' : 'Connexion en cours…'}
        </h1>
        <p className="finaliser-text">
          {error || 'On finalise ton authentification, un instant.'}
        </p>
        {!error && (
          <div className="finaliser-loader">
            <Loader2 size={20} className="spin" />
          </div>
        )}
      </div>

      <FinaliserStyles />
    </div>
  );
}

function FinaliserStyles() {
  return (
    <style jsx global>{`
      .finaliser-container {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        background: var(--bg-page);
      }
      .finaliser-card {
        width: 100%;
        max-width: 420px;
        background: var(--bg-card);
        border-radius: var(--radius-xl);
        box-shadow: var(--shadow-lg);
        padding: 40px 32px;
        text-align: center;
      }
      .finaliser-icon {
        width: 64px; height: 64px; border-radius: 50%;
        background: var(--brand-light);
        color: var(--brand);
        display: flex; align-items: center; justify-content: center;
        margin: 0 auto 16px;
      }
      .finaliser-title {
        font-size: 1.25rem; font-weight: 700;
        color: var(--text-primary);
        margin: 0 0 8px;
      }
      .finaliser-text {
        color: var(--text-secondary);
        font-size: 0.9375rem;
        margin: 0 0 20px;
        line-height: 1.5;
      }
      .finaliser-loader {
        display: flex; justify-content: center;
        color: var(--brand);
      }
      .spin { animation: spin 1s linear infinite; }
      @keyframes spin { to { transform: rotate(360deg); } }
    `}</style>
  );
}

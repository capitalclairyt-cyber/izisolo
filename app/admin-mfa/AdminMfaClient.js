'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

/**
 * Challenge TOTP admin : la session est valide (aal1) mais le compte a activé
 * la double authentification → on demande le code à 6 chiffres avant de
 * laisser entrer dans /admin. La vérification écrit une session aal2 dans les
 * cookies (createBrowserClient @supabase/ssr) : le layout admin serveur la
 * voit au refresh suivant.
 */
export default function AdminMfaClient() {
  const router = useRouter();
  const supabaseRef = useRef(null);
  if (!supabaseRef.current) supabaseRef.current = createClient();
  const supabase = supabaseRef.current;

  const [factorId, setFactorId] = useState(null);
  const [challengeId, setChallengeId] = useState(null);
  const [code, setCode] = useState('');
  const [erreur, setErreur] = useState('');
  const [etat, setEtat] = useState('chargement'); // chargement | pret | verif

  useEffect(() => {
    let annule = false;
    (async () => {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (annule) return;
      const facteur = data?.totp?.[0];
      if (error || !facteur) {
        // Rien à challenger (facteur retiré entre-temps ?) : retour à l'admin,
        // son layout tranchera.
        router.replace('/admin');
        return;
      }
      setFactorId(facteur.id);
      const { data: ch, error: eCh } = await supabase.auth.mfa.challenge({ factorId: facteur.id });
      if (annule) return;
      if (eCh || !ch) {
        setErreur('Impossible de préparer la vérification. Recharge la page.');
        return;
      }
      setChallengeId(ch.id);
      setEtat('pret');
    })();
    return () => { annule = true; };
  }, [supabase, router]);

  const verifier = useCallback(async (e) => {
    e?.preventDefault?.();
    if (!factorId || !challengeId || code.length !== 6) return;
    setEtat('verif');
    setErreur('');
    const { error } = await supabase.auth.mfa.verify({ factorId, challengeId, code });
    if (error) {
      // Un challenge peut être consommé par l'échec : on en reprend un frais.
      const { data: ch } = await supabase.auth.mfa.challenge({ factorId });
      if (ch) setChallengeId(ch.id);
      setErreur('Code invalide ou expiré. Réessaie avec le code affiché maintenant.');
      setCode('');
      setEtat('pret');
      return;
    }
    router.replace('/admin');
    router.refresh();
  }, [supabase, factorId, challengeId, code, router]);

  const deconnexion = useCallback(async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  }, [supabase, router]);

  return (
    <div className="mfa-page">
      <form className="mfa-card" onSubmit={verifier}>
        <div className="mfa-logo">🔐</div>
        <h1>IziSolo Admin</h1>
        <p className="mfa-sub">
          Entre le code à 6 chiffres de ton application d&apos;authentification
          pour ouvrir l&apos;admin.
        </p>
        <input
          className="mfa-input"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={6}
          placeholder="000000"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          disabled={etat !== 'pret'}
          autoFocus
          aria-label="Code de vérification à 6 chiffres"
        />
        {erreur && <p className="mfa-erreur" role="alert">{erreur}</p>}
        <button className="mfa-btn" type="submit" disabled={etat !== 'pret' || code.length !== 6}>
          {etat === 'verif' ? 'Vérification…' : etat === 'chargement' ? 'Chargement…' : 'Vérifier'}
        </button>
        <button className="mfa-logout" type="button" onClick={deconnexion}>
          Se déconnecter
        </button>
      </form>

      <style jsx>{`
        .mfa-page {
          min-height: 100dvh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #1a1612;
          padding: 24px;
        }
        .mfa-card {
          width: 100%;
          max-width: 380px;
          background: #241e18;
          border: 1px solid #3a3028;
          border-radius: 16px;
          padding: 32px 28px;
          text-align: center;
          color: #f5efe8;
        }
        .mfa-logo { font-size: 2rem; margin-bottom: 8px; }
        h1 {
          font-size: 1.25rem;
          font-weight: 600;
          margin: 0 0 6px;
          color: #f5efe8;
        }
        .mfa-sub {
          font-size: 0.875rem;
          color: #b8aa9a;
          margin: 0 0 20px;
          line-height: 1.5;
        }
        .mfa-input {
          width: 100%;
          padding: 12px;
          font-size: 1.5rem;
          letter-spacing: 0.4em;
          text-align: center;
          text-indent: 0.4em;
          border-radius: 10px;
          border: 1px solid #3a3028;
          background: #1a1612;
          color: #f5efe8;
          font-family: var(--font-geist-mono), monospace;
        }
        .mfa-input:focus { outline: 2px solid #c98a4b; border-color: #c98a4b; }
        .mfa-erreur {
          color: #e89090;
          font-size: 0.8125rem;
          margin: 10px 0 0;
        }
        .mfa-btn {
          width: 100%;
          margin-top: 16px;
          padding: 12px;
          border: none;
          border-radius: 10px;
          background: #c98a4b;
          color: #1a1612;
          font-size: 0.9375rem;
          font-weight: 700;
          cursor: pointer;
        }
        .mfa-btn:disabled { opacity: 0.5; cursor: default; }
        .mfa-logout {
          margin-top: 14px;
          background: none;
          border: none;
          color: #8a7d6e;
          font-size: 0.8125rem;
          cursor: pointer;
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}

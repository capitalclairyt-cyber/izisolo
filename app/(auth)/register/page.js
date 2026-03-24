'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Sparkles, Mail, Lock, User } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [prenom, setPrenom] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cguAccepted, setCguAccepted] = useState(false);

  async function handleRegister(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password.length < 6) {
      setError('Le mot de passe doit faire au moins 6 caractères');
      setLoading(false);
      return;
    }

    if (!cguAccepted) {
      setError('Tu dois accepter les CGU et la politique de confidentialité pour continuer');
      setLoading(false);
      return;
    }

    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { prenom },
        emailRedirectTo: `${window.location.origin}/onboarding`,
      },
    });

    if (authError) {
      setError(authError.message === 'User already registered'
        ? 'Cet email est déjà utilisé'
        : 'Erreur lors de l\'inscription');
      setLoading(false);
      return;
    }

    // Si email confirmation requise
    if (data?.user?.identities?.length === 0) {
      setError('Cet email est déjà utilisé');
      setLoading(false);
      return;
    }

    // Rediriger vers l'onboarding
    router.push('/onboarding');
    router.refresh();
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <Sparkles size={28} />
            <h1>IziSolo</h1>
          </div>
          <p className="auth-subtitle">Crée ton studio en 2 minutes</p>
        </div>

        <form onSubmit={handleRegister} className="auth-form">
          {error && <div className="auth-error">{error}</div>}

          <div className="auth-field">
            <label htmlFor="prenom">Ton prénom</label>
            <div className="auth-input-wrapper">
              <User size={18} />
              <input
                id="prenom"
                type="text"
                className="izi-input"
                placeholder="Marie"
                value={prenom}
                onChange={e => setPrenom(e.target.value)}
                required
                autoComplete="given-name"
                style={{ paddingLeft: '44px' }}
              />
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="email">Email</label>
            <div className="auth-input-wrapper">
              <Mail size={18} />
              <input
                id="email"
                type="email"
                className="izi-input"
                placeholder="marie@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                style={{ paddingLeft: '44px' }}
              />
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="password">Mot de passe</label>
            <div className="auth-input-wrapper">
              <Lock size={18} />
              <input
                id="password"
                type="password"
                className="izi-input"
                placeholder="6 caractères minimum"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                style={{ paddingLeft: '44px' }}
              />
            </div>
          </div>

          <label className="cgu-check">
            <input
              type="checkbox"
              checked={cguAccepted}
              onChange={e => setCguAccepted(e.target.checked)}
            />
            <span>
              J'accepte les{' '}
              <Link href="/legal/cgu" target="_blank">CGU</Link>
              {' '}et la{' '}
              <Link href="/legal/rgpd" target="_blank">politique de confidentialité</Link>
            </span>
          </label>

          <button type="submit" className="izi-btn izi-btn-primary auth-submit" disabled={loading || !cguAccepted}>
            {loading ? 'Création...' : 'Créer mon studio'}
          </button>
        </form>

        <div className="auth-footer">
          <p>Déjà un compte ? <Link href="/login">Se connecter</Link></p>
        </div>
      </div>

      <style jsx global>{`
        .auth-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: var(--bg-page);
        }
        .auth-card {
          width: 100%;
          max-width: 420px;
          background: var(--bg-card);
          border-radius: var(--radius-xl);
          box-shadow: var(--shadow-lg);
          padding: 40px 32px;
        }
        .auth-header {
          text-align: center;
          margin-bottom: 32px;
        }
        .auth-logo {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          color: var(--brand);
          margin-bottom: 8px;
        }
        .auth-logo h1 {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--brand-dark);
        }
        .auth-subtitle {
          color: var(--text-secondary);
          font-size: 0.9375rem;
        }
        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .auth-field label {
          display: block;
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--text-secondary);
          margin-bottom: 6px;
        }
        .auth-input-wrapper {
          position: relative;
        }
        .auth-input-wrapper > :global(svg:first-child) {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
          pointer-events: none;
        }
        .auth-error {
          background: #fef2f2;
          color: var(--danger);
          padding: 10px 14px;
          border-radius: var(--radius-sm);
          font-size: 0.875rem;
          text-align: center;
        }
        .cgu-check {
          display: flex; align-items: flex-start; gap: 10px;
          font-size: 0.875rem; color: var(--text-secondary);
          cursor: pointer; line-height: 1.4;
        }
        .cgu-check input[type="checkbox"] {
          flex-shrink: 0; width: 16px; height: 16px; margin-top: 2px;
          accent-color: var(--brand);
        }
        .cgu-check a { color: var(--brand); font-weight: 600; text-decoration: none; }
        .cgu-check a:hover { text-decoration: underline; }
        .auth-submit {
          width: 100%;
          margin-top: 4px;
        }
        .auth-footer {
          text-align: center;
          margin-top: 24px;
          font-size: 0.875rem;
          color: var(--text-secondary);
        }
        .auth-footer a {
          color: var(--brand);
          font-weight: 600;
          text-decoration: none;
        }
      `}</style>
    </div>
  );
}

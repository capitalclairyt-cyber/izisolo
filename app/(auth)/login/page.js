'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Sparkles, Mail, Lock, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError('Email ou mot de passe incorrect');
      setLoading(false);
      return;
    }

    router.push(redirect);
    router.refresh();
  }

  async function handleMagicLink() {
    if (!email) {
      setError('Entre ton email pour recevoir un lien de connexion');
      return;
    }
    setLoading(true);
    setError('');

    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}${redirect}` },
    });

    if (authError) {
      setError('Erreur lors de l\'envoi du lien');
      setLoading(false);
      return;
    }

    setError('');
    alert('Un lien de connexion a été envoyé à ton adresse email !');
    setLoading(false);
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <Sparkles size={28} />
            <h1>IziSolo</h1>
          </div>
          <p className="auth-subtitle">Content de te revoir !</p>
        </div>

        <form onSubmit={handleLogin} className="auth-form">
          {error && <div className="auth-error">{error}</div>}

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
                type={showPassword ? 'text' : 'password'}
                className="izi-input"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                style={{ paddingLeft: '44px', paddingRight: '44px' }}
              />
              <button
                type="button"
                className="auth-eye"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="auth-pwd-row">
            <button type="submit" className="izi-btn izi-btn-primary auth-submit" disabled={loading}>
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
            <Link href="/mot-de-passe-oublie" className="auth-forgot">
              Mot de passe oublié ?
            </Link>
          </div>

          <button
            type="button"
            className="izi-btn izi-btn-ghost auth-magic"
            onClick={handleMagicLink}
            disabled={loading}
          >
            Recevoir un lien par email
          </button>
        </form>

        <div className="auth-footer">
          <p>Pas encore de compte ? <Link href="/register">Créer mon studio</Link></p>
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
        .auth-eye {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 4px;
        }
        .auth-error {
          background: #fef2f2;
          color: var(--danger);
          padding: 10px 14px;
          border-radius: var(--radius-sm);
          font-size: 0.875rem;
          text-align: center;
        }
        .auth-pwd-row {
          display: flex; flex-direction: column; gap: 8px; align-items: center;
        }
        .auth-submit {
          width: 100%;
          margin-top: 4px;
        }
        .auth-forgot {
          font-size: 0.8125rem; color: var(--text-muted);
          text-decoration: none; transition: color 0.15s;
        }
        .auth-forgot:hover { color: var(--brand); text-decoration: underline; }
        .auth-magic {
          width: 100%;
          font-size: 0.875rem;
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
        .auth-footer a:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}

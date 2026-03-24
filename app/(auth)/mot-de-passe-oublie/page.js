'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail, CheckCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase';

export default function MotDePasseOubliePage() {
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    try {
      const supabase = createClient();
      const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
      });
      if (err) throw err;
      setSent(true);
    } catch (err) {
      setError('Impossible d\'envoyer l\'email. Vérifie l\'adresse saisie.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link href="/login" className="auth-back">
          <ArrowLeft size={18} /> Retour
        </Link>

        {sent ? (
          <div className="auth-success">
            <CheckCircle size={40} className="success-icon" />
            <h1>Email envoyé !</h1>
            <p>
              Un lien de réinitialisation a été envoyé à <strong>{email}</strong>.
              Vérifie aussi tes spams.
            </p>
            <Link href="/login" className="auth-btn-primary">Retour à la connexion</Link>
          </div>
        ) : (
          <>
            <div className="auth-header">
              <div className="auth-logo">🔑</div>
              <h1>Mot de passe oublié</h1>
              <p>Saisis ton adresse e-mail pour recevoir un lien de réinitialisation.</p>
            </div>

            <form onSubmit={handleSubmit} className="auth-form">
              {error && <div className="auth-error">{error}</div>}
              <div className="auth-field">
                <label>Adresse e-mail</label>
                <div className="auth-input-wrap">
                  <Mail size={16} className="auth-input-icon" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="ton@email.com"
                    required
                    autoFocus
                  />
                </div>
              </div>
              <button type="submit" className="auth-btn-primary" disabled={loading || !email.trim()}>
                {loading ? 'Envoi…' : 'Envoyer le lien'}
              </button>
            </form>
          </>
        )}
      </div>

      <style jsx global>{`
        .auth-page {
          min-height: 100dvh; display: flex;
          align-items: center; justify-content: center;
          background: #faf8f5; padding: 24px;
        }
        .auth-card {
          background: white; border-radius: 20px;
          padding: 32px 28px; width: 100%; max-width: 380px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.07);
          display: flex; flex-direction: column; gap: 24px;
        }
        .auth-back {
          display: inline-flex; align-items: center; gap: 6px;
          color: #888; text-decoration: none; font-size: 0.875rem;
          font-weight: 500; transition: color 0.15s;
        }
        .auth-back:hover { color: #d4a0a0; }
        .auth-header { text-align: center; }
        .auth-logo { font-size: 2.5rem; margin-bottom: 12px; }
        .auth-header h1 { font-size: 1.25rem; font-weight: 700; color: #1a1a2e; margin: 0 0 8px; }
        .auth-header p { color: #666; font-size: 0.9rem; line-height: 1.5; }
        .auth-form { display: flex; flex-direction: column; gap: 16px; }
        .auth-error {
          background: #fef2f2; border: 1px solid #fecaca;
          color: #dc2626; border-radius: 10px; padding: 10px 14px;
          font-size: 0.875rem;
        }
        .auth-field { display: flex; flex-direction: column; gap: 6px; }
        .auth-field label { font-size: 0.8125rem; font-weight: 600; color: #555; }
        .auth-input-wrap {
          position: relative; display: flex; align-items: center;
        }
        .auth-input-icon {
          position: absolute; left: 12px; color: #aaa; pointer-events: none;
        }
        .auth-input-wrap input {
          width: 100%; padding: 11px 14px 11px 36px;
          border: 1.5px solid #e5e5e5; border-radius: 10px;
          font-size: 0.9375rem; outline: none; transition: border-color 0.15s;
        }
        .auth-input-wrap input:focus { border-color: #d4a0a0; }
        .auth-btn-primary {
          display: block; width: 100%; padding: 13px;
          background: #d4a0a0; color: white; border: none;
          border-radius: 12px; font-size: 0.9375rem; font-weight: 600;
          cursor: pointer; text-align: center; text-decoration: none;
          transition: background 0.15s;
        }
        .auth-btn-primary:hover:not(:disabled) { background: #c08080; }
        .auth-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
        .auth-success {
          text-align: center; display: flex; flex-direction: column;
          align-items: center; gap: 14px;
        }
        .success-icon { color: #22c55e; }
        .auth-success h1 { font-size: 1.25rem; font-weight: 700; color: #1a1a2e; }
        .auth-success p { color: #666; font-size: 0.9rem; line-height: 1.5; }
      `}</style>
    </div>
  );
}

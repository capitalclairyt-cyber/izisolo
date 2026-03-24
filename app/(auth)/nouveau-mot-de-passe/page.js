'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Lock, CheckCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase';

export default function NouveauMotDePassePage() {
  const router = useRouter();
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [showPwd, setShowPwd]     = useState(false);
  const [loading, setLoading]     = useState(false);
  const [done, setDone]           = useState(false);
  const [error, setError]         = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 6) { setError('Le mot de passe doit faire au moins 6 caractères.'); return; }
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas.'); return; }
    setLoading(true);
    setError('');
    try {
      const supabase = createClient();
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) throw err;
      setDone(true);
      setTimeout(() => router.push('/dashboard'), 2500);
    } catch (err) {
      setError(err.message || 'Erreur lors de la mise à jour.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        {done ? (
          <div className="auth-success">
            <CheckCircle size={40} className="success-icon" />
            <h1>Mot de passe mis à jour !</h1>
            <p>Tu vas être redirigé vers ton tableau de bord…</p>
          </div>
        ) : (
          <>
            <div className="auth-header">
              <div className="auth-logo">🔒</div>
              <h1>Nouveau mot de passe</h1>
              <p>Choisis un nouveau mot de passe sécurisé.</p>
            </div>

            <form onSubmit={handleSubmit} className="auth-form">
              {error && <div className="auth-error">{error}</div>}

              <div className="auth-field">
                <label>Nouveau mot de passe</label>
                <div className="auth-input-wrap">
                  <Lock size={16} className="auth-input-icon" />
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="6 caractères minimum"
                    required autoFocus
                  />
                  <button type="button" className="auth-eye" onClick={() => setShowPwd(s => !s)}>
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="auth-field">
                <label>Confirmer le mot de passe</label>
                <div className="auth-input-wrap">
                  <Lock size={16} className="auth-input-icon" />
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Répète ton mot de passe"
                    required
                  />
                </div>
              </div>

              <button type="submit" className="auth-btn-primary" disabled={loading || !password || !confirm}>
                {loading ? 'Mise à jour…' : 'Enregistrer le mot de passe'}
              </button>
            </form>
          </>
        )}
      </div>

      <style jsx global>{`
        .auth-page { min-height: 100dvh; display: flex; align-items: center; justify-content: center; background: #faf8f5; padding: 24px; }
        .auth-card { background: white; border-radius: 20px; padding: 32px 28px; width: 100%; max-width: 380px; box-shadow: 0 4px 24px rgba(0,0,0,0.07); display: flex; flex-direction: column; gap: 24px; }
        .auth-header { text-align: center; }
        .auth-logo { font-size: 2.5rem; margin-bottom: 12px; }
        .auth-header h1 { font-size: 1.25rem; font-weight: 700; color: #1a1a2e; margin: 0 0 8px; }
        .auth-header p { color: #666; font-size: 0.9rem; }
        .auth-form { display: flex; flex-direction: column; gap: 16px; }
        .auth-error { background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; border-radius: 10px; padding: 10px 14px; font-size: 0.875rem; }
        .auth-field { display: flex; flex-direction: column; gap: 6px; }
        .auth-field label { font-size: 0.8125rem; font-weight: 600; color: #555; }
        .auth-input-wrap { position: relative; display: flex; align-items: center; }
        .auth-input-icon { position: absolute; left: 12px; color: #aaa; pointer-events: none; }
        .auth-input-wrap input { width: 100%; padding: 11px 40px 11px 36px; border: 1.5px solid #e5e5e5; border-radius: 10px; font-size: 0.9375rem; outline: none; transition: border-color 0.15s; }
        .auth-input-wrap input:focus { border-color: #d4a0a0; }
        .auth-eye { position: absolute; right: 10px; background: none; border: none; cursor: pointer; color: #aaa; padding: 4px; }
        .auth-btn-primary { display: block; width: 100%; padding: 13px; background: #d4a0a0; color: white; border: none; border-radius: 12px; font-size: 0.9375rem; font-weight: 600; cursor: pointer; transition: background 0.15s; }
        .auth-btn-primary:hover:not(:disabled) { background: #c08080; }
        .auth-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
        .auth-success { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 14px; }
        .success-icon { color: #22c55e; }
        .auth-success h1 { font-size: 1.25rem; font-weight: 700; color: #1a1a2e; }
        .auth-success p { color: #666; font-size: 0.9rem; }
      `}</style>
    </div>
  );
}

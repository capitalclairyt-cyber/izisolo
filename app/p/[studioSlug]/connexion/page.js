'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Mail, ArrowLeft, CheckCircle, Loader } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function ConnexionPortailPage() {
  const { studioSlug } = useParams();
  const [email, setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent]     = useState(false);
  const [error, setError]   = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    try {
      const redirectTo = `${window.location.origin}/auth/callback?next=/p/${studioSlug}/espace`;
      const { error: authError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: redirectTo },
      });
      if (authError) throw authError;
      setSent(true);
    } catch {
      setError('Une erreur est survenue. Réessaie dans quelques instants.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div>
        <Link href={`/p/${studioSlug}`} className="portail-back-link">
          <ArrowLeft size={15} /> Retour aux cours
        </Link>
        <div className="portail-card" style={{ textAlign: 'center', padding: '40px 24px' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#f0faf0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <CheckCircle size={30} style={{ color: '#4caf50' }} />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 10px', color: '#1a1a2e' }}>Vérifie ta boîte mail !</h2>
          <p style={{ color: '#666', margin: '0 0 20px', lineHeight: 1.6, fontSize: '0.9375rem' }}>
            On a envoyé un lien de connexion à<br />
            <strong style={{ color: '#1a1a2e' }}>{email}</strong>
          </p>
          <p style={{ color: '#aaa', fontSize: '0.8125rem', margin: '0 0 28px', lineHeight: 1.5 }}>
            Clique sur le lien dans l'email pour accéder à ton espace.<br />
            Le lien expire dans 1 heure. Vérifie tes spams si besoin.
          </p>
          <button
            onClick={() => { setSent(false); setEmail(''); }}
            className="portail-btn-ghost"
            style={{ maxWidth: 240, margin: '0 auto' }}
          >
            Changer d'adresse email
          </button>
        </div>
        <style jsx global>{`
          .portail-back-link { display: inline-flex; align-items: center; gap: 6px; color: #888; font-size: 0.875rem; text-decoration: none; margin-bottom: 20px; }
          .portail-back-link:hover { color: #d4a0a0; }
        `}</style>
      </div>
    );
  }

  return (
    <div>
      <Link href={`/p/${studioSlug}`} className="portail-back-link">
        <ArrowLeft size={15} /> Retour aux cours
      </Link>

      <div className="portail-card">
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🔑</div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 6px', color: '#1a1a2e' }}>Mon espace élève</h1>
          <p style={{ color: '#888', fontSize: '0.875rem', margin: 0, lineHeight: 1.5 }}>
            Connecte-toi pour voir tes réservations<br />et gérer tes inscriptions.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="portail-field">
            <label className="portail-label">Ton adresse email</label>
            <input
              type="email"
              className="portail-input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="marie@exemple.fr"
              required
              autoComplete="email"
              autoFocus
            />
          </div>

          {error && (
            <div style={{ background: '#fff0f0', border: '1px solid #ffcdd2', borderRadius: '8px', padding: '10px 14px', color: '#c62828', fontSize: '0.875rem', marginBottom: '14px' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !email.trim()}
            className="portail-btn-primary"
          >
            {loading ? <Loader size={16} className="spin" /> : <Mail size={16} />}
            {loading ? 'Envoi en cours…' : 'Recevoir mon lien de connexion'}
          </button>

          <p style={{ textAlign: 'center', fontSize: '0.8125rem', color: '#aaa', margin: '14px 0 0', lineHeight: 1.5 }}>
            Un lien magique sera envoyé à ton adresse.<br />
            Pas besoin de mot de passe.
          </p>
        </form>
      </div>

      <style jsx global>{`
        .portail-back-link { display: inline-flex; align-items: center; gap: 6px; color: #888; font-size: 0.875rem; text-decoration: none; margin-bottom: 20px; }
        .portail-back-link:hover { color: #d4a0a0; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin { animation: spin 0.8s linear infinite; }
      `}</style>
    </div>
  );
}

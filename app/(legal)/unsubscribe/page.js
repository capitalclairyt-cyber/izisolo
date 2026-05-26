'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function UnsubscribeForm() {
  const searchParams = useSearchParams();
  const prefillEmail = searchParams.get('email') || '';
  const errorParam = searchParams.get('error');

  const [email, setEmail] = useState(prefillEmail);
  const [status, setStatus] = useState(errorParam ? 'error' : 'idle'); // idle | loading | done | error
  const [errorMsg, setErrorMsg] = useState(
    errorParam === 'invalid'
      ? 'L\'adresse email n\'est pas valide.'
      : errorParam === 'server'
        ? 'Une erreur est survenue. Réessaie dans quelques instants.'
        : ''
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();

    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setStatus('error');
      setErrorMsg('Merci d\'entrer une adresse email valide.');
      return;
    }

    setStatus('loading');
    setErrorMsg('');

    try {
      const res = await fetch('/api/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Erreur');
      }

      setStatus('done');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err.message || 'Une erreur est survenue.');
    }
  };

  if (status === 'done') {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: '#e8f5e9', display: 'flex', alignItems: 'center',
          justifyContent: 'center', margin: '0 auto 24px', fontSize: '2rem',
        }}>
          ✓
        </div>
        <h1 style={{ fontSize: '1.5rem', marginBottom: 12 }}>
          C'est noté !
        </h1>
        <p style={{ color: '#666', lineHeight: 1.7, maxWidth: 440, margin: '0 auto' }}>
          Tu ne recevras plus de messages de notre part.
          Si c'est une erreur, tu peux nous écrire
          à <a href="mailto:bonjour@izisolo.fr" style={{ color: '#d4a0a0' }}>bonjour@izisolo.fr</a>.
        </p>
        <div style={{ marginTop: 32 }}>
          <Link
            href="https://www.izisolo.fr"
            style={{
              display: 'inline-block', padding: '10px 24px',
              background: '#d4a0a0', color: 'white', borderRadius: 8,
              textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem',
            }}
          >
            Retour sur izisolo.fr
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <h1 style={{ fontSize: '1.5rem', textAlign: 'center', marginBottom: 8 }}>
        Désinscription
      </h1>
      <p style={{
        textAlign: 'center', color: '#666', lineHeight: 1.7,
        maxWidth: 480, margin: '0 auto 32px',
      }}>
        Tu ne souhaites plus recevoir nos messages ? On comprend.
        Confirme ton adresse email ci-dessous et tu ne recevras plus rien de notre part.
      </p>

      <form onSubmit={handleSubmit} style={{
        maxWidth: 400, margin: '0 auto',
        display: 'flex', flexDirection: 'column', gap: 16,
      }}>
        <div>
          <label
            htmlFor="unsub-email"
            style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: '0.9rem' }}
          >
            Ton adresse email
          </label>
          <input
            id="unsub-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ton@email.fr"
            required
            autoComplete="email"
            style={{
              width: '100%', padding: '10px 14px', fontSize: '1rem',
              border: '1px solid #ddd', borderRadius: 8,
              outline: 'none', transition: 'border-color 0.15s',
            }}
            onFocus={(e) => e.target.style.borderColor = '#d4a0a0'}
            onBlur={(e) => e.target.style.borderColor = '#ddd'}
          />
        </div>

        {status === 'error' && errorMsg && (
          <p style={{
            color: '#dc2626', fontSize: '0.875rem',
            margin: 0, padding: '8px 12px',
            background: '#fef2f2', borderRadius: 6,
          }}>
            {errorMsg}
          </p>
        )}

        <button
          type="submit"
          disabled={status === 'loading'}
          style={{
            padding: '10px 24px', fontSize: '0.95rem',
            background: status === 'loading' ? '#ccc' : '#d4a0a0',
            color: 'white', border: 'none', borderRadius: 8,
            cursor: status === 'loading' ? 'wait' : 'pointer',
            fontWeight: 600, transition: 'background 0.15s',
          }}
        >
          {status === 'loading' ? 'En cours...' : 'Me désinscrire'}
        </button>
      </form>

      <p style={{
        textAlign: 'center', color: '#999', fontSize: '0.8rem',
        marginTop: 40, lineHeight: 1.6,
      }}>
        Tu peux aussi nous écrire directement
        à <a href="mailto:bonjour@izisolo.fr" style={{ color: '#d4a0a0' }}>bonjour@izisolo.fr</a> pour
        exercer tes droits (accès, rectification, suppression) conformément au RGPD.
      </p>
    </>
  );
}

export default function UnsubscribePage() {
  return (
    <div className="legal-content">
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <Link
          href="/"
          style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#d4a0a0',
            textDecoration: 'none',
          }}
        >
          IziSolo
        </Link>
      </div>

      <Suspense fallback={
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#888' }}>
          Chargement...
        </div>
      }>
        <UnsubscribeForm />
      </Suspense>

      <div style={{
        textAlign: 'center', marginTop: 48, paddingTop: 24,
        borderTop: '1px solid #eee', fontSize: '0.8rem', color: '#aaa',
      }}>
        <p>
          Atelier Mélusine — SASU au capital de 1 000 € — SIREN 889 060 901<br />
          146 Rue Elsa Triolet, 38260 La Côte-Saint-André
        </p>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { User } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function PortailLayoutClient({ studioSlug, children }) {
  const [prenom, setPrenom] = useState(null); // null = chargement en cours

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        // Récupérer le prénom du client dans ce studio
        supabase
          .from('profiles')
          .select('id')
          .eq('studio_slug', studioSlug)
          .single()
          .then(({ data: profile }) => {
            if (!profile) { setPrenom(''); return; }
            supabase
              .from('clients')
              .select('prenom')
              .eq('profile_id', profile.id)
              .ilike('email', session.user.email)
              .single()
              .then(({ data: client }) => {
                setPrenom(client?.prenom || session.user.email.split('@')[0]);
              });
          });
      } else {
        setPrenom('');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) setPrenom('');
    });
    return () => subscription.unsubscribe();
  }, [studioSlug]);

  return (
    <div className="portail-layout">
      <header className="portail-header">
        <Link href={`/p/${studioSlug}`} className="portail-logo-link">
          🌿 <span className="portail-logo-text">IziSolo</span>
        </Link>
        <div className="portail-header-actions">
          {prenom ? (
            <Link href={`/p/${studioSlug}/espace`} className="portail-espace-btn portail-espace-btn--connected">
              <User size={13} /> {prenom}
            </Link>
          ) : (
            <Link href={`/p/${studioSlug}/espace`} className="portail-espace-btn">
              Mon espace
            </Link>
          )}
        </div>
      </header>

      <main className="portail-main">
        {children}
      </main>

      <footer className="portail-footer">
        <span>Propulsé par <a href="https://izisolo.app" target="_blank" rel="noopener noreferrer">IziSolo</a></span>
        <span className="portail-footer-sep">·</span>
        <a href="/legal/cgu">CGU</a>
        <span className="portail-footer-sep">·</span>
        <a href="/legal/rgpd">Confidentialité</a>
      </footer>

      <style jsx global>{`
        * { box-sizing: border-box; }
        body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #faf8f5; color: #1a1a2e; }
        .portail-layout { min-height: 100dvh; display: flex; flex-direction: column; }
        .portail-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 20px; background: white; border-bottom: 1px solid #f0ebe8;
          position: sticky; top: 0; z-index: 10;
        }
        .portail-logo-link { display: flex; align-items: center; gap: 6px; text-decoration: none; font-weight: 700; font-size: 1rem; color: #1a1a2e; }
        .portail-logo-text { color: #d4a0a0; }
        .portail-espace-btn {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 0.875rem; font-weight: 600; padding: 7px 16px;
          background: #d4a0a0; color: white; border-radius: 99px;
          text-decoration: none; transition: background 0.15s;
        }
        .portail-espace-btn:hover { background: #c08080; }
        .portail-espace-btn--connected {
          background: white; color: #d4a0a0;
          border: 1.5px solid #d4a0a0;
        }
        .portail-espace-btn--connected:hover { background: #fce8e8; }
        .portail-main { flex: 1; max-width: 680px; margin: 0 auto; width: 100%; padding: 24px 16px 48px; }
        .portail-footer {
          text-align: center; padding: 20px; border-top: 1px solid #f0ebe8;
          background: white; font-size: 0.8125rem; color: #888; display: flex;
          justify-content: center; align-items: center; gap: 10px; flex-wrap: wrap;
        }
        .portail-footer a { color: #d4a0a0; text-decoration: none; }
        .portail-footer-sep { color: #ddd; }

        /* Composants communs portail */
        .portail-card {
          background: white; border-radius: 16px; padding: 20px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.06); margin-bottom: 12px;
        }
        .portail-btn-primary {
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          padding: 13px 24px; background: #d4a0a0; color: white; border: none;
          border-radius: 12px; font-weight: 600; font-size: 0.9375rem;
          cursor: pointer; transition: background 0.15s; text-decoration: none; width: 100%;
        }
        .portail-btn-primary:hover:not(:disabled) { background: #c08080; }
        .portail-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
        .portail-btn-ghost {
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          padding: 11px 20px; background: transparent; color: #888;
          border: 1.5px solid #e5e5e5; border-radius: 12px;
          font-weight: 500; font-size: 0.9rem; cursor: pointer; transition: all 0.15s;
          text-decoration: none; width: 100%;
        }
        .portail-btn-ghost:hover { border-color: #d4a0a0; color: #d4a0a0; }
        .portail-input {
          width: 100%; padding: 12px 14px; border: 1.5px solid #e8e0db; border-radius: 10px;
          font-size: 1rem; outline: none; transition: border-color 0.15s; box-sizing: border-box;
          background: white;
        }
        .portail-input:focus { border-color: #d4a0a0; }
        .portail-label { font-size: 0.875rem; font-weight: 600; color: #555; margin-bottom: 6px; display: block; }
        .portail-field { margin-bottom: 14px; }
        .portail-tag {
          display: inline-block; padding: 3px 10px; border-radius: 99px;
          font-size: 0.75rem; font-weight: 600;
        }
        .portail-tag-rose { background: #fce8e8; color: #c06060; }
        .portail-tag-green { background: #e8f5e9; color: #2e7d32; }
        .portail-tag-amber { background: #fff8e1; color: #f57f17; }
        .portail-tag-blue { background: #e3f2fd; color: #1565c0; }
      `}</style>
    </div>
  );
}

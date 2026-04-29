'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { User, MessageCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { ToastProvider } from '@/components/ui/ToastProvider';
import BottomNav from '@/components/portail/BottomNav';

export default function PortailLayoutClient({ studioSlug, children }) {
  return (
    <ToastProvider>
      <PortailLayoutInner studioSlug={studioSlug}>{children}</PortailLayoutInner>
    </ToastProvider>
  );
}

function PortailLayoutInner({ studioSlug, children }) {
  const [prenom, setPrenom] = useState(null); // null = chargement en cours
  const [unread, setUnread] = useState(0);

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
      if (!session) { setPrenom(''); setUnread(0); }
    });
    return () => subscription.unsubscribe();
  }, [studioSlug]);

  // Polling unread messages count (every 30s) — uniquement si connecté
  useEffect(() => {
    if (!prenom) return;
    let cancelled = false;
    const fetchUnread = async () => {
      try {
        const res = await fetch('/api/messagerie/unread');
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled) setUnread(json.count || 0);
      } catch { /* ignore */ }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [prenom]);

  return (
    <div className="portail-layout">
      <header className="portail-header">
        <Link href={`/p/${studioSlug}`} className="portail-logo-link">
          🌿 <span className="portail-logo-text">IziSolo</span>
        </Link>
        <div className="portail-header-actions">
          {prenom && (
            <Link
              href={`/p/${studioSlug}/espace/messages`}
              className="portail-msg-icon"
              aria-label={unread > 0 ? `Messages (${unread} non lus)` : 'Messages'}
              title="Mes messages"
            >
              <MessageCircle size={18} />
              {unread > 0 && (
                <span className="portail-msg-badge">{unread > 9 ? '9+' : unread}</span>
              )}
            </Link>
          )}
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

      {/* BottomNav fixe (élève connecté, mobile uniquement) */}
      {prenom && (
        <BottomNav studioSlug={studioSlug} unread={unread} />
      )}

      <footer className="portail-footer">
        <span>Propulsé par <a href="https://izisolo.fr" target="_blank" rel="noopener noreferrer">IziSolo</a></span>
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
        .portail-header-actions { display: flex; align-items: center; gap: 8px; }
        .portail-msg-icon {
          position: relative;
          display: inline-flex; align-items: center; justify-content: center;
          width: 36px; height: 36px; border-radius: 50%;
          color: #666; background: white; border: 1px solid #e8e0db;
          text-decoration: none; transition: all 0.15s;
        }
        .portail-msg-icon:hover { color: #d4a0a0; border-color: #d4a0a0; }
        .portail-msg-badge {
          position: absolute; top: -3px; right: -3px;
          min-width: 16px; height: 16px; padding: 0 4px;
          background: #dc2626; color: white;
          border-radius: 99px; border: 2px solid white;
          font-size: 0.625rem; font-weight: 700; line-height: 1;
          display: inline-flex; align-items: center; justify-content: center;
        }
        .portail-main { flex: 1; max-width: 680px; margin: 0 auto; width: 100%; padding: 24px 16px 48px; }
        /* Mobile : padding-bottom pour ne pas masquer le contenu sous le BottomNav (~90px) */
        @media (max-width: 768px) {
          .portail-main { padding-bottom: 100px; }
        }
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

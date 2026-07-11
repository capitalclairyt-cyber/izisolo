'use client';

import { useState, useEffect } from 'react';
import { Bell, X, Share } from 'lucide-react';
import { isPushSupported, isIosNonInstalled, getExistingSubscription, enablePush } from '@/lib/push-client';

/**
 * PushPrompt — bannière d'incitation à activer les notifications.
 * S'affiche tant que le push n'est pas activé (et pas déjà refusé/masqué).
 * Sur iOS non installé : explique comment ajouter à l'écran d'accueil (seul
 * moyen d'avoir le push sur iPhone). Se masque après activation ou « plus tard ».
 *
 * @param {'eleve'|'prof'} audience  adapte le texte
 */
const DISMISS_KEY = 'izi_push_prompt_dismissed_v1';

export default function PushPrompt({ audience = 'eleve' }) {
  const [state, setState] = useState('hidden'); // hidden | ask | ios | busy
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem(DISMISS_KEY) === '1') return;
    setDismissed(false);
    (async () => {
      if (isIosNonInstalled()) { setState('ios'); return; }
      if (!isPushSupported()) return;                       // canal indispo → rien
      if (typeof Notification !== 'undefined' && Notification.permission === 'denied') return;
      const sub = await getExistingSubscription();
      if (!sub) setState('ask');                            // pas encore abonné → on invite
    })();
  }, []);

  if (dismissed || state === 'hidden') return null;

  const hide = () => {
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch {}
    setDismissed(true);
  };

  const activer = async () => {
    setState('busy');
    const res = await enablePush();
    if (res === 'granted') { try { localStorage.setItem(DISMISS_KEY, '1'); } catch {} setDismissed(true); }
    else setState('ask');
  };

  const valeur = audience === 'prof'
    ? 'Sois prévenu·e dès qu\'un·e élève réserve, annule ou t\'écrit — même app fermée.'
    : 'Sois prévenu·e dès qu\'une place se libère ou que ton studio t\'écrit — même app fermée.';

  return (
    <div className="push-prompt">
      <button className="pp-close" onClick={hide} aria-label="Masquer"><X size={15} /></button>
      <div className="pp-icon"><Bell size={18} /></div>
      <div className="pp-body">
        {state === 'ios' ? (
          <>
            <div className="pp-title">Active les notifications</div>
            <div className="pp-text">
              Sur iPhone, ajoute d'abord ce portail à ton écran d'accueil :
              appuie sur <Share size={13} style={{ verticalAlign: '-2px' }} /> <strong>Partager</strong> →
              <strong> « Sur l'écran d'accueil »</strong>, puis rouvre-le depuis l'icône.
            </div>
          </>
        ) : (
          <>
            <div className="pp-title">Ne rate rien 🔔</div>
            <div className="pp-text">{valeur}</div>
            <div className="pp-actions">
              <button className="pp-btn" onClick={activer} disabled={state === 'busy'}>
                {state === 'busy' ? 'Activation…' : 'Activer les notifications'}
              </button>
              <button className="pp-later" onClick={hide}>Plus tard</button>
            </div>
          </>
        )}
      </div>

      <style jsx>{`
        .push-prompt {
          position: relative; display: flex; gap: 12px;
          background: var(--brand-light, #f7efe6); border: 1px solid var(--brand-200, #e8d3bd);
          border-radius: 14px; padding: 14px 40px 14px 14px; margin-bottom: 16px;
        }
        .pp-close { position: absolute; top: 8px; right: 8px; background: none; border: none; color: var(--text-muted, #999); cursor: pointer; padding: 4px; display: flex; }
        .pp-icon { flex-shrink: 0; width: 34px; height: 34px; border-radius: 50%; background: var(--brand, #B87333); color: white; display: flex; align-items: center; justify-content: center; }
        .pp-body { flex: 1; min-width: 0; }
        .pp-title { font-weight: 700; font-size: 0.9rem; color: var(--text-primary, #1a1a2e); margin-bottom: 2px; }
        .pp-text { font-size: 0.8125rem; color: var(--text-secondary, #6B5D52); line-height: 1.45; }
        .pp-actions { display: flex; gap: 10px; align-items: center; margin-top: 10px; flex-wrap: wrap; }
        .pp-btn { background: var(--brand, #B87333); color: white; border: none; border-radius: 99px; padding: 8px 16px; font-size: 0.8125rem; font-weight: 700; cursor: pointer; font-family: inherit; }
        .pp-btn:disabled { opacity: 0.7; cursor: wait; }
        .pp-later { background: none; border: none; color: var(--text-muted, #999); font-size: 0.8125rem; cursor: pointer; text-decoration: underline; font-family: inherit; }
      `}</style>
    </div>
  );
}

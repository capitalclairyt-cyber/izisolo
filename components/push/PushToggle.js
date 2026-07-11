'use client';

import { useState, useEffect } from 'react';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { isPushSupported, isIosNonInstalled, getExistingSubscription, enablePush, disablePush } from '@/lib/push-client';

/**
 * PushToggle — bouton d'activation des notifications navigateur (Web Push).
 * Réutilisable côté prof (dashboard) et côté élève (espace).
 *
 * @param {string} [variant] 'default' | 'compact' — compact = version texte fine
 */
export default function PushToggle({ variant = 'default' }) {
  const [state, setState] = useState('loading'); // loading|unsupported|ios|default|granted|denied|busy
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    (async () => {
      if (!isPushSupported()) { setState(isIosNonInstalled() ? 'ios' : 'unsupported'); return; }
      if (typeof Notification !== 'undefined' && Notification.permission === 'denied') { setState('denied'); return; }
      const sub = await getExistingSubscription();
      setState(sub ? 'granted' : 'default');
    })();
  }, []);

  if (!mounted || state === 'loading' || state === 'unsupported') return null;

  const handleEnable = async () => {
    setState('busy');
    const res = await enablePush();
    setState(res === 'granted' ? 'granted' : res === 'denied' ? 'denied' : 'default');
  };
  const handleDisable = async () => {
    setState('busy');
    await disablePush();
    setState('default');
  };

  // iOS non installé : on invite à ajouter à l'écran d'accueil.
  if (state === 'ios') {
    return (
      <div className={`push-toggle push-toggle--hint ${variant}`}>
        <Bell size={14} /> Pour être notifié·e, ajoute d'abord ce portail à ton écran d'accueil (Partager → « Sur l'écran d'accueil »).
        <style jsx>{styles}</style>
      </div>
    );
  }
  if (state === 'denied') {
    return (
      <div className={`push-toggle push-toggle--hint ${variant}`}>
        <BellOff size={14} /> Notifications bloquées dans les réglages de ton navigateur.
        <style jsx>{styles}</style>
      </div>
    );
  }

  return (
    <button
      type="button"
      className={`push-toggle ${state === 'granted' ? 'push-toggle--on' : 'push-toggle--off'} ${variant}`}
      onClick={state === 'granted' ? handleDisable : handleEnable}
      disabled={state === 'busy'}
    >
      {state === 'busy' ? <Loader2 size={14} className="push-spin" />
        : state === 'granted' ? <Bell size={14} />
        : <Bell size={14} />}
      {state === 'granted' ? 'Notifications activées' : 'Activer les notifications'}
      <style jsx>{styles}</style>
    </button>
  );
}

const styles = `
  .push-toggle {
    display: inline-flex; align-items: center; gap: 7px;
    font-size: 0.8125rem; font-weight: 600;
    border-radius: 99px; padding: 8px 14px;
    cursor: pointer; border: 1px solid var(--border, #e5e0d8);
    background: var(--bg-card, #fff); color: var(--text-secondary, #6B5D52);
    transition: all 0.15s; font-family: inherit; line-height: 1.3;
  }
  .push-toggle--off:hover { border-color: var(--brand, #B87333); color: var(--brand-700, #8c5826); }
  .push-toggle--on { background: #e9f5ec; border-color: #b7e0c1; color: #2f7a41; }
  .push-toggle--hint {
    cursor: default; background: none; border: none; padding: 6px 0;
    color: var(--text-muted, #999); font-weight: 500; align-items: flex-start;
    text-align: left;
  }
  .push-toggle:disabled { opacity: 0.6; cursor: wait; }
  .push-spin { animation: pushspin 0.8s linear infinite; }
  @keyframes pushspin { to { transform: rotate(360deg); } }
`;

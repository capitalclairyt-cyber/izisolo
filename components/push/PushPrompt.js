'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, X, Share, Smartphone } from 'lucide-react';
import { isPushSupported, isIosNonInstalled, getExistingSubscription, enablePush } from '@/lib/push-client';

/**
 * PushPrompt — bannière « installe l'appli, puis active les notifications ».
 *
 * v2 (2026-07-26, retour d'une élève de Maude : « je dois redemander un lien
 * par email à chaque connexion ») : la mission n°1 devient l'INSTALLATION de
 * la PWA — une icône sur l'écran d'accueil = accès 1-tap SANS repasser par
 * l'email, et la session survit (Safari purge le stockage des sites non
 * visités ~7 j, mais PAS celui des apps installées). Le push (l'ancienne
 * mission unique) passe en n°2, une fois installé — sur iPhone il EXIGE de
 * toute façon l'installation.
 *
 * v3 (2026-08-18, appel Patricia : « je n'arrive pas à installer », demande
 * Colin « l'afficher tant que ce n'est pas installé ») : le « Plus tard » de
 * la mission INSTALLATION n'est plus définitif — simple report de 7 jours
 * (clé SNOOZE horodatée). Tant que l'app n'est pas installée, la bannière
 * revient. Le « Plus tard » du push, lui, reste définitif (harceler pour des
 * notifications est pire que pour une icône). + lien « Comment faire ? » vers
 * le tuto /aide#installer côté prof.
 *
 * Plateformes :
 *  - iOS Safari non installé  → étapes Partager → « Sur l'écran d'accueil »
 *  - Android/desktop Chrome   → vrai bouton « Installer » (beforeinstallprompt)
 *                               ou, si l'événement n'est pas disponible,
 *                               l'astuce menu ⋮ → « Installer l'application »
 *  - déjà installé            → invitation push (comportement historique)
 *
 * @param {'eleve'|'prof'} audience  adapte le texte
 */
const DISMISS_KEY = 'izi_pwa_prompt_v2';        // push : « plus tard » définitif (historique)
const SNOOZE_KEY = 'izi_pwa_install_snooze';    // install : timestamp du dernier report
const SNOOZE_JOURS = 7;

export default function PushPrompt({ audience = 'eleve' }) {
  // hidden | install-ios | install-any | ask | busy
  const [state, setState] = useState('hidden');
  const [dismissed, setDismissed] = useState(true);
  const [installEvent, setInstallEvent] = useState(null);
  const capteurPose = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const installee = window.matchMedia?.('(display-mode: standalone)')?.matches
      || window.navigator.standalone === true;

    if (!installee) {
      // Mission n°1 : installer — re-proposée tant que ce n'est pas fait
      // (le report n'est qu'un snooze de SNOOZE_JOURS, jamais définitif).
      const snooze = parseInt(localStorage.getItem(SNOOZE_KEY) || '0', 10);
      if (snooze && Date.now() - snooze < SNOOZE_JOURS * 24 * 3600 * 1000) return;
      setDismissed(false);
      // Chrome/Edge émettent beforeinstallprompt quand la PWA est installable
      // — on le capture pour offrir un VRAI bouton.
      if (!capteurPose.current) {
        capteurPose.current = true;
        window.addEventListener('beforeinstallprompt', (e) => {
          e.preventDefault();
          setInstallEvent(e);
        });
      }
      setState(isIosNonInstalled() ? 'install-ios' : 'install-any');
      return;
    }

    // Mission n°2 : le push (app déjà installée) — « plus tard » définitif.
    if (localStorage.getItem(DISMISS_KEY) === '1') return;
    setDismissed(false);
    (async () => {
      if (!isPushSupported()) return;
      if (typeof Notification !== 'undefined' && Notification.permission === 'denied') return;
      const sub = await getExistingSubscription();
      if (!sub) setState('ask');
    })();
  }, []);

  if (dismissed || state === 'hidden') return null;

  const estInstallMission = state === 'install-ios' || state === 'install-any';

  const hide = () => {
    try {
      if (estInstallMission) localStorage.setItem(SNOOZE_KEY, String(Date.now()));
      else localStorage.setItem(DISMISS_KEY, '1');
    } catch {}
    setDismissed(true);
  };

  const installer = async () => {
    if (!installEvent) return;
    installEvent.prompt();
    const { outcome } = await installEvent.userChoice.catch(() => ({ outcome: 'dismissed' }));
    if (outcome === 'accepted') hide();
    setInstallEvent(null); // l'événement ne se rejoue pas
  };

  const activer = async () => {
    setState('busy');
    const res = await enablePush();
    if (res === 'granted') { hide(); }
    else setState('ask');
  };

  const pitchInstall = audience === 'prof'
    ? 'Ton studio dans la poche : ouvre IziSolo d\'un tap, sans navigateur, et reste connecté·e.'
    : 'Retrouve tes cours et ton carnet d\'un tap — sans redemander un lien par email : une fois installé, tu restes connecté·e.';

  const pitchPush = audience === 'prof'
    ? 'Sois prévenu·e dès qu\'un·e élève réserve, annule ou t\'écrit — même app fermée.'
    : 'Sois prévenu·e dès qu\'une place se libère ou que ton studio t\'écrit — même app fermée.';

  return (
    <div className="push-prompt">
      <button className="pp-close" onClick={hide} aria-label="Masquer"><X size={15} /></button>
      <div className="pp-icon">{estInstallMission ? <Smartphone size={18} /> : <Bell size={18} />}</div>
      <div className="pp-body">
        {state === 'install-ios' && (
          <>
            <div className="pp-title">Installe {audience === 'prof' ? 'IziSolo' : 'ton espace'} sur ton écran d'accueil</div>
            <div className="pp-text">
              {pitchInstall}<br />
              Appuie sur <Share size={13} style={{ verticalAlign: '-2px' }} /> <strong>Partager</strong> →
              <strong> « Sur l'écran d'accueil »</strong>, puis rouvre depuis l'icône.
              {audience === 'prof' && <> <a className="pp-link" href="/aide#installer">Le pas-à-pas complet →</a></>}
            </div>
          </>
        )}
        {state === 'install-any' && (
          <>
            <div className="pp-title">Installe {audience === 'prof' ? 'IziSolo' : 'ton espace'} sur ton téléphone</div>
            <div className="pp-text">{pitchInstall}</div>
            <div className="pp-actions">
              {installEvent ? (
                <button className="pp-btn" onClick={installer}>Installer l'appli</button>
              ) : (
                <span className="pp-text">Dans ton navigateur : menu <strong>⋮</strong> → <strong>« Installer l'application »</strong>.</span>
              )}
              {audience === 'prof' && <a className="pp-link" href="/aide#installer">Comment faire ?</a>}
              <button className="pp-later" onClick={hide}>Plus tard</button>
            </div>
          </>
        )}
        {(state === 'ask' || state === 'busy') && (
          <>
            <div className="pp-title">Ne rate rien 🔔</div>
            <div className="pp-text">{pitchPush}</div>
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
        .pp-close { position: absolute; top: 8px; right: 8px; background: none; border: none; color: var(--text-muted, #999); cursor: pointer; padding: 4px; display: flex; z-index: 1; }
        .pp-icon { flex-shrink: 0; width: 34px; height: 34px; border-radius: 50%; background: var(--brand, #B87333); color: white; display: flex; align-items: center; justify-content: center; }
        .pp-body { flex: 1; min-width: 0; }
        .pp-title { font-weight: 700; font-size: 0.9rem; color: var(--text-primary, #1a1a2e); margin-bottom: 2px; }
        .pp-text { font-size: 0.8125rem; color: var(--text-secondary, #6B5D52); line-height: 1.45; }
        .pp-actions { display: flex; gap: 10px; align-items: center; margin-top: 10px; flex-wrap: wrap; }
        .pp-btn { background: var(--brand, #B87333); color: white; border: none; border-radius: 99px; padding: 8px 16px; font-size: 0.8125rem; font-weight: 700; cursor: pointer; font-family: inherit; }
        .pp-btn:disabled { opacity: 0.7; cursor: wait; }
        .pp-later { background: none; border: none; color: var(--text-muted, #999); font-size: 0.8125rem; cursor: pointer; text-decoration: underline; font-family: inherit; }
        .pp-link { color: var(--brand, #B87333); font-size: 0.8125rem; font-weight: 600; text-decoration: underline; }
      `}</style>
    </div>
  );
}

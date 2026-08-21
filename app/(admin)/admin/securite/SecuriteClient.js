'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

/**
 * Sécurité du compte admin — activation de la double authentification (TOTP).
 * Une fois un facteur VÉRIFIÉ, le layout admin exige une session aal2 :
 * chaque nouvelle connexion passe par /admin-mfa (code à 6 chiffres).
 * Téléphone perdu : node scripts/admin-mfa-reset.mjs <email> (service_role).
 */
export default function SecuriteClient() {
  const router = useRouter();
  const supabaseRef = useRef(null);
  if (!supabaseRef.current) supabaseRef.current = createClient();
  const supabase = supabaseRef.current;

  const [chargement, setChargement] = useState(true);
  const [facteurActif, setFacteurActif] = useState(null); // facteur TOTP vérifié
  const [enrolement, setEnrolement] = useState(null);     // { id, qr, secret } en cours
  const [code, setCode] = useState('');
  const [message, setMessage] = useState(null);           // { type: 'ok'|'erreur', texte }
  const [occupe, setOccupe] = useState(false);

  const chargerFacteurs = useCallback(async () => {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) {
      setMessage({ type: 'erreur', texte: 'Impossible de lire l’état MFA : ' + error.message });
      setChargement(false);
      return;
    }
    setFacteurActif(data?.totp?.[0] || null);
    setChargement(false);
  }, [supabase]);

  useEffect(() => { chargerFacteurs(); }, [chargerFacteurs]);

  const activer = useCallback(async () => {
    setOccupe(true);
    setMessage(null);
    // Purge les enrôlements abandonnés (facteur non vérifié qui bloquerait
    // un nouvel enroll avec le même nom).
    const { data: existants } = await supabase.auth.mfa.listFactors();
    for (const f of (existants?.all || [])) {
      if (f.status !== 'verified') await supabase.auth.mfa.unenroll({ factorId: f.id });
    }
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'IziSolo Admin' });
    setOccupe(false);
    if (error || !data) {
      setMessage({ type: 'erreur', texte: 'Activation impossible : ' + (error?.message || 'réponse vide') });
      return;
    }
    const qr = data.totp?.qr_code || '';
    setEnrolement({
      id: data.id,
      qr: qr.startsWith('data:') ? qr : 'data:image/svg+xml;utf8,' + encodeURIComponent(qr),
      secret: data.totp?.secret || '',
    });
  }, [supabase]);

  const confirmer = useCallback(async (e) => {
    e?.preventDefault?.();
    if (!enrolement || code.length !== 6) return;
    setOccupe(true);
    setMessage(null);
    const { data: ch, error: eCh } = await supabase.auth.mfa.challenge({ factorId: enrolement.id });
    if (eCh || !ch) {
      setOccupe(false);
      setMessage({ type: 'erreur', texte: 'Vérification impossible : ' + (eCh?.message || 'challenge vide') });
      return;
    }
    const { error } = await supabase.auth.mfa.verify({ factorId: enrolement.id, challengeId: ch.id, code });
    setOccupe(false);
    if (error) {
      setMessage({ type: 'erreur', texte: 'Code invalide. Réessaie avec le code affiché maintenant.' });
      setCode('');
      return;
    }
    setEnrolement(null);
    setCode('');
    setMessage({ type: 'ok', texte: 'Double authentification activée. Chaque nouvelle connexion demandera un code.' });
    await chargerFacteurs();
    router.refresh();
  }, [supabase, enrolement, code, chargerFacteurs, router]);

  const desactiver = useCallback(async () => {
    if (!facteurActif) return;
    const sur = window.confirm(
      'Désactiver la double authentification ?\n\nL’admin redeviendra accessible avec le mot de passe seul.'
    );
    if (!sur) return;
    setOccupe(true);
    setMessage(null);
    const { error } = await supabase.auth.mfa.unenroll({ factorId: facteurActif.id });
    setOccupe(false);
    if (error) {
      setMessage({ type: 'erreur', texte: 'Désactivation impossible : ' + error.message });
      return;
    }
    setMessage({ type: 'ok', texte: 'Double authentification désactivée.' });
    await chargerFacteurs();
    router.refresh();
  }, [supabase, facteurActif, chargerFacteurs, router]);

  return (
    <div className="secu">
      <h1>🔐 Sécurité</h1>
      <p className="secu-intro">
        L&apos;admin donne accès aux données de tous les studios : la double
        authentification (code à 6 chiffres depuis une app comme Google
        Authenticator, 1Password ou Aegis) protège ton compte même si ton mot
        de passe fuite. Elle ne s&apos;applique qu&apos;à TON compte, pas à celui des profs.
      </p>

      {message && (
        <p className={`secu-msg ${message.type}`} role="status">{message.texte}</p>
      )}

      {chargement ? (
        <p className="secu-muted">Chargement…</p>
      ) : facteurActif ? (
        <div className="secu-carte">
          <p className="secu-etat ok">✅ Double authentification activée</p>
          <p className="secu-muted">
            Facteur « {facteurActif.friendly_name || 'TOTP'} », vérifié. Chaque
            nouvelle connexion à l&apos;admin demande un code.
          </p>
          <p className="secu-muted">
            Téléphone perdu ? Le facteur se retire côté serveur :
            {' '}<code>node scripts/admin-mfa-reset.mjs ton@email</code>
          </p>
          <button className="secu-btn danger" onClick={desactiver} disabled={occupe}>
            Désactiver
          </button>
        </div>
      ) : enrolement ? (
        <form className="secu-carte" onSubmit={confirmer}>
          <p className="secu-etat">1. Scanne ce QR code avec ton app d&apos;authentification</p>
          <img className="secu-qr" src={enrolement.qr} alt="QR code d'enrôlement TOTP" width={180} height={180} />
          <p className="secu-muted">Ou saisis la clé à la main : <code className="secu-secret">{enrolement.secret}</code></p>
          <p className="secu-etat">2. Entre le code affiché pour confirmer</p>
          <input
            className="secu-input"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            aria-label="Code de confirmation à 6 chiffres"
          />
          <div className="secu-actions">
            <button className="secu-btn" type="submit" disabled={occupe || code.length !== 6}>
              {occupe ? 'Vérification…' : 'Confirmer'}
            </button>
            <button className="secu-btn ghost" type="button" disabled={occupe} onClick={() => { setEnrolement(null); setCode(''); }}>
              Annuler
            </button>
          </div>
        </form>
      ) : (
        <div className="secu-carte">
          <p className="secu-etat">Double authentification désactivée</p>
          <p className="secu-muted">
            Recommandé pour Maude et toi : l&apos;activation prend une minute,
            app d&apos;authentification en main.
          </p>
          <button className="secu-btn" onClick={activer} disabled={occupe}>
            {occupe ? 'Préparation…' : 'Activer la double authentification'}
          </button>
        </div>
      )}

      <style jsx>{`
        .secu { max-width: 560px; }
        h1 { font-size: 1.4rem; margin: 0 0 10px; }
        .secu-intro { color: var(--text-secondary, #555); font-size: 0.9rem; line-height: 1.55; margin: 0 0 18px; }
        .secu-carte {
          border: 1px solid #e3d9cd;
          background: #fff;
          border-radius: 14px;
          padding: 20px;
        }
        .secu-etat { font-weight: 600; margin: 0 0 8px; }
        .secu-etat.ok { color: #2d7a4f; }
        .secu-muted { color: #8a7d6e; font-size: 0.85rem; line-height: 1.5; margin: 0 0 10px; }
        .secu-qr { display: block; margin: 10px 0 12px; border: 1px solid #eee; border-radius: 8px; background: #fff; }
        .secu-secret { font-size: 0.8rem; word-break: break-all; }
        .secu-input {
          width: 160px;
          padding: 10px;
          font-size: 1.25rem;
          letter-spacing: 0.3em;
          text-align: center;
          border-radius: 8px;
          border: 1px solid #d8cec2;
          font-family: var(--font-geist-mono), monospace;
          margin-bottom: 12px;
        }
        .secu-actions { display: flex; gap: 10px; }
        .secu-btn {
          padding: 10px 16px;
          border: none;
          border-radius: 9px;
          background: #1a1612;
          color: #fff;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
        }
        .secu-btn:disabled { opacity: 0.5; cursor: default; }
        .secu-btn.ghost { background: transparent; color: #8a7d6e; border: 1px solid #d8cec2; }
        .secu-btn.danger { background: #a33f3f; }
        .secu-msg { border-radius: 9px; padding: 10px 12px; font-size: 0.875rem; margin: 0 0 14px; }
        .secu-msg.ok { background: #e9f5ee; color: #2d7a4f; }
        .secu-msg.erreur { background: #fbecec; color: #a33f3f; }
      `}</style>
    </div>
  );
}

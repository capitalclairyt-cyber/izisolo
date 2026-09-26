'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Sparkles, Mail, Lock, User, CheckCircle } from 'lucide-react';
import { TYPES_STRUCTURE, CODES_STRUCTURE, sanitizeTypeStructure, textesInscription } from '@/lib/structure';
import { lireAcquisition } from '@/lib/acquisition';

// Le type de structure choisi AVANT le compte (2026-09-23, retour Colin : « on
// devrait différencier à l'inscription solo, assoc, studio »). Il arrive
// pré-coché par `?structure=` (vitrines /associations et /studios, pont 1 du
// parrainage) et reste modifiable d'un clic ; l'onboarding le relit et permet
// encore de changer.
export default function RegisterPage() {
  // ⚠️ Le serveur rend cette page SANS connaître l'URL : initialiser depuis
  // `window.location` faisait rendre « Studio » côté client et « prof seule »
  // côté serveur, donc une erreur d'hydratation (attrapée dans la console du
  // dev server le 2026-09-23). Le défaut est `solo`, l'URL se lit après montage.
  const [structure, setStructure] = useState('solo');
  // D'où vient l'inscription (campagne Google Ads, 2026-09-26) : les utm_* de
  // l'URL, recopiés par LienCta depuis la page d'atterrissage, partent dans la
  // metadata du compte. Aucun cookie : sans utm, rien n'est posé (lib/acquisition).
  const [acq, setAcq] = useState(null);
  useEffect(() => {
    try {
      const voulu = new URLSearchParams(window.location.search).get('structure');
      if (voulu) setStructure(sanitizeTypeStructure(voulu));
      setAcq(lireAcquisition(window.location.search));
    } catch { /* rien : prof seule */ }
  }, []);
  const textes = textesInscription(structure);
  const [prenom, setPrenom] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cguAccepted, setCguAccepted] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  async function handleRegister(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password.length < 6) {
      setError('Le mot de passe doit faire au moins 6 caractères');
      setLoading(false);
      return;
    }

    if (!cguAccepted) {
      setError('Tu dois accepter les CGU et la politique de confidentialité pour continuer');
      setLoading(false);
      return;
    }

    // Le type de structure (lot 1 Associations & Studios, cartes depuis le
    // 2026-09-23) voyage dans la metadata pour survivre à la confirmation
    // d'email : l'onboarding le relit pour pré-cocher la bonne carte. Une prof
    // seule n'en pose pas (le défaut de la base est déjà `solo`).
    const { data, error: authError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: { prenom, ...(structure !== 'solo' ? { structure } : {}), ...(acq ? { acquisition: acq } : {}) },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
      },
    });

    if (authError) {
      const msg = authError.message || '';
      if (msg === 'User already registered') {
        setError('Cet email est déjà utilisé');
      } else if (msg.includes('rate') || authError.status === 429) {
        setError('Trop de tentatives, attends quelques minutes puis réessaie.');
      } else if (/password/i.test(msg)) {
        setError('Mot de passe refusé par le serveur : ' + msg);
      } else {
        // B1d : le générique « Erreur lors de l'inscription » laissait la
        // prof réessayer en boucle sans savoir quoi corriger.
        setError('Erreur lors de l\'inscription : ' + (msg || 'réessaie dans un instant.'));
      }
      setLoading(false);
      return;
    }

    // Si email confirmation requise
    if (data?.user?.identities?.length === 0) {
      setError('Cet email est déjà utilisé');
      setLoading(false);
      return;
    }

    // Afficher l'écran de confirmation email
    setEmailSent(true);
    setLoading(false);
  }

  if (emailSent) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-logo" style={{ color: 'var(--success, #16a34a)' }}>
              <CheckCircle size={28} />
            </div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: 8 }}>
              Vérifie ta boîte mail
            </h1>
            <p className="auth-subtitle" style={{ marginTop: 8 }}>
              Un lien de confirmation a été envoyé à <strong>{email}</strong>.
              Clique dessus pour activer ton compte et démarrer la configuration de ton studio.
            </p>
          </div>
          <p style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: 16 }}>
            Pas reçu ? Vérifie tes spams ou{' '}
            <button
              style={{ background: 'none', border: 'none', color: 'var(--brand)', cursor: 'pointer', fontWeight: 600, padding: 0 }}
              onClick={() => setEmailSent(false)}
            >
              réessaie
            </button>.
          </p>
        </div>
        <style jsx global>{`
          .auth-container { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; background: var(--bg-page); }
          .auth-card { width: 100%; max-width: 420px; background: var(--bg-card); border-radius: var(--radius-xl); box-shadow: var(--shadow-lg); padding: 40px 32px; }
          .auth-header { text-align: center; margin-bottom: 32px; }
          .auth-subtitle { color: var(--text-secondary); font-size: 0.9375rem; }
        `}</style>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <Sparkles size={28} />
            <h1>IziSolo</h1>
          </div>
          <p className="auth-subtitle" data-testid="reg-titre">{textes.titre}</p>
          <p className="auth-reassurance" data-testid="reg-reassurance">{textes.reassurance}</p>
        </div>

        <form onSubmit={handleRegister} className="auth-form" data-acq-source={acq?.source || undefined}>
          {error && <div className="auth-error">{error}</div>}

          {/* C'est quoi, ton IziSolo ? Trois cartes, les mêmes qu'à l'onboarding
              (mêmes libellés, lib/structure), pour que le plan essayé et le
              bouton parlent de la bonne maison dès la première page. */}
          <div className="auth-field">
            <label id="reg-structure-label">C&apos;est quoi, ton IziSolo ?</label>
            <div className="structure-grid" role="radiogroup" aria-labelledby="reg-structure-label" data-testid="reg-structure">
              {CODES_STRUCTURE.map((code) => (
                <button
                  key={code}
                  type="button"
                  role="radio"
                  aria-checked={structure === code}
                  data-structure={code}
                  className={`structure-card izi-card izi-card-interactive ${structure === code ? 'selected' : ''}`}
                  onClick={() => setStructure(code)}
                >
                  <span className="structure-emoji">{TYPES_STRUCTURE[code].emoji}</span>
                  <span className="structure-label">{TYPES_STRUCTURE[code].label}</span>
                  <span className="structure-desc">{TYPES_STRUCTURE[code].description}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="prenom">Ton prénom</label>
            <div className="auth-input-wrapper">
              <User size={18} />
              <input
                id="prenom"
                type="text"
                className="izi-input"
                placeholder="Marie"
                value={prenom}
                onChange={e => setPrenom(e.target.value)}
                required
                autoComplete="given-name"
                style={{ paddingLeft: '44px' }}
              />
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="email">Email</label>
            <div className="auth-input-wrapper">
              <Mail size={18} />
              <input
                id="email"
                type="email"
                className="izi-input"
                placeholder="marie@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                style={{ paddingLeft: '44px' }}
              />
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="password">Mot de passe</label>
            <div className="auth-input-wrapper">
              <Lock size={18} />
              <input
                id="password"
                type="password"
                className="izi-input"
                placeholder="6 caractères minimum"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                style={{ paddingLeft: '44px' }}
              />
            </div>
          </div>

          <label className="cgu-check">
            <input
              type="checkbox"
              checked={cguAccepted}
              onChange={e => setCguAccepted(e.target.checked)}
            />
            <span>
              J'accepte les{' '}
              <Link href="/legal/cgu" target="_blank">CGU</Link>
              {' '}et la{' '}
              <Link href="/legal/rgpd" target="_blank">politique de confidentialité</Link>
            </span>
          </label>

          <button type="submit" className="izi-btn izi-btn-primary auth-submit" disabled={loading || !cguAccepted}>
            {loading ? 'Création...' : textes.bouton}
          </button>
        </form>

        <div className="auth-footer">
          <p>Déjà un compte ? <Link href="/login">Se connecter</Link></p>
        </div>
      </div>

      <style jsx global>{`
        .auth-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: var(--bg-page);
        }
        .auth-card {
          width: 100%;
          max-width: 420px;
          background: var(--bg-card);
          border-radius: var(--radius-xl);
          box-shadow: var(--shadow-lg);
          padding: 40px 32px;
        }
        .auth-header {
          text-align: center;
          margin-bottom: 32px;
        }
        .auth-logo {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          color: var(--brand);
          margin-bottom: 8px;
        }
        .auth-logo h1 {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--brand-dark);
        }
        .auth-subtitle {
          color: var(--text-secondary);
          font-size: 0.9375rem;
        }
        .auth-reassurance {
          color: var(--text-muted);
          font-size: 0.8125rem;
          margin-top: 6px;
        }
        /* Les trois cartes de structure : le même dessin qu'à l'onboarding,
           en colonne dans une carte de 420 px. */
        .structure-grid { display: grid; grid-template-columns: 1fr; gap: 8px; margin-top: 6px; }
        .structure-card {
          display: flex; flex-direction: column; align-items: flex-start; gap: 3px;
          padding: 10px 12px; text-align: left; cursor: pointer;
          border: 2px solid var(--border); background: var(--bg-card, white); font-family: inherit;
        }
        .structure-card.selected { border-color: var(--brand, #b87333); background: var(--brand-light, #faf2eb); }
        .structure-emoji { font-size: 1.2rem; }
        .structure-label { font-weight: 600; font-size: 0.9rem; }
        .structure-desc { font-size: 0.75rem; color: var(--text-muted); line-height: 1.35; }
        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .auth-field label {
          display: block;
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--text-secondary);
          margin-bottom: 6px;
        }
        .auth-input-wrapper {
          position: relative;
        }
        .auth-input-wrapper > :global(svg:first-child) {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
          pointer-events: none;
        }
        .auth-error {
          background: #fef2f2;
          color: var(--danger);
          padding: 10px 14px;
          border-radius: var(--radius-sm);
          font-size: 0.875rem;
          text-align: center;
        }
        .cgu-check {
          display: flex; align-items: flex-start; gap: 10px;
          font-size: 0.875rem; color: var(--text-secondary);
          cursor: pointer; line-height: 1.4;
        }
        .cgu-check input[type="checkbox"] {
          flex-shrink: 0; width: 16px; height: 16px; margin-top: 2px;
          accent-color: var(--brand);
        }
        .cgu-check a { color: var(--brand); font-weight: 600; text-decoration: none; }
        .cgu-check a:hover { text-decoration: underline; }
        .auth-submit {
          width: 100%;
          margin-top: 4px;
        }
        .auth-footer {
          text-align: center;
          margin-top: 24px;
          font-size: 0.875rem;
          color: var(--text-secondary);
        }
        .auth-footer a {
          color: var(--brand);
          font-weight: 600;
          text-decoration: none;
        }
      `}</style>
    </div>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Sparkles, Lock, ArrowLeft } from 'lucide-react';

const JOURS_LONG = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

export default function SondageReponseClient({ profile, sondage, creneaux, isClosed, connectedClient, isLoggedIn }) {
  const [reponses, setReponses] = useState({}); // { creneauId: 'oui'|'peut_etre'|'non' }
  const [email, setEmail] = useState(connectedClient?.email || '');
  const [prenom, setPrenom] = useState(connectedClient?.prenom || '');
  const [commentaire, setCommentaire] = useState('');
  const [website, setWebsite] = useState(''); // honeypot
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);

  const setRep = (id, valeur) => setReponses(prev => ({ ...prev, [id]: valeur }));

  const ouiCount = Object.values(reponses).filter(v => v === 'oui').length;
  const peutEtreCount = Object.values(reponses).filter(v => v === 'peut_etre').length;

  const visibiliteInscrits = sondage.visibilite === 'inscrits';
  const needsEmail = !connectedClient && !visibiliteInscrits;

  // Bloque si visibilité 'inscrits' sans connexion
  if (visibiliteInscrits && !connectedClient) {
    return (
      <div className="sr-page">
        <header className="sr-studio">
          <Link href={`/p/${profile.studio_slug}`} className="sr-back">
            <ArrowLeft size={16} /> Retour au studio
          </Link>
          <div className="sr-studio-nom">{profile.studio_nom}</div>
        </header>
        <div className="izi-card sr-locked">
          <Lock size={28} style={{ color: 'var(--brand)' }} />
          <h2>Sondage réservé aux élèves inscrits</h2>
          <p>Connecte-toi à ton espace élève pour répondre.</p>
          <Link href={`/p/${profile.studio_slug}/connexion?next=/p/${profile.studio_slug}/sondage/${sondage.slug}`} className="izi-btn izi-btn-primary">
            Me connecter
          </Link>
        </div>
        {styleBlock}
      </div>
    );
  }

  if (isClosed) {
    return (
      <div className="sr-page">
        <header className="sr-studio">
          <Link href={`/p/${profile.studio_slug}`} className="sr-back">
            <ArrowLeft size={16} /> Retour au studio
          </Link>
          <div className="sr-studio-nom">{profile.studio_nom}</div>
        </header>
        <div className="izi-card sr-locked">
          <h2>Ce sondage est clos</h2>
          <p>Merci à toutes celles et ceux qui ont répondu !</p>
          <Link href={`/p/${profile.studio_slug}`} className="izi-btn izi-btn-secondary">
            Voir les cours
          </Link>
        </div>
        {styleBlock}
      </div>
    );
  }

  const submit = async () => {
    setError(null);
    if (Object.keys(reponses).length === 0) {
      setError('Choisis au moins une réponse.');
      return;
    }
    if (needsEmail && !email.trim()) {
      setError('Indique ton email pour répondre.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/sondage/${sondage.slug}/repondre`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reponses,
          email: needsEmail ? email.trim() : undefined,
          prenom: prenom.trim() || undefined,
          commentaire: commentaire.trim() || undefined,
          website, // honeypot
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erreur');
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="sr-page">
        <div className="izi-card sr-done">
          <CheckCircle2 size={48} style={{ color: '#16a34a' }} />
          <h2>Merci pour ta réponse !</h2>
          <p>{profile.studio_nom} en tient compte pour construire le planning à venir.</p>
          <Link href={`/p/${profile.studio_slug}`} className="izi-btn izi-btn-primary">
            Voir les cours du studio
          </Link>
        </div>
        {styleBlock}
      </div>
    );
  }

  return (
    <div className="sr-page">
      <header className="sr-studio">
        <Link href={`/p/${profile.studio_slug}`} className="sr-back">
          <ArrowLeft size={16} /> Retour au studio
        </Link>
        <div className="sr-studio-nom">{profile.studio_nom}</div>
      </header>

      <div className="sr-intro">
        <div className="sr-intro-icon"><Sparkles size={20} /></div>
        <div>
          <h1>{sondage.titre}</h1>
          {sondage.message && <p className="sr-intro-msg">{sondage.message}</p>}
        </div>
      </div>

      {/* Tableau de créneaux */}
      <div className="sr-creneaux">
        {creneaux.map(c => (
          <div key={c.id} className="sr-creneau izi-card">
            <div className="sr-cr-info">
              <div className="sr-cr-titre">
                {JOURS_LONG[c.jour_semaine - 1]} · {c.heure?.slice(0, 5)}
              </div>
              <div className="sr-cr-meta">{c.type_cours} · {c.duree_minutes}min</div>
            </div>
            <div className="sr-cr-vote">
              <button
                type="button"
                onClick={() => setRep(c.id, 'oui')}
                className={`vote-btn vote-oui ${reponses[c.id] === 'oui' ? 'active' : ''}`}
                aria-label={`Oui pour ${c.type_cours}`}
              >
                Oui
              </button>
              <button
                type="button"
                onClick={() => setRep(c.id, 'peut_etre')}
                className={`vote-btn vote-peut ${reponses[c.id] === 'peut_etre' ? 'active' : ''}`}
                aria-label={`Peut-être pour ${c.type_cours}`}
              >
                Peut-être
              </button>
              <button
                type="button"
                onClick={() => setRep(c.id, 'non')}
                className={`vote-btn vote-non ${reponses[c.id] === 'non' ? 'active' : ''}`}
                aria-label={`Non pour ${c.type_cours}`}
              >
                Non
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Identification (anonyme) */}
      {needsEmail && (
        <div className="izi-card sr-form">
          <h3>Quelques infos pour qu'on sache qui tu es</h3>
          <div className="sr-form-row">
            <div className="sr-form-group">
              <label>Prénom</label>
              <input
                className="izi-input"
                type="text"
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                maxLength={80}
                placeholder="Sophie"
              />
            </div>
            <div className="sr-form-group">
              <label>Email <span style={{ color: 'var(--brand)' }}>*</span></label>
              <input
                className="izi-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="sophie@exemple.fr"
              />
            </div>
          </div>
          {/* Honeypot caché — un bot le remplira, un humain non */}
          <input
            type="text"
            name="website"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            style={{ position: 'absolute', left: '-9999px', opacity: 0 }}
            tabIndex={-1}
            autoComplete="off"
          />
        </div>
      )}

      {/* Commentaire optionnel */}
      <div className="izi-card sr-form">
        <label className="sr-comment-label">Un mot pour {profile.studio_nom} (optionnel)</label>
        <textarea
          className="izi-input"
          value={commentaire}
          onChange={(e) => setCommentaire(e.target.value)}
          rows={2}
          maxLength={500}
          placeholder="Ex : Idéalement plutôt en fin de journée car je travaille…"
        />
      </div>

      {error && <div className="sr-error">{error}</div>}

      {/* Submit */}
      <div className="sr-submit-bar">
        <div className="sr-summary">
          {ouiCount > 0 && <span className="sr-pill pill-oui">{ouiCount} oui</span>}
          {peutEtreCount > 0 && <span className="sr-pill pill-peut">{peutEtreCount} peut-être</span>}
        </div>
        <button
          type="button"
          className="izi-btn izi-btn-primary sr-submit"
          onClick={submit}
          disabled={submitting || Object.keys(reponses).length === 0}
        >
          {submitting ? 'Envoi…' : 'Envoyer mes réponses'}
        </button>
      </div>

      {styleBlock}
    </div>
  );
}

const styleBlock = (
  <style jsx global>{`
    .sr-page {
      max-width: 640px; margin: 0 auto; padding: 16px;
      display: flex; flex-direction: column; gap: 16px;
      padding-bottom: 60px;
    }

    .sr-studio { display: flex; align-items: center; gap: 12px; }
    .sr-back {
      display: inline-flex; align-items: center; gap: 4px;
      font-size: 0.8125rem; color: var(--text-muted);
      text-decoration: none;
    }
    .sr-back:hover { color: var(--brand); }
    .sr-studio-nom {
      margin-left: auto;
      font-size: 0.875rem; font-weight: 600; color: var(--text-secondary);
    }

    .sr-intro {
      display: flex; gap: 14px;
      padding: 18px 16px;
      background: linear-gradient(135deg, var(--brand-light), white);
      border: 1px solid var(--brand-200, #f0d0d0);
      border-radius: 16px;
    }
    .sr-intro-icon {
      width: 40px; height: 40px; border-radius: 50%;
      background: var(--brand); color: white;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .sr-intro h1 { font-size: 1.125rem; font-weight: 700; }
    .sr-intro-msg { font-size: 0.875rem; color: var(--text-secondary); margin-top: 4px; line-height: 1.5; white-space: pre-line; }

    .sr-creneaux { display: flex; flex-direction: column; gap: 8px; }
    .sr-creneau {
      display: flex; flex-direction: column; gap: 8px;
      padding: 12px 14px;
    }
    .sr-cr-info { display: flex; flex-direction: column; }
    .sr-cr-titre { font-weight: 700; font-size: 0.9375rem; color: var(--text-primary); }
    .sr-cr-meta { font-size: 0.75rem; color: var(--text-muted); margin-top: 2px; }

    .sr-cr-vote { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
    .vote-btn {
      padding: 10px; border: 1.5px solid var(--border);
      background: var(--bg-card); border-radius: 10px;
      cursor: pointer; font-size: 0.8125rem; font-weight: 600;
      color: var(--text-secondary);
      transition: all 0.15s;
      min-height: 44px;
    }
    .vote-btn:hover { border-color: var(--text-secondary); }
    .vote-oui.active   { background: #dcfce7; color: #15803d; border-color: #16a34a; }
    .vote-peut.active  { background: #fef3c7; color: #92400e; border-color: #f59e0b; }
    .vote-non.active   { background: #fee2e2; color: #991b1b; border-color: #dc2626; }

    .sr-form { padding: 14px; }
    .sr-form h3 { font-size: 0.9375rem; font-weight: 700; margin-bottom: 12px; }
    .sr-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    @media (max-width: 600px) { .sr-form-row { grid-template-columns: 1fr; } }
    .sr-form-group { display: flex; flex-direction: column; gap: 4px; }
    .sr-form-group label { font-size: 0.75rem; font-weight: 600; color: var(--text-secondary); }

    .sr-comment-label { font-size: 0.8125rem; font-weight: 600; color: var(--text-secondary); display: block; margin-bottom: 6px; }

    .sr-error {
      padding: 10px 14px; border-radius: 10px;
      background: #fee2e2; color: #991b1b;
      font-size: 0.8125rem; font-weight: 500;
    }

    .sr-submit-bar {
      display: flex; align-items: center; justify-content: space-between;
      gap: 12px; flex-wrap: wrap;
      position: sticky; bottom: 12px;
      background: var(--bg-card); padding: 12px;
      border-radius: 14px; box-shadow: 0 4px 24px rgba(0,0,0,0.08);
      border: 1px solid var(--border);
    }
    .sr-summary { display: flex; gap: 6px; }
    .sr-pill {
      font-size: 0.75rem; font-weight: 700;
      padding: 4px 10px; border-radius: 99px;
    }
    .sr-pill.pill-oui { background: #dcfce7; color: #15803d; }
    .sr-pill.pill-peut { background: #fef3c7; color: #92400e; }
    .sr-submit { padding: 10px 22px; }

    .sr-locked, .sr-done {
      display: flex; flex-direction: column; align-items: center; gap: 12px;
      padding: 40px 24px; text-align: center;
    }
    .sr-locked h2, .sr-done h2 { font-size: 1.125rem; font-weight: 700; }
    .sr-locked p, .sr-done p { font-size: 0.875rem; color: var(--text-secondary); }
  `}</style>
);

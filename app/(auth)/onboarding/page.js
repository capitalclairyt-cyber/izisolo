'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { METIERS, TYPES_COURS_DEFAUT } from '@/lib/constantes';
import { getVocabulaire } from '@/lib/vocabulaire';
import { slugify } from '@/lib/utils';
import { Sparkles, ArrowRight, ArrowLeft, Check, Copy, ExternalLink, PartyPopper } from 'lucide-react';

const ETAPES = ['metier', 'studio', 'offre', 'portail'];

export default function OnboardingPage() {
  const router = useRouter();
  const [etape, setEtape] = useState(0);
  const [loading, setLoading] = useState(false);
  const [createdSlug, setCreatedSlug] = useState('');
  const [copied, setCopied] = useState(false);

  // Données du formulaire
  const [metier, setMetier] = useState('');
  const [studioNom, setStudioNom] = useState('');
  const [offreNom, setOffreNom] = useState('');
  const [offrePrix, setOffrePrix] = useState('');
  const [offreSeances, setOffreSeances] = useState('10');

  // Pré-remplir l'offre selon le métier
  useEffect(() => {
    if (metier) {
      const templates = {
        yoga: { nom: 'Carnet 10 séances', prix: '150', seances: '10' },
        pilates: { nom: 'Carnet 10 séances', prix: '180', seances: '10' },
        danse: { nom: 'Trimestre', prix: '200', seances: '12' },
        musique: { nom: 'Forfait 4 leçons', prix: '120', seances: '4' },
        coaching: { nom: 'Pack 5 sessions', prix: '350', seances: '5' },
        arts: { nom: 'Carnet 8 ateliers', prix: '160', seances: '8' },
        autre: { nom: 'Carnet 10 séances', prix: '150', seances: '10' },
      };
      const t = templates[metier] || templates.autre;
      setOffreNom(t.nom);
      setOffrePrix(t.prix);
      setOffreSeances(t.seances);
    }
  }, [metier]);

  async function handleFinish() {
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    const vocabulaire = getVocabulaire(metier);
    const typesCours = TYPES_COURS_DEFAUT[metier] || TYPES_COURS_DEFAUT.autre;
    const couleur = METIERS[metier]?.couleurDefaut || 'rose';
    const slug = slugify(studioNom || 'mon-studio');

    // Mise à jour du profil
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        studio_nom: studioNom || 'Mon Studio',
        studio_slug: slug,
        metier,
        ui_couleur: couleur,
        types_cours: typesCours,
        vocabulaire,
      })
      .eq('id', user.id);

    if (profileError) {
      console.error('Erreur profil:', profileError);
    }

    // Créer la première offre si renseignée
    if (offreNom && offrePrix) {
      await supabase.from('offres').insert({
        profile_id: user.id,
        nom: offreNom,
        type: 'carnet',
        seances: parseInt(offreSeances) || 10,
        prix: parseFloat(offrePrix),
        actif: true,
        ordre: 0,
      });
    }

    setCreatedSlug(slug);
    setEtape(3);
    setLoading(false);
  }

  async function copyPortalUrl() {
    if (!createdSlug) return;
    const url = `${window.location.origin}/p/${createdSlug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    } catch {}
  }

  function goToDashboard() {
    router.push('/dashboard');
    router.refresh();
  }

  return (
    <div className="onboarding-container">
      <div className="onboarding-card">
        {/* Progress */}
        <div className="onboarding-progress">
          {ETAPES.map((_, i) => (
            <div
              key={i}
              className={`progress-dot ${i <= etape ? 'active' : ''}`}
            />
          ))}
        </div>

        {/* Étape 1 : Métier */}
        {etape === 0 && (
          <div className="onboarding-step animate-fade-in">
            <div className="step-header">
              <Sparkles size={24} style={{ color: 'var(--brand)' }} />
              <h2>Bienvenue ! Quel est ton métier ?</h2>
            </div>
            <div className="metier-grid">
              {Object.entries(METIERS).map(([key, { label, emoji }]) => (
                <button
                  key={key}
                  className={`metier-card izi-card izi-card-interactive ${metier === key ? 'selected' : ''}`}
                  onClick={() => setMetier(key)}
                >
                  <span className="metier-emoji">{emoji}</span>
                  <span className="metier-label">{label}</span>
                </button>
              ))}
            </div>
            <button
              className="izi-btn izi-btn-primary onboarding-next"
              disabled={!metier}
              onClick={() => setEtape(1)}
            >
              Continuer <ArrowRight size={18} />
            </button>
          </div>
        )}

        {/* Étape 2 : Studio */}
        {etape === 1 && (
          <div className="onboarding-step animate-fade-in">
            <div className="step-header">
              <h2>Comment s'appelle ton studio ?</h2>
              <p className="step-hint">Ce nom apparaîtra dans ton app et sur ton portail public.</p>
            </div>
            <div className="step-fields">
              <div className="auth-field">
                <label>Nom du studio</label>
                <input
                  type="text"
                  className="izi-input"
                  placeholder="Yoga avec Marie"
                  value={studioNom}
                  onChange={e => setStudioNom(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
            <div className="step-nav">
              <button className="izi-btn izi-btn-ghost" onClick={() => setEtape(0)}>
                <ArrowLeft size={18} /> Retour
              </button>
              <button
                className="izi-btn izi-btn-primary"
                disabled={!studioNom}
                onClick={() => setEtape(2)}
              >
                Continuer <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Étape 3 : Première offre */}
        {etape === 2 && (
          <div className="onboarding-step animate-fade-in">
            <div className="step-header">
              <h2>Ta formule la plus courante ?</h2>
              <p className="step-hint">Tu pourras en ajouter d'autres plus tard. Tu peux aussi passer cette étape.</p>
            </div>
            <div className="step-fields">
              <div className="auth-field">
                <label>Nom de l'offre</label>
                <input
                  type="text"
                  className="izi-input"
                  placeholder="Carnet 10 séances"
                  value={offreNom}
                  onChange={e => setOffreNom(e.target.value)}
                />
              </div>
              <div className="step-row">
                <div className="auth-field" style={{ flex: 1 }}>
                  <label>Nombre de séances</label>
                  <input
                    type="number"
                    className="izi-input"
                    placeholder="10"
                    value={offreSeances}
                    onChange={e => setOffreSeances(e.target.value)}
                    min="1"
                  />
                </div>
                <div className="auth-field" style={{ flex: 1 }}>
                  <label>Prix (€)</label>
                  <input
                    type="number"
                    className="izi-input"
                    placeholder="150"
                    value={offrePrix}
                    onChange={e => setOffrePrix(e.target.value)}
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
            </div>
            <div className="step-nav">
              <button className="izi-btn izi-btn-ghost" onClick={() => setEtape(1)}>
                <ArrowLeft size={18} /> Retour
              </button>
              <button
                className="izi-btn izi-btn-primary"
                onClick={handleFinish}
                disabled={loading}
              >
                {loading ? 'Création...' : 'C\'est parti !'} <Check size={18} />
              </button>
            </div>
            <button
              className="izi-btn izi-btn-ghost skip-btn"
              onClick={handleFinish}
              disabled={loading}
            >
              Passer cette étape
            </button>
          </div>
        )}

        {/* Étape 4 : Bravo, voici ton portail */}
        {etape === 3 && (
          <div className="onboarding-step animate-fade-in" style={{ textAlign: 'center' }}>
            <div className="welcome-emoji">
              <PartyPopper size={28} style={{ color: 'var(--brand)' }} />
            </div>
            <h2 style={{ fontSize: '1.375rem', fontWeight: 800, margin: '0 0 6px' }}>
              Tout est prêt, bravo !
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', margin: '0 0 24px', lineHeight: 1.5 }}>
              <strong>{studioNom || 'Ton studio'}</strong> a son propre portail.<br />
              Partage le lien à tes élèves pour qu'ils réservent leurs cours.
            </p>

            <div className="welcome-portal-card">
              <div className="welcome-portal-label">Ton lien portail</div>
              <div className="welcome-portal-url">
                {typeof window !== 'undefined' ? window.location.host : 'izisolo.fr'}/p/{createdSlug}
              </div>
              <button onClick={copyPortalUrl} className={`welcome-copy-btn${copied ? ' copied' : ''}`}>
                {copied ? <><Check size={14} /> Copié !</> : <><Copy size={14} /> Copier le lien</>}
              </button>
            </div>

            <div className="welcome-actions">
              <a
                href={`/p/${createdSlug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="izi-btn izi-btn-ghost"
              >
                <ExternalLink size={16} /> Voir comme un élève
              </a>
              <button onClick={goToDashboard} className="izi-btn izi-btn-primary">
                Aller au tableau de bord <ArrowRight size={16} />
              </button>
            </div>

            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '20px 0 0' }}>
              Tu retrouveras toujours ce lien dans ton tableau de bord et tes paramètres.
            </p>
          </div>
        )}
      </div>

      <style jsx global>{`
        .onboarding-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: var(--bg-page);
        }
        .onboarding-card {
          width: 100%;
          max-width: 520px;
          background: var(--bg-card);
          border-radius: var(--radius-xl);
          box-shadow: var(--shadow-lg);
          padding: 40px 32px;
        }
        .onboarding-progress {
          display: flex;
          justify-content: center;
          gap: 8px;
          margin-bottom: 32px;
        }
        .progress-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--border);
          transition: all var(--transition-normal);
        }
        .progress-dot.active {
          background: var(--brand);
          width: 24px;
          border-radius: var(--radius-full);
        }
        .onboarding-step {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .step-header h2 {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--text-primary);
        }
        .step-hint {
          font-size: 0.875rem;
          color: var(--text-secondary);
          margin-top: 4px;
        }
        .metier-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
          gap: 12px;
        }
        .metier-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 16px 12px;
          background: var(--bg-card);
          border: 2px solid var(--border);
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        .metier-card:hover {
          border-color: var(--brand-200);
        }
        .metier-card.selected {
          border-color: var(--brand);
          background: var(--brand-50);
        }
        .metier-emoji {
          font-size: 2rem;
        }
        .metier-label {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-primary);
        }
        .step-fields {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .step-row {
          display: flex;
          gap: 12px;
        }
        .step-nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }
        .auth-field label {
          display: block;
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--text-secondary);
          margin-bottom: 6px;
        }
        .onboarding-next {
          width: 100%;
        }
        .skip-btn {
          align-self: center;
          font-size: 0.8125rem;
        }
        .welcome-emoji {
          width: 64px; height: 64px; border-radius: 50%;
          background: var(--brand-light); margin: 0 auto 16px;
          display: flex; align-items: center; justify-content: center;
        }
        .welcome-portal-card {
          background: var(--bg-soft, #faf8f5);
          border: 1.5px dashed var(--brand-200, #f0d0d0);
          border-radius: 14px;
          padding: 20px 16px;
          margin: 0 0 20px;
        }
        .welcome-portal-label {
          font-size: 0.75rem; font-weight: 600;
          color: var(--text-muted); text-transform: uppercase;
          letter-spacing: 0.06em; margin-bottom: 8px;
        }
        .welcome-portal-url {
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 0.9rem; font-weight: 600;
          color: var(--text-primary); margin-bottom: 14px;
          word-break: break-all;
        }
        .welcome-copy-btn {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 9px 18px; border-radius: 99px;
          background: var(--brand); color: white; border: none;
          font-size: 0.8125rem; font-weight: 600; cursor: pointer;
          transition: background 0.15s;
        }
        .welcome-copy-btn:hover { background: var(--brand-dark, #b07070); }
        .welcome-copy-btn.copied { background: #4ade80; }
        .welcome-actions {
          display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;
        }
        .welcome-actions .izi-btn { flex: 1 1 auto; min-width: 180px; }
      `}</style>
    </div>
  );
}

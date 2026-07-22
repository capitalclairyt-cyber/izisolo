'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { METIERS, TYPES_COURS_DEFAUT } from '@/lib/constantes';
import { getVocabulaire } from '@/lib/vocabulaire';
import { slugify } from '@/lib/utils';
import { Sparkles, ArrowRight, ArrowLeft, Check, Copy, ExternalLink, PartyPopper, Upload } from 'lucide-react';

const ETAPES = ['metier', 'studio', 'offre', 'portail'];

export default function OnboardingPage() {
  const router = useRouter();
  const [etape, setEtape] = useState(0);
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState('');
  const [createdSlug, setCreatedSlug] = useState('');
  const [copied, setCopied] = useState(false);

  // Compte élève (créé via le portail d'un studio, v57) : on n'affiche pas
  // le wizard prof mais un écran dédié avec ses portails + « devenir prof ».
  const [isEleve, setIsEleve] = useState(false);
  const [portails, setPortails] = useState([]);
  const [devenirLoading, setDevenirLoading] = useState(false);

  // Données du formulaire
  const [metier, setMetier] = useState('');
  const [studioNom, setStudioNom] = useState('');
  // Coordonnées du studio (étape 2) — prénom + nom + ville obligatoires,
  // téléphone + adresse optionnels.
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [ville, setVille] = useState('');
  const [telephone, setTelephone] = useState('');
  const [adresse, setAdresse] = useState('');
  const [offreNom, setOffreNom] = useState('');
  const [offrePrix, setOffrePrix] = useState('');
  const [offreSeances, setOffreSeances] = useState('10');

  // Pré-remplir prénom/email depuis le user déjà connecté pour éviter de
  // demander 2x les infos qu'on possède déjà (prénom est passé au signup
  // dans options.data.prenom).
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Élève arrivé côté app prof (login, mot de passe oublié, lien
        // direct) : écran dédié, pas de wizard. On charge ses portails.
        if (user.user_metadata?.role === 'eleve') {
          setIsEleve(true);
          try {
            const res = await fetch('/api/eleve/compte');
            const data = await res.json().catch(() => ({}));
            if (res.ok && Array.isArray(data.portails)) setPortails(data.portails);
          } catch {}
          return;
        }
        const metaPrenom = user.user_metadata?.prenom;
        if (metaPrenom && !prenom) setPrenom(metaPrenom);
        // Si le profil a déjà été partiellement rempli (par ex. l'utilisateur
        // revient à mi-onboarding), on pré-remplit les champs.
        const { data: prof } = await supabase
          .from('profiles')
          .select('prenom, nom, ville, telephone, adresse, studio_nom, metier')
          .eq('id', user.id)
          .maybeSingle();
        if (prof) {
          if (prof.prenom && !prenom) setPrenom(prof.prenom);
          if (prof.nom) setNom(prof.nom);
          if (prof.ville) setVille(prof.ville);
          if (prof.telephone) setTelephone(prof.telephone);
          if (prof.adresse) setAdresse(prof.adresse);
          if (prof.studio_nom && prof.studio_nom !== 'Mon Studio') setStudioNom(prof.studio_nom);
          if (prof.metier) setMetier(prof.metier);
        }
      }
    })();
  }, []);

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
    setErreur('');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      router.push('/login');
      return;
    }

    const vocabulaire = getVocabulaire(metier);
    const typesCours = TYPES_COURS_DEFAUT[metier] || TYPES_COURS_DEFAUT.autre;
    const couleur = METIERS[metier]?.couleurDefaut || 'rose';
    const slug = slugify(studioNom || 'mon-studio');

    // Mise à jour du profil — on enregistre TOUTES les infos collectées
    // pendant l'onboarding (studio + coordonnées). On active aussi le portail
    // public d'office (portail_actif=true) pour que /p/{slug} soit accessible
    // dès la fin de l'onboarding sans manip supplémentaire.
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        studio_nom: studioNom || 'Mon Studio',
        studio_slug: slug,
        metier,
        prenom: prenom || null,
        nom: nom || null,
        ville: ville || null,
        telephone: telephone || null,
        adresse: adresse || null,
        ui_couleur: couleur,
        types_cours: typesCours,
        vocabulaire,
        portail_actif: true,
      })
      .eq('id', user.id);

    if (profileError) {
      console.error('Erreur profil:', profileError);
      setErreur("Oups, on n'a pas réussi à enregistrer ton studio. Vérifie ta connexion et réessaie.");
      setLoading(false);
      return;
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

  // Élève qui veut ouvrir SON studio : POST /api/eleve/compte passe le
  // compte en prof et crée le profil avec un essai 14 jours NEUF (le
  // trigger v33 pose trial_started_at à l'insert). On rafraîchit ensuite
  // la session pour récupérer le nouveau role, puis on ouvre le wizard.
  async function handleDevenirProf() {
    setDevenirLoading(true);
    setErreur('');
    try {
      const res = await fetch('/api/eleve/compte', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Erreur serveur');
      }
      await supabase.auth.refreshSession().catch(() => {});
      setIsEleve(false);
    } catch (e) {
      console.error('devenir prof:', e);
      setErreur("Oups, on n'a pas réussi à préparer ton espace studio. Réessaie dans un instant.");
    }
    setDevenirLoading(false);
  }

  // Porte de sortie : un compte coincé sur l'onboarding (mauvais compte,
  // envie de changer d'utilisateur) doit toujours pouvoir se déconnecter.
  async function handleLogout() {
    try { await supabase.auth.signOut(); } catch {}
    router.push('/login');
    router.refresh();
  }

  return (
    <div className="onboarding-container">
      <div className="onboarding-card">
        {/* Compte élève : pas de wizard prof, écran dédié (v57) */}
        {isEleve && (
          <div className="onboarding-step animate-fade-in" style={{ textAlign: 'center' }}>
            <div className="welcome-emoji">
              <Sparkles size={28} style={{ color: 'var(--brand)' }} />
            </div>
            <h2 style={{ fontSize: '1.375rem', fontWeight: 800, margin: '0 0 6px' }}>
              Ton compte est un compte élève 🌿
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', margin: '0 0 20px', lineHeight: 1.5 }}>
              Tu utilises IziSolo pour réserver tes cours — ton espace se trouve
              sur le portail de ton studio, pas ici.
            </p>

            {portails.length > 0 ? (
              <div className="eleve-portails">
                {portails.map(p => (
                  <a key={p.slug} href={`/p/${p.slug}/espace`} className="izi-btn izi-btn-primary eleve-portail-btn">
                    <ExternalLink size={16} /> Mon espace — {p.nom}
                  </a>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '0 0 20px' }}>
                Pour retrouver ton espace, utilise le lien de connexion envoyé
                par ton studio (ou demandes-en un nouveau sur son portail).
              </p>
            )}

            <div className="eleve-divider" />

            <p style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)', margin: '0 0 14px', lineHeight: 1.5 }}>
              Tu enseignes aussi et tu veux <strong>ouvrir ton propre studio</strong> ?
              Ton essai gratuit de 14 jours démarre à ce moment-là, pas avant.
            </p>
            {erreur && <div className="onboarding-error" role="alert">{erreur}</div>}
            <button
              type="button"
              className="izi-btn izi-btn-ghost"
              onClick={handleDevenirProf}
              disabled={devenirLoading}
            >
              {devenirLoading ? 'Préparation...' : 'Ouvrir mon studio'} <ArrowRight size={16} />
            </button>
          </div>
        )}

        {!isEleve && (<>
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
              type="button"
              className="izi-btn izi-btn-primary onboarding-next"
              disabled={!metier}
              onClick={() => setEtape(1)}
            >
              Continuer <ArrowRight size={18} />
            </button>
          </div>
        )}

        {/* Étape 2 : Studio + coordonnées */}
        {etape === 1 && (
          <div className="onboarding-step animate-fade-in">
            <div className="step-header">
              <h2>Parle-nous de ton studio</h2>
              <p className="step-hint">
                Ces infos apparaîtront sur ton portail public et tes reçus de paiement.
                Tu pourras tout modifier dans <em>Paramètres</em> plus tard.
              </p>
            </div>
            <div className="step-fields">
              <div className="auth-field">
                <label htmlFor="onb-studio-nom">Nom du studio *</label>
                <input
                  id="onb-studio-nom"
                  type="text"
                  className="izi-input"
                  placeholder="Yoga avec Marie"
                  value={studioNom}
                  onChange={e => setStudioNom(e.target.value)}
                  autoFocus
                  aria-required="true"
                />
              </div>
              <div className="step-row">
                <div className="auth-field" style={{ flex: 1 }}>
                  <label htmlFor="onb-prenom">Prénom *</label>
                  <input
                    id="onb-prenom"
                    type="text"
                    className="izi-input"
                    placeholder="Marie"
                    value={prenom}
                    onChange={e => setPrenom(e.target.value)}
                    aria-required="true"
                  />
                </div>
                <div className="auth-field" style={{ flex: 1 }}>
                  <label htmlFor="onb-nom">Nom *</label>
                  <input
                    id="onb-nom"
                    type="text"
                    className="izi-input"
                    placeholder="Dupont"
                    value={nom}
                    onChange={e => setNom(e.target.value)}
                    aria-required="true"
                  />
                </div>
              </div>
              <div className="step-row">
                <div className="auth-field" style={{ flex: 1 }}>
                  <label htmlFor="onb-ville">Ville *</label>
                  <input
                    id="onb-ville"
                    type="text"
                    className="izi-input"
                    placeholder="Lyon"
                    value={ville}
                    onChange={e => setVille(e.target.value)}
                    aria-required="true"
                  />
                </div>
                <div className="auth-field" style={{ flex: 1 }}>
                  <label htmlFor="onb-telephone">Téléphone</label>
                  <input
                    id="onb-telephone"
                    type="tel"
                    className="izi-input"
                    placeholder="06 12 34 56 78"
                    value={telephone}
                    onChange={e => setTelephone(e.target.value)}
                  />
                </div>
              </div>
              <div className="auth-field">
                <label htmlFor="onb-adresse">Adresse <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optionnel)</span></label>
                <input
                  id="onb-adresse"
                  type="text"
                  className="izi-input"
                  placeholder="12 rue des Lilas"
                  value={adresse}
                  onChange={e => setAdresse(e.target.value)}
                />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '6px 0 0' }}>
                  Si tu donnes cours dans plusieurs lieux, tu pourras les ajouter individuellement
                  dans <em>Paramètres → Mes lieux</em>.
                </p>
              </div>
            </div>
            <div className="step-nav">
              <button type="button" className="izi-btn izi-btn-ghost" onClick={() => setEtape(0)}>
                <ArrowLeft size={18} /> Retour
              </button>
              <button
                type="button"
                className="izi-btn izi-btn-primary"
                disabled={!studioNom.trim() || !prenom.trim() || !nom.trim() || !ville.trim()}
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
              <h2>Ton offre la plus courante ?</h2>
              <p className="step-hint">Tu pourras en ajouter d'autres plus tard. Tu peux aussi passer cette étape.</p>
            </div>
            <div className="step-fields">
              <div className="auth-field">
                <label htmlFor="onb-offre-nom">Nom de l'offre</label>
                <input
                  id="onb-offre-nom"
                  type="text"
                  className="izi-input"
                  placeholder="Carnet 10 séances"
                  value={offreNom}
                  onChange={e => setOffreNom(e.target.value)}
                />
              </div>
              <div className="step-row">
                <div className="auth-field" style={{ flex: 1 }}>
                  <label htmlFor="onb-offre-seances">Nombre de séances</label>
                  <input
                    id="onb-offre-seances"
                    type="number"
                    className="izi-input"
                    placeholder="10"
                    value={offreSeances}
                    onChange={e => setOffreSeances(e.target.value)}
                    min="1"
                  />
                </div>
                <div className="auth-field" style={{ flex: 1 }}>
                  <label htmlFor="onb-offre-prix">Prix (€)</label>
                  <input
                    id="onb-offre-prix"
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
            {erreur && <div className="onboarding-error" role="alert">{erreur}</div>}
            <div className="step-nav">
              <button type="button" className="izi-btn izi-btn-ghost" onClick={() => setEtape(1)}>
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
              type="button"
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
              <button type="button" onClick={copyPortalUrl} className={`welcome-copy-btn${copied ? ' copied' : ''}`}>
                {copied ? <><Check size={14} /> Copié !</> : <><Copy size={14} /> Copier le lien</>}
              </button>
            </div>

            {/* Levier d'activation : importer sa base dès la 1re minute. */}
            <div className="welcome-import-card">
              <div className="welcome-import-title">📋 Tu as déjà une liste d'élèves ?</div>
              <p className="welcome-import-sub">
                Importe-la depuis un CSV en quelques secondes, rien à ressaisir.<br />
                Tu viens d'un autre outil&nbsp;? Exporte ta base et récupère tout ici.
              </p>
              <button
                type="button"
                onClick={() => { router.push('/clients/importer'); router.refresh(); }}
                className="izi-btn izi-btn-primary"
              >
                <Upload size={16} /> Importer mes élèves
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
              <button type="button" onClick={goToDashboard} className="izi-btn izi-btn-ghost">
                Aller au tableau de bord <ArrowRight size={16} />
              </button>
            </div>

            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '20px 0 0' }}>
              Tu retrouveras toujours ce lien dans ton tableau de bord et tes paramètres.
            </p>
          </div>
        )}
        </>)}

        {/* Sortie de secours — visible sur TOUS les écrans de l'onboarding */}
        <div style={{ textAlign: 'center', marginTop: 22, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <button
            type="button"
            onClick={handleLogout}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.8125rem', cursor: 'pointer', textDecoration: 'underline', padding: 6 }}
          >
            Ce n'est pas toi ? Se déconnecter
          </button>
        </div>
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
        .onboarding-error {
          background: var(--danger-light, #fef2f2);
          color: var(--danger);
          padding: 10px 14px;
          border-radius: var(--radius-sm);
          font-size: 0.875rem;
          text-align: center;
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
        .welcome-import-card {
          background: var(--brand-50, #f7f2ea);
          border: 1px solid var(--brand-200, #f0d9a8);
          border-radius: 14px;
          padding: 18px 16px;
          margin: 0 0 18px;
          text-align: center;
        }
        .welcome-import-title {
          font-weight: 700; color: var(--text-primary); margin-bottom: 4px;
        }
        .welcome-import-sub {
          font-size: 0.85rem; color: var(--text-secondary);
          margin: 0 0 14px; line-height: 1.45;
        }
        .welcome-actions {
          display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;
        }
        .welcome-actions .izi-btn { flex: 1 1 auto; min-width: 180px; }
        .eleve-portails {
          display: flex; flex-direction: column; gap: 10px;
          margin: 0 0 4px;
        }
        .eleve-portail-btn { width: 100%; }
        .eleve-divider {
          border-top: 1px solid var(--border);
          margin: 20px 0;
        }
      `}</style>
    </div>
  );
}

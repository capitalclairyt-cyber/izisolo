'use client';

// ════════════════════════════════════════════════════════════════════════════
// Section "Page publique" — enrichit ce que voient les visiteurs sur /p/[slug]
// Bio, photo, formations, horaires, FAQ, réseaux sociaux. Tous champs optionnels.
// ⚠️ La page publique ENRICHIE est une feature Pro+ : pendant le trial, un
// user en plan Solo a accès, mais à J30, s'il choisit Solo plutôt que Pro, ses
// modifs (bio, FAQ, philosophie...) ne seront plus rendues sur le portail.
// On l'avertit via un bandeau en haut de la section.
// Extrait de parametres/page.js en B2d (découpe mécanique, zéro changement).
// ════════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { useToast } from '@/components/ui/ToastProvider';
import {
  Eye, ExternalLink, AlertCircle, User, Image as ImageIcon,
  ToggleLeft, ToggleRight, Trash2, Plus,
} from 'lucide-react';
import { getTrialStatus } from '@/lib/trial';
import { can } from '@/lib/plan-guard';
import PhotoUploader from '@/components/ui/PhotoUploader';
import CoverPhotoEditor from '@/components/ui/CoverPhotoEditor';
import HorairesStudioEditor from './HorairesStudioEditor';

export default function PagePubliqueSection({ profile, setProfile, setDirty }) {
  const studioSlug = profile?.studio_slug;
  const { toast } = useToast();
  // v108 : « proposer mes offres dans l'espace de mes élèves ». Route DÉDIÉE
  // (jamais dans le payload de la carte : pré-migration, la sauvegarde
  // entière échouerait), enregistré au clic.
  const [offresEspaceBusy, setOffresEspaceBusy] = useState(false);
  const offresEspaceVisible = profile?.offres_espace !== false;
  const toggleOffresEspace = async () => {
    const visible = !offresEspaceVisible;
    setOffresEspaceBusy(true);
    try {
      const res = await fetch('/api/profile/offres-espace', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ visible }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Réglage non enregistré');
      setProfile(prev => ({ ...prev, offres_espace: json.visible === true }));
      toast.success(json.visible ? 'Tes offres sont de nouveau proposées dans l\'espace de tes élèves.' : 'Tes offres ne sont plus proposées dans l\'espace de tes élèves.');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setOffresEspaceBusy(false);
    }
  };
  const trial = getTrialStatus(profile);
  // Avertir si trial actif ET plan réel = solo (= ce qui sera effectif après J30)
  const showTrialWarning = trial.active && (profile?.plan === 'solo' || !profile?.plan);
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://www.izisolo.fr';
  const publicUrl = studioSlug ? `${baseUrl}/p/${studioSlug}` : null;
  const previewUrl = publicUrl ? `${publicUrl}?preview=1` : null;
  const [previewLoading, setPreviewLoading] = useState(false);

  const set = (field) => (e) => {
    const value = e?.target ? e.target.value : e;
    setProfile(prev => ({ ...prev, [field]: value }));
    setDirty(true);
  };
  const toggle = (field) => () => {
    setProfile(prev => ({ ...prev, [field]: !prev?.[field] }));
    setDirty(true);
  };

  const openPreview = async () => {
    if (!previewUrl) return;
    setPreviewLoading(true);
    try {
      // Pousser un brouillon contenant les valeurs actuelles non encore sauvegardées
      const draft = {
        bio: profile?.bio || null,
        philosophie: profile?.philosophie || null,
        formations: profile?.formations || null,
        annees_experience: profile?.annees_experience ? parseInt(profile.annees_experience) : null,
        horaires_studio: profile?.horaires_studio || null,
        afficher_tarifs: profile?.afficher_tarifs === true,
        afficher_horaires: profile?.afficher_horaires === true,
        faq_publique: profile?.faq_publique || [],
        photo_url: profile?.photo_url || null,
        photo_couverture: profile?.photo_couverture || null,
        instagram_url: profile?.instagram_url || null,
        facebook_url: profile?.facebook_url || null,
        website_url: profile?.website_url || null,
      };
      await fetch('/api/profile/page-publique', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      window.open(previewUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.error('[preview] save draft err:', err);
      window.open(previewUrl, '_blank', 'noopener,noreferrer');
    } finally {
      setPreviewLoading(false);
    }
  };

  // FAQ : array de { q, a }
  const faq = Array.isArray(profile?.faq_publique) ? profile.faq_publique : [];
  const updateFaq = (next) => {
    setProfile(prev => ({ ...prev, faq_publique: next }));
    setDirty(true);
  };
  const addFaq = () => updateFaq([...faq, { q: '', a: '' }]);
  const removeFaq = (i) => updateFaq(faq.filter((_, idx) => idx !== i));
  const editFaq = (i, key, value) =>
    updateFaq(faq.map((item, idx) => idx === i ? { ...item, [key]: value } : item));

  return (
    <div className="section izi-card">
      <div className="section-top">
        <div className="section-icon"><Eye size={20} /></div>
        <h2>Ma page publique</h2>
        {publicUrl && (
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="page-public-preview"
            title="Voir ma page publique"
          >
            <ExternalLink size={13} /> Voir
          </a>
        )}
      </div>

      {/* Où atterrit chaque champ. Retour Melyflow (2026-08-25) : elle avait
          tout rempli, tout était bien enregistré et bien rendu, mais réparti
          dans trois onglets qu'elle n'a pas ouverts. Elle a conclu que son
          travail était perdu, le jour de son inscription. Un formulaire qui ne
          dit pas où va ce qu'on y écrit fabrique ce malentendu. */}
      <p className="page-public-ou">
        Ta <strong>bio</strong> s&apos;affiche en accroche dès l&apos;accueil, et en entier dans
        l&apos;onglet « À propos ». Tes <strong>réseaux</strong> sont en pied de page, visibles
        partout. Ton <strong>adresse</strong>, tes <strong>horaires</strong> et ta{' '}
        <strong>FAQ</strong> vivent dans l&apos;onglet « Infos ». Le bouton <strong>Voir</strong>
        {' '}ci-dessus ouvre ta page telle que tes élèves la découvrent.
      </p>

      <style jsx global>{`
        .page-public-ou {
          margin: 0 0 16px; padding: 11px 13px; border-radius: 11px;
          font-size: 0.84rem; line-height: 1.6;
          background: var(--brand-50, #fdf8f1); border: 1px solid var(--brand-100, #fbf1e6);
          color: var(--text-secondary);
        }
      `}</style>
      <p className="section-desc">
        Tout ce que tes futur·e·s élèves voient sur <strong>{publicUrl || 'ta page'}</strong>. Tous les champs sont optionnels : laisse vide ce que tu ne veux pas montrer.
      </p>

      {/* Avertissement trial : la page publique enrichie est Pro+ */}
      {showTrialWarning && (
        <div className="page-pub-trial-warning">
          <AlertCircle size={16} />
          <div>
            <strong>Ces enrichissements demandent le plan Complet.</strong> Tu y as
            accès pendant ton essai 30 jours. Si tu choisis Essentiel à la fin,
            les champs avancés (bio, philosophie, formations, FAQ, photos
            additionnelles) ne seront plus affichés sur ta page publique.
            Pour les conserver, passe en Complet.
          </div>
        </div>
      )}

      {/* Workflow brouillon → aperçu → publication */}
      {studioSlug && (
        <div className="page-pub-workflow">
          <div className="page-pub-workflow-info">
            <strong>Aperçu avant publication</strong> : visualise tes modifs comme tes élèves les verront, avant de cliquer Enregistrer en bas de page.
          </div>
          <div className="page-pub-workflow-actions">
            <button
              type="button"
              onClick={openPreview}
              disabled={previewLoading}
              className="izi-btn izi-btn-secondary"
            >
              <Eye size={14} /> {previewLoading ? 'Préparation…' : "Voir l'aperçu"}
            </button>
          </div>
        </div>
      )}

      {/* Photo de couverture — hero du portail public, avec point focal ajustable */}
      <div className="form-group">
        <label className="form-label"><ImageIcon size={14} /> Photo de couverture</label>
        <CoverPhotoEditor
          currentUrl={profile?.photo_couverture || null}
          focalY={profile?.photo_couverture_focal_y ?? 50}
          studioNom={profile?.studio_nom || ''}
          metier={profile?.metier || ''}
          onUploaded={(url) => {
            setProfile(prev => ({ ...prev, photo_couverture: url }));
          }}
          onFocalChange={(y) => {
            setProfile(prev => ({ ...prev, photo_couverture_focal_y: y }));
            setDirty(true);
          }}
        />
        <p className="form-hint" style={{ marginTop: 6 }}>
          Format paysage recommandé (1920×840 ou plus large). Glisse la ligne pour choisir la zone à mettre en avant.
        </p>
      </div>

      {/* Photo de profil — upload direct via Vercel Blob, resize 1024px côté client */}
      <div className="form-group">
        <label className="form-label"><User size={14} /> Photo de profil</label>
        <PhotoUploader
          currentUrl={profile?.photo_url || null}
          kind="profil"
          onUploaded={(url) => {
            setProfile(prev => ({ ...prev, photo_url: url }));
            // Pas de setDirty : la mise à jour DB est faite côté API (immédiate)
          }}
          label="Téléverser une photo"
        />
        <p className="form-hint" style={{ marginTop: 8 }}>
          JPG, PNG ou WebP, max 8 Mo (resize automatique à 1024×1024 avant envoi).
        </p>
      </div>

      {/* Bio */}
      <div className="form-group">
        <label className="form-label">Bio courte</label>
        <textarea
          className="izi-input"
          rows={3}
          value={profile?.bio || ''}
          onChange={set('bio')}
          placeholder="Ex : Prof de Hatha & Vinyasa depuis 8 ans. J'ai à cœur de transmettre une pratique douce et accessible…"
          maxLength={400}
        />
        <p className="form-hint">~2-3 phrases pour te présenter. {(profile?.bio || '').length}/400</p>
      </div>

      {/* Années d'expérience + formations */}
      <div className="form-row">
        <div className="form-group" style={{ flex: 1 }}>
          <label className="form-label">Années d'expérience</label>
          <input
            type="number"
            min="0"
            max="80"
            className="izi-input"
            value={profile?.annees_experience || ''}
            onChange={set('annees_experience')}
            placeholder="Ex : 8"
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Formations / certifications</label>
        <textarea
          className="izi-input"
          rows={2}
          value={profile?.formations || ''}
          onChange={set('formations')}
          placeholder="Ex : RYT 500, Yoga Alliance · Diplôme Hatha (Sivananda) · Formation prénatal"
        />
      </div>

      {/* Frontière des plans (2026-09-07) : bio, philosophie, formations et FAQ
          ne s'affichent sur la page publique qu'en Complet (portail_enrichi).
          On laisse écrire, on dit ce qui s'affiche. */}
      {profile && !can(profile, 'portail_enrichi') && (
        <p className="form-hint" data-testid="hint-portail-enrichi" style={{ margin: '-6px 0 12px' }}>
          🔒 Bio, philosophie, formations et FAQ ne s&apos;affichent sur ta page publique qu&apos;avec le plan Complet. Tes textes sont conservés : ils apparaîtront le jour où tu y passes.
        </p>
      )}
      {/* Philosophie */}
      <div className="form-group">
        <label className="form-label">Ma philosophie / ce qui me rend unique</label>
        <textarea
          className="izi-input"
          rows={3}
          value={profile?.philosophie || ''}
          onChange={set('philosophie')}
          placeholder="Ex : Mes cours mêlent rigueur de la posture et écoute du souffle. Je crois qu'un yoga juste se construit lentement, sans course à la performance…"
          maxLength={600}
        />
      </div>

      {/* Horaires — masqués par défaut. La prof choisit de les afficher ;
          l'éditeur (widget structuré, source horaires_studio_jours JSONB) n'apparaît
          que si le toggle est actif. horaires_studio (text) est dérivé au save. */}
      <div className="form-group toggle-row">
        <button
          type="button"
          onClick={toggle('afficher_horaires')}
          className="toggle-btn"
          aria-pressed={profile?.afficher_horaires === true}
        >
          {profile?.afficher_horaires ? <ToggleRight size={28} style={{ color: 'var(--brand)' }} /> : <ToggleLeft size={28} style={{ color: 'var(--text-muted)' }} />}
          <span>Afficher les horaires du studio sur ma page publique</span>
        </button>
        <p className="form-hint">Désactivé par défaut. Active-le pour renseigner et publier tes horaires d'ouverture.</p>
      </div>

      {profile?.afficher_horaires && (
        <HorairesStudioEditor
          horaires={profile?.horaires_studio_jours}
          onChange={(newHoraires, newText) => {
            setProfile(prev => ({
              ...prev,
              horaires_studio_jours: newHoraires,
              horaires_studio: newText,
            }));
            setDirty(true);
          }}
        />
      )}

      {/* Tarifs visibles */}
      <div className="form-group toggle-row">
        <button
          type="button"
          onClick={toggle('afficher_tarifs')}
          className="toggle-btn"
          aria-pressed={profile?.afficher_tarifs === true}
        >
          {profile?.afficher_tarifs ? <ToggleRight size={28} style={{ color: 'var(--brand)' }} /> : <ToggleLeft size={28} style={{ color: 'var(--text-muted)' }} />}
          <span>Afficher mes tarifs (offres) sur ma page publique</span>
        </button>
        <p className="form-hint">Liste tes carnets, abonnements et cours unitaires actifs avec leur prix.</p>
      </div>

      {/* Offres dans l'espace élève (v108, retour Manon 2026-09-07 : « je gère
          la prise de carte ou d'abonnement via mon site ») */}
      <div className="form-group toggle-row">
        <button
          type="button"
          onClick={toggleOffresEspace}
          className="toggle-btn"
          aria-pressed={offresEspaceVisible}
          disabled={offresEspaceBusy}
        >
          {offresEspaceVisible ? <ToggleRight size={28} style={{ color: 'var(--brand)' }} /> : <ToggleLeft size={28} style={{ color: 'var(--text-muted)' }} />}
          <span>Proposer mes offres dans l&apos;espace de mes élèves</span>
        </button>
        <p className="form-hint">
          Activé : la section « Les offres du studio » de leur espace liste ton catalogue, avec « Payer en ligne » ou « Demander ». Désactivé (tu vends ailleurs, sur ton site par exemple) : la section disparaît ; leurs paiements, carnets et factures restent visibles, et tu continues d&apos;attribuer tes offres depuis les fiches. Enregistré tout de suite, sans passer par « Sauvegarder ».
        </p>
      </div>

      {/* Réseaux sociaux */}
      <div className="form-group">
        <label className="form-label">Réseaux sociaux & site</label>
        <div className="form-row">
          <input
            type="url"
            className="izi-input"
            value={profile?.instagram_url || ''}
            onChange={set('instagram_url')}
            placeholder="https://instagram.com/…"
          />
          <input
            type="url"
            className="izi-input"
            value={profile?.facebook_url || ''}
            onChange={set('facebook_url')}
            placeholder="https://facebook.com/…"
          />
        </div>
        <input
          type="url"
          className="izi-input"
          value={profile?.website_url || ''}
          onChange={set('website_url')}
          placeholder="https://mon-site.fr"
          style={{ marginTop: 8 }}
        />
      </div>

      {/* FAQ publique */}
      <div className="form-group">
        <label className="form-label">FAQ : questions de tes élèves</label>
        <p className="form-hint" style={{ marginTop: 0, marginBottom: 8 }}>
          Anticipe les questions classiques (« dois-je amener mon tapis ? », « où me garer ? »).
        </p>
        <div className="faq-editor-list">
          {faq.map((item, i) => (
            <div key={i} className="faq-editor-item">
              <input
                className="izi-input"
                value={item.q || ''}
                onChange={e => editFaq(i, 'q', e.target.value)}
                placeholder="Question"
              />
              <textarea
                className="izi-input"
                rows={2}
                value={item.a || ''}
                onChange={e => editFaq(i, 'a', e.target.value)}
                placeholder="Réponse"
              />
              <button
                type="button"
                onClick={() => removeFaq(i)}
                className="izi-btn izi-btn-ghost faq-remove-btn"
                aria-label="Supprimer cette question"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
        <button type="button" onClick={addFaq} className="izi-btn izi-btn-secondary" style={{ marginTop: 8 }}>
          <Plus size={14} /> Ajouter une question
        </button>
      </div>

      <style jsx global>{`
        .page-public-preview {
          margin-left: auto;
          display: inline-flex; align-items: center; gap: 4px;
          padding: 5px 10px; border-radius: 999px;
          background: var(--brand-light); color: var(--brand-700);
          font-size: 0.75rem; font-weight: 600;
          text-decoration: none;
          border: 1px solid var(--brand-200, #f0d0d0);
        }
        .page-public-preview:hover { background: var(--brand); color: white; }
        .page-pub-trial-warning {
          display: flex; align-items: flex-start; gap: 10px;
          padding: 12px 14px; margin: 4px 0 12px;
          background: var(--hot-light, #FCE8DA);
          border: 1px solid var(--hot, #E8722A);
          border-radius: 12px;
          font-size: 0.8125rem;
          color: var(--text-primary);
          line-height: 1.5;
        }
        .page-pub-trial-warning > svg {
          flex-shrink: 0;
          color: var(--hot, #E8722A);
          margin-top: 2px;
        }
        .page-pub-trial-warning strong { color: var(--hot, #E8722A); font-weight: 700; }
        .page-pub-workflow {
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px; flex-wrap: wrap;
          padding: 12px 14px; margin: 4px 0 16px;
          background: var(--bg-soft, #faf8f5);
          border: 1px solid var(--border); border-radius: 12px;
        }
        .page-pub-workflow-info { font-size: 0.8125rem; color: var(--text-secondary); flex: 1; min-width: 220px; }
        .page-pub-workflow-info strong { color: var(--text-primary); font-weight: 600; }
        /* wrap + max-width : sur mobile, la paire de boutons (QR + aperçu) est
           plus large que la carte — avec flex-shrink:0 sans wrap, « Voir
           l'aperçu » débordait de 79 px du bloc (retour Colin 2026-08-23,
           mesuré 375px). Les boutons se replient l'un sous l'autre. */
        .page-pub-workflow-actions { display: flex; gap: 6px; flex-wrap: wrap; min-width: 0; max-width: 100%; }
        .toggle-row .toggle-btn {
          display: inline-flex; align-items: center; gap: 10px;
          background: none; border: none; cursor: pointer;
          padding: 0; font-size: 0.875rem; color: var(--text-primary);
          font-weight: 500;
        }
        .form-hint { font-size: 0.75rem; color: var(--text-muted); margin-top: 4px; line-height: 1.4; }
        .faq-editor-list { display: flex; flex-direction: column; gap: 12px; margin-top: 4px; }
        .faq-editor-item {
          display: grid;
          grid-template-columns: 1fr 36px;
          grid-template-areas: "q remove" "a remove";
          gap: 8px;
          padding: 12px;
          background: var(--bg-soft, #faf8f5);
          border: 1px solid var(--border);
          border-radius: 10px;
        }
        .faq-editor-item input { grid-area: q; }
        .faq-editor-item textarea { grid-area: a; resize: vertical; min-height: 60px; font-family: inherit; }
        .faq-remove-btn {
          grid-area: remove; padding: 0; width: 36px; min-height: 36px;
          color: var(--danger, #dc2626);
          align-self: start;
        }
      `}</style>
    </div>
  );
}

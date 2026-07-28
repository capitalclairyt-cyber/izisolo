'use client';

// ════════════════════════════════════════════════════════════════════════════
// Section "Page publique" — enrichit ce que voient les visiteurs sur /p/[slug]
// Bio, photo, formations, horaires, FAQ, réseaux sociaux. Tous champs optionnels.
// ⚠️ La page publique ENRICHIE est une feature Pro+ : pendant le trial, un
// user en plan Solo a accès, mais à J14, s'il choisit Solo plutôt que Pro, ses
// modifs (bio, FAQ, philosophie...) ne seront plus rendues sur le portail.
// On l'avertit via un bandeau en haut de la section.
// Extrait de parametres/page.js en B2d (découpe mécanique, zéro changement).
// ════════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import {
  Eye, ExternalLink, AlertCircle, User, Image as ImageIcon,
  ToggleLeft, ToggleRight, Trash2, Plus,
} from 'lucide-react';
import { getTrialStatus } from '@/lib/trial';
import { can } from '@/lib/plan-guard';
import PhotoUploader from '@/components/ui/PhotoUploader';
import CoverPhotoEditor from '@/components/ui/CoverPhotoEditor';
import HorairesStudioEditor from './HorairesStudioEditor';
import QrPortailModal from '@/components/portail/QrPortailModal';

export default function PagePubliqueSection({ profile, setProfile, setDirty }) {
  const studioSlug = profile?.studio_slug;
  const trial = getTrialStatus(profile);
  // Avertir si trial actif ET plan réel = solo (= ce qui sera effectif après J14)
  const showTrialWarning = trial.active && (profile?.plan === 'solo' || !profile?.plan);
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://www.izisolo.fr';
  const publicUrl = studioSlug ? `${baseUrl}/p/${studioSlug}` : null;
  const previewUrl = publicUrl ? `${publicUrl}?preview=1` : null;
  const [previewLoading, setPreviewLoading] = useState(false);
  const [qrOpen, setQrOpen] = useState(false); // modale « Mon QR code »

  // Snippets « Intégrer sur ton site » (B2g — demande Manon) : le widget
  // une-ligne (auto-hauteur) + l'iframe nue en secours (builders sans JS).
  const [copie, setCopie] = useState(null); // 'widget' | 'iframe'
  const snippetWidget = `<script src="${baseUrl}/widget.js" data-studio="${studioSlug}" async></script>`;
  const snippetIframe = `<iframe src="${baseUrl}/embed/${studioSlug}" style="width:100%;height:900px;border:0;" title="Planning des cours"></iframe>`;
  const copier = async (quoi, txt) => {
    try {
      await navigator.clipboard.writeText(txt);
      setCopie(quoi);
      setTimeout(() => setCopie(null), 2000);
    } catch { /* clipboard refusé — le snippet reste sélectionnable à la main */ }
  };

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
      <p className="section-desc">
        Tout ce que tes futur·e·s élèves voient sur <strong>{publicUrl || 'ta page'}</strong>. Tous les champs sont optionnels — laisse vide ce que tu ne veux pas montrer.
      </p>

      {/* Avertissement trial : la page publique enrichie est Pro+ */}
      {showTrialWarning && (
        <div className="page-pub-trial-warning">
          <AlertCircle size={16} />
          <div>
            <strong>Ces enrichissements sont une feature Pro.</strong> Tu y as
            accès pendant ton essai 14 jours. Si tu choisis Solo à la fin,
            les champs avancés (bio, philosophie, formations, FAQ, photos
            additionnelles) ne seront plus affichés sur ta page publique.
            Pour les conserver, passe en Pro.
          </div>
        </div>
      )}

      {/* Workflow brouillon → aperçu → publication */}
      {studioSlug && (
        <div className="page-pub-workflow">
          <div className="page-pub-workflow-info">
            <strong>Aperçu avant publication</strong> — visualise tes modifs comme tes élèves les verront, avant de cliquer Enregistrer en bas de page.
          </div>
          <div className="page-pub-workflow-actions">
            <button
              type="button"
              onClick={() => setQrOpen(true)}
              className="izi-btn izi-btn-secondary"
              title="QR code à imprimer (carte de visite, flyer, affiche)"
            >
              ▦ Mon QR code
            </button>
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

      {studioSlug && (
        <QrPortailModal
          open={qrOpen}
          onClose={() => setQrOpen(false)}
          studioSlug={studioSlug}
          studioNom={profile?.studio_nom}
          essaiDispo={profile?.essai_actif === true && can(profile, 'cours_essai')}
        />
      )}

      {/* Intégrer le planning sur SON site (B2g — demande Manon). Deux niveaux :
          le widget une-ligne (auto-hauteur) et l'iframe nue (marche partout,
          même les builders qui bloquent les scripts). */}
      {studioSlug && (
        <div className="emb-integrer">
          <div className="emb-int-titre">🌐 Intègre ton planning sur ton site</div>
          <p className="emb-int-desc">
            Colle une de ces deux lignes dans un bloc <strong>HTML personnalisé</strong> de
            ton site (WordPress, Wix, Squarespace…). Ton planning s'affiche chez toi,
            et tes élèves réservent sur ta page IziSolo en un clic.
          </p>
          <div className="emb-int-row">
            <div className="emb-int-label">Recommandé — s'ajuste tout seul à la hauteur du planning :</div>
            <div className="emb-int-snippet">
              <code>{snippetWidget}</code>
              <button type="button" className="izi-btn izi-btn-secondary emb-int-copy" onClick={() => copier('widget', snippetWidget)}>
                {copie === 'widget' ? '✓ Copié' : 'Copier'}
              </button>
            </div>
          </div>
          <div className="emb-int-row">
            <div className="emb-int-label">Si ton site refuse les scripts — iframe simple (hauteur fixe) :</div>
            <div className="emb-int-snippet">
              <code>{snippetIframe}</code>
              <button type="button" className="izi-btn izi-btn-secondary emb-int-copy" onClick={() => copier('iframe', snippetIframe)}>
                {copie === 'iframe' ? '✓ Copié' : 'Copier'}
              </button>
            </div>
          </div>
          <p className="form-hint" style={{ marginTop: 8 }}>
            Options à ajouter dans la balise : <code>data-palette=&quot;rose | sauge | sable | lavande&quot;</code> (couleurs
            du planning), <code>data-semaines=&quot;8&quot;</code> (nombre de semaines affichées),
            <code> data-type=&quot;Yoga&quot;</code> (un seul type de cours). Pour l&apos;iframe, les mêmes options
            se passent dans l&apos;adresse : <code>/embed/{studioSlug}?palette=lavande&amp;semaines=8</code>.
          </p>
          <a href={`/embed/${studioSlug}`} target="_blank" rel="noopener noreferrer" className="emb-int-preview">
            Voir le rendu du planning intégrable →
          </a>
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
          placeholder="Ex : RYT 500 — Yoga Alliance · Diplôme Hatha (Sivananda) · Formation prénatal"
        />
      </div>

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
        <label className="form-label">FAQ — questions de tes élèves</label>
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
        .page-pub-workflow-actions { display: flex; gap: 6px; flex-shrink: 0; }
        .emb-integrer {
          padding: 12px 14px; margin: 0 0 16px;
          background: var(--bg-soft, #faf8f5);
          border: 1px solid var(--border); border-radius: 12px;
        }
        .emb-int-titre { font-size: 0.875rem; font-weight: 700; color: var(--text-primary); }
        .emb-int-desc { font-size: 0.8125rem; color: var(--text-secondary); margin: 4px 0 10px; line-height: 1.5; }
        .emb-int-row { margin-bottom: 10px; }
        .emb-int-label { font-size: 0.75rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 4px; }
        .emb-int-snippet { display: flex; gap: 6px; align-items: stretch; }
        .emb-int-snippet code {
          flex: 1; min-width: 0; padding: 7px 10px;
          background: white; border: 1px solid var(--border); border-radius: 8px;
          font-size: 0.6875rem; word-break: break-all; color: var(--text-primary);
          display: block;
        }
        .emb-int-copy { flex-shrink: 0; padding: 6px 12px; font-size: 0.75rem; }
        .emb-int-preview { font-size: 0.75rem; color: var(--brand-700); font-weight: 600; text-decoration: none; }
        .emb-int-preview:hover { text-decoration: underline; }
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

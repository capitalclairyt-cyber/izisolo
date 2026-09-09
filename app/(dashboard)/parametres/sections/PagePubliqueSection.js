'use client';

// ════════════════════════════════════════════════════════════════════════════
// Section « Ma page » — ce que voient les visiteurs sur /p/[slug].
//
// Lot 2 « le repli » (2026-09-09) : trois cartes au lieu d'une colonne de
// quinze champs. (1) « Ma page », ouverte : ce qui fait la page au premier
// regard (couverture, photo, bio, réseaux). (2) « Ce que ta page montre »,
// repliée : les trois interrupteurs (horaires, tarifs, offres dans l'espace).
// (3) « Aller plus loin », repliée : expérience, formations, philosophie, FAQ.
// Un seul bouton Enregistrer pour la carte `page` (rendu par la rubrique).
// Le code d'intégration, les couleurs et le QR vivent dans « Intégrer sur
// mon site » depuis le lot 1.
// ════════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { useToast } from '@/components/ui/ToastProvider';
import {
  Eye, ExternalLink, User, Image as ImageIcon, Globe, SlidersHorizontal, BookOpen,
  ToggleLeft, ToggleRight, Trash2, Plus,
} from 'lucide-react';
import { getTrialStatus } from '@/lib/trial';
import { can } from '@/lib/plan-guard';
import { resumeCarte } from '@/lib/parametres-rubriques';
import PhotoUploader from '@/components/ui/PhotoUploader';
import CoverPhotoEditor from '@/components/ui/CoverPhotoEditor';
import HorairesStudioEditor from './HorairesStudioEditor';
import CarteReglage, { EnSavoirPlus } from '../CarteReglage';

export default function PagePubliqueSection({ profile, setProfile, setDirty }) {
  const studioSlug = profile?.studio_slug;
  const { toast } = useToast();
  // v108 : « proposer mes offres dans l'espace de mes élèves ». Route DÉDIÉE
  // (jamais dans le payload de la carte), enregistré au clic.
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

  const enTete = studioSlug ? (
    <span className="page-pub-actions" onClick={e => e.stopPropagation()}>
      <button type="button" onClick={openPreview} disabled={previewLoading} className="izi-btn izi-btn-secondary page-pub-btn">
        <Eye size={14} /> {previewLoading ? 'Préparation…' : "Voir l'aperçu"}
      </button>
      <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="page-public-preview" title="Voir ma page publique">
        <ExternalLink size={13} /> Voir
      </a>
    </span>
  ) : null;

  return (
    <>
      {/* ── 1. Ma page : ce qui fait la page au premier regard ─────────────── */}
      <CarteReglage id="page" titre="Ma page" icone={Globe} resume={resumeCarte('page', profile)} ouverte enTete={enTete}>
        {/* Où atterrit chaque champ. Retour Melyflow (2026-08-25) : elle avait
            tout rempli, réparti dans trois onglets qu'elle n'a pas ouverts, et
            a conclu que son travail était perdu. Le repère reste, replié. */}
        <EnSavoirPlus libelle="Où s'affiche chaque champ ?">
          <p>Tout est optionnel : laisse vide ce que tu ne veux pas montrer. Ta <strong>bio</strong> s&apos;affiche en accroche dès l&apos;accueil, et en entier dans l&apos;onglet « À propos ». Tes <strong>réseaux</strong> sont en pied de page, visibles partout. Ton <strong>adresse</strong>, tes <strong>horaires</strong> et ta <strong>FAQ</strong> vivent dans l&apos;onglet « Infos ». « Voir l&apos;aperçu » montre tes modifs avant d&apos;enregistrer.</p>
        </EnSavoirPlus>
        {showTrialWarning && (
          <p className="form-hint page-pub-trial-hint">
            Bio, philosophie, formations et FAQ demandent le plan Complet : tu y as accès pendant ton essai, et tes textes sont conservés si tu choisis Essentiel.
          </p>
        )}

        <div className="form-group">
          <label className="form-label"><ImageIcon size={14} /> Photo de couverture</label>
          <CoverPhotoEditor
            currentUrl={profile?.photo_couverture || null}
            focalY={profile?.photo_couverture_focal_y ?? 50}
            studioNom={profile?.studio_nom || ''}
            metier={profile?.metier || ''}
            onUploaded={(url) => { setProfile(prev => ({ ...prev, photo_couverture: url })); }}
            onFocalChange={(y) => { setProfile(prev => ({ ...prev, photo_couverture_focal_y: y })); setDirty(true); }}
          />
          <p className="form-hint" style={{ marginTop: 6 }}>Paysage (1920×840 ou plus). Glisse la ligne pour choisir la zone mise en avant.</p>
        </div>
        <div className="form-group">
          <label className="form-label"><User size={14} /> Photo de profil</label>
          <PhotoUploader
            currentUrl={profile?.photo_url || null}
            kind="profil"
            onUploaded={(url) => { setProfile(prev => ({ ...prev, photo_url: url })); }}
            label="Téléverser une photo"
          />
          <p className="form-hint" style={{ marginTop: 8 }}>JPG, PNG ou WebP, 8 Mo max.</p>
        </div>
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
          <p className="form-hint">Deux ou trois phrases pour te présenter. {(profile?.bio || '').length}/400</p>
        </div>
        {profile && !can(profile, 'portail_enrichi') && (
          <p className="form-hint" data-testid="hint-portail-enrichi" style={{ margin: '-6px 0 6px' }}>
            🔒 Bio, philosophie, formations et FAQ ne s&apos;affichent sur ta page qu&apos;avec le plan Complet. Tes textes sont conservés.
          </p>
        )}
        <div className="form-group">
          <label className="form-label">Réseaux sociaux & site</label>
          <div className="form-row">
            <input type="url" className="izi-input" value={profile?.instagram_url || ''} onChange={set('instagram_url')} placeholder="https://instagram.com/…" />
            <input type="url" className="izi-input" value={profile?.facebook_url || ''} onChange={set('facebook_url')} placeholder="https://facebook.com/…" />
          </div>
          <input type="url" className="izi-input" value={profile?.website_url || ''} onChange={set('website_url')} placeholder="https://mon-site.fr" style={{ marginTop: 8 }} />
        </div>
      </CarteReglage>

      {/* ── 2. Ce que ta page montre : les trois interrupteurs ───────────── */}
      <CarteReglage id="page_affichage" titre="Ce que ta page montre" icone={SlidersHorizontal} resume={resumeCarte('page_affichage', profile)}>
        <div className="form-group toggle-row">
          <button type="button" onClick={toggle('afficher_horaires')} className="toggle-btn" aria-pressed={profile?.afficher_horaires === true}>
            {profile?.afficher_horaires ? <ToggleRight size={28} style={{ color: 'var(--brand)' }} /> : <ToggleLeft size={28} style={{ color: 'var(--text-muted)' }} />}
            <span>Afficher les horaires du studio sur ma page publique</span>
          </button>
        </div>
        {profile?.afficher_horaires && (
          <HorairesStudioEditor
            horaires={profile?.horaires_studio_jours}
            onChange={(newHoraires, newText) => {
              setProfile(prev => ({ ...prev, horaires_studio_jours: newHoraires, horaires_studio: newText }));
              setDirty(true);
            }}
          />
        )}
        <div className="form-group toggle-row">
          <button type="button" onClick={toggle('afficher_tarifs')} className="toggle-btn" aria-pressed={profile?.afficher_tarifs === true}>
            {profile?.afficher_tarifs ? <ToggleRight size={28} style={{ color: 'var(--brand)' }} /> : <ToggleLeft size={28} style={{ color: 'var(--text-muted)' }} />}
            <span>Afficher mes tarifs (offres) sur ma page publique</span>
          </button>
          <p className="form-hint">Tes carnets, abonnements et cours à l&apos;unité actifs, avec leur prix.</p>
        </div>
        {/* Offres dans l'espace élève (v108, retour Manon 2026-09-07). */}
        <div className="form-group toggle-row">
          <button type="button" onClick={toggleOffresEspace} className="toggle-btn" aria-pressed={offresEspaceVisible} disabled={offresEspaceBusy}>
            {offresEspaceVisible ? <ToggleRight size={28} style={{ color: 'var(--brand)' }} /> : <ToggleLeft size={28} style={{ color: 'var(--text-muted)' }} />}
            <span>Proposer mes offres dans l&apos;espace de mes élèves</span>
          </button>
          <p className="form-hint">Enregistré tout de suite. Désactivé (tu vends ailleurs), la section « Les offres du studio » disparaît de leur espace.</p>
          <EnSavoirPlus>
            <p>Activé : leur espace liste ton catalogue, avec « Payer en ligne » ou « Demander ». Désactivé : leurs paiements, carnets et factures restent visibles, et tu continues d&apos;attribuer tes offres depuis les fiches.</p>
          </EnSavoirPlus>
        </div>
      </CarteReglage>

      {/* ── 3. Aller plus loin : les textes longs et la FAQ ──────────────── */}
      <CarteReglage id="page_plus" titre="Aller plus loin" icone={BookOpen} resume={resumeCarte('page_plus', profile)}>
        <div className="form-row">
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">Années d'expérience</label>
            <input type="number" min="0" max="80" className="izi-input" value={profile?.annees_experience || ''} onChange={set('annees_experience')} placeholder="Ex : 8" />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Formations / certifications</label>
          <textarea className="izi-input" rows={2} value={profile?.formations || ''} onChange={set('formations')} placeholder="Ex : RYT 500, Yoga Alliance · Diplôme Hatha (Sivananda) · Formation prénatal" />
        </div>
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
        <div className="form-group">
          <label className="form-label">FAQ : questions de tes élèves</label>
          <p className="form-hint" style={{ marginTop: 0, marginBottom: 8 }}>« Dois-je amener mon tapis ? », « Où me garer ? »</p>
          <div className="faq-editor-list">
            {faq.map((item, i) => (
              <div key={i} className="faq-editor-item">
                <input className="izi-input" value={item.q || ''} onChange={e => editFaq(i, 'q', e.target.value)} placeholder="Question" />
                <textarea className="izi-input" rows={2} value={item.a || ''} onChange={e => editFaq(i, 'a', e.target.value)} placeholder="Réponse" />
                <button type="button" onClick={() => removeFaq(i)} className="izi-btn izi-btn-ghost faq-remove-btn" aria-label="Supprimer cette question">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
          <button type="button" onClick={addFaq} className="izi-btn izi-btn-secondary" style={{ marginTop: 8 }}>
            <Plus size={14} /> Ajouter une question
          </button>
        </div>
      </CarteReglage>

      <style jsx global>{`
        .page-pub-actions { display: inline-flex; align-items: center; gap: 6px; flex-shrink: 0; }
        .page-pub-btn { padding: 5px 10px; font-size: 0.75rem; }
        .page-public-preview {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 5px 10px; border-radius: 999px;
          background: var(--brand-light); color: var(--brand-700);
          font-size: 0.75rem; font-weight: 600;
          text-decoration: none;
          border: 1px solid var(--brand-200, #f0d0d0);
        }
        .page-public-preview:hover { background: var(--brand); color: white; }
        .page-pub-trial-hint { margin: 0; color: var(--hot, #E8722A); }
        @media (max-width: 560px) {
          .page-pub-btn { display: none; } /* l'aperçu reste accessible par « Voir » ; l'en-tête doit rester une ligne */
        }
        .toggle-row .toggle-btn {
          display: inline-flex; align-items: center; gap: 10px;
          background: none; border: none; cursor: pointer;
          padding: 0; font-size: 0.875rem; color: var(--text-primary);
          font-weight: 500; text-align: left;
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
    </>
  );
}

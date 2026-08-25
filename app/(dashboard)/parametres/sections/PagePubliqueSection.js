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
// Chargée à la demande (AUDIT-PERF 2.9) : la lib `qrcode` hors du bundle.
import dynamic from 'next/dynamic';
const QrPortailModal = dynamic(() => import('@/components/portail/QrPortailModal'), { ssr: false });

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
  // Options du planning intégrable (demande Manon 2026-07-28) : elles ne sont
  // stockées nulle part — la vérité vit dans le code que la prof colle sur son
  // site. Les sélecteurs ci-dessous régénèrent les 2 snippets en direct.
  const [optAffichage, setOptAffichage] = useState('liste');
  const [optPalette, setOptPalette] = useState('');
  // Pré-remplies depuis `couleurs_marque` (v104) : elles habillent MAINTENANT
  // le portail en plus du bloc intégré, donc elles vivent en base et plus
  // seulement dans le code collé sur son site.
  const [optCouleur1, setOptCouleur1] = useState(profile?.couleurs_marque?.c1 ? '#' + profile.couleurs_marque.c1 : '');
  const [optCouleur2, setOptCouleur2] = useState(profile?.couleurs_marque?.c2 ? '#' + profile.couleurs_marque.c2 : '');

  // Enregistrement à part (route dédiée) : mêlée au gros payload des
  // Paramètres, une colonne neuve ferait échouer TOUTE la sauvegarde tant que
  // la migration n'est pas passée (le dégât de v95).
  const enregistrerCouleurs = async (c1, c2) => {
    try {
      const res = await fetch('/api/profile/couleurs-marque', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ c1: c1 || null, c2: c2 || null }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.error) setAvertissementCouleurs(data.error);
        return;
      }
      setAvertissementCouleurs('');
    } catch { /* silencieux : le snippet, lui, porte déjà les couleurs */ }
  };
  const [avertissementCouleurs, setAvertissementCouleurs] = useState('');

  const attrs = [`data-studio="${studioSlug}"`];
  const urlParams = [];
  if (optAffichage === 'semaine') { attrs.push('data-affichage="semaine"'); urlParams.push('affichage=semaine'); }
  if (optCouleur1) {
    // Couleurs libres (2 max) : priment sur la palette — les nuances de texte
    // sont dérivées côté embed avec un plancher de contraste (lib/embed-couleurs).
    attrs.push(`data-couleur="${optCouleur1}"`);
    urlParams.push('c1=' + optCouleur1.slice(1));
    if (optCouleur2) { attrs.push(`data-couleur-2="${optCouleur2}"`); urlParams.push('c2=' + optCouleur2.slice(1)); }
  } else if (optPalette) {
    attrs.push(`data-palette="${optPalette}"`);
    urlParams.push('palette=' + optPalette);
  }
  const embSuffixe = urlParams.length ? '?' + urlParams.join('&') : '';
  const snippetWidget = `<script src="${baseUrl}/widget.js" ${attrs.join(' ')} async></script>`;
  const snippetIframe = `<iframe src="${baseUrl}/embed/${studioSlug}${embSuffixe}" style="width:100%;height:900px;border:0;" title="Planning des cours"></iframe>`;

  // Second bloc : « Mes offres » (v99). Mêmes couleurs que le planning (un
  // studio ne doit pas avoir deux blocs dépareillés sur la même page), sans
  // l'option d'affichage qui n'a de sens que pour un agenda.
  const attrsOffres = attrs
    .filter(a => !a.startsWith('data-affichage'))
    .concat('data-bloc="offres"');
  const urlParamsOffres = urlParams.filter(p => !p.startsWith('affichage='));
  const embSuffixeOffres = urlParamsOffres.length ? '?' + urlParamsOffres.join('&') : '';
  const snippetOffresWidget = `<script src="${baseUrl}/widget.js" ${attrsOffres.join(' ')} async></script>`;
  const snippetOffresIframe = `<iframe src="${baseUrl}/embed/${studioSlug}/offres${embSuffixeOffres}" style="width:100%;height:420px;border:0;" title="Offres et tarifs"></iframe>`;
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
          <div className="emb-int-opts">
            <label className="emb-int-opt">
              Affichage
              <select value={optAffichage} onChange={e => setOptAffichage(e.target.value)}>
                <option value="liste">Liste — jours avec séances</option>
                <option value="semaine">Semaine complète (Lun → Dim)</option>
              </select>
            </label>
            <label className="emb-int-opt">
              Palette
              <select value={optPalette} onChange={e => setOptPalette(e.target.value)} disabled={!!optCouleur1}>
                <option value="">Sable (défaut)</option>
                <option value="rose">Rose</option>
                <option value="sauge">Sauge</option>
                <option value="lavande">Lavande</option>
              </select>
            </label>
            <div className="emb-int-opt">
              Tes couleurs
              <span className="emb-int-pickers">
                <input
                  type="color"
                  value={optCouleur1 || '#b9794d'}
                  onChange={e => { setOptCouleur1(e.target.value); enregistrerCouleurs(e.target.value, optCouleur2); }}
                  title="Couleur principale (titres, boutons)"
                  aria-label="Couleur principale"
                />
                <input
                  type="color"
                  value={optCouleur2 || optCouleur1 || '#b9794d'}
                  onChange={e => { setOptCouleur2(e.target.value); enregistrerCouleurs(optCouleur1, e.target.value); }}
                  disabled={!optCouleur1}
                  title="Deuxième couleur (pastilles) — optionnelle"
                  aria-label="Deuxième couleur (optionnelle)"
                />
                {optCouleur1 && (
                  <button type="button" className="emb-int-reset" onClick={() => { setOptCouleur1(''); setOptCouleur2(''); enregistrerCouleurs('', ''); }}>
                    Réinitialiser
                  </button>
                )}
              </span>
            </div>
          </div>
          <p className="form-hint" style={{ margin: '0 0 10px' }}>
            Tes couleurs remplacent la palette (2 max) et habillent AUSSI ta page publique,
            pour que le bloc sur ton site et la page où arrivent tes élèves soient du même
            monde. Les textes restent lisibles quoi qu&apos;il arrive : les nuances sont
            dérivées avec un plancher de contraste. Les codes ci-dessous se mettent à jour,
            recolle-les sur ton site pour appliquer le bloc.
          </p>
          {avertissementCouleurs && (
            <p className="form-hint" style={{ color: '#92400e', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '8px 10px', margin: '0 0 10px' }}>
              {avertissementCouleurs}
            </p>
          )}
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
            Autres options à ajouter à la main dans la balise : <code>data-semaines=&quot;8&quot;</code> (nombre
            de semaines affichées), <code>data-type=&quot;Yoga&quot;</code> (un seul type de cours).
            Pour l&apos;iframe : <code>?semaines=8&amp;type=Yoga</code> dans l&apos;adresse.
          </p>
          <a href={`/embed/${studioSlug}${embSuffixe}`} target="_blank" rel="noopener noreferrer" className="emb-int-preview">
            Voir le rendu du planning intégrable →
          </a>

          {/* Second bloc (v99) : la grille tarifaire, à coller où elle veut sur
              son site. Le clic sort de l'iframe vers son portail, onglet
              Tarifs, où vivent déjà le paiement en ligne et la demande
              d'offre. */}
          <div className="emb-int-bloc2">
            <div className="emb-int-titre">🎟 Et tes offres, si tu veux</div>
            <p className="emb-int-sous">
              Le même principe pour ta grille tarifaire. Tes élèves cliquent, elles arrivent
              sur tes tarifs, et elles peuvent payer en ligne ou te demander l&apos;offre.
              Ce bloc affiche tes offres actives même si tu as choisi de ne pas montrer tes
              tarifs sur ta page publique : le coller sur ton site, c&apos;est déjà les publier.
            </p>
            <div className="emb-int-row">
              <div className="emb-int-label">Recommandé, s&apos;ajuste tout seul à la hauteur :</div>
              <div className="emb-int-snippet">
                <code>{snippetOffresWidget}</code>
                <button type="button" className="izi-btn izi-btn-secondary emb-int-copy" onClick={() => copier('offres-widget', snippetOffresWidget)}>
                  {copie === 'offres-widget' ? '✓ Copié' : 'Copier'}
                </button>
              </div>
            </div>
            <div className="emb-int-row">
              <div className="emb-int-label">Si ton site refuse les scripts, iframe simple :</div>
              <div className="emb-int-snippet">
                <code>{snippetOffresIframe}</code>
                <button type="button" className="izi-btn izi-btn-secondary emb-int-copy" onClick={() => copier('offres-iframe', snippetOffresIframe)}>
                  {copie === 'offres-iframe' ? '✓ Copié' : 'Copier'}
                </button>
              </div>
            </div>
            <a href={`/embed/${studioSlug}/offres${embSuffixeOffres}`} target="_blank" rel="noopener noreferrer" className="emb-int-preview">
              Voir le rendu du bloc offres →
            </a>
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
        /* wrap + max-width : sur mobile, la paire de boutons (QR + aperçu) est
           plus large que la carte — avec flex-shrink:0 sans wrap, « Voir
           l'aperçu » débordait de 79 px du bloc (retour Colin 2026-08-23,
           mesuré 375px). Les boutons se replient l'un sous l'autre. */
        .page-pub-workflow-actions { display: flex; gap: 6px; flex-wrap: wrap; min-width: 0; max-width: 100%; }
        .emb-integrer {
          padding: 12px 14px; margin: 0 0 16px;
          background: var(--bg-soft, #faf8f5);
          border: 1px solid var(--border); border-radius: 12px;
        }
        .emb-int-titre { font-size: 0.875rem; font-weight: 700; color: var(--text-primary); }
        .emb-int-desc { font-size: 0.8125rem; color: var(--text-secondary); margin: 4px 0 10px; line-height: 1.5; }
        /* Second bloc intégrable (v99) : séparé par un filet, pas par une
           carte de plus — c'est la même conversation « ton site ». */
        .emb-int-bloc2 {
          margin-top: 16px; padding-top: 14px;
          border-top: 1px dashed var(--border);
        }
        .emb-int-sous { font-size: 0.8125rem; color: var(--text-secondary); margin: 4px 0 10px; line-height: 1.5; }
        .emb-int-row { margin-bottom: 10px; }
        .emb-int-opts { display: flex; flex-wrap: wrap; gap: 14px; align-items: flex-end; margin: 4px 0 8px; }
        .emb-int-opt { display: flex; flex-direction: column; gap: 4px; font-size: 0.75rem; font-weight: 600; color: var(--text-secondary); }
        .emb-int-opt select {
          font: inherit; font-weight: 500; padding: 5px 8px; border-radius: 8px;
          border: 1px solid var(--border-color, #ddd); background: var(--bg-primary, #fff); color: var(--text-primary);
        }
        .emb-int-pickers { display: flex; align-items: center; gap: 6px; }
        .emb-int-pickers input[type='color'] {
          width: 34px; height: 30px; padding: 2px; border: 1px solid var(--border-color, #ddd);
          border-radius: 8px; background: var(--bg-primary, #fff); cursor: pointer;
        }
        .emb-int-pickers input[type='color']:disabled { opacity: 0.4; cursor: not-allowed; }
        .emb-int-reset {
          font-size: 0.6875rem; font-weight: 600; color: var(--text-secondary);
          background: none; border: none; cursor: pointer; text-decoration: underline; padding: 2px 4px;
        }
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

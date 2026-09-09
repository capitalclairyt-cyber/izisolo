'use client';

// ════════════════════════════════════════════════════════════════════════════
// Rubrique « Intégrer sur mon site » : le planning et les offres à coller sur
// le site de la prof (B2g / v99), les couleurs de marque (v104) et le QR code
// du portail. Extrait de Ma page au lot 1 ; lot 2 : le code d'abord (carte
// ouverte), le QR replié, les explications derrière « En savoir plus ».
//
// Rien n'est stocké côté snippets (la vérité vit dans le code collé sur son
// site) ; les couleurs vivent en base par /api/profile/couleurs-marque parce
// qu'elles habillent AUSSI le portail.
// ════════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Code2, QrCode } from 'lucide-react';
import { can } from '@/lib/plan-guard';
import { resumeCarte } from '@/lib/parametres-rubriques';
import CarteReglage, { EnSavoirPlus } from '../CarteReglage';

// Chargée à la demande (AUDIT-PERF 2.9) : la lib `qrcode` hors du bundle.
const QrPortailModal = dynamic(() => import('@/components/portail/QrPortailModal'), { ssr: false });

export default function IntegrerSiteSection({ profile, setProfile }) {
  const studioSlug = profile?.studio_slug;
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://www.izisolo.fr';
  const [qrOpen, setQrOpen] = useState(false);
  const [copie, setCopie] = useState(null);
  const [optAffichage, setOptAffichage] = useState('liste');
  const [optPalette, setOptPalette] = useState('');
  const [optCouleur1, setOptCouleur1] = useState(profile?.couleurs_marque?.c1 ? '#' + profile.couleurs_marque.c1 : '');
  const [optCouleur2, setOptCouleur2] = useState(profile?.couleurs_marque?.c2 ? '#' + profile.couleurs_marque.c2 : '');
  const [avertissementCouleurs, setAvertissementCouleurs] = useState('');

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
      if (setProfile) {
        setProfile(prev => ({ ...prev, couleurs_marque: c1 ? { c1: c1.slice(1), c2: c2 ? c2.slice(1) : null } : null }));
      }
    } catch { /* silencieux : le snippet, lui, porte déjà les couleurs */ }
  };

  const attrs = [`data-studio="${studioSlug}"`];
  const urlParams = [];
  if (optAffichage === 'semaine') { attrs.push('data-affichage="semaine"'); urlParams.push('affichage=semaine'); }
  if (optCouleur1) {
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
  const attrsOffres = attrs.filter(a => !a.startsWith('data-affichage')).concat('data-bloc="offres"');
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

  if (!studioSlug) {
    return (
      <CarteReglage id="integrer" titre="Intégrer sur mon site" icone={Code2} resume="" ouverte>
        <p className="section-desc">
          Donne d&apos;abord un nom à ton studio (rubrique « Studio & lieux ») : ta page publique naît avec lui, et c&apos;est elle que ton site intégrera.
        </p>
      </CarteReglage>
    );
  }

  const Snippet = ({ id, texte, label }) => (
    <div className="emb-int-row">
      <div className="emb-int-label">{label}</div>
      <div className="emb-int-snippet">
        <code>{texte}</code>
        <button type="button" className="izi-btn izi-btn-secondary emb-int-copy" onClick={() => copier(id, texte)}>
          {copie === id ? '✓ Copié' : 'Copier'}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <CarteReglage id="integrer" titre="Intègre ton planning sur ton site" icone={Code2} resume={resumeCarte('integrer', profile)} ouverte>
        <p className="section-desc">
          Colle une ligne dans un bloc <strong>HTML personnalisé</strong> de ton site (WordPress, Wix, Squarespace…). Tes élèves réservent sur ta page IziSolo en un clic.
        </p>
        <div className="emb-int-opts">
          <label className="emb-int-opt">
            Affichage
            <select value={optAffichage} onChange={e => setOptAffichage(e.target.value)}>
              <option value="liste">Liste (jours avec séances)</option>
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
                title="Deuxième couleur (pastilles), optionnelle"
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
        <p className="form-hint" style={{ margin: 0 }}>Tes couleurs habillent aussi ta page publique, et les codes ci-dessous se mettent à jour : recolle-les sur ton site.</p>
        {avertissementCouleurs && (
          <p className="form-hint" style={{ color: '#92400e', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '8px 10px', margin: 0 }}>
            {avertissementCouleurs}
          </p>
        )}
        <Snippet id="widget" texte={snippetWidget} label="Recommandé, s'ajuste tout seul à la hauteur du planning :" />
        <Snippet id="iframe" texte={snippetIframe} label="Si ton site refuse les scripts, iframe simple (hauteur fixe) :" />
        <a href={`/embed/${studioSlug}${embSuffixe}`} target="_blank" rel="noopener noreferrer" className="emb-int-preview">
          Voir le rendu du planning intégrable →
        </a>
        <EnSavoirPlus>
          <p>Deux couleurs au plus ; elles remplacent la palette et les nuances sont dérivées avec un plancher de contraste, les textes restent lisibles. Options à ajouter à la main dans la balise : <code>data-semaines=&quot;8&quot;</code> (nombre de semaines), <code>data-type=&quot;Yoga&quot;</code> (un seul type). Pour l&apos;iframe : <code>?semaines=8&amp;type=Yoga</code>.</p>
        </EnSavoirPlus>

        {/* Second bloc (v99) : la grille tarifaire, à coller où elle veut. Le
            clic sort de l'iframe vers son portail, onglet Tarifs. */}
        <div className="emb-int-bloc2">
          <div className="emb-int-titre">🎟 Et tes offres, si tu veux</div>
          <p className="emb-int-sous">
            Même principe pour ta grille tarifaire : tes élèves cliquent, arrivent sur tes tarifs, paient en ligne ou te demandent l&apos;offre. Coller ce bloc, c&apos;est déjà publier tes offres.
          </p>
          <Snippet id="offres-widget" texte={snippetOffresWidget} label="Recommandé, s'ajuste tout seul à la hauteur :" />
          <Snippet id="offres-iframe" texte={snippetOffresIframe} label="Si ton site refuse les scripts, iframe simple :" />
          <a href={`/embed/${studioSlug}/offres${embSuffixeOffres}`} target="_blank" rel="noopener noreferrer" className="emb-int-preview">
            Voir le rendu du bloc offres →
          </a>
        </div>
      </CarteReglage>

      <CarteReglage id="qr" titre="Mon QR code" icone={QrCode} resume={resumeCarte('qr', profile)}>
        <p className="section-desc">
          À imprimer sur une carte de visite, un flyer ou une affiche : il mène tes futur·e·s élèves sur ta page IziSolo.
        </p>
        <button type="button" onClick={() => setQrOpen(true)} className="izi-btn izi-btn-secondary" style={{ alignSelf: 'flex-start' }}>
          ▦ Ouvrir mon QR code
        </button>
        <QrPortailModal
          open={qrOpen}
          onClose={() => setQrOpen(false)}
          studioSlug={studioSlug}
          studioNom={profile?.studio_nom}
          essaiDispo={profile?.essai_actif === true && can(profile, 'cours_essai')}
        />
      </CarteReglage>

      <style jsx global>{`
        .emb-int-titre { font-size: 0.875rem; font-weight: 700; color: var(--text-primary); }
        .emb-int-bloc2 { margin-top: 4px; padding-top: 12px; border-top: 1px dashed var(--border); display: flex; flex-direction: column; gap: 8px; }
        .emb-int-sous { font-size: 0.8125rem; color: var(--text-secondary); margin: 0; line-height: 1.5; }
        .emb-int-row { margin: 0; }
        .emb-int-opts { display: flex; flex-wrap: wrap; gap: 14px; align-items: flex-end; margin: 0; }
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
          background: var(--bg-soft, #faf8f5); border: 1px solid var(--border); border-radius: 8px;
          font-size: 0.6875rem; word-break: break-all; color: var(--text-primary);
          display: block;
        }
        .emb-int-copy { flex-shrink: 0; padding: 6px 12px; font-size: 0.75rem; }
        .emb-int-preview { font-size: 0.75rem; color: var(--brand-700); font-weight: 600; text-decoration: none; }
        .emb-int-preview:hover { text-decoration: underline; }
      `}</style>
    </>
  );
}

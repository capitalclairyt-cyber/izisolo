'use client';

// ════════════════════════════════════════════════════════════════════════════
// QR code du portail (v1, 2026-07-26) — brainstorm Colin avant P4.
// 3 presets = 3 intentions d'impression :
//   carte   → /p/slug            (« découvre mon studio »)
//   flyer   → /p/slug/essai      (« viens essayer » — LE convertisseur)
//   affiche → /p/slug/connexion  (« retrouve ton espace », élèves existants)
// Chaque preset embarque ?src=qr-… : tracking d'acquisition gratuit via
// Vercel Analytics, zéro backend. Génération 100 % client (lib qrcode) :
// PNG 1024 (usage direct) + SVG vectoriel (imprimeur) + affichette print.
// Disponible pour TOUS les plans : chaque affiche collée dans un studio
// est aussi une pub IziSolo — l'intérêt de la prof et le nôtre s'alignent.
// ⚠️ Si le cours d'essai est indisponible (désactivé, ou studio Essentiel
// depuis B3c), le preset flyer RETOMBE sur le portail : un QR imprimé qui
// mène à une 404 ne se patche pas.
// ════════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { X, Download, Printer, QrCode } from 'lucide-react';

const COULEURS = [
  { id: 'noir',   dark: '#1a1a1a', label: 'Noir' },
  // brand-700 : cuivre foncé — contraste suffisant pour le scan à l'impression
  { id: 'cuivre', dark: '#7A4A1E', label: 'Cuivre' },
];

export default function QrPortailModal({ open, onClose, studioSlug, studioNom, essaiDispo = true }) {
  const [preset, setPreset] = useState('carte');
  const [couleur, setCouleur] = useState('noir');
  const [previewUrl, setPreviewUrl] = useState(null);

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.izisolo.fr';
  const PRESETS = [
    { id: 'carte',   label: 'Carte de visite', intention: 'Découvrir ton studio',            path: '' },
    { id: 'flyer',   label: 'Flyer',           intention: essaiDispo ? "Demander un cours d'essai" : 'Découvrir ton studio', path: essaiDispo ? '/essai' : '' },
    { id: 'affiche', label: 'Affiche studio',  intention: 'Retrouver son espace élève',      path: '/connexion' },
  ];
  const actif = PRESETS.find(p => p.id === preset) || PRESETS[0];
  const dark = (COULEURS.find(c => c.id === couleur) || COULEURS[0]).dark;
  const qrUrl = `${origin}/p/${studioSlug}${actif.path}?src=qr-${actif.id}`;

  useEffect(() => {
    if (!open) return;
    let vivant = true;
    QRCode.toDataURL(qrUrl, { width: 232, margin: 2, color: { dark, light: '#FFFFFF' } })
      .then(u => { if (vivant) setPreviewUrl(u); })
      .catch(() => { if (vivant) setPreviewUrl(null); });
    return () => { vivant = false; };
  }, [open, qrUrl, dark]);

  if (!open) return null;

  const telechargerPng = async () => {
    try {
      const u = await QRCode.toDataURL(qrUrl, { width: 1024, margin: 4, color: { dark, light: '#FFFFFF' } });
      const a = document.createElement('a');
      a.href = u;
      a.download = `qr-${studioSlug}-${actif.id}.png`;
      a.click();
    } catch { /* génération locale : un échec ici est quasi impossible, rien à signaler */ }
  };

  const telechargerSvg = async () => {
    try {
      const svg = await QRCode.toString(qrUrl, { type: 'svg', margin: 4, color: { dark, light: '#FFFFFF' } });
      const blob = new Blob([svg], { type: 'image/svg+xml' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `qr-${studioSlug}-${actif.id}.svg`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    } catch { /* idem */ }
  };

  const ouvrirAffichette = () => {
    const params = new URLSearchParams({ slug: studioSlug, nom: studioNom || '', preset: actif.id, couleur });
    window.open(`/qr-affiche?${params}`, '_blank', 'noopener');
  };

  return (
    <div className="qrm-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="QR code de ton portail">
      <div className="qrm-card izi-card" onClick={e => e.stopPropagation()}>
        <button type="button" className="qrm-close" onClick={onClose} aria-label="Fermer"><X size={16} /></button>

        <h2 className="qrm-title"><QrCode size={18} /> Mon QR code</h2>
        <p className="qrm-sub">À imprimer sur ta carte de visite, tes flyers ou une affiche au studio.</p>

        <div className="qrm-presets">
          {PRESETS.map(p => (
            <button
              key={p.id}
              type="button"
              className={`qrm-preset ${preset === p.id ? 'active' : ''}`}
              onClick={() => setPreset(p.id)}
            >
              <span className="qrm-preset-label">{p.label}</span>
              <span className="qrm-preset-int">{p.intention}</span>
            </button>
          ))}
        </div>
        {preset === 'flyer' && !essaiDispo && (
          <p className="qrm-hint">Ton cours d'essai en ligne n'est pas actif — ce QR mènera à ton portail.</p>
        )}

        <div className="qrm-preview">
          {previewUrl
            ? <img src={previewUrl} alt={`QR code vers ${qrUrl}`} width={116} height={116} />
            : <div className="qrm-preview-vide" />}
          <div className="qrm-preview-infos">
            <code className="qrm-url">{qrUrl.replace(/^https?:\/\//, '')}</code>
            <div className="qrm-couleurs">
              {COULEURS.map(c => (
                <button
                  key={c.id}
                  type="button"
                  className={`qrm-couleur ${couleur === c.id ? 'active' : ''}`}
                  style={{ background: c.dark }}
                  onClick={() => setCouleur(c.id)}
                  aria-label={`Couleur ${c.label}`}
                  title={c.label}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="qrm-actions">
          <button type="button" className="izi-btn izi-btn-secondary" onClick={telechargerPng}>
            <Download size={15} /> PNG
          </button>
          <button type="button" className="izi-btn izi-btn-secondary" onClick={telechargerSvg}>
            <Download size={15} /> SVG (imprimeur)
          </button>
          <button type="button" className="izi-btn izi-btn-primary" onClick={ouvrirAffichette}>
            <Printer size={15} /> Affichette à imprimer
          </button>
        </div>

        <style jsx>{`
          .qrm-backdrop {
            position: fixed; inset: 0; z-index: 200;
            background: rgba(40, 30, 20, 0.35);
            display: flex; align-items: center; justify-content: center;
            padding: 16px;
          }
          .qrm-card { position: relative; width: 100%; max-width: 460px; padding: 22px; }
          .qrm-close {
            position: absolute; top: 10px; right: 10px; z-index: 1; /* la leçon de la checklist */
            background: none; border: none; cursor: pointer; padding: 6px;
            color: var(--text-muted); border-radius: 50%;
          }
          .qrm-close:hover { background: rgba(0,0,0,0.05); }
          .qrm-title { display: flex; align-items: center; gap: 8px; font-size: 1.0625rem; font-weight: 700; margin: 0 0 4px; }
          .qrm-sub { font-size: 0.8125rem; color: var(--text-muted); margin: 0 0 14px; }
          .qrm-presets { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
          .qrm-preset {
            display: flex; flex-direction: column; gap: 2px; text-align: left;
            padding: 8px 10px; border-radius: 10px; cursor: pointer;
            border: 1.5px solid var(--border); background: white;
          }
          .qrm-preset.active { border-color: var(--brand); background: var(--brand-light); }
          .qrm-preset-label { font-size: 0.8125rem; font-weight: 700; color: var(--text-primary); }
          .qrm-preset-int { font-size: 0.6875rem; color: var(--text-muted); line-height: 1.3; }
          .qrm-hint { font-size: 0.75rem; color: #854d0e; background: #fef3c7; border-radius: 8px; padding: 6px 10px; margin: 8px 0 0; }
          .qrm-preview {
            display: flex; gap: 14px; align-items: center;
            margin: 14px 0; padding: 12px;
            background: var(--bg-soft, #faf8f5); border: 1px dashed var(--border); border-radius: 12px;
          }
          .qrm-preview img { border-radius: 8px; background: white; flex-shrink: 0; }
          .qrm-preview-vide { width: 116px; height: 116px; border-radius: 8px; background: white; }
          .qrm-preview-infos { min-width: 0; display: flex; flex-direction: column; gap: 10px; }
          .qrm-url { font-size: 0.6875rem; word-break: break-all; color: var(--text-secondary); }
          .qrm-couleurs { display: flex; gap: 8px; }
          .qrm-couleur {
            width: 24px; height: 24px; border-radius: 50%; cursor: pointer;
            border: 2px solid transparent; padding: 0;
          }
          .qrm-couleur.active { border-color: var(--brand); box-shadow: 0 0 0 2px white inset; }
          .qrm-actions { display: flex; gap: 8px; flex-wrap: wrap; }
          .qrm-actions :global(.izi-btn) { flex: 1; justify-content: center; min-width: 120px; }
        `}</style>
      </div>
    </div>
  );
}

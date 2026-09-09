'use client';

// ═══════════════════════════════════════════════════════════════════════════
// Les styles GLOBAUX de l'écran Paramètres : sections, formulaires, lieux,
// modal, abonnement (hérités de page.js, découpe mécanique du 2026-09-09) +
// la liste des rubriques et la mise en page à deux colonnes du lot 1.
// jsx GLOBAL : les sections sont des composants séparés, une règle scopée
// ne les atteindrait pas (piège § 12 de la bible).
// ═══════════════════════════════════════════════════════════════════════════

export default function ParametresStyles() {
  return (
    <style jsx global>{`
        .parametres { display: flex; flex-direction: column; gap: 0; padding-bottom: 40px; }
        .page-header { margin-bottom: 12px; }
        .page-header h1 { font-size: 1.375rem; font-weight: 700; }

        /* === CONTENU — collé aux onglets === */
        .tab-content {
          display: flex; flex-direction: column; gap: 0;
          background: var(--bg-card);
          border: 1.5px solid var(--border); border-top: none;
          border-radius: 0 0 var(--radius-lg) var(--radius-lg);
          padding: 16px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.04);
        }
        .tab-content > .section {
          border-radius: var(--radius-md);
          margin-bottom: 12px;
        }
        .tab-content > .save-btn {
          margin-top: 4px;
        }
        .subtab-content > .section {
          border-radius: var(--radius-md);
          margin-bottom: 12px;
        }
        .subtab-content > .section:last-of-type { margin-bottom: 4px; }
        .subtab-content > .save-btn {
          margin-top: 4px;
        }

        /* subtabs-bar / subtab-btn → globals.css */

        .subtab-content {
          display: flex; flex-direction: column; gap: 0;
          background: var(--bg-card);
          border: 1px solid var(--border); border-top: none;
          border-radius: 0 0 var(--radius-md) var(--radius-md);
          padding: 12px;
        }

        /* === SECTIONS === */
        .section { padding: 20px; display: flex; flex-direction: column; gap: 12px; }
        .section-top { display: flex; align-items: center; gap: 10px; }
        .section-top h2 { font-size: 1.0625rem; font-weight: 700; margin: 0; }
        .section-icon { width: 36px; height: 36px; border-radius: var(--radius-sm); background: var(--brand-light); color: var(--brand-700); display: flex; align-items: center; justify-content: center; }
        .section-desc { font-size: 0.8125rem; color: var(--text-muted); margin: -4px 0 4px; }

        /* Barre de sous-onglets */
        .param-subtabs { margin-bottom: 12px; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .form-group { display: flex; flex-direction: column; gap: 6px; }
        .form-label { font-size: 0.8125rem; font-weight: 600; color: var(--text-secondary); }

        /* Déclaration URSSAF (v93) */
        .izi-check { display: flex; align-items: flex-start; gap: 8px; cursor: pointer; font-size: 0.8125rem; font-weight: 600; color: var(--text-primary); }
        .izi-check input { margin-top: 2px; accent-color: var(--brand); flex-shrink: 0; }
        .urssaf-taux-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .urssaf-pct { display: flex; align-items: center; gap: 6px; }
        .urssaf-pct .izi-input { flex: 1; min-width: 0; }
        .urssaf-pct span { font-size: 0.875rem; font-weight: 600; color: var(--text-muted); }
        @media (max-width: 560px) { .urssaf-taux-row { grid-template-columns: 1fr; } }

        /* Types de cours */
        .chips-list { display: flex; flex-wrap: wrap; gap: 6px; }
        .chip-editable { display: flex; align-items: center; gap: 4px; padding: 6px 10px; background: var(--brand-light); color: var(--brand-700); border-radius: var(--radius-full); font-size: 0.8125rem; font-weight: 500; }
        .chip-remove { background: none; border: none; cursor: pointer; color: var(--brand-600); padding: 0; display: flex; align-items: center; opacity: 0.6; }
        .chip-remove:hover { opacity: 1; }

        /* Lieux */
        .lieux-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 4px; }
        .lieu-card {
          display: flex; align-items: flex-start; gap: 12px;
          padding: 12px 14px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
        }
        .lieu-card:hover {
          border-color: var(--brand-300, #d4b8a0);
          box-shadow: 0 1px 4px rgba(70, 35, 25, 0.06);
        }
        .lieu-card-icon {
          flex-shrink: 0;
          width: 36px; height: 36px;
          display: flex; align-items: center; justify-content: center;
          background: var(--brand-light);
          color: var(--brand-700);
          border-radius: var(--radius-sm);
        }
        .lieu-card-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
        .lieu-card-nom { font-weight: 600; font-size: 0.9375rem; color: var(--text-primary); line-height: 1.3; }
        .lieu-card-adresse { font-size: 0.8125rem; color: var(--text-secondary); line-height: 1.4; }
        .lieu-card-notes {
          font-size: 0.75rem; color: var(--text-muted);
          font-style: italic; margin-top: 2px;
          overflow: hidden; text-overflow: ellipsis;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
        }
        .lieu-card-actions { display: flex; gap: 4px; flex-shrink: 0; }
        .lieu-action-btn {
          width: 32px; height: 32px;
          display: flex; align-items: center; justify-content: center;
          background: transparent;
          border: 1px solid transparent;
          border-radius: var(--radius-sm);
          color: var(--text-muted);
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        .lieu-action-btn:hover {
          background: var(--cream);
          color: var(--text-primary);
          border-color: var(--border);
        }
        .lieu-action-danger:hover {
          background: #fef2f2;
          color: var(--danger);
          border-color: #fecaca;
        }
        .lieu-add-btn {
          width: 100%;
          justify-content: center;
          gap: 8px;
        }
        .lieux-empty {
          display: flex; align-items: flex-start; gap: 10px;
          padding: 14px;
          background: var(--cream);
          border: 1px dashed var(--border);
          border-radius: var(--radius-md);
          color: var(--text-muted);
          font-size: 0.8125rem;
          line-height: 1.4;
          margin-bottom: 8px;
        }
        .lieux-empty svg { flex-shrink: 0; margin-top: 2px; opacity: 0.7; }

        /* Modal lieu — réutilise le pattern .modal-* du reste de l'app */
        .modal-backdrop {
          position: fixed; inset: 0;
          background: rgba(0, 0, 0, 0.45);
          z-index: 200;
          display: flex; align-items: flex-end; justify-content: center;
        }
        @media (min-width: 600px) {
          .modal-backdrop { align-items: center; }
        }
        .modal-sheet {
          background: var(--bg-card);
          border-radius: var(--radius-lg) var(--radius-lg) 0 0;
          width: 100%; max-width: 480px; max-height: 90vh;
          display: flex; flex-direction: column; overflow: hidden;
        }
        @media (min-width: 600px) {
          .modal-sheet { border-radius: var(--radius-lg); }
        }
        .modal-header {
          display: flex; align-items: center; gap: 8px;
          padding: 16px 16px 12px;
          border-bottom: 1px solid var(--border);
          flex-shrink: 0;
        }
        .modal-title { flex: 1; font-weight: 700; font-size: 1rem; color: var(--text-primary); }
        .modal-close {
          background: none; border: none;
          width: 36px; height: 36px;
          display: flex; align-items: center; justify-content: center;
          color: var(--text-secondary);
          cursor: pointer;
          border-radius: var(--radius-sm);
        }
        .modal-close:hover { background: var(--cream-dark); }
        .modal-body {
          padding: 16px;
          overflow-y: auto;
          display: flex; flex-direction: column; gap: 14px;
        }
        .modal-footer {
          display: flex; gap: 8px; justify-content: flex-end;
          padding-top: 8px;
          margin-top: 4px;
          border-top: 1px solid var(--border);
        }
        .modal-footer .izi-btn { min-width: 110px; justify-content: center; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Add row */
        .add-row { display: flex; gap: 8px; }
        .add-row .izi-input { flex: 1; }
        .add-btn { min-width: 48px; padding: 0; display: flex; align-items: center; justify-content: center; }

        /* Palette */
        .palette-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
        .palette-btn { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 12px; border-radius: var(--radius-md); border: 2px solid var(--border); background: var(--bg-card); cursor: pointer; transition: all var(--transition-fast); }
        .palette-btn.selected { border-color: var(--brand); box-shadow: 0 0 0 2px var(--brand-light); }
        .palette-swatch { width: 32px; height: 32px; border-radius: 50%; }
        .palette-label { font-size: 0.75rem; font-weight: 600; color: var(--text-secondary); }
        .save-btn { width: 100%; }

        /* Décor options */
        .decor-options { display: flex; flex-wrap: wrap; gap: 6px; }
        .decor-option {
          padding: 8px 14px; border-radius: var(--radius-full);
          border: 1.5px solid var(--border); background: var(--bg-card);
          font-size: 0.8125rem; font-weight: 500; color: var(--text-secondary);
          cursor: pointer; transition: all var(--transition-fast);
        }
        .decor-option.selected {
          border-color: var(--brand); background: var(--brand-light); color: var(--brand-700);
        }
        .decor-emoji { font-size: 0.9rem; }

        /* Illustration preview */
        .illustration-preview {
          display: flex; align-items: center; justify-content: center;
          padding: 16px; border-radius: var(--radius-md);
          border: 1px solid var(--border); background: var(--bg-card);
        }
        .illustration-preview img {
          width: 180px; height: 180px; object-fit: contain; opacity: 0.7;
        }

        /* Toggle switch */
        .toggle-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .toggle-label { font-size: 0.875rem; font-weight: 500; color: var(--text-primary); }
        .toggle-switch { width: 48px; height: 28px; border-radius: 14px; border: none; background: var(--cream-dark); cursor: pointer; position: relative; transition: background var(--transition-fast); padding: 0; }
        .toggle-switch.active { background: var(--brand); }
        .toggle-knob { position: absolute; top: 3px; left: 3px; width: 22px; height: 22px; border-radius: 50%; background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.15); transition: transform var(--transition-fast); display: block; }
        .toggle-switch.active .toggle-knob { transform: translateX(20px); }

        /* === ABONNEMENT === */
        .abo-icon { background: linear-gradient(135deg, #fef3c7, #fde68a); color: #b45309; }
        .abo-current { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
        .abo-badge {
          padding: 4px 12px; border-radius: var(--radius-full);
          background: var(--cream); border: 1px solid var(--border);
          font-size: 0.75rem; font-weight: 700; color: var(--text-secondary);
          text-transform: uppercase; letter-spacing: 0.5px;
        }
        .abo-status { font-size: 0.875rem; color: var(--text-secondary); margin: 0; }
        .abo-features { display: flex; flex-direction: column; gap: 8px; margin-top: 4px; }
        .abo-feature {
          display: flex; align-items: center; gap: 10px;
          font-size: 0.875rem; color: var(--text-secondary);
          padding: 8px 12px; border-radius: var(--radius-sm);
        }
        .abo-feature.included { color: var(--text-primary); }
        .abo-feature.locked { opacity: 0.55; }
        .abo-check { color: var(--brand); font-weight: 700; font-size: 1rem; }
        .abo-lock { font-size: 0.8rem; }

        /* Plans */
        .plans-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 12px; margin-top: 4px; } /* 3 cartes depuis Multi (2026-09-07) */
        .plan-card {
          display: flex; flex-direction: column; gap: 8px;
          padding: 20px; border-radius: var(--radius-md);
          border: 2px solid var(--border); background: var(--bg-card);
          position: relative;
        }
        .plan-card.recommended {
          border-color: var(--brand);
          background: var(--brand-light);
        }
        /* Studio "bientôt" : carte grisée, bouton désactivé */
        .plan-card.plan-card-disabled {
          opacity: 0.6;
          background: var(--bg-soft, #F8F4ED);
          border-color: var(--border);
        }
        .plan-card.plan-card-disabled .plan-cta {
          background: var(--text-muted) !important;
          color: white;
          cursor: not-allowed;
          opacity: 0.7;
        }
        .plan-badge {
          position: absolute; top: -10px; right: 12px;
          padding: 2px 10px; border-radius: var(--radius-full);
          background: var(--brand); color: white;
          font-size: 0.6875rem; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        .plan-badge.plan-badge-soon {
          background: var(--text-muted);
          color: white;
        }
        .plan-tagline {
          font-size: 0.75rem; color: var(--brand-700);
          text-transform: uppercase; letter-spacing: 0.04em;
          font-weight: 600;
        }
        .plan-card.plan-card-disabled .plan-tagline { color: var(--text-muted); }
        .plan-name { font-size: 1.125rem; font-weight: 700; color: var(--text-primary); }
        .plan-price { display: flex; align-items: baseline; gap: 2px; }
        .plan-amount {
          font-family: var(--font-fraunces), Georgia, serif;
          font-variation-settings: 'opsz' 144;
          font-size: 2rem; font-weight: 600; color: var(--text-primary);
        }
        .plan-period { font-size: 0.8125rem; color: var(--text-muted); }
        .plan-desc { font-size: 0.8125rem; color: var(--text-muted); margin: 0; }
        .plan-features { list-style: none; padding: 0; margin: 8px 0; display: flex; flex-direction: column; gap: 6px; flex: 1; }
        .plan-features li { display: flex; gap: 6px; align-items: flex-start; font-size: 0.8125rem; color: var(--text-secondary); line-height: 1.4; }
        .plan-limits {
          font-size: 0.75rem; color: var(--text-muted);
          font-style: italic; margin: 4px 0 0;
        }
        .plan-bonus {
          font-size: 0.75rem; color: var(--brand-700);
          background: var(--brand-50); padding: 8px 10px;
          border-radius: var(--radius-sm); margin: 4px 0 0;
          line-height: 1.4;
        }
        .plan-cta { margin-top: 8px; width: 100%; justify-content: center; }

        @media (max-width: 768px) {
        }
        @media (max-width: 480px) {
          .plans-grid { grid-template-columns: 1fr; }
          .form-row { grid-template-columns: 1fr; }
        }

        /* Animation */
        .animate-fade-in {
          animation: fadeIn 0.25s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up { animation: slideUp 0.2s ease; }

        /* ── Sous-onglets notifications ── */
        .notif-subtabs {
          display: flex; gap: 4px;
          background: var(--border); border-radius: 10px;
          padding: 3px; width: fit-content; margin-bottom: 14px;
        }
        .notif-subtab {
          display: flex; align-items: center; gap: 5px;
          padding: 6px 16px; border-radius: 8px; border: none;
          background: none; font-size: 0.8125rem; font-weight: 600;
          color: var(--text-muted); cursor: pointer; transition: all 0.15s;
        }
        .notif-subtab.active {
          background: var(--bg-card); color: var(--text-primary);
          box-shadow: 0 1px 4px rgba(0,0,0,0.07);
        }

        /* Anniversaires */
        .notif-anniv { display: flex; flex-direction: column; gap: 10px; }
        .notif-row {
          display: flex; align-items: center;
          justify-content: space-between; gap: 12px; flex-direction: row !important;
        }
        .notif-row-left { display: flex; align-items: center; gap: 12px; flex: 1; }
        .notif-row-emoji { font-size: 1.25rem; flex-shrink: 0; width: 28px; text-align: center; }
        .notif-row-label {
          font-size: 0.875rem; font-weight: 600; color: var(--text-primary);
          display: flex; align-items: center; gap: 7px;
        }
        .notif-row-desc  { font-size: 0.75rem; color: var(--text-muted); margin-top: 2px; }
        .notif-soon-badge {
          font-size: 0.625rem; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.05em; padding: 2px 6px; border-radius: 5px;
          background: #fef9c3; color: #a16207; border: 1px solid #fde047;
        }
        .param-toggle-switch.disabled { opacity: 0.4; cursor: not-allowed; }

        /* ── Notifications / Anniversaires ── */
        .param-section {
          background: var(--bg-card); border: 1px solid var(--border);
          border-radius: var(--radius-md); padding: 16px;
          display: flex; flex-direction: column; gap: 12px;
        }
        .param-section + .param-section { margin-top: 12px; }
        .param-section-title {
          display: flex; align-items: center; gap: 8px;
          font-size: 0.875rem; font-weight: 700; color: var(--text-primary);
        }
        .param-section-title-row {
          display: flex; align-items: center; justify-content: space-between;
        }
        .param-section-desc {
          font-size: 0.8125rem; color: var(--text-muted); margin: 0; line-height: 1.5;
        }
        .param-section-desc code {
          background: var(--border); padding: 1px 5px; border-radius: 4px;
          font-size: 0.75rem; font-family: monospace;
        }
        .param-toggle-switch { background: none; border: none; cursor: pointer; padding: 0; display: flex; }

        /* Modes anniversaire */
        .anniv-modes { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
        .anniv-mode-btn {
          padding: 10px 12px; border-radius: var(--radius-md);
          border: 1.5px solid var(--border); background: var(--bg-card);
          text-align: left; cursor: pointer; transition: all 0.15s;
        }
        .anniv-mode-btn.active { border-color: var(--brand); background: var(--brand-light); }
        .anniv-mode-label { font-size: 0.8125rem; font-weight: 700; color: var(--text-primary); }
        .anniv-mode-desc  { font-size: 0.75rem; color: var(--text-muted); margin-top: 2px; }
        .anniv-mode-btn.active .anniv-mode-label { color: var(--brand-700); }

        /* Textarea message */
        .anniv-textarea { resize: vertical; min-height: 80px; }
        .anniv-preview {
          font-size: 0.8125rem; color: var(--text-muted);
          padding: 8px 10px; background: var(--cream, #faf8f5);
          border-radius: var(--radius-sm); border: 1px dashed var(--border);
          line-height: 1.5;
        }
        .anniv-preview-label {
          font-weight: 700; font-size: 0.6875rem; text-transform: uppercase;
          letter-spacing: 0.06em; display: block; margin-bottom: 4px; color: var(--text-muted);
        }

        /* Cadeau */
        .anniv-cadeau-zone { display: flex; flex-direction: column; gap: 10px; }
        .anniv-cadeau-type-row { display: flex; gap: 8px; flex-wrap: wrap; }
        .anniv-cadeau-type-btn {
          flex: 1; padding: 8px 12px; border-radius: var(--radius-full);
          border: 1.5px solid var(--border); background: var(--bg-card);
          font-size: 0.8125rem; font-weight: 600; color: var(--text-secondary);
          cursor: pointer; transition: all 0.15s; white-space: nowrap;
        }
        .anniv-cadeau-type-btn.active { border-color: var(--brand); background: var(--brand-light); color: var(--brand-700); }
        .anniv-remise-row { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
        .anniv-pct-btn {
          padding: 7px 14px; border-radius: var(--radius-full);
          border: 1.5px solid var(--border); background: var(--bg-card);
          font-size: 0.8125rem; font-weight: 600; color: var(--text-secondary);
          cursor: pointer; transition: all 0.15s;
        }
        .anniv-pct-btn.active { border-color: var(--brand); background: var(--brand-light); color: var(--brand-700); }
        .anniv-pct-input { width: 80px !important; }
        .anniv-cadeau-hint {
          font-size: 0.75rem; color: var(--text-muted);
          padding: 8px 10px; background: var(--cream, #faf8f5);
          border-radius: var(--radius-sm); line-height: 1.5;
        }

        @media (max-width: 480px) {
          .anniv-modes { grid-template-columns: 1fr; }
        }
      
        /* ═══ Lot 1 « Paramètres qui respirent » (2026-09-09) ═══ */
        /* La liste des rubriques : une ligne par rubrique, un résumé, un chevron. */
        .rubriques { display: flex; flex-direction: column; gap: 18px; max-width: 760px; }
        .rubriques-groupe-titre {
          font-size: 0.72rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
          color: var(--text-muted); margin: 0 0 6px 4px;
        }
        .rubriques-lignes {
          display: flex; flex-direction: column;
          background: var(--bg-card); border: 1.5px solid var(--border);
          border-radius: var(--radius-lg); overflow: hidden;
          box-shadow: 0 2px 12px rgba(0,0,0,0.04);
        }
        .rubrique-ligne {
          display: flex; align-items: center; gap: 12px;
          padding: 12px 14px; min-height: 56px;
          color: var(--text-primary); text-decoration: none;
          border-bottom: 1px solid var(--border);
          transition: background var(--transition-fast);
        }
        .rubrique-ligne:last-child { border-bottom: none; }
        .rubrique-ligne:hover { background: var(--cream, #faf8f5); }
        .rubrique-ligne.active { background: var(--brand-light); }
        .rubrique-icone {
          width: 34px; height: 34px; border-radius: var(--radius-sm); flex-shrink: 0;
          background: var(--brand-light); color: var(--brand-700);
          display: flex; align-items: center; justify-content: center;
        }
        .rubrique-ligne.active .rubrique-icone { background: var(--bg-card); }
        .rubrique-texte { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
        .rubrique-label { font-size: 0.9375rem; font-weight: 600; line-height: 1.25; }
        .rubrique-resume {
          font-size: 0.78rem; color: var(--text-muted); line-height: 1.35;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .rubrique-chevron { color: var(--text-muted); flex-shrink: 0; }
        /* Version compacte (colonne de gauche d'une rubrique, desktop) */
        .rubriques-compact { gap: 12px; max-width: none; }
        .rubriques-compact .rubriques-lignes { box-shadow: none; border-width: 1px; }
        .rubriques-compact .rubrique-ligne { padding: 8px 10px; min-height: 40px; gap: 10px; }
        .rubriques-compact .rubrique-icone { width: 28px; height: 28px; }
        .rubriques-compact .rubrique-label { font-size: 0.84rem; }
        .rubriques-compact .rubrique-chevron { display: none; }
        /* Une rubrique : deux colonnes sur desktop, la rubrique seule sur mobile. */
        .parametres-colonnes { display: grid; grid-template-columns: 250px minmax(0, 1fr); gap: 20px; align-items: start; }
        .parametres-aside { position: sticky; top: 16px; display: flex; flex-direction: column; gap: 10px; }
        .parametres-main { min-width: 0; max-width: 860px; }
        .parametres-main > .section, .parametres-main > .izi-card { margin-bottom: 12px; }
        .parametres-main > .save-btn { margin: -4px 0 16px; }
        .parametres-retour {
          display: inline-flex; align-items: center; gap: 2px;
          font-size: 0.84rem; font-weight: 600; color: var(--text-secondary);
          text-decoration: none; padding: 4px 6px 4px 2px; border-radius: var(--radius-sm);
        }
        .parametres-retour:hover { color: var(--brand-700); background: var(--brand-light); }
        .parametres-retour-mobile { display: none; }
        .parametres-rubrique-head { display: flex; align-items: center; gap: 8px; margin: 0 0 12px; flex-wrap: wrap; }
        .parametres-rubrique-titre {
          font-family: var(--font-fraunces), Georgia, serif;
          font-variation-settings: 'opsz' 144, 'SOFT' 100;
          font-weight: 500; font-size: 1.5rem; letter-spacing: -0.02em; line-height: 1.1;
          color: #1a1612; margin: 0; flex: 1; min-width: 0;
        }
        @media (max-width: 900px) {
          .parametres-colonnes { grid-template-columns: 1fr; }
          .parametres-aside { display: none; }
          .parametres-retour-mobile { display: inline-flex; width: 100%; margin-bottom: 2px; }
          .parametres-main { max-width: none; }
        }
      `}</style>
  );
}

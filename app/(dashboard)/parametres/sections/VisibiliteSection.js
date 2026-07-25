'use client';

// ════════════════════════════════════════════════════════════════════════════
// Section "Visibilité par défaut des cours" — pour le portail public.
// Extrait de parametres/page.js en B2d (découpe mécanique, zéro changement).
// ════════════════════════════════════════════════════════════════════════════

import { Eye } from 'lucide-react';

export default function VisibiliteSection({ profile, setProfile, setDirty }) {
  const current = profile?.visibilite_default || 'public';
  const set = (val) => {
    setProfile(prev => ({ ...prev, visibilite_default: val }));
    setDirty(true);
  };

  const options = [
    { value: 'public',   label: 'Tout le monde',          desc: 'Visible par tous les visiteurs (default).' },
    { value: 'inscrits', label: 'Élèves inscrits',         desc: 'Seulement ceux qui ont déjà une fiche dans ton studio.' },
    { value: 'abonnes',  label: 'Détenteurs d\'abonnement', desc: 'Seulement avec un abonnement actif (carnet, mensuel...).' },
    { value: 'fideles',  label: 'Élèves fidèles',          desc: 'Seulement ceux marqués \'Fidèle\' dans ta CRM.' },
  ];

  return (
    <div className="section izi-card">
      <div className="section-top">
        <div className="section-icon"><Eye size={20} /></div>
        <h2>Visibilité des cours</h2>
      </div>
      <p className="section-desc">
        Détermine qui peut voir tes cours sur ton portail public. Ce paramètre s'applique
        à tous les <strong>nouveaux cours</strong> créés. Tu peux ensuite override la visibilité
        cours par cours depuis sa fiche.
      </p>

      <div className="vis-radio-group">
        {options.map(opt => (
          <label key={opt.value} className={`vis-radio-opt ${current === opt.value ? 'active' : ''}`}>
            <input
              type="radio"
              name="visibilite_default"
              value={opt.value}
              checked={current === opt.value}
              onChange={() => set(opt.value)}
            />
            <div>
              <div className="vis-radio-label">{opt.label}</div>
              <div className="vis-radio-desc">{opt.desc}</div>
            </div>
          </label>
        ))}
      </div>

      {/* Toggle : afficher ou non la jauge places/inscrits sur le portail public */}
      <div className="vis-inscrits">
        <button
          type="button"
          className={`vis-switch ${profile?.afficher_inscrits !== false ? 'on' : ''}`}
          onClick={() => { setProfile(prev => ({ ...prev, afficher_inscrits: !(prev?.afficher_inscrits !== false) })); setDirty(true); }}
          aria-pressed={profile?.afficher_inscrits !== false}
          aria-label="Afficher les places / inscrits sur le portail public"
        >
          <span className="vis-knob" />
        </button>
        <div>
          <div className="vis-radio-label">Afficher les places / inscrits sur le portail</div>
          <div className="vis-radio-desc">Le badge « Complet » reste toujours affiché. Désactive si tu préfères ne pas montrer les places restantes (utile quand il y a peu d'inscrits).</div>
        </div>
      </div>

      <style jsx>{`
        .vis-radio-group { display: flex; flex-direction: column; gap: 6px; margin-top: 8px; }
        .vis-radio-opt {
          display: flex; align-items: flex-start; gap: 10px;
          padding: 10px 12px; border: 1.5px solid var(--border);
          border-radius: 10px; cursor: pointer; transition: all 0.15s;
        }
        .vis-radio-opt.active { border-color: var(--brand); background: var(--brand-light); }
        .vis-radio-opt input { margin-top: 4px; accent-color: var(--brand); }
        .vis-radio-label { font-size: 0.875rem; font-weight: 600; color: var(--text-primary); }
        .vis-radio-desc { font-size: 0.75rem; color: var(--text-secondary); margin-top: 2px; line-height: 1.4; }
        .vis-inscrits { display: flex; align-items: flex-start; gap: 12px; margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--border); }
        .vis-switch { flex-shrink: 0; width: 42px; height: 24px; border-radius: 99px; border: none; background: var(--border); cursor: pointer; position: relative; transition: background 0.2s; padding: 0; }
        .vis-switch.on { background: var(--brand); }
        .vis-knob { position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 50%; background: white; transition: transform 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.2); }
        .vis-switch.on .vis-knob { transform: translateX(18px); }
      `}</style>
    </div>
  );
}

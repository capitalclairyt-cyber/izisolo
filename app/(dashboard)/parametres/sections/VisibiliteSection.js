'use client';

// ════════════════════════════════════════════════════════════════════════════
// Section "Visibilité par défaut des cours" — pour le portail public. La carte
// (titre, résumé, bouton) est rendue par la rubrique (lot 2).
// ════════════════════════════════════════════════════════════════════════════

export default function VisibiliteSection({ profile, setProfile, setDirty }) {
  const current = profile?.visibilite_default || 'public';
  const set = (val) => {
    setProfile(prev => ({ ...prev, visibilite_default: val }));
    setDirty(true);
  };

  const options = [
    { value: 'public',   label: 'Tout le monde',            desc: 'Visible par tous les visiteurs.' },
    { value: 'inscrits', label: 'Élèves inscrits',          desc: 'Celles et ceux qui ont une fiche chez toi.' },
    { value: 'abonnes',  label: 'Détenteurs d\'abonnement', desc: 'Avec un carnet ou un abonnement actif.' },
    { value: 'fideles',  label: 'Élèves fidèles',           desc: 'Marqués « Fidèle » sur leur fiche, par toi.' },
  ];

  return (
    <>
      <p className="section-desc">
        Qui voit tes <strong>nouveaux cours</strong> sur ta page publique. Chaque cours peut ensuite avoir sa propre visibilité.
      </p>

      <div className="vis-radio-group">
        {options.map(opt => (
          <label key={opt.value} className={`vis-radio-opt ${current === opt.value ? 'active' : ''}`}>
            <input type="radio" name="visibilite_default" value={opt.value} checked={current === opt.value} onChange={() => set(opt.value)} />
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
          <div className="vis-radio-label">Afficher les places restantes sur ma page</div>
          <div className="vis-radio-desc">Le badge « Complet » reste toujours affiché.</div>
        </div>
      </div>

      <style jsx>{`
        .vis-radio-group { display: flex; flex-direction: column; gap: 6px; margin-top: 4px; }
        .vis-radio-opt {
          display: flex; align-items: flex-start; gap: 10px;
          padding: 8px 12px; border: 1.5px solid var(--border);
          border-radius: 10px; cursor: pointer; transition: all 0.15s;
        }
        .vis-radio-opt.active { border-color: var(--brand); background: var(--brand-light); }
        .vis-radio-opt input { margin-top: 4px; accent-color: var(--brand); }
        .vis-radio-label { font-size: 0.875rem; font-weight: 600; color: var(--text-primary); }
        .vis-radio-desc { font-size: 0.75rem; color: var(--text-secondary); margin-top: 2px; line-height: 1.4; }
        .vis-inscrits { display: flex; align-items: flex-start; gap: 12px; margin-top: 10px; padding-top: 12px; border-top: 1px solid var(--border); }
        .vis-switch { flex-shrink: 0; width: 42px; height: 24px; border-radius: 99px; border: none; background: var(--border); cursor: pointer; position: relative; transition: background 0.2s; padding: 0; }
        .vis-switch.on { background: var(--brand); }
        .vis-knob { position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 50%; background: white; transition: transform 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.2); }
        .vis-switch.on .vis-knob { transform: translateX(18px); }
      `}</style>
    </>
  );
}

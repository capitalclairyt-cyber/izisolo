'use client';

import { useState, useEffect } from 'react';
import {
  Plus, X, Trash2, ToggleRight, ToggleLeft,
  Zap, Info, Loader2, ChevronDown
} from 'lucide-react';
import { createClient } from '@/lib/supabase';
import {
  CONDITIONS, ACTIONS,
  getConditionLabel, getActionLabel,
  defaultConditionParams, defaultActionParams,
} from '@/lib/regles';

// ═══════════════════════════════════════════════════════════════════════════
// Modal — Builder de règle
// ═══════════════════════════════════════════════════════════════════════════
function RegleBuilderModal({ onClose, onSave, editingRegle }) {
  const [nom, setNom] = useState(editingRegle?.nom || '');
  const [conditionType, setConditionType] = useState(
    editingRegle?.condition_type || 'abonnement_actif'
  );
  const [conditionParams, setConditionParams] = useState(
    editingRegle?.condition_params || defaultConditionParams('abonnement_actif')
  );
  const [actionType, setActionType] = useState(
    editingRegle?.action_type || 'payer_plus_tard_auto'
  );
  const [actionParams, setActionParams] = useState(
    editingRegle?.action_params || defaultActionParams('payer_plus_tard_auto')
  );
  const [saving, setSaving] = useState(false);

  const currentConditionDef = CONDITIONS.find(c => c.type === conditionType);
  const currentActionDef    = ACTIONS.find(a => a.type === actionType);

  // Auto-génère un nom si vide
  const autoName = () => {
    const cLabel = getConditionLabel({ condition_type: conditionType, condition_params: conditionParams });
    const aLabel = getActionLabel({ action_type: actionType, action_params: actionParams });
    return `${cLabel} → ${aLabel}`;
  };

  const handleConditionChange = (newType) => {
    setConditionType(newType);
    setConditionParams(defaultConditionParams(newType));
  };

  const handleActionChange = (newType) => {
    setActionType(newType);
    setActionParams(defaultActionParams(newType));
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave({
      nom: nom.trim() || autoName(),
      condition_type: conditionType,
      condition_params: conditionParams,
      action_type: actionType,
      action_params: actionParams,
    });
    setSaving(false);
  };

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-sheet animate-slide-up">

        {/* Header */}
        <div className="modal-header">
          <div style={{ width: 36 }} />
          <span className="modal-title">
            {editingRegle ? 'Modifier la règle' : 'Nouvelle règle'}
          </span>
          <button className="modal-close" onClick={onClose} type="button">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">

          {/* ── SI ─────────────────────────────────────────── */}
          <div className="builder-block builder-if">
            <div className="builder-chip builder-chip-if">SI</div>
            <div className="builder-content">
              <select
                className="izi-input"
                value={conditionType}
                onChange={e => handleConditionChange(e.target.value)}
              >
                {CONDITIONS.map(c => (
                  <option key={c.type} value={c.type}>{c.label}</option>
                ))}
              </select>

              {/* Params de condition */}
              {currentConditionDef?.params.map(param => {
                if (param.type === 'select') {
                  return (
                    <select
                      key={param.key}
                      className="izi-input"
                      value={conditionParams[param.key] ?? param.default ?? ''}
                      onChange={e => setConditionParams(prev => ({ ...prev, [param.key]: e.target.value }))}
                    >
                      {param.options.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  );
                }
                if (param.type === 'number') {
                  return (
                    <div key={param.key} className="param-row">
                      <input
                        className="izi-input param-number"
                        type="number"
                        min={param.min ?? 0}
                        value={conditionParams[param.key] ?? param.default}
                        onChange={e => setConditionParams(prev => ({ ...prev, [param.key]: parseInt(e.target.value) || param.default }))}
                      />
                      {param.suffix && <span className="param-suffix">{param.suffix}</span>}
                    </div>
                  );
                }
                return null;
              })}

              {currentConditionDef?.description && (
                <p className="builder-hint">{currentConditionDef.description}</p>
              )}
            </div>
          </div>

          <div className="builder-arrow">↓</div>

          {/* ── ALORS ──────────────────────────────────────── */}
          <div className="builder-block builder-then">
            <div className="builder-chip builder-chip-then">ALORS</div>
            <div className="builder-content">
              <select
                className="izi-input"
                value={actionType}
                onChange={e => handleActionChange(e.target.value)}
              >
                {ACTIONS.map(a => (
                  <option key={a.type} value={a.type}>
                    {a.label}{a.bientot ? ' ✦ bientôt' : ''}
                  </option>
                ))}
              </select>

              {/* Params d'action */}
              {currentActionDef?.params.map(param => {
                if (param.type === 'number') {
                  return (
                    <div key={param.key} className="param-row">
                      <input
                        className="izi-input param-number"
                        type="number"
                        min={param.min || 1}
                        value={actionParams[param.key] ?? param.default}
                        onChange={e => setActionParams(prev => ({ ...prev, [param.key]: parseInt(e.target.value) || param.default }))}
                      />
                      {param.suffix && <span className="param-suffix">{param.suffix}</span>}
                    </div>
                  );
                }
                if (param.type === 'text') {
                  return (
                    <div key={param.key} className="param-text-row">
                      {param.label && <label className="param-label">{param.label}</label>}
                      <input
                        className="izi-input"
                        type="text"
                        maxLength={200}
                        value={actionParams[param.key] ?? param.default ?? ''}
                        onChange={e => setActionParams(prev => ({ ...prev, [param.key]: e.target.value }))}
                      />
                    </div>
                  );
                }
                if (param.type === 'textarea') {
                  return (
                    <div key={param.key} className="param-text-row">
                      {param.label && <label className="param-label">{param.label}</label>}
                      <textarea
                        className="izi-input"
                        rows={4}
                        maxLength={2000}
                        value={actionParams[param.key] ?? param.default ?? ''}
                        onChange={e => setActionParams(prev => ({ ...prev, [param.key]: e.target.value }))}
                      />
                      <p className="param-hint">Variables disponibles : <code>{'{{prenom}}'}</code>, <code>{'{{nom}}'}</code>, <code>{'{{studio}}'}</code></p>
                    </div>
                  );
                }
                return null;
              })}

              {currentActionDef?.bientot && (
                <div className="action-bientot-notice">
                  <Info size={13} />
                  <span>Sera activée avec le module réservation en ligne.</span>
                </div>
              )}

              {currentActionDef?.description && !currentActionDef.bientot && (
                <p className="builder-hint">{currentActionDef.description}</p>
              )}
            </div>
          </div>

          {/* ── Nom ────────────────────────────────────────── */}
          <div className="builder-nom-section">
            <label className="form-label">Nom de la règle (optionnel)</label>
            <input
              className="izi-input"
              type="text"
              value={nom}
              onChange={e => setNom(e.target.value)}
              placeholder={autoName()}
            />
          </div>

          <button
            className="izi-btn izi-btn-primary confirm-btn"
            onClick={handleSave}
            disabled={saving}
            type="button"
          >
            {saving
              ? <><Loader2 size={16} className="spin" /> Enregistrement...</>
              : editingRegle ? 'Enregistrer les modifications' : 'Créer la règle'
            }
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Composant principal — onglet Règles
// ═══════════════════════════════════════════════════════════════════════════
export default function ReglesTab({ profileId }) {
  const [regles, setRegles]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingRegle, setEditingRegle] = useState(null);

  const loadRegles = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('regles')
      .select('*')
      .eq('profile_id', profileId)
      .order('ordre');
    setRegles(data || []);
    setLoading(false);
  };

  useEffect(() => { loadRegles(); }, [profileId]);

  const toggleActif = async (regle) => {
    const supabase = createClient();
    await supabase.from('regles').update({ actif: !regle.actif }).eq('id', regle.id);
    setRegles(prev => prev.map(r => r.id === regle.id ? { ...r, actif: !r.actif } : r));
  };

  const deleteRegle = async (id) => {
    if (!confirm('Supprimer cette règle ?')) return;
    const supabase = createClient();
    await supabase.from('regles').delete().eq('id', id);
    setRegles(prev => prev.filter(r => r.id !== id));
  };

  const saveRegle = async (data) => {
    const supabase = createClient();
    if (editingRegle) {
      await supabase.from('regles').update(data).eq('id', editingRegle.id);
    } else {
      await supabase.from('regles').insert({
        ...data,
        profile_id: profileId,
        ordre: regles.length,
        actif: true,
      });
    }
    setShowBuilder(false);
    setEditingRegle(null);
    await loadRegles();
  };

  const openEdit = (regle) => {
    setEditingRegle(regle);
    setShowBuilder(true);
  };

  // Catégorise par statut d'action (disponible vs bientôt)
  const getActionBientot = (actionType) =>
    ACTIONS.find(a => a.type === actionType)?.bientot || false;

  return (
    <div className="regles-tab">

      {/* Intro */}
      <div className="regles-intro izi-card">
        <div className="regles-intro-icon"><Zap size={20} /></div>
        <div>
          <p className="regles-intro-title">Règles automatiques</p>
          <p className="regles-intro-desc">
            Définis des règles <strong>SI / ALORS</strong> qui s'appliquent automatiquement
            selon le profil de tes élèves. Par exemple : les abonnés annuels peuvent payer plus tard
            sans confirmation, ou réserver leur place chaque semaine.
          </p>
        </div>
      </div>

      {/* Liste */}
      {loading ? (
        <div className="regles-loading">
          <Loader2 size={20} className="spin" /> Chargement...
        </div>
      ) : regles.length === 0 ? (
        <div className="regles-empty izi-card">
          <p className="regles-empty-title">Aucune règle configurée</p>
          <p className="regles-empty-hint">
            Crée ta première règle pour automatiser la gestion de tes élèves.
          </p>
        </div>
      ) : (
        <div className="regles-list">
          {regles.map(regle => {
            const bientot = getActionBientot(regle.action_type);
            return (
              <div
                key={regle.id}
                className={`regle-card izi-card ${!regle.actif ? 'regle-inactive' : ''} ${bientot ? 'regle-bientot-mode' : ''}`}
              >
                <div className="regle-body" onClick={() => openEdit(regle)} style={{ cursor: 'pointer' }}>
                  {/* Condition */}
                  <div className="regle-sentence">
                    <span className="regle-chip regle-chip-if">SI</span>
                    <span className="regle-label">{getConditionLabel(regle)}</span>
                  </div>
                  {/* Action */}
                  <div className="regle-sentence">
                    <span className="regle-chip regle-chip-then">ALORS</span>
                    <span className="regle-label">{getActionLabel(regle)}</span>
                    {bientot && <span className="regle-bientot-badge">bientôt</span>}
                  </div>
                  {/* Nom */}
                  <p className="regle-nom">{regle.nom}</p>
                </div>

                {/* Contrôles */}
                <div className="regle-controls">
                  <button
                    className="regle-toggle"
                    onClick={() => toggleActif(regle)}
                    title={regle.actif ? 'Désactiver' : 'Activer'}
                    type="button"
                  >
                    {regle.actif
                      ? <ToggleRight size={24} style={{ color: 'var(--success)' }} />
                      : <ToggleLeft size={24} style={{ color: 'var(--text-muted)' }} />
                    }
                  </button>
                  <button
                    className="regle-delete"
                    onClick={() => deleteRegle(regle.id)}
                    title="Supprimer"
                    type="button"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bouton Nouvelle règle */}
      <button
        className="izi-btn izi-btn-secondary add-regle-btn"
        onClick={() => { setEditingRegle(null); setShowBuilder(true); }}
        type="button"
      >
        <Plus size={18} /> Nouvelle règle
      </button>

      {/* Modal builder */}
      {showBuilder && (
        <RegleBuilderModal
          onClose={() => { setShowBuilder(false); setEditingRegle(null); }}
          onSave={saveRegle}
          editingRegle={editingRegle}
        />
      )}

      <style jsx global>{`
        .regles-tab { display: flex; flex-direction: column; gap: 12px; }

        /* Intro */
        .regles-intro { display: flex; align-items: flex-start; gap: 12px; padding: 16px; }
        .regles-intro-icon { width: 40px; height: 40px; border-radius: var(--radius-sm); background: var(--brand-light); color: var(--brand); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .regles-intro-title { font-weight: 700; font-size: 0.9375rem; color: var(--text-primary); }
        .regles-intro-desc { font-size: 0.8125rem; color: var(--text-secondary); margin-top: 4px; line-height: 1.5; }

        /* États chargement/vide */
        .regles-loading { display: flex; align-items: center; gap: 8px; padding: 24px 0; color: var(--text-muted); font-size: 0.875rem; }
        .regles-empty { padding: 24px; text-align: center; }
        .regles-empty-title { font-weight: 600; color: var(--text-primary); }
        .regles-empty-hint { font-size: 0.8125rem; color: var(--text-muted); margin-top: 6px; }

        /* Cartes de règles */
        .regles-list { display: flex; flex-direction: column; gap: 8px; }
        .regle-card { display: flex; align-items: center; gap: 8px; padding: 14px 12px 14px 16px; transition: opacity var(--transition-fast); }
        .regle-inactive { opacity: 0.5; }
        .regle-bientot-mode { border-left: 3px solid var(--text-muted); }

        .regle-body { flex: 1; display: flex; flex-direction: column; gap: 5px; }
        .regle-sentence { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

        .regle-chip { font-size: 0.6875rem; font-weight: 800; padding: 2px 7px; border-radius: var(--radius-full); flex-shrink: 0; letter-spacing: 0.06em; }
        .regle-chip-if   { background: #dbeafe; color: #1d4ed8; }
        .regle-chip-then { background: #dcfce7; color: #15803d; }
        .regle-label { font-size: 0.875rem; color: var(--text-primary); font-weight: 500; }
        .regle-bientot-badge { font-size: 0.65rem; font-weight: 700; padding: 1px 6px; border-radius: var(--radius-full); background: var(--text-muted); color: white; margin-left: 4px; }
        .regle-nom { font-size: 0.75rem; color: var(--text-muted); margin-top: 2px; }

        .regle-controls { display: flex; align-items: center; gap: 2px; flex-shrink: 0; }
        .regle-toggle { background: none; border: none; cursor: pointer; padding: 4px; border-radius: var(--radius-sm); display: flex; }
        .regle-delete  { background: none; border: none; cursor: pointer; padding: 6px; border-radius: var(--radius-sm); color: var(--danger); opacity: 0.5; }
        .regle-delete:hover { opacity: 1; background: #fef2f2; }

        /* Bouton ajouter */
        .add-regle-btn { width: 100%; justify-content: center; }

        /* ── Modal builder ───────────────────────────────── */
        .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 300; display: flex; align-items: flex-end; justify-content: center; }
        @media (min-width: 600px) { .modal-backdrop { align-items: center; } }
        .modal-sheet { background: var(--bg-card); border-radius: var(--radius-lg) var(--radius-lg) 0 0; width: 100%; max-width: 540px; max-height: 92vh; display: flex; flex-direction: column; overflow: hidden; }
        @media (min-width: 600px) { .modal-sheet { border-radius: var(--radius-lg); } }

        .modal-header { display: flex; align-items: center; padding: 16px 16px 12px; border-bottom: 1px solid var(--border); flex-shrink: 0; }
        .modal-title { flex: 1; text-align: center; font-weight: 700; font-size: 1rem; }
        .modal-close { background: none; border: none; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; color: var(--text-secondary); cursor: pointer; border-radius: var(--radius-sm); }
        .modal-close:hover { background: var(--cream-dark); }

        .modal-body { padding: 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 16px; }

        /* Builder blocks */
        .builder-block { display: flex; align-items: flex-start; gap: 12px; }
        .builder-chip { display: flex; align-items: center; justify-content: center; min-width: 56px; height: 36px; border-radius: var(--radius-full); font-weight: 800; font-size: 0.75rem; letter-spacing: 0.06em; flex-shrink: 0; margin-top: 1px; }
        .builder-chip-if   { background: #dbeafe; color: #1d4ed8; }
        .builder-chip-then { background: #dcfce7; color: #15803d; }
        .builder-content { flex: 1; display: flex; flex-direction: column; gap: 8px; }
        .builder-arrow { text-align: left; padding-left: 16px; color: var(--text-muted); font-size: 1.25rem; line-height: 1; }
        .builder-hint { font-size: 0.75rem; color: var(--text-muted); line-height: 1.4; }
        .builder-nom-section { display: flex; flex-direction: column; gap: 6px; padding-top: 8px; border-top: 1px solid var(--border); }

        /* Param row (number) */
        .param-row { display: flex; align-items: center; gap: 8px; }
        .param-number { width: 80px; text-align: center; }
        .param-suffix { font-size: 0.875rem; color: var(--text-secondary); }

        /* Param row (text/textarea) */
        .param-text-row { display: flex; flex-direction: column; gap: 4px; }
        .param-label { font-size: 0.75rem; font-weight: 600; color: var(--text-secondary); }
        .param-hint { font-size: 0.7rem; color: var(--text-muted); margin-top: 2px; }
        .param-hint code { background: var(--bg-soft, #faf8f5); padding: 1px 4px; border-radius: 4px; font-size: 0.7rem; }

        /* Notice bientôt */
        .action-bientot-notice { display: flex; align-items: center; gap: 6px; padding: 8px 12px; background: #fef9c3; border-radius: var(--radius-sm); font-size: 0.8rem; color: #854d0e; }

        .confirm-btn { width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; }

        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 0.8s linear infinite; }
      `}</style>
    </div>
  );
}

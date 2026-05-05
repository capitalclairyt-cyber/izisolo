'use client';

/**
 * Onglet "Règles métier" dans Paramètres.
 *
 * Affiche les 7 cas particuliers paramétrables. Chaque cas est une carte
 * expandable avec :
 *   - Mode automatique / manuel (radio)
 *   - Si auto : choix d'action (radio)
 *   - Toggles notifications (prof / email élève / SMS élève)
 *   - Message custom optionnel
 *
 * Sauvegarde sur profiles.regles_metier (JSONB).
 */

import { useState, useEffect } from 'react';
import { ChevronDown, Save, AlertCircle, Loader2, ToggleLeft, ToggleRight } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { useToast } from '@/components/ui/ToastProvider';
import { CASES, getRegle } from '@/lib/regles-metier';
import { SMS_ENABLED } from '@/lib/constantes';

export default function ReglesMetierTab({ profileId }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [regles, setRegles] = useState({});
  const [expandedId, setExpandedId] = useState(null);
  const [profile, setProfile] = useState(null);

  // Charger la config actuelle
  useEffect(() => {
    if (!profileId) return;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('profiles')
        .select('regles_metier')
        .eq('id', profileId)
        .single();
      const fakeProfile = { regles_metier: data?.regles_metier || null };
      setProfile(fakeProfile);
      // Charge les valeurs effectives (avec fallback sur les défauts)
      const initial = {};
      for (const c of CASES) {
        initial[c.id] = getRegle(fakeProfile, c.id);
      }
      setRegles(initial);
      setLoading(false);
    })();
  }, [profileId]);

  const updateRegle = (caseId, patch) => {
    setRegles(prev => ({
      ...prev,
      [caseId]: { ...prev[caseId], ...patch },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('profiles')
        .update({ regles_metier: regles })
        .eq('id', profileId);
      if (error) throw error;
      toast.success('Règles enregistrées');
    } catch (err) {
      toast.error('Erreur : ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefaults = () => {
    if (!confirm('Réinitialiser les 7 règles à leurs valeurs par défaut ? Ton paramétrage actuel sera écrasé (tu pourras toujours le réenregistrer).')) return;
    const reset = {};
    for (const c of CASES) {
      reset[c.id] = { ...c.defaut, messageCustom: null };
    }
    setRegles(reset);
    toast.success('Valeurs par défaut restaurées (clique Enregistrer pour valider)');
  };

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
        <Loader2 size={20} className="spin" /> Chargement…
      </div>
    );
  }

  return (
    <div className="rm-tab">
      {/* Intro */}
      <div className="rm-intro">
        <AlertCircle size={18} />
        <div>
          <strong>Cadre les cas particuliers une fois pour toutes.</strong> L'app
          appliquera tes règles automatiquement, ou te remontera le cas dans une
          inbox « À traiter » si tu choisis le mode manuel. Tu peux modifier
          ces règles à tout moment.
          <div style={{ marginTop: 10 }}>
            💡 <em>Pas envie de tout configurer ?</em> Les valeurs par défaut sont
            déjà saines (équilibre strict/souple, notif élève quand pertinent).
            Tu peux <strong>cliquer Enregistrer en bas tout de suite</strong> et
            ajuster plus tard si besoin.
          </div>
        </div>
      </div>

      {/* Cards des 7 cas */}
      <div className="rm-cards">
        {CASES.map(caseDef => {
          const r = regles[caseDef.id] || caseDef.defaut;
          const expanded = expandedId === caseDef.id;
          const isAuto = r.mode === 'auto';
          const summary = isAuto
            ? caseDef.options.find(o => o.value === r.choix)?.label || 'Non configuré'
            : 'Géré manuellement';

          return (
            <div key={caseDef.id} className={`rm-card ${expanded ? 'expanded' : ''}`}>
              <button
                type="button"
                className="rm-card-header"
                onClick={() => setExpandedId(expanded ? null : caseDef.id)}
              >
                <span className="rm-icon">{caseDef.icone}</span>
                <div className="rm-header-text">
                  <div className="rm-titre">{caseDef.titre}</div>
                  <div className="rm-summary">→ {summary}</div>
                </div>
                <ChevronDown
                  size={18}
                  className={`rm-chevron ${expanded ? 'rotated' : ''}`}
                />
              </button>

              {expanded && (
                <div className="rm-card-body">
                  <p className="rm-desc">{caseDef.desc}</p>

                  {/* Mode auto / manuel */}
                  <div className="rm-block">
                    <div className="rm-block-title">Comment l'app doit gérer ce cas</div>
                    <div className="rm-radio-group">
                      <label className={`rm-radio ${isAuto ? 'selected' : ''}`}>
                        <input
                          type="radio"
                          name={`mode-${caseDef.id}`}
                          checked={isAuto}
                          onChange={() => updateRegle(caseDef.id, { mode: 'auto', choix: r.choix || caseDef.defaut.choix })}
                        />
                        <span><strong>Automatique</strong> — l'app applique ma règle</span>
                      </label>
                      <label className={`rm-radio ${!isAuto ? 'selected' : ''}`}>
                        <input
                          type="radio"
                          name={`mode-${caseDef.id}`}
                          checked={!isAuto}
                          onChange={() => updateRegle(caseDef.id, { mode: 'manuel', choix: null })}
                        />
                        <span><strong>Manuel</strong> — je veux gérer chaque cas dans l'inbox « À traiter »</span>
                      </label>
                    </div>
                  </div>

                  {/* Choix de l'action (uniquement si mode auto) */}
                  {isAuto && (
                    <div className="rm-block">
                      <div className="rm-block-title">Action automatique</div>
                      <div className="rm-radio-group">
                        {caseDef.options.map(opt => (
                          <label key={opt.value} className={`rm-radio rm-radio-option ${r.choix === opt.value ? 'selected' : ''}`}>
                            <input
                              type="radio"
                              name={`choix-${caseDef.id}`}
                              checked={r.choix === opt.value}
                              onChange={() => updateRegle(caseDef.id, { choix: opt.value })}
                            />
                            <span>
                              <strong>{opt.label}</strong>
                              {opt.subText && <em>{opt.subText}</em>}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Notifications */}
                  <div className="rm-block">
                    <div className="rm-block-title">Notifications quand ce cas se présente</div>
                    <div className="rm-toggles">
                      <button
                        type="button"
                        className="rm-toggle-row"
                        onClick={() => updateRegle(caseDef.id, { notifProf: !r.notifProf })}
                      >
                        {r.notifProf ? <ToggleRight size={24} style={{ color: 'var(--brand)' }} /> : <ToggleLeft size={24} style={{ color: 'var(--text-muted)' }} />}
                        <span>Alerte sur mon dashboard</span>
                      </button>
                      <button
                        type="button"
                        className="rm-toggle-row"
                        onClick={() => updateRegle(caseDef.id, { notifEleveEmail: !r.notifEleveEmail })}
                      >
                        {r.notifEleveEmail ? <ToggleRight size={24} style={{ color: 'var(--brand)' }} /> : <ToggleLeft size={24} style={{ color: 'var(--text-muted)' }} />}
                        <span>Email automatique à l'élève</span>
                      </button>
                      <button
                        type="button"
                        className="rm-toggle-row rm-toggle-disabled"
                        disabled
                        title="SMS bientôt disponibles"
                      >
                        <ToggleLeft size={24} style={{ color: 'var(--border)' }} />
                        <span>SMS automatique à l'élève <em>(bientôt disponible)</em></span>
                      </button>
                    </div>
                  </div>

                  {/* Message custom (optionnel) */}
                  {r.notifEleveEmail && (
                    <div className="rm-block">
                      <div className="rm-block-title">
                        Message custom à l'élève (optionnel)
                      </div>
                      <p className="rm-block-hint">
                        Laisse vide pour utiliser le message par défaut. Tu peux utiliser
                        <code> {'{prenom}'} </code>, <code>{'{cours}'}</code>,
                        <code>{'{date}'}</code>.
                      </p>
                      <textarea
                        className="izi-input"
                        rows={3}
                        value={r.messageCustom || ''}
                        onChange={(e) => updateRegle(caseDef.id, { messageCustom: e.target.value || null })}
                        placeholder="Ex: Hello {prenom}, suite à ton annulation tardive..."
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="rm-actions">
        <button
          type="button"
          className="izi-btn izi-btn-ghost"
          onClick={handleResetToDefaults}
          disabled={saving}
        >
          Réinitialiser aux défauts
        </button>
        <button
          type="button"
          className="izi-btn izi-btn-primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? <><Loader2 size={16} className="spin" /> Enregistrement…</> : <><Save size={16} /> Enregistrer mes règles</>}
        </button>
      </div>

      <style jsx global>{`
        .rm-tab { display: flex; flex-direction: column; gap: 16px; }

        .rm-intro {
          display: flex; gap: 12px; align-items: flex-start;
          padding: 14px 16px;
          background: var(--brand-light);
          border: 1px solid var(--brand-200);
          border-radius: var(--radius-md);
          color: var(--text-primary);
          font-size: 0.875rem; line-height: 1.5;
        }
        .rm-intro > svg { flex-shrink: 0; color: var(--brand-700); margin-top: 2px; }
        .rm-intro strong { color: var(--brand-700); }

        .rm-cards { display: flex; flex-direction: column; gap: 8px; }

        .rm-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          overflow: hidden;
          transition: border-color var(--transition-fast);
        }
        .rm-card.expanded { border-color: var(--brand-300); }

        .rm-card-header {
          display: flex; align-items: center; gap: 14px;
          width: 100%;
          padding: 14px 16px;
          background: none; border: none;
          cursor: pointer;
          text-align: left;
          font-family: inherit;
        }
        .rm-card-header:hover { background: var(--bg-card-hover); }
        .rm-icon {
          font-size: 1.5rem;
          width: 36px; height: 36px;
          display: inline-flex; align-items: center; justify-content: center;
          background: var(--brand-light); border-radius: var(--radius-sm);
          flex-shrink: 0;
        }
        .rm-header-text { flex: 1; min-width: 0; }
        .rm-titre {
          font-weight: 600; font-size: 0.9375rem;
          color: var(--text-primary);
          line-height: 1.3;
        }
        .rm-summary {
          font-size: 0.8125rem; color: var(--text-secondary);
          margin-top: 2px;
        }
        .rm-chevron {
          color: var(--text-muted);
          transition: transform 0.2s ease;
          flex-shrink: 0;
        }
        .rm-chevron.rotated { transform: rotate(180deg); }

        .rm-card-body {
          padding: 4px 16px 18px;
          display: flex; flex-direction: column; gap: 14px;
          border-top: 1px solid var(--border);
        }

        .rm-desc {
          font-size: 0.875rem;
          color: var(--text-secondary);
          margin: 12px 0 0;
          line-height: 1.5;
        }

        .rm-block { display: flex; flex-direction: column; gap: 8px; }
        .rm-block-title {
          font-size: 0.75rem; font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.04em;
          color: var(--text-muted);
        }
        .rm-block-hint {
          font-size: 0.75rem; color: var(--text-muted);
          margin: 0; line-height: 1.5;
        }
        .rm-block-hint code {
          background: var(--cream); padding: 1px 5px; border-radius: 4px;
          font-size: 0.75rem;
        }

        .rm-radio-group {
          display: flex; flex-direction: column; gap: 6px;
        }
        .rm-radio {
          display: flex; align-items: flex-start; gap: 10px;
          padding: 10px 12px;
          background: var(--bg-card); border: 1.5px solid var(--border);
          border-radius: var(--radius-sm);
          cursor: pointer;
          font-size: 0.875rem; line-height: 1.4;
          transition: all var(--transition-fast);
        }
        .rm-radio:hover { border-color: var(--brand-200); }
        .rm-radio.selected {
          border-color: var(--brand);
          background: var(--brand-50);
        }
        .rm-radio input[type="radio"] {
          margin-top: 2px;
          accent-color: var(--brand);
        }
        .rm-radio-option em {
          display: block;
          color: var(--text-muted);
          font-size: 0.75rem;
          font-style: normal;
          margin-top: 2px;
          line-height: 1.4;
        }

        .rm-toggles { display: flex; flex-direction: column; gap: 4px; }
        .rm-toggle-row {
          display: flex; align-items: center; gap: 10px;
          padding: 8px 4px;
          background: none; border: none;
          cursor: pointer;
          font-size: 0.875rem;
          color: var(--text-primary);
          font-family: inherit;
          text-align: left;
        }
        .rm-toggle-row em {
          color: var(--text-muted); font-style: italic;
        }
        .rm-toggle-disabled { cursor: not-allowed; color: var(--text-muted); }

        .rm-actions {
          display: flex; justify-content: space-between; gap: 12px;
          padding: 12px 0; flex-wrap: wrap;
        }
      `}</style>
    </div>
  );
}

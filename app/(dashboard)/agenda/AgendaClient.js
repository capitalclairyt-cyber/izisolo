'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  ChevronLeft, ChevronRight, Clock, Plus, CheckCircle2,
  Users, Calendar, List, LayoutGrid, Filter, X, Eye
} from 'lucide-react';
import { formatHeure, getAllTypesFromCategories } from '@/lib/utils';
import {
  parseDate, toDateStr, getLundi, getSemaine, addDays, addMonths,
  isAujourdhui, getGrilleMois, JOURS_COURTS, MOIS,
  formatDateLong, formatDateCourte
} from '@/lib/dates';
import { createClient } from '@/lib/supabase';

// ============================================
// Constantes
// ============================================
const VUES = [
  { id: 'jour',    label: 'Jour',    icon: List },
  { id: 'semaine', label: 'Semaine', icon: Calendar },
  { id: 'mois',    label: 'Mois',    icon: LayoutGrid },
];

// ============================================
// Composant principal
// ============================================
export default function AgendaClient({ cours: initialCours, profile, initialDate }) {
  const [vue, setVue]               = useState('semaine');
  const [dateRef, setDateRef]       = useState(() => parseDate(initialDate));
  const [cours, setCours]           = useState(initialCours);
  const [loading, setLoading]       = useState(false);
  const [filtre, setFiltre]         = useState(null);
  const [showFiltres, setShowFiltres] = useState(false);
  // Case active pour le split diagonal
  const [activeCell, setActiveCell] = useState(null);

  const filtreRef  = useRef(null);
  const agendaRef  = useRef(null);

  // Fermer le dropdown filtres au clic extérieur
  useEffect(() => {
    if (!showFiltres) return;
    const h = (e) => {
      if (filtreRef.current && !filtreRef.current.contains(e.target)) setShowFiltres(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [showFiltres]);

  // Fermer le split au clic extérieur
  useEffect(() => {
    if (!activeCell) return;
    const h = (e) => {
      if (agendaRef.current && !agendaRef.current.querySelector(`[data-cell="${activeCell}"]`)?.contains(e.target)) {
        setActiveCell(null);
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [activeCell]);

  // Echap pour fermer le split
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') setActiveCell(null); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, []);

  // Types de cours disponibles (support format hiérarchique et plat)
  const typesCours = useMemo(() => {
    const fromProfile = getAllTypesFromCategories(profile?.types_cours);
    const fromCours   = [...new Set(cours.map(c => c.type_cours).filter(Boolean))];
    return [...new Set([...fromProfile, ...fromCours])];
  }, [profile, cours]);

  const coursFiltres = useMemo(() => {
    if (!filtre) return cours;
    return cours.filter(c => c.type_cours === filtre);
  }, [cours, filtre]);

  // ---- Plage visible ----
  const plage = useMemo(() => {
    if (vue === 'jour') {
      return { debut: toDateStr(dateRef), fin: toDateStr(dateRef) };
    }
    if (vue === 'semaine') {
      const lundi = getLundi(dateRef);
      return { debut: toDateStr(lundi), fin: toDateStr(addDays(lundi, 6)) };
    }
    const y = dateRef.getFullYear(), m = dateRef.getMonth();
    return {
      debut: toDateStr(new Date(y, m - 1, 1)),
      fin:   toDateStr(new Date(y, m + 2, 0)),
    };
  }, [vue, dateRef]);

  // ---- Chargement dynamique ----
  const chargerCours = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('cours')
        .select('*, presences(pointee)')
        .gte('date', plage.debut)
        .lte('date', plage.fin)
        .order('date').order('heure');
      if (!error && data) setCours(data);
    } catch (err) {
      console.error('Erreur chargement cours:', err);
    } finally {
      setLoading(false);
    }
  }, [plage.debut, plage.fin]);

  const [firstRender, setFirstRender] = useState(true);
  useEffect(() => {
    if (firstRender) { setFirstRender(false); return; }
    chargerCours();
  }, [plage.debut, plage.fin, chargerCours, firstRender]);

  // Date du jour (pour comparer les cours passés)
  const todayStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  }, []);

  // Met à jour un cours dans le state local (ex: annulation)
  const handleCoursMaj = useCallback((updatedFields) => {
    setCours(prev => prev.map(c => c.id === updatedFields.id ? { ...c, ...updatedFields } : c));
  }, []);

  // ---- Navigation ----
  const naviguer = useCallback((dir) => {
    setActiveCell(null);
    setDateRef(prev => {
      if (vue === 'jour')    return addDays(prev, dir);
      if (vue === 'semaine') return addDays(prev, dir * 7);
      return addMonths(prev, dir);
    });
  }, [vue]);

  const allerAujourdhui = useCallback(() => {
    setActiveCell(null);
    setDateRef(new Date());
  }, []);

  const titreNav = useMemo(() => {
    if (vue === 'jour') return formatDateLong(dateRef);
    if (vue === 'semaine') {
      const lundi = getLundi(dateRef);
      const dim   = addDays(lundi, 6);
      if (lundi.getMonth() === dim.getMonth())
        return `${lundi.getDate()} – ${dim.getDate()} ${MOIS[lundi.getMonth()]} ${lundi.getFullYear()}`;
      return `${formatDateCourte(lundi)} – ${formatDateCourte(dim)} ${dim.getFullYear()}`;
    }
    return `${MOIS[dateRef.getMonth()]} ${dateRef.getFullYear()}`;
  }, [vue, dateRef]);

  const handleSelectDay = useCallback((d) => {
    setDateRef(d);
    setVue('jour');
    setActiveCell(null);
  }, []);

  // ============================================
  // Rendu
  // ============================================
  return (
    <div className="agenda" ref={agendaRef}>

      {/* Sélecteur de vue */}
      <div className="vue-switcher animate-fade-in">
        {VUES.map(v => (
          <button
            key={v.id}
            className={`vue-btn ${vue === v.id ? 'active' : ''}`}
            onClick={() => { setVue(v.id); setActiveCell(null); }}
          >
            <v.icon size={16} />
            <span>{v.label}</span>
          </button>
        ))}
      </div>

      {/* Barre navigation + filtres */}
      <div className="agenda-topbar animate-fade-in">
        <button onClick={() => naviguer(-1)} className="nav-btn" aria-label="Précédent">
          <ChevronLeft size={20} />
        </button>

        <div className="header-center">
          <h1 className="nav-title">{titreNav}</h1>
          {!isAujourdhui(dateRef) && (
            <button className="today-btn" onClick={allerAujourdhui}>Aujourd'hui</button>
          )}
        </div>

        <button onClick={() => naviguer(1)} className="nav-btn" aria-label="Suivant">
          <ChevronRight size={20} />
        </button>

        {typesCours.length > 0 && (
          <div className="filtres-wrap" ref={filtreRef}>
            <button
              className={`filtre-btn ${filtre ? 'has-filtre' : ''} ${showFiltres ? 'open' : ''}`}
              onClick={() => setShowFiltres(s => !s)}
            >
              <Filter size={15} />
              {filtre && <span className="filtre-label">{filtre}</span>}
              {filtre && (
                <span className="filtre-clear"
                  onClick={e => { e.stopPropagation(); setFiltre(null); setShowFiltres(false); }}>
                  <X size={13} />
                </span>
              )}
            </button>
            {showFiltres && (
              <div className="filtres-dropdown">
                <button className={`filtre-option ${!filtre ? 'active' : ''}`}
                  onClick={() => { setFiltre(null); setShowFiltres(false); }}>
                  Tous les cours
                </button>
                {typesCours.map(t => (
                  <button key={t} className={`filtre-option ${filtre === t ? 'active' : ''}`}
                    onClick={() => { setFiltre(t); setShowFiltres(false); }}>
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Contenu */}
      <div className={`agenda-content ${loading ? 'loading' : ''}`}>
        {vue === 'semaine' && (
          <VueSemaine
            dateRef={dateRef}
            cours={coursFiltres}
            activeCell={activeCell}
            setActiveCell={setActiveCell}
            onSelectDay={handleSelectDay}
            todayStr={todayStr}
          />
        )}
        {vue === 'jour' && (
          <VueJour dateRef={dateRef} cours={coursFiltres} todayStr={todayStr} onCoursMaj={handleCoursMaj} />
        )}
        {vue === 'mois' && (
          <VueMois
            dateRef={dateRef}
            cours={coursFiltres}
            activeCell={activeCell}
            setActiveCell={setActiveCell}
            onSelectDay={handleSelectDay}
            todayStr={todayStr}
          />
        )}
      </div>

      <Link href="/cours/nouveau" className="izi-fab" aria-label="Nouvelle séance">
        <Plus size={24} />
      </Link>

      <AgendaStyles />
    </div>
  );
}

// ============================================
// SPLIT DIAGONAL — composant réutilisable
// ============================================
function SplitDiagonal({ dateStr, onVoir, onClose }) {
  return (
    <div className="split-overlay" data-split>
      {/* Triangle haut-gauche : Voir */}
      <button
        className="split-voir"
        onClick={(e) => { e.stopPropagation(); onVoir(); }}
        title="Voir les cours du jour"
      >
        <Eye size={18} />
        <span>Voir</span>
      </button>

      {/* Triangle bas-droite : Ajouter */}
      <Link
        href={`/cours/nouveau?date=${dateStr}`}
        className="split-ajouter"
        onClick={(e) => e.stopPropagation()}
        title="Créer un cours ce jour"
      >
        <Plus size={18} />
        <span>Ajouter</span>
      </Link>

      {/* Ligne diagonale décorative */}
      <div className="split-line" />

      {/* Bouton fermeture */}
      <button className="split-close" onClick={(e) => { e.stopPropagation(); onClose(); }}>
        <X size={12} />
      </button>
    </div>
  );
}

// ============================================
// VUE SEMAINE
// ============================================
function VueSemaine({ dateRef, cours, activeCell, setActiveCell, onSelectDay, todayStr }) {
  const lundi   = useMemo(() => getLundi(dateRef), [dateRef]);
  const semaine = useMemo(() => getSemaine(lundi), [lundi]);

  const coursParJour = useMemo(() => {
    const map = {};
    cours.forEach(c => {
      if (!map[c.date]) map[c.date] = [];
      map[c.date].push(c);
    });
    return map;
  }, [cours]);

  return (
    <div className="vue-semaine animate-slide-up">
      {semaine.map((jour, idx) => {
        const dateStr     = toDateStr(jour);
        const coursDuJour = coursParJour[dateStr] || [];
        const today       = isAujourdhui(jour);
        const isActive    = activeCell === dateStr;

        return (
          <div
            key={idx}
            className={`s-jour ${today ? 'today' : ''} ${isActive ? 'split-active' : ''}`}
            data-cell={dateStr}
          onClick={() => setActiveCell(isActive ? null : dateStr)}
          >
            {/* En-tête — visuel seulement, clic capté par le parent */}
            <div className="s-jour-head">
              <span className="s-jour-name">{JOURS_COURTS[idx]}</span>
              <span className={`s-jour-num ${today ? 'today' : ''}`}>{jour.getDate()}</span>
            </div>

            {/* Corps avec les chips */}
            <div className="s-jour-body">
              {coursDuJour.length === 0
                ? <div className="s-vide" />
                : coursDuJour.map(c => <CoursChip key={c.id} cours={c} todayStr={todayStr} />)
              }
            </div>

            {/* Split diagonal */}
            {isActive && (
              <SplitDiagonal
                dateStr={dateStr}
                onVoir={() => onSelectDay(jour)}
                onClose={() => setActiveCell(null)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================
// VUE JOUR
// ============================================
function VueJour({ dateRef, cours, todayStr, onCoursMaj }) {
  const dateStr     = toDateStr(dateRef);
  const coursDuJour = useMemo(() => cours.filter(c => c.date === dateStr), [cours, dateStr]);

  return (
    <div className="vue-jour animate-slide-up">
      <div className="jour-head">
        <span className="jour-date-long">{formatDateLong(dateRef)}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="jour-count">{coursDuJour.length} cours</span>
          <Link
            href={`/cours/nouveau?date=${dateStr}`}
            className="jour-add-btn"
          >
            <Plus size={15} />
            Ajouter
          </Link>
        </div>
      </div>
      {coursDuJour.length === 0 ? (
        <div className="empty-state izi-card">
          <div className="empty-emoji">📅</div>
          <p className="empty-title">Aucun cours ce jour</p>
          <Link href={`/cours/nouveau?date=${dateStr}`} className="izi-btn izi-btn-secondary" style={{ marginTop: 8 }}>
            <Plus size={18} /> Créer un cours
          </Link>
        </div>
      ) : (
        <div className="cours-list">
          {coursDuJour.map(c => <CoursCard key={c.id} cours={c} todayStr={todayStr} onCoursMaj={onCoursMaj} />)}
        </div>
      )}
    </div>
  );
}

// ============================================
// VUE MOIS
// ============================================
function VueMois({ dateRef, cours, activeCell, setActiveCell, onSelectDay, todayStr }) {
  const y      = dateRef.getFullYear();
  const m      = dateRef.getMonth();
  const grille = useMemo(() => getGrilleMois(y, m), [y, m]);

  const coursParJour = useMemo(() => {
    const map = {};
    cours.forEach(c => {
      if (!map[c.date]) map[c.date] = [];
      map[c.date].push(c);
    });
    return map;
  }, [cours]);

  return (
    <div className="vue-mois animate-slide-up">
      <div className="mois-cols-head">
        {JOURS_COURTS.map(j => (
          <div key={j} className="mois-col-label">{j}</div>
        ))}
      </div>
      <div className="mois-grille">
        {grille.map((jour, idx) => {
          const dateStr     = toDateStr(jour);
          const estMois     = jour.getMonth() === m;
          const today       = isAujourdhui(jour);
          const coursDuJour = coursParJour[dateStr] || [];
          const MAX_VISIBLE = 3;
          const surplus     = coursDuJour.length - MAX_VISIBLE;
          const isActive    = activeCell === dateStr;

          return (
            <div
              key={idx}
              className={`mois-cell ${estMois ? '' : 'autre-mois'} ${today ? 'today' : ''} ${isActive ? 'split-active' : ''}`}
              data-cell={dateStr}
              onClick={(e) => {
                e.stopPropagation();
                setActiveCell(isActive ? null : dateStr);
              }}
            >
              <span className={`mois-num ${today ? 'today' : ''}`}>{jour.getDate()}</span>

              {!isActive && coursDuJour.slice(0, MAX_VISIBLE).map(c => {
                const chipPast   = todayStr && c.date < todayStr && !c.est_annule;
                const chipPointe = !c.est_annule && (c.presences || []).some(p => p.pointee);
                return (
                <Link key={c.id} href={`/cours/${c.id}`}
                  className={`mois-chip ${c.est_annule ? 'annule' : ''} ${chipPast ? 'past' : ''} ${chipPointe ? 'pointe' : ''}`}
                  title={`${formatHeure(c.heure)} — ${c.nom}`}
                  onClick={e => e.stopPropagation()}>
                  <span className="mois-chip-heure">{formatHeure(c.heure)}</span>
                  <span className="mois-chip-nom">{c.nom}</span>
                </Link>
                );
              })}
              {!isActive && surplus > 0 && (
                <span className="mois-surplus">+{surplus}</span>
              )}

              {/* Split diagonal */}
              {isActive && (
                <SplitDiagonal
                  dateStr={dateStr}
                  onVoir={() => onSelectDay(jour)}
                  onClose={() => setActiveCell(null)}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================
// CHIP cours (semaine)
// ============================================
function CoursChip({ cours: c, todayStr }) {
  const isPast   = todayStr && c.date < todayStr && !c.est_annule;
  const isPointe = !c.est_annule && (c.presences || []).some(p => p.pointee);
  return (
    <Link
      href={`/cours/${c.id}`}
      className={`cours-chip ${c.est_annule ? 'annule' : ''} ${isPast ? 'past' : ''} ${isPointe ? 'pointe' : ''}`}
      onClick={e => e.stopPropagation()}
    >
      <span className="chip-heure">{formatHeure(c.heure)}</span>
      <span className="chip-nom">{c.nom}</span>
      {isPointe && <CheckCircle2 size={10} className="chip-pointe-icon" />}
      {c.recurrence_parent_id && <span className="chip-recur">↻</span>}
    </Link>
  );
}

// ============================================
// CARTE complète (vue jour)
// ============================================
function CoursCard({ cours: c, todayStr, onCoursMaj }) {
  const [confirmAnnul, setConfirmAnnul] = useState(false);
  const [annulant, setAnnulant]         = useState(false);

  const isPast    = todayStr && c.date < todayStr && !c.est_annule;
  const nbInscrits = (c.presences || []).length;
  const nbPointes  = (c.presences || []).filter(p => p.pointee).length;
  const isPointe   = !c.est_annule && nbPointes > 0;

  const handleAnnuler = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setAnnulant(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from('cours').update({ est_annule: true }).eq('id', c.id);
      if (!error) onCoursMaj?.({ id: c.id, est_annule: true });
    } catch (err) {
      console.error('Erreur annulation:', err);
    } finally {
      setAnnulant(false);
      setConfirmAnnul(false);
    }
  };

  return (
    <Link href={`/cours/${c.id}`}
      className={`cours-card izi-card ${c.est_annule ? 'annule' : ''} ${isPast ? 'past' : ''}`}>
      <div className={`card-bar ${isPointe ? 'pointe' : ''}`} />
      <div className="card-body">
        <div className="card-top">
          <div>
            <div className="card-nom">
              {c.nom}
              {c.recurrence_parent_id && <span className="card-recur">↻</span>}
              {c.est_annule && <span className="card-annule-badge">Annulé</span>}
            </div>
            <div className="card-meta">
              <Clock size={14} />
              {formatHeure(c.heure)}
              {c.duree_minutes && ` · ${c.duree_minutes} min`}
              {c.lieu && ` · ${c.lieu}`}
            </div>
          </div>
          {c.type_cours && (
            <span className="izi-badge izi-badge-brand">{c.type_cours}</span>
          )}
        </div>
        <div className="card-footer">
          <span className="card-inscrits">
            {nbInscrits > 0 && <><Users size={14} /> {nbInscrits}</>}
          </span>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {!c.est_annule && (
              confirmAnnul ? (
                <div className="cancel-confirm" onClick={e => { e.preventDefault(); e.stopPropagation(); }}>
                  <span className="cancel-label">Annuler ce cours ?</span>
                  <button className="cancel-oui" onClick={handleAnnuler} disabled={annulant}>
                    {annulant ? '…' : 'Oui'}
                  </button>
                  <button className="cancel-non" onClick={e => { e.preventDefault(); e.stopPropagation(); setConfirmAnnul(false); }}>
                    Non
                  </button>
                </div>
              ) : (
                <button className="annuler-btn" onClick={e => { e.preventDefault(); e.stopPropagation(); setConfirmAnnul(true); }}>
                  <X size={13} /> Annuler
                </button>
              )
            )}
            {!c.est_annule && (
              isPointe ? (
                <span className="pointe-done-btn"
                  onClick={e => {
                    e.preventDefault(); e.stopPropagation();
                    window.location.href = `/pointage/${c.id}`;
                  }}>
                  <CheckCircle2 size={15} />
                  Déjà pointé ({nbPointes}/{nbInscrits})
                </span>
              ) : (
                <span className="pointer-btn"
                  onClick={e => {
                    e.preventDefault(); e.stopPropagation();
                    window.location.href = `/pointage/${c.id}`;
                  }}>
                  <CheckCircle2 size={16} /> Pointer
                </span>
              )
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

// ============================================
// STYLES
// ============================================
function AgendaStyles() {
  return (
    <style jsx global>{`
      .agenda {
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding-bottom: 80px;
      }
      .agenda-content {
        transition: opacity 0.2s;
      }
      .agenda-content.loading {
        opacity: 0.45;
        pointer-events: none;
      }

      /* ---- Sélecteur de vue ---- */
      .vue-switcher {
        display: flex;
        background: var(--bg-card);
        border: 1px solid var(--border);
        border-radius: var(--radius-md);
        padding: 4px;
        gap: 4px;
      }
      .vue-btn {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 8px 10px;
        border: none;
        border-radius: var(--radius-sm);
        background: none;
        color: var(--text-secondary);
        font-size: 0.8125rem;
        font-weight: 500;
        cursor: pointer;
        transition: all var(--transition-fast);
      }
      .vue-btn.active {
        background: var(--brand);
        color: white;
        font-weight: 600;
      }

      /* ---- Topbar ---- */
      .agenda-topbar {
        display: flex;
        align-items: center;
        gap: 8px;
        position: relative;
        z-index: 10;
      }
      .header-center {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        min-width: 0;
      }
      .nav-title {
        font-size: 1rem;
        font-weight: 700;
        text-transform: capitalize;
        text-align: center;
        line-height: 1.2;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100%;
      }
      .today-btn {
        padding: 3px 10px;
        border: 1px solid var(--brand);
        border-radius: var(--radius-full);
        background: none;
        color: var(--brand);
        font-size: 0.6875rem;
        font-weight: 600;
        cursor: pointer;
        transition: all var(--transition-fast);
      }
      .today-btn:hover { background: var(--brand); color: white; }
      .nav-btn {
        width: 38px;
        height: 38px;
        border-radius: var(--radius-sm);
        border: 1px solid var(--border);
        background: var(--bg-card);
        color: var(--text-secondary);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        flex-shrink: 0;
        transition: background var(--transition-fast);
      }
      .nav-btn:active { background: var(--cream-dark); }

      /* ---- Filtres ---- */
      .filtres-wrap { position: relative; flex-shrink: 0; }
      .filtre-btn {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        height: 38px;
        padding: 0 12px;
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        background: var(--bg-card);
        color: var(--text-secondary);
        font-size: 0.8125rem;
        font-weight: 500;
        cursor: pointer;
        transition: all var(--transition-fast);
      }
      .filtre-btn.has-filtre,
      .filtre-btn.open {
        border-color: var(--brand);
        color: var(--brand-700);
        background: var(--brand-light);
      }
      .filtre-label {
        max-width: 80px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 0.75rem;
        font-weight: 600;
      }
      .filtre-clear { display: flex; align-items: center; margin-left: 2px; opacity: 0.6; }
      .filtre-clear:hover { opacity: 1; }
      .filtres-dropdown {
        position: absolute;
        top: calc(100% + 6px);
        right: 0;
        background: var(--bg-card);
        border: 1px solid var(--border);
        border-radius: var(--radius-md);
        box-shadow: var(--shadow-lg);
        z-index: 200;
        min-width: 170px;
        overflow: hidden;
        animation: fadeIn 0.12s ease;
      }
      .filtre-option {
        display: block;
        width: 100%;
        padding: 10px 16px;
        border: none;
        background: none;
        color: var(--text-primary);
        font-size: 0.875rem;
        text-align: left;
        cursor: pointer;
        transition: background var(--transition-fast);
        white-space: nowrap;
      }
      .filtre-option:hover  { background: var(--cream-dark); }
      .filtre-option.active {
        background: var(--brand-light);
        color: var(--brand-700);
        font-weight: 600;
      }

      /* ====================================================
         SPLIT DIAGONAL
         ==================================================== */
      .split-overlay {
        position: absolute;
        inset: 0;
        z-index: 20;
        border-radius: inherit;
        overflow: hidden;
        animation: splitIn 0.18s ease;
      }

      @keyframes splitIn {
        from { opacity: 0; transform: scale(0.96); }
        to   { opacity: 1; transform: scale(1); }
      }

      /* Triangle haut-gauche : Voir */
      .split-voir {
        position: absolute;
        inset: 0;
        clip-path: polygon(0 0, 100% 0, 0 100%);
        background: var(--brand);
        border: none;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        justify-content: flex-start;
        gap: 2px;
        padding: 12px 10px;
        color: white;
        font-weight: 700;
        font-size: 0.75rem;
        transition: filter var(--transition-fast);
      }
      .split-voir:hover { filter: brightness(1.1); }
      .split-voir span { text-shadow: 0 1px 2px rgba(0,0,0,0.2); }

      /* Triangle bas-droite : Ajouter */
      .split-ajouter {
        position: absolute;
        inset: 0;
        clip-path: polygon(100% 0, 100% 100%, 0 100%);
        background: var(--sage);
        text-decoration: none;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        justify-content: flex-end;
        gap: 2px;
        padding: 12px 10px;
        color: white;
        font-weight: 700;
        font-size: 0.75rem;
        transition: filter var(--transition-fast);
      }
      .split-ajouter:hover { filter: brightness(1.08); }
      .split-ajouter span { text-shadow: 0 1px 2px rgba(0,0,0,0.2); }

      /* Ligne diagonale */
      .split-line {
        position: absolute;
        top: 0; left: 0;
        width: 141%;          /* diagonale d'un carré = côté × √2 ≈ 1.41 */
        height: 2px;
        background: rgba(255,255,255,0.5);
        transform-origin: top left;
        transform: rotate(45deg) translateY(-1px);
        pointer-events: none;
      }

      /* Bouton fermer */
      .split-close {
        position: absolute;
        top: 4px;
        right: 4px;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        border: none;
        background: rgba(255,255,255,0.25);
        color: white;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 21;
        transition: background var(--transition-fast);
      }
      .split-close:hover { background: rgba(255,255,255,0.4); }

      /* Cellule active */
      .mois-cell.split-active,
      .s-jour.split-active {
        outline: 2px solid var(--brand);
        outline-offset: -2px;
        z-index: 5;
      }

      /* ---- VUE SEMAINE ---- */
      .vue-semaine {
        display: flex;
        flex-direction: column;
        gap: 3px;
      }
      .s-jour {
        background: var(--bg-card);
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        overflow: hidden;
        display: flex;
        flex-direction: row;
        min-height: 52px;
        position: relative;
      }
      .s-jour.today { border-color: var(--brand); border-width: 1.5px; }

      .s-jour-head {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 1px;
        padding: 8px 10px;
        width: 54px;
        flex-shrink: 0;
        cursor: pointer;
        background: var(--cream);
        border-right: 1px solid var(--border);
        transition: background var(--transition-fast);
        user-select: none;
      }
      .s-jour-head:hover { background: var(--cream-dark); }
      .s-jour-name {
        font-size: 0.6875rem;
        font-weight: 700;
        text-transform: uppercase;
        color: var(--text-muted);
        letter-spacing: 0.04em;
      }
      .s-jour-num {
        font-size: 1.125rem;
        font-weight: 800;
        color: var(--text-primary);
      }
      .s-jour-num.today { color: var(--brand); }
      .s-jour-body {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 3px;
        padding: 6px 8px;
        justify-content: center;
      }
      .s-vide { min-height: 20px; }

      .cours-chip {
        display: flex;
        align-items: center;
        gap: 5px;
        padding: 5px 8px;
        background: var(--brand-light);
        border-radius: 6px;
        text-decoration: none;
        color: var(--brand-700);
        transition: background var(--transition-fast);
        overflow: hidden;
      }
      .cours-chip:hover { background: var(--brand-200); }
      .cours-chip.annule { opacity: 0.5; }
      .chip-heure {
        font-size: 0.6875rem;
        font-weight: 700;
        white-space: nowrap;
        flex-shrink: 0;
        color: var(--brand-600);
      }
      .chip-nom {
        font-size: 0.8125rem;
        font-weight: 600;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        color: var(--text-primary);
      }
      .chip-recur { font-size: 0.625rem; margin-left: auto; opacity: 0.5; flex-shrink: 0; }

      /* ---- VUE JOUR ---- */
      .vue-jour { display: flex; flex-direction: column; gap: 12px; }
      .jour-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .jour-date-long {
        font-weight: 700;
        font-size: 0.9375rem;
        text-transform: capitalize;
      }
      .jour-count { font-size: 0.8125rem; color: var(--text-muted); }
      .jour-add-btn {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 5px 12px;
        background: var(--brand);
        color: white;
        border-radius: var(--radius-full);
        font-size: 0.75rem;
        font-weight: 700;
        text-decoration: none;
        transition: background var(--transition-fast);
      }
      .jour-add-btn:hover { background: var(--brand-dark); }

      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        padding: 40px 20px;
        text-align: center;
      }
      .empty-emoji { font-size: 2.5rem; }
      .empty-title { font-weight: 600; }
      .cours-list { display: flex; flex-direction: column; gap: 10px; }

      /* Carte complète */
      .cours-card {
        display: flex;
        overflow: hidden;
        text-decoration: none;
        color: inherit;
        cursor: pointer;
        transition: box-shadow 0.15s, transform 0.15s;
      }
      .cours-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.08); transform: translateY(-1px); }
      .cours-card:active { transform: translateY(0); }
      .cours-card.annule { opacity: 0.5; }
      .card-bar { width: 4px; background: var(--brand); flex-shrink: 0; }
      .card-body {
        flex: 1;
        padding: 14px 16px;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .card-top {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 8px;
      }
      .card-nom {
        font-weight: 600;
        font-size: 0.9375rem;
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
      }
      .card-recur { font-size: 0.75rem; color: var(--text-muted); opacity: 0.6; }
      .card-annule-badge {
        font-size: 0.6875rem;
        font-weight: 700;
        background: var(--danger);
        color: white;
        padding: 2px 6px;
        border-radius: var(--radius-full);
      }
      .card-meta {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 0.8125rem;
        color: var(--text-secondary);
        margin-top: 3px;
      }
      .card-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .card-inscrits {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 0.8125rem;
        color: var(--text-muted);
      }
      .pointer-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 16px;
        background: var(--brand);
        color: white;
        border-radius: var(--radius-full);
        font-size: 0.8125rem;
        font-weight: 600;
        border: none;
        cursor: pointer;
        min-height: 36px;
      }
      .pointer-btn:active { background: var(--brand-dark); transform: scale(0.97); }

      /* ---- VUE MOIS ---- */
      .vue-mois { display: flex; flex-direction: column; gap: 2px; }
      .mois-cols-head {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 2px;
        margin-bottom: 2px;
      }
      .mois-col-label {
        text-align: center;
        font-size: 0.6875rem;
        font-weight: 700;
        text-transform: uppercase;
        color: var(--text-muted);
        padding: 4px 0;
        letter-spacing: 0.04em;
      }
      .mois-grille {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 2px;
      }
      .mois-cell {
        background: var(--bg-card);
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        padding: 4px 3px;
        cursor: pointer;
        min-height: 64px;
        display: flex;
        flex-direction: column;
        gap: 2px;
        overflow: hidden;
        position: relative;
        transition: background var(--transition-fast);
      }
      .mois-cell:hover { background: var(--cream-dark); }
      .mois-cell.autre-mois { opacity: 0.3; }
      .mois-cell.today { border-color: var(--brand); border-width: 1.5px; }

      .mois-num {
        font-size: 0.75rem;
        font-weight: 700;
        color: var(--text-secondary);
        line-height: 1;
        padding: 1px 2px;
        align-self: flex-start;
      }
      .mois-num.today {
        background: var(--brand);
        color: white;
        border-radius: 4px;
        padding: 2px 5px;
      }
      .mois-chip {
        display: flex;
        align-items: center;
        gap: 2px;
        padding: 2px 4px;
        background: var(--brand-light);
        border-radius: 4px;
        overflow: hidden;
        width: 100%;
      }
      .mois-chip.annule { opacity: 0.4; }
      .mois-chip-heure {
        font-size: 0.5625rem;
        font-weight: 800;
        color: var(--brand-600);
        white-space: nowrap;
        flex-shrink: 0;
      }
      .mois-chip-nom {
        font-size: 0.5625rem;
        font-weight: 600;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        color: var(--text-primary);
      }
      .mois-surplus {
        font-size: 0.5625rem;
        font-weight: 700;
        color: var(--text-muted);
        text-align: center;
        padding: 1px 0;
      }

      /* ---- Desktop ---- */
      @media (min-width: 768px) {
        .nav-title { font-size: 1.2rem; }
        .vue-semaine {
          flex-direction: row;
          gap: 4px;
          align-items: stretch;
        }
        .s-jour {
          flex: 1;
          flex-direction: column;
          min-height: 180px;
        }
        .s-jour-head {
          flex-direction: row;
          justify-content: flex-start;
          width: auto;
          padding: 10px 12px;
          border-right: none;
          border-bottom: 1px solid var(--border);
          gap: 6px;
        }
        .s-jour-name { font-size: 0.75rem; }
        .s-jour-num  { font-size: 1rem; }
        .s-jour-body { padding: 8px 6px; gap: 4px; }

        .split-voir span,
        .split-ajouter span { font-size: 0.875rem; }

        .mois-cell { min-height: 90px; padding: 5px 4px; }
        .mois-chip { padding: 2px 5px; }
        .mois-chip-heure,
        .mois-chip-nom { font-size: 0.6875rem; }
        .mois-num { font-size: 0.8125rem; }
      }

      @media (min-width: 1200px) {
        .mois-cell { min-height: 110px; }
        .mois-chip-heure,
        .mois-chip-nom { font-size: 0.75rem; }
      }

      /* ---- Cours passés (toutes vues) ---- */
      .cours-card.past   { opacity: 0.5; }
      .cours-chip.past   { opacity: 0.4; }
      .mois-chip.past    { opacity: 0.4; }

      /* ---- Cours pointés ---- */
      .card-bar.pointe { background: #16a34a; }

      .cours-chip.pointe {
        background: #dcfce7;
        color: #166534;
      }
      .cours-chip.pointe .chip-heure { color: #16a34a; }
      .cours-chip.pointe:hover { background: #bbf7d0; }
      .chip-pointe-icon { margin-left: auto; color: #16a34a; flex-shrink: 0; }

      .mois-chip.pointe { background: #dcfce7; }
      .mois-chip.pointe .mois-chip-heure { color: #16a34a; }

      .card-pointe-badge {
        display: inline-flex;
        align-items: center;
        gap: 3px;
        font-size: 0.6875rem;
        font-weight: 700;
        background: #dcfce7;
        color: #166534;
        padding: 2px 7px;
        border-radius: var(--radius-full);
      }

      /* ---- Bouton Déjà pointé (vue jour) ---- */
      .pointe-done-btn {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 7px 14px;
        background: #dcfce7;
        color: #166534;
        border-radius: var(--radius-full);
        font-size: 0.8125rem;
        font-weight: 600;
        cursor: pointer;
        min-height: 36px;
        border: 1px solid #bbf7d0;
        transition: background 0.15s;
        white-space: nowrap;
      }
      .pointe-done-btn:hover { background: #bbf7d0; }

      /* ---- Bouton Annuler ---- */
      .annuler-btn {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 6px 12px;
        background: none;
        border: 1px solid #ef4444;
        color: #ef4444;
        border-radius: var(--radius-full);
        font-size: 0.75rem;
        font-weight: 600;
        cursor: pointer;
        min-height: 32px;
        transition: all 0.15s;
        flex-shrink: 0;
      }
      .annuler-btn:hover { background: #fef2f2; }

      .cancel-confirm {
        display: flex;
        align-items: center;
        gap: 6px;
        background: #fef2f2;
        border: 1px solid #fca5a5;
        border-radius: var(--radius-full);
        padding: 4px 10px;
        flex-shrink: 0;
      }
      .cancel-label {
        font-size: 0.75rem;
        color: #dc2626;
        white-space: nowrap;
        font-weight: 500;
      }
      .cancel-oui {
        padding: 3px 10px;
        background: #dc2626;
        color: white;
        border: none;
        border-radius: var(--radius-full);
        font-size: 0.75rem;
        font-weight: 700;
        cursor: pointer;
        transition: background 0.15s;
      }
      .cancel-oui:hover:not(:disabled) { background: #b91c1c; }
      .cancel-oui:disabled { opacity: 0.6; cursor: not-allowed; }
      .cancel-non {
        padding: 3px 6px;
        background: none;
        border: none;
        color: var(--text-secondary);
        font-size: 0.75rem;
        cursor: pointer;
        transition: color 0.15s;
      }
      .cancel-non:hover { color: var(--text-primary); }
    `}</style>
  );
}

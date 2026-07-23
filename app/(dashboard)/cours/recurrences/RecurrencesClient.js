'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Repeat, Calendar, ChevronLeft, ChevronRight, Plus, Trash2,
  Sun, AlertTriangle, ToggleRight, ToggleLeft, X, Pencil, Save
} from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { getAllTypesFromCategories } from '@/lib/utils';
import { useToast } from '@/components/ui/ToastProvider';
import {
  estPendantVacances, estJourFerie, getPeriodeVacances, ZONES_VACANCES,
} from '@/lib/vacances-scolaires';

const JOURS_LABEL = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

function toISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const j = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${j}`;
}

function freqLabel(rec) {
  if (rec.frequence === 'hebdomadaire') return 'Chaque semaine';
  if (rec.frequence === 'bimensuel') return 'Toutes les 2 semaines';
  if (rec.frequence === 'mensuel') return 'Une fois par mois';
  if (rec.frequence === 'quotidien') return 'Tous les jours';
  if (rec.frequence === 'personnalise') {
    const jours = (rec.jours_semaine || []).map(j => JOURS_LABEL[j - 1]).join(', ');
    return jours || 'Personnalisé';
  }
  return rec.frequence;
}

export default function RecurrencesClient({ recurrences: initialRecurrences, cours: initialCours, profile, initialRecId = null, autoEdit = false }) {
  const router = useRouter();
  const { toast } = useToast();
  const [recurrences, setRecurrences] = useState(initialRecurrences);
  const [cours, setCours] = useState(initialCours);
  // Pré-sélection depuis le crayon d'une série (?rec=<id>) sinon la 1re.
  const [selectedRecId, setSelectedRecId] = useState(
    (initialRecId && initialRecurrences.some(r => r.id === initialRecId) ? initialRecId : initialRecurrences[0]?.id) || null
  );
  const [monthOffset, setMonthOffset] = useState(0); // 0 = mois courant
  const [actionPending, setActionPending] = useState(null); // ISO date en cours

  // Édition nom + type de la série (le crayon des cours récurrents atterrit ici
  // quand la série n'a pas d'occurrence future → il faut pouvoir éditer d'ici).
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ nom: '', type_cours: '' });
  const [savingEdit, setSavingEdit] = useState(false);
  const typesCours = getAllTypesFromCategories(profile?.types_cours);

  const selected = recurrences.find(r => r.id === selectedRecId);

  const ouvrirEdition = () => {
    if (!selected) return;
    setEditForm({ nom: selected.nom || '', type_cours: selected.type_cours || '' });
    setEditing(true);
  };

  const enregistrerEdition = async () => {
    if (!selected) return;
    const nom = editForm.nom.trim();
    if (!nom) { toast.error('Le nom ne peut pas être vide'); return; }
    setSavingEdit(true);
    const supabase = createClient();
    const today = toISO(new Date());
    const type_cours = editForm.type_cours || null;
    try {
      // 1) La récurrence elle-même
      const { error: e1 } = await supabase
        .from('recurrences')
        .update({ nom, type_cours })
        .eq('id', selected.id);
      if (e1) throw e1;
      // 2) Les occurrences futures (les passées restent inchangées)
      const { error: e2 } = await supabase
        .from('cours')
        .update({ nom, type_cours })
        .eq('recurrence_parent_id', selected.id)
        .gte('date', today);
      if (e2) throw e2;

      setRecurrences(prev => prev.map(r => r.id === selected.id ? { ...r, nom, type_cours } : r));
      setCours(prev => prev.map(c => c.recurrence_parent_id === selected.id && c.date >= today ? { ...c, nom } : c));
      setEditing(false);
      toast.success('Série mise à jour ✓');
    } catch (err) {
      toast.error('Erreur : ' + err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  // Ouvre l'édition directement si on arrive depuis le crayon d'une série (?edit=1).
  useEffect(() => {
    if (autoEdit && selected) {
      setEditForm({ nom: selected.nom || '', type_cours: selected.type_cours || '' });
      setEditing(true);
    }
    // au montage uniquement
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cours futurs liés à la récurrence sélectionnée
  const coursDeRec = useMemo(() => {
    if (!selectedRecId) return [];
    return cours.filter(c => c.recurrence_parent_id === selectedRecId);
  }, [cours, selectedRecId]);

  // Date du mois affiché
  const monthDate = useMemo(() => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() + monthOffset);
    return d;
  }, [monthOffset]);

  const monthLabel = monthDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  // Construit la grille du mois (cellules par jour, lundi en premier)
  const grid = useMemo(() => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const firstWeekday = first.getDay() === 0 ? 7 : first.getDay(); // 1=lundi…7=dim
    const cells = [];

    // Padding en début de mois pour aligner sur lundi
    for (let i = 1; i < firstWeekday; i++) cells.push(null);

    for (let d = 1; d <= last.getDate(); d++) {
      const date = new Date(year, month, d);
      const iso = toISO(date);
      const coursDuJour = coursDeRec.find(c => c.date === iso);
      const dansVacances = selected?.zone_vacances ? estPendantVacances(iso, selected.zone_vacances) : false;
      const ferie = estJourFerie(iso);
      cells.push({
        date, iso,
        cours: coursDuJour,
        dansVacances,
        ferie,
        periodeVacances: dansVacances && selected ? getPeriodeVacances(iso, selected.zone_vacances) : null,
      });
    }
    return cells;
  }, [monthDate, coursDeRec, selected]);

  const totalCoursFuturs = coursDeRec.length;

  // ─── Actions ─────────────────────────────────────────────────────────────
  const supprimerCours = async (coursId, iso) => {
    setActionPending(iso);
    const supabase = createClient();
    const { error } = await supabase.from('cours').delete().eq('id', coursId);
    if (error) {
      toast.error('Erreur : ' + error.message);
    } else {
      setCours(prev => prev.filter(c => c.id !== coursId));
      toast.success('Cours supprimé');
    }
    setActionPending(null);
  };

  const ajouterCours = async (iso) => {
    if (!selected) return;
    setActionPending(iso);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    // La table recurrences ne porte pas tarif_unitaire (payable à la séance) :
    // on le recopie depuis le cours le plus récent de la série pour que
    // l'occurrence ajoutée garde le même modèle de paiement.
    let tarifUnitaire = null;
    try {
      const { data: frere } = await supabase
        .from('cours')
        .select('tarif_unitaire')
        .eq('recurrence_parent_id', selected.id)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle();
      tarifUnitaire = frere?.tarif_unitaire ?? null;
    } catch { /* pas de frère : tarif null */ }
    const { data, error } = await supabase.from('cours').insert({
      profile_id: user.id,
      nom: selected.nom,
      type_cours: selected.type_cours,
      date: iso,
      heure: selected.heure,
      duree_minutes: selected.duree_minutes,
      lieu_id: selected.lieu_id,
      capacite_max: null,
      recurrence_parent_id: selected.id,
      tarif_unitaire: tarifUnitaire,
    }).select().single();
    if (error) {
      toast.error('Erreur : ' + error.message);
    } else {
      setCours(prev => [...prev, data]);
      toast.success('Cours ajouté');
    }
    setActionPending(null);
  };

  const toggleActif = async (rec) => {
    const supabase = createClient();
    const { error } = await supabase.from('recurrences').update({ actif: !rec.actif }).eq('id', rec.id);
    if (!error) {
      setRecurrences(prev => prev.map(r => r.id === rec.id ? { ...r, actif: !r.actif } : r));
      toast.success(rec.actif ? 'Récurrence mise en pause' : 'Récurrence réactivée');
    }
  };

  const supprimerRecurrence = async (rec) => {
    if (!confirm(`Supprimer la récurrence "${rec.nom}" ET tous ses ${coursDeRec.length} cours futurs ?`)) return;
    const supabase = createClient();
    // Garde-fou : des présences déjà pointées dans le périmètre (ex. cours du
    // jour déjà pointé) seraient effacées en cascade avec leur historique.
    const { data: coursCibles } = await supabase
      .from('cours').select('id')
      .eq('recurrence_parent_id', rec.id).gte('date', toISO(new Date()));
    const ids = (coursCibles || []).map(c => c.id);
    if (ids.length > 0) {
      const { count } = await supabase
        .from('presences')
        .select('id', { count: 'exact', head: true })
        .in('cours_id', ids)
        .in('statut_pointage', ['present', 'absent', 'excuse']);
      if ((count || 0) > 0 && !confirm(
        `⚠️ ${count} présence${count > 1 ? 's' : ''} déjà pointée${count > 1 ? 's' : ''} sur ces cours ` +
        `— la suppression efface définitivement cet historique et détache les paiements liés.\n\nSupprimer quand même ?`
      )) return;
    }
    // Supprime d'abord les cours futurs liés
    await supabase.from('cours').delete().eq('recurrence_parent_id', rec.id).gte('date', toISO(new Date()));
    // Puis la récurrence
    const { error } = await supabase.from('recurrences').delete().eq('id', rec.id);
    if (!error) {
      setRecurrences(prev => prev.filter(r => r.id !== rec.id));
      setCours(prev => prev.filter(c => c.recurrence_parent_id !== rec.id));
      setSelectedRecId(recurrences[0]?.id || null);
      toast.success('Récurrence supprimée');
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────
  if (recurrences.length === 0) {
    return (
      <div className="rec-page">
        <header className="rec-header">
          <Link href="/cours" className="back-btn"><ArrowLeft size={18} /></Link>
          <div>
            <h1>Mes cours récurrents</h1>
            <p className="rec-subtitle">Gère tes séries de cours en un coup d'œil</p>
          </div>
        </header>
        <div className="rec-empty izi-card">
          <div className="rec-empty-icon"><Repeat size={28} /></div>
          <p className="rec-empty-title">Tu n'as aucune série de cours récurrents pour l'instant.</p>
          <p className="rec-empty-desc">Crée ton premier cours récurrent en choisissant "Chaque semaine" dans le formulaire.</p>
          <Link href="/cours/nouveau" className="izi-btn izi-btn-primary">
            <Plus size={16} /> Nouveau cours
          </Link>
        </div>
        {styleBlock}
      </div>
    );
  }

  return (
    <div className="rec-page">
      <header className="rec-header">
        <Link href="/cours" className="back-btn"><ArrowLeft size={18} /></Link>
        <div style={{ flex: 1 }}>
          <h1>Mes cours récurrents</h1>
          <p className="rec-subtitle">{recurrences.length} série{recurrences.length > 1 ? 's' : ''} active{recurrences.length > 1 ? 's' : ''}</p>
        </div>
        <Link href="/cours/nouveau" className="izi-btn izi-btn-secondary">
          <Plus size={16} /> Nouvelle série
        </Link>
      </header>

      {/* Liste des récurrences (chips horizontales scrollables) */}
      <div className="rec-list">
        {recurrences.map(rec => {
          const nbCours = cours.filter(c => c.recurrence_parent_id === rec.id).length;
          return (
            <button
              key={rec.id}
              type="button"
              onClick={() => setSelectedRecId(rec.id)}
              className={`rec-chip ${rec.id === selectedRecId ? 'selected' : ''} ${!rec.actif ? 'inactive' : ''}`}
            >
              <span className="rec-chip-nom">{rec.nom}</span>
              <span className="rec-chip-meta">{freqLabel(rec)} · {nbCours} à venir</span>
            </button>
          );
        })}
      </div>

      {selected && (
        <>
          {/* Header de la récurrence sélectionnée */}
          <div className="rec-detail izi-card">
            {!editing ? (
              <div className="rec-detail-top">
                <div>
                  <div className="rec-detail-nom">{selected.nom}</div>
                  <div className="rec-detail-meta">
                    {freqLabel(selected)}
                    {selected.heure && ` · ${selected.heure.slice(0, 5)}`}
                    {selected.duree_minutes && ` · ${selected.duree_minutes}min`}
                    {selected.type_cours && ` · ${selected.type_cours}`}
                  </div>
                </div>
                <div className="rec-detail-actions">
                  <button type="button" onClick={ouvrirEdition} className="rec-icon-btn" title="Modifier le nom et le type">
                    <Pencil size={16} />
                  </button>
                  <button type="button" onClick={() => toggleActif(selected)} className="rec-icon-btn" title={selected.actif ? 'Mettre en pause' : 'Réactiver'}>
                    {selected.actif
                      ? <ToggleRight size={22} style={{ color: '#16a34a' }} />
                      : <ToggleLeft size={22} style={{ color: 'var(--text-muted)' }} />}
                  </button>
                  <button type="button" onClick={() => supprimerRecurrence(selected)} className="rec-icon-btn danger" title="Supprimer la série">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="rec-edit-form">
                <label className="rec-edit-label">Nom du cours</label>
                <input
                  className="izi-input"
                  value={editForm.nom}
                  onChange={e => setEditForm(f => ({ ...f, nom: e.target.value }))}
                  placeholder="Ex : Yoga Vinyasa"
                  autoFocus
                />
                {typesCours.length > 0 && (
                  <>
                    <label className="rec-edit-label">Type</label>
                    <div className="rec-edit-chips">
                      {typesCours.map(type => (
                        <button
                          key={type}
                          type="button"
                          className={`rec-chip-type ${editForm.type_cours === type ? 'selected' : ''}`}
                          onClick={() => setEditForm(f => ({ ...f, type_cours: f.type_cours === type ? '' : type }))}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </>
                )}
                <p className="rec-edit-hint">
                  S'applique à la série et à ses <strong>{totalCoursFuturs}</strong> cours à venir (les séances passées ne changent pas).
                </p>
                <div className="rec-edit-actions">
                  <button type="button" className="izi-btn izi-btn-ghost" onClick={() => setEditing(false)} disabled={savingEdit}>
                    Annuler
                  </button>
                  <button type="button" className="izi-btn izi-btn-primary" onClick={enregistrerEdition} disabled={savingEdit || !editForm.nom.trim()}>
                    <Save size={16} /> {savingEdit ? 'Enregistrement…' : 'Enregistrer'}
                  </button>
                </div>
              </div>
            )}

            {(selected.exclure_vacances || selected.exclure_feries) && (
              <div className="rec-detail-tags">
                {selected.exclure_vacances && selected.zone_vacances && (
                  <span className="rec-tag">
                    <Sun size={11} /> Hors vacances Zone {selected.zone_vacances === 'Corse' ? 'Corse' : selected.zone_vacances}
                  </span>
                )}
                {selected.exclure_feries && (
                  <span className="rec-tag">
                    <Sun size={11} /> Hors jours fériés
                  </span>
                )}
              </div>
            )}

            {/* Compteur visible */}
            <div className="rec-counter">
              <Calendar size={14} />
              <strong>{totalCoursFuturs}</strong> cours à venir sur les 12 prochains mois
            </div>
          </div>

          {/* Calendrier mensuel */}
          <div className="rec-calendar izi-card">
            <div className="rec-cal-header">
              <button type="button" onClick={() => setMonthOffset(o => o - 1)} className="rec-icon-btn">
                <ChevronLeft size={18} />
              </button>
              <div className="rec-cal-month">{monthLabel}</div>
              <button type="button" onClick={() => setMonthOffset(o => o + 1)} className="rec-icon-btn">
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="rec-cal-weekdays">
              {JOURS_LABEL.map(j => <div key={j}>{j}</div>)}
            </div>

            <div className="rec-cal-grid">
              {grid.map((cell, i) => {
                if (!cell) return <div key={i} className="rec-cal-cell empty" />;
                const isToday = cell.iso === toISO(new Date());
                const isPast = cell.iso < toISO(new Date());
                return (
                  <div
                    key={i}
                    className={`rec-cal-cell ${cell.cours ? 'has-cours' : ''} ${cell.dansVacances ? 'vacances' : ''} ${cell.ferie ? 'ferie' : ''} ${isToday ? 'today' : ''} ${isPast ? 'past' : ''}`}
                    title={
                      cell.cours
                        ? `Cours : ${cell.cours.nom}${cell.cours.heure ? ' à ' + cell.cours.heure.slice(0,5) : ''}`
                        : cell.ferie ? 'Jour férié'
                        : cell.dansVacances ? `Vacances : ${cell.periodeVacances?.label || ''}`
                        : ''
                    }
                  >
                    <span className="rec-cal-day">{cell.date.getDate()}</span>
                    {cell.cours && !isPast && (
                      <button
                        type="button"
                        className="rec-cal-action remove"
                        onClick={() => supprimerCours(cell.cours.id, cell.iso)}
                        disabled={actionPending === cell.iso}
                        aria-label="Supprimer ce cours"
                      >
                        <X size={10} />
                      </button>
                    )}
                    {!cell.cours && !isPast && (
                      <button
                        type="button"
                        className="rec-cal-action add"
                        onClick={() => ajouterCours(cell.iso)}
                        disabled={actionPending === cell.iso}
                        aria-label="Ajouter un cours ce jour"
                      >
                        <Plus size={10} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="rec-cal-legend">
              <span><span className="dot dot-cours" /> Cours prévu</span>
              <span><span className="dot dot-vacances" /> Vacances scolaires</span>
              <span><span className="dot dot-ferie" /> Jour férié</span>
            </div>
          </div>
        </>
      )}

      {styleBlock}
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styleBlock = (
  <style jsx global>{`
    .rec-page { display: flex; flex-direction: column; gap: 16px; padding-bottom: 60px; }
    .rec-header { display: flex; align-items: center; gap: 12px; }
    .rec-header h1 { font-size: 1.25rem; font-weight: 700; }
    .rec-subtitle { font-size: 0.8125rem; color: var(--text-muted); margin-top: 2px; }
    .back-btn {
      width: 40px; height: 40px; border-radius: var(--radius-sm);
      border: 1px solid var(--border); background: var(--bg-card);
      display: flex; align-items: center; justify-content: center;
      color: var(--text-secondary); text-decoration: none;
    }

    .rec-empty {
      display: flex; flex-direction: column; align-items: center; gap: 8px;
      padding: 40px 24px; text-align: center;
    }
    .rec-empty-icon {
      width: 56px; height: 56px; border-radius: 50%;
      background: var(--brand-light); color: var(--brand);
      display: flex; align-items: center; justify-content: center;
    }
    .rec-empty-title { font-weight: 600; font-size: 0.9375rem; color: var(--text-primary); }
    .rec-empty-desc { font-size: 0.8125rem; color: var(--text-muted); margin-bottom: 12px; }

    .rec-list {
      display: flex; gap: 8px; overflow-x: auto;
      padding: 4px 0 8px; scrollbar-width: thin;
    }
    .rec-chip {
      flex-shrink: 0; min-width: 180px; max-width: 240px;
      padding: 10px 14px; border-radius: 14px;
      border: 1.5px solid var(--border); background: var(--bg-card);
      cursor: pointer; text-align: left;
      display: flex; flex-direction: column; gap: 2px;
      transition: all var(--transition-fast);
    }
    .rec-chip:hover { border-color: var(--brand-200, #f0d0d0); }
    .rec-chip.selected { border-color: var(--brand); background: var(--brand-light); }
    .rec-chip.inactive { opacity: 0.55; }
    .rec-chip-nom { font-weight: 600; font-size: 0.875rem; color: var(--text-primary); }
    .rec-chip-meta { font-size: 0.7rem; color: var(--text-muted); }

    .rec-detail { display: flex; flex-direction: column; gap: 12px; padding: 16px; }
    .rec-detail-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
    .rec-detail-nom { font-size: 1.0625rem; font-weight: 700; color: var(--text-primary); }
    .rec-detail-meta { font-size: 0.8125rem; color: var(--text-secondary); margin-top: 2px; }
    .rec-detail-actions { display: flex; gap: 4px; }

    /* Édition nom + type de la série */
    .rec-edit-form { display: flex; flex-direction: column; gap: 8px; }
    .rec-edit-label { font-size: 0.8125rem; font-weight: 600; color: var(--text-secondary); }
    .rec-edit-chips { display: flex; flex-wrap: wrap; gap: 6px; }
    .rec-chip-type {
      padding: 8px 14px; border-radius: var(--radius-full);
      border: 1px solid var(--border); background: var(--bg-card);
      color: var(--text-secondary); font-size: 0.8125rem; font-weight: 500; cursor: pointer;
      transition: all var(--transition-fast);
    }
    .rec-chip-type.selected { background: var(--brand); color: white; border-color: var(--brand); }
    .rec-edit-hint { font-size: 0.75rem; color: var(--text-muted); margin: 2px 0 0; line-height: 1.4; }
    .rec-edit-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px; }
    .rec-icon-btn {
      background: none; border: none; cursor: pointer;
      width: 36px; height: 36px; border-radius: var(--radius-sm);
      display: flex; align-items: center; justify-content: center;
      color: var(--text-secondary);
    }
    .rec-icon-btn:hover { background: var(--bg-soft, #faf8f5); }
    .rec-icon-btn.danger { color: #dc2626; }
    .rec-icon-btn.danger:hover { background: #fef2f2; }

    .rec-detail-tags { display: flex; flex-wrap: wrap; gap: 6px; }
    .rec-tag {
      display: inline-flex; align-items: center; gap: 4px;
      font-size: 0.6875rem; font-weight: 600;
      background: #fef3c7; color: #92400e;
      padding: 3px 10px; border-radius: 99px;
    }

    .rec-counter {
      display: flex; align-items: center; gap: 6px;
      padding: 10px 12px; border-radius: 10px;
      background: var(--brand-light); color: var(--brand-700, var(--brand));
      font-size: 0.8125rem;
    }
    .rec-counter strong { font-size: 0.9375rem; font-weight: 800; }

    /* Calendrier */
    .rec-calendar { padding: 14px; }
    .rec-cal-header {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 10px;
    }
    .rec-cal-month {
      font-weight: 700; font-size: 0.9375rem;
      text-transform: capitalize;
    }
    .rec-cal-weekdays {
      display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px;
      margin-bottom: 4px;
    }
    .rec-cal-weekdays div {
      text-align: center; font-size: 0.6875rem;
      color: var(--text-muted); font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.04em;
    }
    .rec-cal-grid {
      display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px;
    }
    .rec-cal-cell {
      position: relative; aspect-ratio: 1;
      border-radius: 8px; background: var(--bg-soft, #faf8f5);
      display: flex; align-items: flex-start; justify-content: flex-start;
      padding: 4px 6px;
      transition: all 0.15s;
    }
    .rec-cal-cell.empty { background: transparent; }
    .rec-cal-cell.has-cours { background: var(--brand); color: white; }
    .rec-cal-cell.has-cours .rec-cal-day { color: white; font-weight: 700; }
    .rec-cal-cell.vacances:not(.has-cours) {
      background: #fef9c3; border: 1px dashed #fde047;
    }
    .rec-cal-cell.ferie:not(.has-cours) {
      background: #fee2e2;
    }
    .rec-cal-cell.today {
      box-shadow: 0 0 0 2px var(--brand);
    }
    .rec-cal-cell.past { opacity: 0.4; }
    .rec-cal-day { font-size: 0.75rem; font-weight: 600; }
    .rec-cal-action {
      position: absolute; bottom: 2px; right: 2px;
      width: 18px; height: 18px; border-radius: 50%;
      border: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      opacity: 0; transition: opacity 0.15s;
    }
    .rec-cal-cell:hover .rec-cal-action { opacity: 1; }
    .rec-cal-action.add {
      background: rgba(255,255,255,0.9); color: var(--brand);
      border: 1px solid var(--brand);
    }
    .rec-cal-action.remove {
      background: rgba(255,255,255,0.95); color: #dc2626;
      border: 1px solid #dc2626;
    }
    .rec-cal-action:disabled { opacity: 0.5; cursor: wait; }

    .rec-cal-legend {
      display: flex; flex-wrap: wrap; gap: 14px;
      margin-top: 14px; padding-top: 12px;
      border-top: 1px solid var(--border);
      font-size: 0.7rem; color: var(--text-muted);
    }
    .rec-cal-legend span { display: inline-flex; align-items: center; gap: 5px; }
    .dot { display: inline-block; width: 10px; height: 10px; border-radius: 3px; }
    .dot-cours { background: var(--brand); }
    .dot-vacances { background: #fef9c3; border: 1px dashed #fde047; }
    .dot-ferie { background: #fee2e2; }
  `}</style>
);

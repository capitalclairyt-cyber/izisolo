'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Plus, Repeat, Calendar, Clock, MapPin, Users,
  X, Check, GraduationCap, Tag, ChevronRight,
  CalendarDays, Pencil, FolderPlus, Folder, AlertTriangle, ArrowRightLeft
} from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { formatHeure } from '@/lib/utils';
import { normalizeTypesCours } from '@/lib/utils';
import { parseDate } from '@/lib/dates';
import { useToast } from '@/components/ui/ToastProvider';
import { toneForCours } from '@/lib/tones';
import Pagination, { usePagination } from '@/components/ui/Pagination';

// ── Libellés fréquence ──────────────────────────────
const FREQ_LABELS = {
  unique:       'Unique',
  hebdomadaire: 'Hebdomadaire',
  bimensuel:    'Bimensuel',
  quotidien:    'Quotidien',
  mensuel:      'Mensuel',
  personnalise: 'Personnalisé',
};
const JOURS = ['', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

function formatDateFr(dateStr) {
  if (!dateStr) return '';
  const d = parseDate(dateStr);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ═══════════════════════════════════════════════════
// Composant principal
// ═══════════════════════════════════════════════════
export default function CoursEventsClient({
  profile, recurrences, ponctuels, lieux, coursRecurrents, todayStr
}) {
  const { toast } = useToast();
  const [onglet, setOnglet] = useState('recurrents');

  // Catégories hiérarchiques (format normalisé)
  const [categories, setCategories] = useState(() =>
    normalizeTypesCours(profile?.types_cours)
  );
  const [savingTypes, setSavingTypes] = useState(false);

  // Index lieux par id
  const lieuxMap = useMemo(() => {
    const m = {};
    lieux.forEach(l => { m[l.id] = l.nom; });
    return m;
  }, [lieux]);

  // Stats par série
  const serieStats = useMemo(() => {
    const m = {};
    coursRecurrents.forEach(c => {
      const rid = c.recurrence_parent_id;
      if (!m[rid]) m[rid] = { nextDate: null, nextCoursId: null, nbSeances: 0, nbInscrits: 0 };
      m[rid].nbSeances++;
      m[rid].nbInscrits += c.presences?.[0]?.count || 0;
      if (!m[rid].nextDate || c.date < m[rid].nextDate) {
        m[rid].nextDate    = c.date;
        m[rid].nextCoursId = c.id;
      }
    });
    return m;
  }, [coursRecurrents]);

  // ── Sauvegarde des types ──────────────────────────
  const persistCategories = async (updated) => {
    setSavingTypes(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('profiles').update({ types_cours: updated }).eq('id', user.id);
      setCategories(updated);
    } catch {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSavingTypes(false);
    }
  };

  // ── Opérations sur les catégories ────────────────
  const addCategorie = (nom) => {
    if (!nom.trim()) return;
    const updated = [...categories, { categorie: nom.trim(), items: [] }];
    persistCategories(updated);
  };

  // Identifiant stable d'une catégorie : sa valeur "categorie" (null → '__null__')
  const catKey = (c) => c.categorie ?? '__null__';

  const renameCategorie = (key, nom) => {
    const updated = categories.map(c =>
      catKey(c) === key ? { ...c, categorie: nom } : c
    );
    persistCategories(updated);
  };

  const deleteCategorie = (key) => {
    const updated = categories.filter(c => catKey(c) !== key);
    persistCategories(updated);
  };

  const addItem = (key, item) => {
    if (!item.trim()) return;
    // Refuser si le type existe déjà dans n'importe quelle catégorie (insensible à la casse)
    const allItems = categories.flatMap(c => c.items || []);
    if (allItems.some(i => i.toLowerCase() === item.trim().toLowerCase())) return false;
    const updated = categories.map(c =>
      catKey(c) === key ? { ...c, items: [...(c.items || []), item.trim()] } : c
    );
    persistCategories(updated);
    return true;
  };

  const removeItem = (key, item) => {
    const updated = categories.map(c =>
      catKey(c) === key ? { ...c, items: c.items.filter(t => t !== item) } : c
    );
    persistCategories(updated);
  };

  const moveItem = (fromKey, item, toKey) => {
    const updated = categories.map(c => {
      if (catKey(c) === fromKey) return { ...c, items: (c.items || []).filter(t => t !== item) };
      if (catKey(c) === toKey)   return { ...c, items: [...(c.items || []), item] };
      return c;
    });
    persistCategories(updated);
  };

  return (
    <div className="ce-page animate-fade-in">

      {/* ── En-tête ── */}
      <div className="ce-header">
        <div className="ce-header-left">
          <GraduationCap size={22} />
          <h1>Cours &amp; Évènements</h1>
        </div>
        <Link href="/cours/nouveau" className="izi-btn izi-btn-primary ce-btn-new">
          <Plus size={16} /> Nouveau
        </Link>
      </div>

      {/* ── Gestionnaire de catégories ── */}
      <CategoryManager
        categories={categories}
        saving={savingTypes}
        profileId={profile?.id}
        todayStr={todayStr}
        onAddCategorie={addCategorie}
        onRenameCategorie={renameCategorie}
        onDeleteCategorie={deleteCategorie}
        onAddItem={addItem}
        onRemoveItem={removeItem}
        onMoveItem={moveItem}
      />

      {/* ── Onglets ── */}
      <div className="tabs-bar">
        <button
          className={`tab-btn ${onglet === 'recurrents' ? 'active' : ''}`}
          onClick={() => setOnglet('recurrents')}
        >
          <Repeat size={15} />
          Récurrents
          <span className="ce-tab-count">{recurrences.length}</span>
        </button>
        <button
          className={`tab-btn ${onglet === 'ponctuels' ? 'active' : ''}`}
          onClick={() => setOnglet('ponctuels')}
        >
          <CalendarDays size={15} />
          Ponctuels
          <span className="ce-tab-count">{ponctuels.length}</span>
        </button>
      </div>

      {/* ── Contenu ── */}
      <div className="ce-content">

        {onglet === 'recurrents' && (
          <div className="ce-list animate-slide-up">
            {recurrences.length > 0 && (
              <Link href="/cours/recurrences" className="ce-cal-link">
                <Calendar size={14} /> Voir le calendrier (ajout/retrait par jour)
              </Link>
            )}
            {recurrences.length === 0 ? (
              <EmptyState
                icon={<Repeat size={32} />}
                title="Aucune série récurrente"
                desc="Créez un cours hebdomadaire, bimensuel ou mensuel pour le voir apparaître ici."
                cta="Créer une série"
                href="/cours/nouveau"
              />
            ) : (
              recurrences.map(serie => (
                <SerieCard
                  key={serie.id}
                  serie={serie}
                  stats={serieStats[serie.id] || { nextDate: null, nextCoursId: null, nbSeances: 0, nbInscrits: 0 }}
                  lieuxMap={lieuxMap}
                />
              ))
            )}
          </div>
        )}

        {onglet === 'ponctuels' && (
          <div className="ce-list animate-slide-up">
            {ponctuels.length === 0 ? (
              <EmptyState
                icon={<CalendarDays size={32} />}
                title="Aucun événement ponctuel à venir"
                desc="Créez un cours unique ou un événement one-shot pour le voir apparaître ici."
                cta="Créer un événement"
                href="/cours/nouveau"
              />
            ) : (
              <PonctuelsList ponctuels={ponctuels} lieuxMap={lieuxMap} />
            )}
          </div>
        )}

      </div>

      <CeStyles />
    </div>
  );
}

// ═══════════════════════════════════════════════════
// Liste paginée des événements ponctuels (8/page)
// ═══════════════════════════════════════════════════
function PonctuelsList({ ponctuels, lieuxMap }) {
  const { paginated, currentPage, totalPages, setPage } = usePagination(ponctuels, 8);
  return (
    <>
      {paginated.map(cours => (
        <PonctuelCard key={cours.id} cours={cours} lieuxMap={lieuxMap} />
      ))}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onChange={setPage}
        label="événements"
      />
    </>
  );
}

// ═══════════════════════════════════════════════════
// Gestionnaire de catégories + types
// ═══════════════════════════════════════════════════
// Identifiant stable : valeur "categorie" (null → '__null__')
const getCatKey = (c) => c.categorie ?? '__null__';

function CategoryManager({ categories, saving, profileId, todayStr, onAddCategorie, onRenameCategorie, onDeleteCategorie, onAddItem, onRemoveItem, onMoveItem }) {
  const [newCatName, setNewCatName]   = useState('');
  const [showNewCat, setShowNewCat]   = useState(false);
  const [editingCat, setEditingCat]   = useState(null); // catKey
  const [editCatVal, setEditCatVal]   = useState('');
  const [addingItem, setAddingItem]   = useState(null); // catKey
  const [newItemVal, setNewItemVal]   = useState('');
  const [itemError, setItemError]     = useState('');
  // Confirmation suppression type
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { item, catKey, passeCount, aVenirCount }
  const [checking, setChecking]           = useState(false);
  // Dialogue déplacement entre catégories
  const [moveDialog, setMoveDialog]       = useState(null); // { item, catKey }

  const confirmAddCat = () => {
    if (!newCatName.trim()) return;
    onAddCategorie(newCatName);
    setNewCatName('');
    setShowNewCat(false);
  };

  const confirmRenameCat = (key) => {
    if (editCatVal.trim()) onRenameCategorie(key, editCatVal.trim());
    setEditingCat(null);
    setEditCatVal('');
  };

  const confirmAddItem = (key) => {
    if (!newItemVal.trim()) return;
    const allItems = categories.flatMap(c => c.items || []);
    if (allItems.some(i => i.toLowerCase() === newItemVal.trim().toLowerCase())) {
      const existingCat = categories.find(c => (c.items || []).some(i => i.toLowerCase() === newItemVal.trim().toLowerCase()));
      setItemError(`"${newItemVal.trim()}" existe déjà${existingCat?.categorie ? ` dans "${existingCat.categorie}"` : ' dans les non classés'}`);
      return;
    }
    const ok = onAddItem(key, newItemVal);
    if (ok !== false) {
      setNewItemVal('');
      setItemError('');
      setAddingItem(null);
    }
  };

  // Vérification avant suppression d'un type
  const handleRequestRemove = async (key, item) => {
    if (!profileId) { onRemoveItem(key, item); return; }
    setChecking(true);
    try {
      const supabase = createClient();
      const [{ count: passeCount }, { count: aVenirCount }] = await Promise.all([
        supabase.from('cours')
          .select('id', { count: 'exact', head: true })
          .eq('profile_id', profileId)
          .eq('type_cours', item)
          .lt('date', todayStr || new Date().toISOString().slice(0, 10)),
        supabase.from('cours')
          .select('id', { count: 'exact', head: true })
          .eq('profile_id', profileId)
          .eq('type_cours', item)
          .gte('date', todayStr || new Date().toISOString().slice(0, 10)),
      ]);
      if ((passeCount || 0) === 0 && (aVenirCount || 0) === 0) {
        onRemoveItem(key, item);
      } else {
        setDeleteConfirm({ item, catKey: key, passeCount: passeCount || 0, aVenirCount: aVenirCount || 0 });
      }
    } catch {
      setDeleteConfirm({ item, catKey: key, passeCount: 0, aVenirCount: 0, networkError: true });
    } finally {
      setChecking(false);
    }
  };

  const confirmDelete = () => {
    if (!deleteConfirm) return;
    onRemoveItem(deleteConfirm.catKey, deleteConfirm.item);
    setDeleteConfirm(null);
  };

  return (
    <div className="cat-manager izi-card">
      <div className="cat-manager-header">
        <Tag size={15} />
        <span className="cat-manager-title">Types de cours</span>
        <button
          className="cat-add-btn"
          onClick={() => setShowNewCat(s => !s)}
          title="Nouvelle catégorie"
        >
          <FolderPlus size={14} />
          <span>Catégorie</span>
        </button>
      </div>

      {/* Nouvelle catégorie inline */}
      {showNewCat && (
        <div className="cat-new-input-row">
          <Folder size={14} className="cat-folder-icon" />
          <input
            className="cat-input"
            value={newCatName}
            onChange={e => setNewCatName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') confirmAddCat(); if (e.key === 'Escape') { setShowNewCat(false); setNewCatName(''); } }}
            placeholder="Nom de la catégorie…"
            autoFocus
            maxLength={40}
          />
          <button className="cat-confirm-btn" onClick={confirmAddCat} disabled={!newCatName.trim() || saving}>
            <Check size={13} />
          </button>
          <button className="cat-cancel-btn" onClick={() => { setShowNewCat(false); setNewCatName(''); }}>
            <X size={13} />
          </button>
        </div>
      )}

      {/* Liste des catégories */}
      {categories.length === 0 && (
        <p className="cat-empty">Aucune catégorie — ajoutez-en une pour organiser vos types de cours.</p>
      )}

      {categories.map((cat) => {
        const key = getCatKey(cat);
        return (
        <div key={key} className="cat-group">
          {/* Header catégorie */}
          <div className="cat-group-header">
            <Folder size={14} className="cat-folder-icon" />
            {editingCat === key ? (
              <span className="cat-rename-wrap">
                <input
                  className="cat-input cat-rename-input"
                  value={editCatVal}
                  onChange={e => setEditCatVal(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') confirmRenameCat(key); if (e.key === 'Escape') setEditingCat(null); }}
                  autoFocus
                  maxLength={40}
                />
                <button className="cat-confirm-btn" onClick={() => confirmRenameCat(key)}>
                  <Check size={12} />
                </button>
                <button className="cat-cancel-btn" onClick={() => setEditingCat(null)}>
                  <X size={12} />
                </button>
              </span>
            ) : (
              <span
                className="cat-group-name"
                onClick={() => { setEditingCat(key); setEditCatVal(cat.categorie || ''); }}
                title="Cliquer pour renommer"
              >
                {cat.categorie || <em>Non classé</em>}
                <Pencil size={11} className="cat-rename-icon" />
              </span>
            )}
            <button
              className="cat-delete-btn"
              onClick={() => onDeleteCategorie(key)}
              title="Supprimer la catégorie"
              disabled={saving}
            >
              <X size={13} />
            </button>
          </div>

          {/* Items */}
          <div className="cat-items">
            {(cat.items || []).map(item => (
              <span key={item} className="cat-chip">
                {item}
                {categories.length > 1 && (
                  <button
                    className="cat-chip-move"
                    onClick={() => setMoveDialog({ item, catKey: key })}
                    disabled={saving}
                    title={`Déplacer "${item}" vers une autre catégorie`}
                  >
                    <ArrowRightLeft size={10} />
                  </button>
                )}
                <button
                  className="cat-chip-remove"
                  onClick={() => handleRequestRemove(key, item)}
                  disabled={saving || checking}
                  title={`Supprimer "${item}"`}
                >
                  <X size={10} />
                </button>
              </span>
            ))}

            {/* Ajouter un cours dans cette catégorie */}
            {addingItem === key ? (
              <span className="cat-item-input-wrap">
                <input
                  className={`cat-input cat-item-input ${itemError ? 'cat-item-input-error' : ''}`}
                  value={newItemVal}
                  onChange={e => { setNewItemVal(e.target.value); setItemError(''); }}
                  onKeyDown={e => { if (e.key === 'Enter') confirmAddItem(key); if (e.key === 'Escape') { setAddingItem(null); setNewItemVal(''); setItemError(''); } }}
                  placeholder="Nom du cours…"
                  autoFocus
                  maxLength={50}
                />
                <button className="cat-confirm-btn" onClick={() => confirmAddItem(key)} disabled={!newItemVal.trim() || saving}>
                  <Check size={12} />
                </button>
                <button className="cat-cancel-btn" onClick={() => { setAddingItem(null); setNewItemVal(''); setItemError(''); }}>
                  <X size={12} />
                </button>
                {itemError && <span className="cat-item-error">{itemError}</span>}
              </span>
            ) : (
              <button
                className="cat-add-item-btn"
                onClick={() => { setAddingItem(key); setNewItemVal(''); }}
                disabled={saving}
              >
                <Plus size={11} /> Ajouter
              </button>
            )}
          </div>
        </div>
        );
      })}

      {/* ── Dialogue déplacement de type ── */}
      {moveDialog && (
        <div className="modal-overlay" onClick={() => setMoveDialog(null)}>
          <div className="modal-box move-dialog" onClick={e => e.stopPropagation()}>
            <div className="move-dialog-header">
              <ArrowRightLeft size={16} />
              <span>Déplacer <strong>"{moveDialog.item}"</strong> vers…</span>
            </div>
            <div className="move-dialog-cats">
              {categories.map((c) => {
                const ck = getCatKey(c);
                if (ck === moveDialog.catKey) return null; // exclure la catégorie source
                return (
                  <button
                    key={ck}
                    className="move-dialog-cat-btn"
                    onClick={() => {
                      onMoveItem(moveDialog.catKey, moveDialog.item, ck);
                      setMoveDialog(null);
                    }}
                  >
                    <Folder size={14} />
                    {c.categorie || 'Non classés'}
                  </button>
                );
              })}
            </div>
            <button className="izi-btn izi-btn-ghost move-dialog-cancel" onClick={() => setMoveDialog(null)}>
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* ── Modale confirmation suppression type ── */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className={`modal-box del-type-modal ${deleteConfirm.aVenirCount > 0 ? 'del-type-danger' : 'del-type-warn'}`} onClick={e => e.stopPropagation()}>

            {/* Icône + titre */}
            <div className="del-type-header">
              {deleteConfirm.aVenirCount > 0
                ? <AlertTriangle size={22} className="del-type-icon danger" />
                : <AlertTriangle size={22} className="del-type-icon warn" />
              }
              <div>
                <div className="del-type-title">
                  Supprimer le type "{deleteConfirm.item}" ?
                </div>
                <div className="del-type-subtitle">
                  {deleteConfirm.aVenirCount > 0
                    ? `${deleteConfirm.aVenirCount} cours à venir + ${deleteConfirm.passeCount} cours passés utilisent ce type`
                    : `${deleteConfirm.passeCount} cours passé${deleteConfirm.passeCount > 1 ? 's' : ''} utilise${deleteConfirm.passeCount > 1 ? 'nt' : ''} ce type`
                  }
                </div>
              </div>
            </div>

            {/* Message contextuel */}
            {deleteConfirm.aVenirCount > 0 ? (
              <div className="del-type-body danger-body">
                <strong>⚠️ {deleteConfirm.aVenirCount} cours à venir</strong> seront privés de libellé après cette suppression.
                Ils resteront visibles dans l'agenda mais sans type associé, ce qui peut rendre leur gestion plus difficile.
              </div>
            ) : (
              <div className="del-type-body warn-body">
                Ce type a été utilisé sur <strong>{deleteConfirm.passeCount} cours passé{deleteConfirm.passeCount > 1 ? 's' : ''}</strong>.
                Ces cours conserveront leur libellé en base mais le type ne sera plus proposé à la création.
              </div>
            )}

            <div className="del-type-actions">
              <button className="izi-btn izi-btn-ghost" onClick={() => setDeleteConfirm(null)}>
                Annuler
              </button>
              <button
                className={`izi-btn ${deleteConfirm.aVenirCount > 0 ? 'del-type-btn-danger' : 'del-type-btn-warn'}`}
                onClick={confirmDelete}
              >
                {deleteConfirm.aVenirCount > 0 ? 'Supprimer quand même' : 'Confirmer la suppression'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// Carte série récurrente
// ═══════════════════════════════════════════════════
function SerieCard({ serie, stats, lieuxMap }) {
  const href     = stats.nextCoursId ? `/cours/${stats.nextCoursId}` : `/agenda`;
  const editHref = stats.nextCoursId ? `/cours/${stats.nextCoursId}?edit=1` : `/cours/nouveau`;

  const joursLabel = useMemo(() => {
    if (!serie.jours_semaine?.length) return null;
    const jours = typeof serie.jours_semaine === 'string'
      ? JSON.parse(serie.jours_semaine)
      : serie.jours_semaine;
    return jours.map(j => JOURS[j]).join(', ');
  }, [serie.jours_semaine]);

  const lieuNom = serie.lieu_id ? lieuxMap[serie.lieu_id] : null;

  return (
    <div className={`ce-card izi-card ce-card--${toneForCours(serie.type_cours)}`}>
      <div className="ce-card-bar recurrent" />
      <Link href={href} className="ce-card-body">
        <div className="ce-card-top">
          <div className="ce-card-title-row">
            <span className="ce-card-nom">{serie.nom}</span>
            {serie.type_cours && (
              <span className={`izi-badge tone-${toneForCours(serie.type_cours)}-bg`}>{serie.type_cours}</span>
            )}
          </div>
          <div className="ce-card-meta-row">
            {serie.frequence && serie.frequence !== 'unique' && (
              <span className="ce-meta-chip recurrent">
                <Repeat size={11} />
                {FREQ_LABELS[serie.frequence] || serie.frequence}
                {joursLabel && ` · ${joursLabel}`}
              </span>
            )}
            {serie.heure && (
              <span className="ce-meta-item">
                <Clock size={12} /> {formatHeure(serie.heure)}
                {serie.duree_minutes && ` · ${serie.duree_minutes} min`}
              </span>
            )}
            {lieuNom && (
              <span className="ce-meta-item">
                <MapPin size={12} /> {lieuNom}
              </span>
            )}
          </div>
        </div>
        <div className="ce-card-footer">
          <div className="ce-card-stats">
            {stats.nextDate && (
              <span className="ce-stat">
                <Calendar size={13} />
                Prochaine : <strong>{formatDateFr(stats.nextDate)}</strong>
              </span>
            )}
            {stats.nbSeances > 0 && (
              <span className="ce-stat">
                <CalendarDays size={13} />
                {stats.nbSeances} séance{stats.nbSeances > 1 ? 's' : ''} à venir
              </span>
            )}
            {stats.nbInscrits > 0 && (
              <span className="ce-stat">
                <Users size={13} />
                {stats.nbInscrits} inscrit{stats.nbInscrits > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <span className="ce-card-voir">Voir <ChevronRight size={14} /></span>
        </div>
      </Link>
      <Link href={editHref} className="ce-card-edit-btn" title="Modifier">
        <Pencil size={14} />
      </Link>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// Carte cours ponctuel
// ═══════════════════════════════════════════════════
function PonctuelCard({ cours: c, lieuxMap }) {
  const lieuNom    = c.lieu_id ? lieuxMap[c.lieu_id] : c.lieu;
  const nbInscrits = c.presences?.[0]?.count || 0;

  return (
    <div className={`ce-card izi-card ce-card--${toneForCours(c.type_cours)}`}>
      <div className="ce-card-bar ponctuel" />
      <Link href={`/cours/${c.id}`} className="ce-card-body">
        <div className="ce-card-top">
          <div className="ce-card-title-row">
            <span className="ce-card-nom">{c.nom}</span>
            {c.type_cours && (
              <span className={`izi-badge tone-${toneForCours(c.type_cours)}-bg`}>{c.type_cours}</span>
            )}
          </div>
          <div className="ce-card-meta-row">
            <span className="ce-meta-chip ponctuel">
              <Calendar size={11} />
              {formatDateFr(c.date)}
            </span>
            {c.heure && (
              <span className="ce-meta-item">
                <Clock size={12} /> {formatHeure(c.heure)}
                {c.duree_minutes && ` · ${c.duree_minutes} min`}
              </span>
            )}
            {lieuNom && (
              <span className="ce-meta-item">
                <MapPin size={12} /> {lieuNom}
              </span>
            )}
          </div>
        </div>
        <div className="ce-card-footer">
          <div className="ce-card-stats">
            {nbInscrits > 0 && (
              <span className="ce-stat">
                <Users size={13} />
                {nbInscrits} inscrit{nbInscrits > 1 ? 's' : ''}
              </span>
            )}
            {c.capacite_max && (
              <span className="ce-stat">{nbInscrits}/{c.capacite_max} places</span>
            )}
          </div>
          <span className="ce-card-voir">Voir <ChevronRight size={14} /></span>
        </div>
      </Link>
      <Link href={`/cours/${c.id}?edit=1`} className="ce-card-edit-btn" title="Modifier">
        <Pencil size={14} />
      </Link>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// Empty state
// ═══════════════════════════════════════════════════
function EmptyState({ icon, title, desc, cta, href }) {
  return (
    <div className="ce-empty izi-card">
      <div className="ce-empty-icon">{icon}</div>
      <div className="ce-empty-title">{title}</div>
      <p className="ce-empty-desc">{desc}</p>
      <Link href={href} className="izi-btn izi-btn-secondary">
        <Plus size={16} /> {cta}
      </Link>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════
function CeStyles() {
  return (
    <style jsx global>{`
      .ce-page { display: flex; flex-direction: column; gap: 14px; padding-bottom: 80px; }

      /* En-tête */
      .ce-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
      .ce-header-left { display: flex; align-items: center; gap: 10px; color: var(--brand); }
      .ce-header-left h1 {
        /* Cohérence Fraunces (charte 2026) : héritage du style global
           .page-header h1 — on garde juste un override de taille pour ce
           contexte spécifique mais on assure la même typo display. */
        font-family: var(--font-fraunces), Georgia, serif;
        font-variation-settings: 'opsz' 144, 'SOFT' 100;
        font-size: 1.625rem;
        font-weight: 500;
        letter-spacing: -0.015em;
        color: var(--text-primary);
      }
      .ce-btn-new { flex-shrink: 0; }

      /* ── Category Manager ── */
      .cat-manager { padding: 14px 16px; display: flex; flex-direction: column; gap: 10px; }
      .cat-manager-header { display: flex; align-items: center; gap: 8px; color: var(--text-secondary); }
      .cat-manager-title { font-size: 0.8125rem; font-weight: 600; flex: 1; }
      .cat-add-btn {
        display: inline-flex; align-items: center; gap: 5px;
        padding: 4px 10px;
        border: 1px dashed var(--border);
        border-radius: var(--radius-full);
        background: none; color: var(--text-muted);
        font-size: 0.75rem; font-weight: 600;
        cursor: pointer; transition: all 0.15s;
      }
      .cat-add-btn:hover { border-color: var(--brand); color: var(--brand); background: var(--brand-light); }

      .cat-new-input-row {
        display: flex; align-items: center; gap: 6px;
        padding: 6px 10px;
        background: var(--cream); border-radius: var(--radius-sm);
        border: 1px solid var(--border);
      }
      .cat-folder-icon { color: var(--brand); flex-shrink: 0; }

      .cat-input {
        flex: 1; border: none; outline: none; background: transparent;
        font-size: 0.875rem; color: var(--text-primary);
      }
      .cat-confirm-btn, .cat-cancel-btn {
        width: 22px; height: 22px; border-radius: 50%; border: none;
        cursor: pointer; flex-shrink: 0; display: flex; align-items: center; justify-content: center;
        transition: background 0.15s;
      }
      .cat-confirm-btn { background: var(--brand); color: white; }
      .cat-confirm-btn:hover:not(:disabled) { background: var(--brand-dark); }
      .cat-confirm-btn:disabled { opacity: 0.45; cursor: not-allowed; }
      .cat-cancel-btn { background: var(--cream-dark); color: var(--text-muted); }
      .cat-cancel-btn:hover { background: var(--border); }

      .cat-empty { font-size: 0.8125rem; color: var(--text-muted); font-style: italic; margin: 0; }

      /* Groupe catégorie */
      .cat-group {
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        overflow: hidden;
      }
      .cat-group-header {
        display: flex; align-items: center; gap: 8px;
        padding: 8px 12px;
        background: var(--cream);
        border-bottom: 1px solid var(--border);
      }
      .cat-group-name {
        flex: 1; font-size: 0.875rem; font-weight: 600;
        color: var(--text-primary); cursor: pointer;
        display: flex; align-items: center; gap: 5px;
      }
      .cat-rename-icon { opacity: 0; transition: opacity 0.15s; color: var(--text-muted); }
      .cat-group-name:hover .cat-rename-icon { opacity: 1; }
      .cat-rename-wrap { flex: 1; display: flex; align-items: center; gap: 5px; }
      .cat-rename-input { font-size: 0.875rem; font-weight: 600; width: 140px; }
      .cat-delete-btn {
        width: 22px; height: 22px; border-radius: 50%; border: none;
        background: none; color: var(--text-muted); cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        transition: all 0.15s;
      }
      .cat-delete-btn:hover { background: #fef2f2; color: #ef4444; }

      /* Items catégorie */
      .cat-items { display: flex; flex-wrap: wrap; gap: 6px; padding: 10px 12px; align-items: center; }
      .cat-chip {
        display: inline-flex; align-items: center; gap: 5px;
        padding: 4px 10px 4px 12px;
        background: var(--brand-light); color: var(--brand-700);
        border-radius: var(--radius-full); font-size: 0.8125rem; font-weight: 500;
      }
      .cat-chip-remove {
        display: flex; align-items: center; justify-content: center;
        width: 15px; height: 15px; border-radius: 50%; border: none;
        background: none; color: var(--brand-600); cursor: pointer;
        opacity: 0.6; transition: opacity 0.15s;
      }
      .cat-chip-remove:hover { opacity: 1; }
      .cat-chip-move {
        display: inline-flex; align-items: center; justify-content: center;
        width: 16px; height: 16px; border: none; background: none; padding: 0;
        color: var(--text-muted); cursor: pointer; opacity: 0.4;
        transition: opacity 0.15s, color 0.15s; flex-shrink: 0;
      }
      .cat-chip:hover .cat-chip-move { opacity: 1; color: var(--brand); }
      .cat-chip-move:hover { opacity: 1 !important; color: var(--brand) !important; }
      .cat-item-input-wrap {
        display: inline-flex; align-items: center; gap: 4px; flex-wrap: wrap;
        background: white; border: 1px solid var(--brand);
        border-radius: var(--radius-full); padding: 2px 6px;
      }
      .cat-item-input-wrap:has(.cat-item-input-error) {
        border-color: #ef4444; border-radius: var(--radius-sm);
      }
      .cat-item-input { width: 130px; font-size: 0.8125rem; }
      .cat-item-input-error { border-color: #ef4444; }
      .cat-item-error {
        flex-basis: 100%; font-size: 0.7rem; color: #ef4444;
        padding: 1px 2px 3px; font-weight: 500; white-space: nowrap;
      }
      .cat-add-item-btn {
        display: inline-flex; align-items: center; gap: 3px;
        padding: 3px 10px; border: 1px dashed var(--border);
        border-radius: var(--radius-full); background: none;
        color: var(--text-muted); font-size: 0.75rem; font-weight: 600;
        cursor: pointer; transition: all 0.15s;
      }
      .cat-add-item-btn:hover { border-color: var(--brand); color: var(--brand); background: var(--brand-light); }

      /* ── Dialogue déplacement ── */
      .move-dialog { padding: 0; gap: 0; max-width: 320px; }
      .move-dialog-header {
        display: flex; align-items: center; gap: 8px;
        padding: 14px 16px 12px; font-size: 0.875rem; color: var(--text-secondary);
        border-bottom: 1px solid var(--border);
      }
      .move-dialog-header strong { color: var(--text-primary); }
      .move-dialog-cats { display: flex; flex-direction: column; gap: 4px; padding: 10px 12px; }
      .move-dialog-cat-btn {
        display: flex; align-items: center; gap: 8px;
        padding: 10px 12px; border: 1px solid var(--border);
        border-radius: var(--radius-sm); background: var(--bg, #f8f9fa);
        color: var(--text-primary); font-size: 0.875rem; font-weight: 500;
        cursor: pointer; text-align: left; transition: all 0.15s;
      }
      .move-dialog-cat-btn:hover { background: var(--brand-50); border-color: var(--brand-200); color: var(--brand-700); }
      .move-dialog-cancel { width: calc(100% - 24px); margin: 0 12px 12px; justify-content: center; }

      /* ── Modale suppression type ── */
      .modal-overlay {
        position: fixed; inset: 0; background: rgba(0,0,0,0.4);
        z-index: 300; display: flex; align-items: center; justify-content: center;
        padding: 20px; animation: fadeIn 0.15s ease;
      }
      .modal-box {
        background: white; border-radius: var(--radius-md);
        width: 100%; max-width: 400px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.18);
        display: flex; flex-direction: column; overflow: hidden;
      }
      .del-type-modal { gap: 0; padding: 0; }

      /* Niveau avertissement (cours passés seulement) */
      .del-type-warn .del-type-header {
        display: flex; align-items: flex-start; gap: 12px;
        padding: 18px 18px 14px; background: #fef3c7;
        border-bottom: 1px solid #fde68a;
      }
      .del-type-icon.warn { color: #d97706; flex-shrink: 0; margin-top: 2px; }
      .del-type-warn .del-type-title { font-size: 0.9375rem; font-weight: 700; color: #92400e; }
      .del-type-warn .del-type-subtitle { font-size: 0.8rem; color: #78350f; margin-top: 2px; }
      .del-type-warn .del-type-body { padding: 14px 18px; font-size: 0.8125rem; color: var(--text-secondary); line-height: 1.5; }
      .del-type-btn-warn {
        background: #f59e0b; color: white; border: none;
        padding: 8px 16px; border-radius: var(--radius-sm);
        font-size: 0.875rem; font-weight: 600; cursor: pointer;
        transition: background 0.15s;
      }
      .del-type-btn-warn:hover { background: #d97706; }

      /* Niveau danger (cours à venir) */
      .del-type-danger .del-type-header {
        display: flex; align-items: flex-start; gap: 12px;
        padding: 18px 18px 14px; background: #fef2f2;
        border-bottom: 1px solid #fecaca;
      }
      .del-type-icon.danger { color: #dc2626; flex-shrink: 0; margin-top: 2px; }
      .del-type-danger .del-type-title { font-size: 0.9375rem; font-weight: 700; color: #991b1b; }
      .del-type-danger .del-type-subtitle { font-size: 0.8rem; color: #7f1d1d; margin-top: 2px; }
      .del-type-danger .del-type-body { padding: 14px 18px; font-size: 0.8125rem; color: var(--text-secondary); line-height: 1.5; }
      .danger-body { background: #fff5f5; border-bottom: 1px solid #fecaca; }
      .del-type-btn-danger {
        background: #dc2626; color: white; border: none;
        padding: 8px 16px; border-radius: var(--radius-sm);
        font-size: 0.875rem; font-weight: 600; cursor: pointer;
        transition: background 0.15s;
      }
      .del-type-btn-danger:hover { background: #b91c1c; }

      .del-type-actions {
        display: flex; justify-content: flex-end; gap: 8px;
        padding: 12px 16px 14px;
      }

      /* ── Onglets ── */
      /* tabs-bar / tab-btn → globals.css */
      .ce-tab-count { font-size: 0.6875rem; font-weight: 700; background: rgba(0,0,0,0.1); color: inherit; border-radius: var(--radius-full); padding: 1px 7px; min-width: 20px; text-align: center; }
      .tab-btn.active .ce-tab-count { background: rgba(255,255,255,0.3); }

      /* ── Liste ── */
      .ce-list { display: flex; flex-direction: column; gap: 10px; }
      .ce-cal-link {
        display: inline-flex; align-items: center; gap: 6px;
        align-self: flex-start;
        padding: 8px 14px; border-radius: 99px;
        background: var(--brand-light); color: var(--brand-700, var(--brand));
        border: 1px solid var(--brand-200, #f0d0d0);
        font-size: 0.8125rem; font-weight: 600;
        text-decoration: none; transition: all 0.15s;
      }
      .ce-cal-link:hover { background: var(--brand); color: white; }

      /* ── Cartes ── */
      .ce-card { display: flex; overflow: hidden; transition: box-shadow 0.15s, transform 0.15s; }
      .ce-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.08); transform: translateY(-1px); }
      .ce-card-bar { width: 6px; flex-shrink: 0; }
      .ce-card-bar.recurrent { background: var(--brand); }
      .ce-card-bar.ponctuel  { background: var(--sage, #8fae8b); }

      /* Tons par type de cours — fond soft + bord coloré (override des color bars par défaut) */
      .ce-card--rose     { background: var(--tone-rose-bg); }
      .ce-card--sage     { background: var(--tone-sage-bg); }
      .ce-card--sand     { background: var(--tone-sand-bg); }
      .ce-card--lavender { background: var(--tone-lavender-bg); }
      .ce-card--ink      { background: var(--tone-ink-bg); }
      .ce-card--rose     .ce-card-bar { background: var(--tone-rose-accent); }
      .ce-card--sage     .ce-card-bar { background: var(--tone-sage-accent); }
      .ce-card--sand     .ce-card-bar { background: var(--tone-sand-accent); }
      .ce-card--lavender .ce-card-bar { background: var(--tone-lavender-accent); }
      .ce-card--ink      .ce-card-bar { background: var(--tone-ink-bg); }

      .ce-card-body { flex: 1; padding: 14px 16px; display: flex; flex-direction: column; gap: 10px; min-width: 0; text-decoration: none; color: inherit; }
      .ce-card-top { display: flex; flex-direction: column; gap: 6px; }
      .ce-card-title-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
      .ce-card-nom { font-weight: 600; font-size: 0.9375rem; color: var(--text-primary); }
      .ce-card-meta-row { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; }
      .ce-meta-chip { display: inline-flex; align-items: center; gap: 4px; padding: 3px 9px; border-radius: var(--radius-full); font-size: 0.75rem; font-weight: 600; }
      .ce-meta-chip.recurrent { background: var(--brand-light); color: var(--brand-700); }
      .ce-meta-chip.ponctuel  { background: #f0f7ee; color: #4a7c59; }
      .ce-meta-item { display: inline-flex; align-items: center; gap: 4px; font-size: 0.8125rem; color: var(--text-secondary); }
      .ce-card-footer { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding-top: 4px; border-top: 1px solid var(--border); }
      .ce-card-stats { display: flex; flex-wrap: wrap; gap: 10px; }
      .ce-stat { display: inline-flex; align-items: center; gap: 4px; font-size: 0.8125rem; color: var(--text-muted); }
      .ce-stat strong { color: var(--text-primary); }
      .ce-card-voir { display: flex; align-items: center; gap: 2px; font-size: 0.8125rem; font-weight: 600; color: var(--brand); flex-shrink: 0; white-space: nowrap; }

      /* Bouton modifier */
      .ce-card-edit-btn {
        display: flex; align-items: center; justify-content: center;
        width: 44px; min-height: 44px; flex-shrink: 0;
        background: var(--cream); border-left: 1px solid var(--border);
        color: var(--text-muted); text-decoration: none;
        transition: background 0.15s, color 0.15s;
      }
      .ce-card-edit-btn:hover { background: var(--brand-light); color: var(--brand); }

      /* ── Empty state ── */
      .ce-empty { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 40px 20px; text-align: center; }
      .ce-empty-icon { color: var(--text-muted); opacity: 0.5; margin-bottom: 4px; }
      .ce-empty-title { font-weight: 600; font-size: 0.9375rem; }
      .ce-empty-desc { font-size: 0.875rem; color: var(--text-muted); max-width: 300px; }
    `}</style>
  );
}

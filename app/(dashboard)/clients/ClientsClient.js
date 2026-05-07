'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, Plus, User, Building2, Phone, Mail, ChevronRight, Filter, Send, ChevronLeft, SlidersHorizontal } from 'lucide-react';
import { getVocabulaire } from '@/lib/vocabulaire';
import { STATUTS_CLIENT } from '@/lib/constantes';
import { toneForClient } from '@/lib/tones';
import InviteModal from './InviteModal';

const PAGE_SIZE = 50;
const INACTIF_DAYS_THRESHOLD = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Filtres principaux orientés "qui me reste à relancer" — basés sur des
// signaux concrets (carnet actif, dernière activité), pas sur les statuts
// fidèle/inactif qui sont conceptuels et reportés en filtres avancés.
const FILTRES_PRIMAIRES = [
  { key: 'tous',         label: 'Tous'              },
  { key: 'carnet_actif', label: 'Carnet actif'      },
  { key: 'sans_carnet',  label: 'Sans carnet'       },
  { key: 'inactifs_30j', label: 'Pas de nouvelles >30j' },
];

export default function ClientsClient({ clients, profile }) {
  const vocab = getVocabulaire(profile?.metier || 'yoga', profile?.vocabulaire);
  const [search, setSearch] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);

  // Filtres : 1 principal visible toujours + un panel "avancé" repliable
  const [filtrePrimaire, setFiltrePrimaire] = useState('tous');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [filtreStatut, setFiltreStatut] = useState('tous');
  const [filtreType, setFiltreType]     = useState('tous'); // tous | particulier | pro
  const [filtreAbo, setFiltreAbo]       = useState('tous'); // nom d'offre exact

  const [page, setPage] = useState(1);

  // Liste des noms d'offres distincts (pour le filtre "type d'abonnement")
  const offresDistinct = useMemo(() => {
    const set = new Set();
    for (const c of clients) {
      for (const a of (c.abonnements || [])) {
        if (a.statut === 'actif' && a.offre_nom) set.add(a.offre_nom);
      }
    }
    return Array.from(set).sort();
  }, [clients]);

  const hasActiveAbo = (c) => (c.abonnements || []).some(a => a.statut === 'actif');

  const filtered = useMemo(() => {
    let list = clients;

    // 1. Recherche texte
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        (c.nom || '').toLowerCase().includes(q) ||
        (c.prenom || '').toLowerCase().includes(q) ||
        (c.nom_structure || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.telephone || '').includes(q)
      );
    }

    // 2. Filtre primaire (orienté action)
    const now = Date.now();
    if (filtrePrimaire === 'carnet_actif') {
      list = list.filter(hasActiveAbo);
    } else if (filtrePrimaire === 'sans_carnet') {
      list = list.filter(c => !hasActiveAbo(c));
    } else if (filtrePrimaire === 'inactifs_30j') {
      list = list.filter(c => {
        const lastUpdate = c.updated_at ? new Date(c.updated_at).getTime() : 0;
        return (now - lastUpdate) > INACTIF_DAYS_THRESHOLD * MS_PER_DAY;
      });
    }

    // 3. Filtres avancés (cumulatifs avec le primaire)
    if (filtreStatut !== 'tous') list = list.filter(c => c.statut === filtreStatut);
    if (filtreType === 'particulier') list = list.filter(c => !c.type_client || c.type_client === 'particulier');
    else if (filtreType === 'pro')    list = list.filter(c =>  c.type_client && c.type_client !== 'particulier');
    if (filtreAbo !== 'tous')         list = list.filter(c => (c.abonnements || []).some(a => a.statut === 'actif' && a.offre_nom === filtreAbo));

    return list;
  }, [clients, search, filtrePrimaire, filtreStatut, filtreType, filtreAbo]);

  // Pagination — recalcul à chaque changement de filtres
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Reset page si filtres changent
  useMemo(() => { setPage(1); }, [search, filtrePrimaire, filtreStatut, filtreType, filtreAbo]);

  const isPro = (c) => c.type_client && c.type_client !== 'particulier';

  const getInitials = (c) => {
    if (isPro(c) && c.nom_structure) return c.nom_structure.substring(0, 2).toUpperCase();
    return ((c.prenom?.[0] || '') + (c.nom?.[0] || '')).toUpperCase() || '?';
  };

  const getDisplayName = (c) => {
    if (isPro(c)) return c.nom_structure || c.nom;
    return [c.prenom, c.nom].filter(Boolean).join(' ');
  };

  const getProLabel = (type) => {
    const labels = { association: 'Asso', studio: 'Studio', entreprise: 'Entreprise', autre_pro: 'Pro' };
    return labels[type] || '';
  };

  const getSeancesRestantes = (client) => {
    const aboActif = client.abonnements?.find(a => a.statut === 'actif' && a.seances_total);
    if (!aboActif) return null;
    return (aboActif.seances_total || 0) - (aboActif.seances_utilisees || 0);
  };

  return (
    <div className="clients-page">
      {/* Header */}
      <div className="page-header animate-fade-in">
        <h1>{vocab.Clients || 'Élèves'}</h1>
        <span className="count-badge">{clients.length}</span>
        <button
          className="izi-btn izi-btn-secondary invite-btn"
          onClick={() => setInviteOpen(true)}
          type="button"
          title="Inviter une élève à créer son compte"
        >
          <Send size={15} /> <span className="invite-btn-label">Inviter</span>
        </button>
      </div>

      <InviteModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        profile={profile}
        clients={clients}
      />

      {/* Recherche sticky */}
      <div className="search-bar animate-slide-up">
        <Search size={18} className="search-icon" />
        <input
          type="text"
          className="izi-input search-input"
          placeholder={`Rechercher un ${(vocab.client || 'élève').toLowerCase()}...`}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Filtres primaires — orientés action ("qui dois-je relancer ?") */}
      <div className="filters animate-slide-up">
        {FILTRES_PRIMAIRES.map(f => (
          <button
            key={f.key}
            className={`filter-btn ${filtrePrimaire === f.key ? 'active' : ''}`}
            onClick={() => setFiltrePrimaire(f.key)}
          >
            {f.label}
          </button>
        ))}
        <button
          className={`filter-btn filter-btn-advanced ${showAdvanced ? 'active' : ''}`}
          onClick={() => setShowAdvanced(v => !v)}
        >
          <SlidersHorizontal size={13} /> Plus de filtres
        </button>
      </div>

      {/* Panel filtres avancés (replié par défaut) */}
      {showAdvanced && (
        <div className="filters-advanced animate-slide-up">
          <div className="filter-group">
            <span className="filter-group-label">Type</span>
            {[
              { key: 'tous', label: 'Tous' },
              { key: 'particulier', label: 'Particuliers' },
              { key: 'pro', label: 'Pros' },
            ].map(t => (
              <button
                key={t.key}
                className={`filter-chip ${filtreType === t.key ? 'active' : ''}`}
                onClick={() => setFiltreType(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="filter-group">
            <span className="filter-group-label">Statut</span>
            {['tous', 'actif', 'fidele', 'prospect', 'inactif'].map(s => (
              <button
                key={s}
                className={`filter-chip ${filtreStatut === s ? 'active' : ''}`}
                onClick={() => setFiltreStatut(s)}
              >
                {s === 'tous' ? 'Tous' : STATUTS_CLIENT[s]?.label || s}
              </button>
            ))}
          </div>
          {offresDistinct.length > 0 && (
            <div className="filter-group">
              <span className="filter-group-label">Carnet/abo</span>
              <select
                className="filter-select"
                value={filtreAbo}
                onChange={e => setFiltreAbo(e.target.value)}
              >
                <option value="tous">Tous</option>
                {offresDistinct.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Liste */}
      {filtered.length === 0 ? (
        <div className="empty-state izi-card animate-slide-up">
          <div className="empty-emoji">&#x1f465;</div>
          <p className="empty-title">
            {search ? 'Aucun résultat' : `Aucun ${(vocab.client || 'élève').toLowerCase()}`}
          </p>
          <p className="empty-desc">
            {search ? 'Essaie avec un autre terme' : `Ajoute ton premier ${(vocab.client || 'élève').toLowerCase()} pour commencer`}
          </p>
          {!search && (
            <Link href="/clients/nouveau" className="izi-btn izi-btn-primary">
              <Plus size={18} /> Ajouter
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* Compteur résultats */}
          <div className="clients-count">
            {filtered.length} {filtered.length > 1 ? 'résultats' : 'résultat'}
            {filtered.length > PAGE_SIZE && (
              <> · page {currentPage}/{totalPages}</>
            )}
          </div>

          <div className="clients-list animate-slide-up">
            {paginated.map(client => {
              const seancesRestantes = getSeancesRestantes(client);
              const statutInfo = STATUTS_CLIENT[client.statut] || STATUTS_CLIENT.prospect;
              const tone = toneForClient(client.statut);

              return (
                <Link
                  key={client.id}
                  href={`/clients/${client.id}`}
                  className={`client-card izi-card izi-card-interactive client-card--${tone}`}
                >
                  <div className={`client-avatar ${isPro(client) ? 'pro' : ''}`}>
                    {isPro(client) ? <Building2 size={20} /> : getInitials(client)}
                  </div>
                  <div className="client-info">
                    <div className="client-name">
                      {getDisplayName(client)}
                    </div>
                    <div className="client-details">
                      {isPro(client) && (
                        <span className="izi-badge izi-badge-brand">{getProLabel(client.type_client)}</span>
                      )}
                      <span className={`izi-badge izi-badge-${statutInfo.color}`}>
                        {statutInfo.label}
                      </span>
                      {seancesRestantes !== null && (
                        <span className={`izi-badge ${seancesRestantes <= 2 ? 'izi-badge-danger' : 'izi-badge-success'}`}>
                          {seancesRestantes} séance{seancesRestantes > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={18} className="client-chevron" />
                </Link>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="clients-pagination animate-slide-up">
              <button
                className="pagination-btn"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft size={14} /> Précédent
              </button>
              <span className="pagination-info">
                Page {currentPage} / {totalPages}
              </span>
              <button
                className="pagination-btn"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Suivant <ChevronRight size={14} />
              </button>
            </div>
          )}
        </>
      )}

      {/* FAB */}
      <Link href="/clients/nouveau" className="izi-fab" aria-label={`Nouveau ${vocab.client || 'élève'}`}>
        <Plus size={24} />
      </Link>

      <style jsx global>{`
        .clients-page {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding-bottom: 80px;
        }
        .page-header {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        /* H1 page-header hérite désormais du style global (Fraunces 1.875rem)
           défini dans app/globals.css. On laisse l'override vide pour ne pas
           casser, mais idéalement vider ou supprimer le sélecteur. */
        .count-badge {
          background: var(--brand-light);
          color: var(--brand-700);
          padding: 2px 10px;
          border-radius: var(--radius-full);
          font-size: 0.8125rem;
          font-weight: 600;
        }
        .invite-btn {
          margin-left: auto;
          padding: 6px 12px;
          font-size: 0.8125rem;
          gap: 6px;
        }
        @media (max-width: 480px) {
          /* On GARDE le label "Inviter" sur mobile (audit UX 2026-05-05 :
             juste l'icône avion en papier était trop énigmatique pour des
             profs non-tech). Padding réduit pour gagner un peu de place. */
          .invite-btn { padding: 6px 10px; font-size: 0.75rem; }
        }

        .search-bar {
          position: sticky;
          top: 0;
          z-index: 10;
          background: var(--bg-page);
          padding: 4px 0;
          display: flex;
          align-items: center;
          position: relative;
        }
        .search-icon {
          position: absolute;
          left: 14px;
          color: var(--text-muted);
          pointer-events: none;
        }
        .search-input {
          padding-left: 42px;
        }

        .filters {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding: 2px 0;
          -webkit-overflow-scrolling: touch;
        }
        .filters::-webkit-scrollbar { display: none; }
        .filter-btn {
          padding: 6px 14px;
          border-radius: var(--radius-full);
          border: 1px solid var(--border);
          background: var(--bg-card);
          color: var(--text-secondary);
          font-size: 0.8125rem;
          font-weight: 500;
          cursor: pointer;
          white-space: nowrap;
          transition: all var(--transition-fast);
          min-height: 36px;
        }
        .filter-btn.active {
          background: var(--brand);
          color: white;
          border-color: var(--brand);
        }
        .filter-btn:active {
          transform: scale(0.95);
        }

        .clients-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .client-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          text-decoration: none;
          color: inherit;
          border-left: 6px solid transparent;
        }
        .client-card--rose     { background: var(--tone-rose-bg);     border-left-color: var(--tone-rose-accent); }
        .client-card--sage     { background: var(--tone-sage-bg);     border-left-color: var(--tone-sage-accent); }
        .client-card--sand     { background: var(--tone-sand-bg);     border-left-color: var(--tone-sand-accent); }
        .client-card--lavender { background: var(--tone-lavender-bg); border-left-color: var(--tone-lavender-accent); }
        .filter-divider {
          width: 1px;
          height: 24px;
          background: var(--border);
          align-self: center;
          flex-shrink: 0;
        }

        /* Bouton "Plus de filtres" — un peu décalé pour signaler le toggle */
        .filter-btn-advanced {
          margin-left: auto;
          display: inline-flex; align-items: center; gap: 4px;
          background: var(--cream, #faf8f5);
          font-style: italic;
        }
        .filter-btn-advanced.active {
          background: var(--brand);
          color: white;
          font-style: normal;
        }

        /* Panel filtres avancés (caché par défaut) */
        .filters-advanced {
          display: flex; flex-direction: column;
          gap: 8px;
          padding: 10px 12px;
          background: var(--cream, #faf8f5);
          border-radius: var(--radius-sm);
          margin-bottom: 8px;
        }
        .filter-group {
          display: flex; flex-wrap: wrap; align-items: center;
          gap: 6px;
        }
        .filter-group-label {
          font-size: 0.75rem; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.04em;
          color: var(--text-muted, #888);
          margin-right: 4px;
          min-width: 70px;
        }
        .filter-chip {
          padding: 4px 12px;
          border-radius: 99px;
          border: 1px solid var(--border, #e5e0d8);
          background: white;
          font-size: 0.75rem; font-weight: 500;
          color: var(--text-secondary, #666);
          cursor: pointer;
          transition: all 0.15s ease;
          font-family: inherit;
        }
        .filter-chip:hover { border-color: var(--brand); color: var(--brand-700); }
        .filter-chip.active {
          background: var(--brand);
          border-color: var(--brand);
          color: white;
        }
        .filter-select {
          padding: 4px 8px;
          font-size: 0.8125rem;
          border: 1px solid var(--border);
          border-radius: 6px;
          background: white;
        }

        /* Compteur résultats + pagination */
        .clients-count {
          font-size: 0.8125rem;
          color: var(--text-muted, #888);
          padding: 4px 0;
        }
        .clients-pagination {
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px;
          padding: 16px 0 24px;
        }
        .pagination-btn {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 8px 14px;
          background: white;
          border: 1px solid var(--border);
          border-radius: 8px;
          font-size: 0.875rem; font-weight: 500;
          color: var(--text-primary);
          cursor: pointer;
          transition: all 0.15s ease;
          font-family: inherit;
        }
        .pagination-btn:hover:not(:disabled) {
          border-color: var(--brand);
          color: var(--brand-700);
        }
        .pagination-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .pagination-info {
          font-size: 0.8125rem;
          color: var(--text-muted);
          font-family: var(--font-geist-mono), ui-monospace, monospace;
        }
        .client-avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: var(--brand-light);
          color: var(--brand-700);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 0.875rem;
          flex-shrink: 0;
        }
        .client-avatar.pro {
          border-radius: var(--radius-sm);
          background: var(--brand-light);
        }
        .client-info {
          flex: 1;
          min-width: 0;
        }
        .client-name {
          font-weight: 600;
          font-size: 0.9375rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .client-details {
          display: flex;
          gap: 6px;
          margin-top: 4px;
          flex-wrap: wrap;
        }
        .client-chevron {
          color: var(--text-muted);
          flex-shrink: 0;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 40px 20px;
          text-align: center;
        }
        .empty-emoji { font-size: 2.5rem; }
        .empty-title { font-weight: 600; color: var(--text-primary); }
        .empty-desc { font-size: 0.875rem; color: var(--text-muted); margin-bottom: 8px; }
      `}</style>
    </div>
  );
}

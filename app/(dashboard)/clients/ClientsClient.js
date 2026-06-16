'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Search, Plus, User, Building2, Phone, Mail, ChevronRight, Filter, Send, SlidersHorizontal, Upload } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { getVocabulaire } from '@/lib/vocabulaire';
import { STATUTS_CLIENT } from '@/lib/constantes';
import { toneForClient } from '@/lib/tones';
import InviteModal from './InviteModal';
import Pagination, { usePagination, DEFAULT_PAGE_SIZE } from '@/components/ui/Pagination';
import EmptyState from '@/components/ui/EmptyState';

const PAGE_SIZE = DEFAULT_PAGE_SIZE;
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

export default function ClientsClient({ clients: clientsInit, profile }) {
  const vocab = getVocabulaire(profile?.metier || 'yoga', profile?.vocabulaire);
  const [search, setSearch] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [clientsList, setClientsList] = useState(clientsInit);
  const [statutDropdown, setStatutDropdown] = useState(null);
  const statutDropRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (statutDropRef.current && !statutDropRef.current.contains(e.target)) setStatutDropdown(null); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const changeClientStatut = async (clientId, newStatut) => {
    setStatutDropdown(null);
    const prev = clientsList.find(c => c.id === clientId)?.statut;
    setClientsList(list => list.map(c => c.id === clientId ? { ...c, statut: newStatut } : c));
    const supabase = createClient();
    const { error } = await supabase.from('clients').update({ statut: newStatut }).eq('id', clientId);
    if (error) setClientsList(list => list.map(c => c.id === clientId ? { ...c, statut: prev } : c));
  };

  // Filtres : 1 principal visible toujours + un panel "avancé" repliable
  const [filtrePrimaire, setFiltrePrimaire] = useState('tous');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [filtreStatut, setFiltreStatut] = useState('tous');
  const [filtreType, setFiltreType]     = useState('tous'); // tous | particulier | pro
  const [filtreAbo, setFiltreAbo]       = useState('tous'); // nom d'offre exact
  const [tri, setTri]                   = useState('alpha'); // alpha | recent


  // Liste des noms d'offres distincts (pour le filtre "type d'abonnement")
  const offresDistinct = useMemo(() => {
    const set = new Set();
    for (const c of clientsList) {
      for (const a of (c.abonnements || [])) {
        if (a.statut === 'actif' && a.offre_nom) set.add(a.offre_nom);
      }
    }
    return Array.from(set).sort();
  }, [clientsList]);

  const hasActiveAbo = (c) => (c.abonnements || []).some(a => a.statut === 'actif');

  const filtered = useMemo(() => {
    let list = clientsList;

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
    if (filtreStatut === 'tous') list = list.filter(c => c.statut !== 'archive');
    else list = list.filter(c => c.statut === filtreStatut);
    if (filtreType === 'particulier') list = list.filter(c => !c.type_client || c.type_client === 'particulier');
    else if (filtreType === 'pro')    list = list.filter(c =>  c.type_client && c.type_client !== 'particulier');
    if (filtreAbo !== 'tous')         list = list.filter(c => (c.abonnements || []).some(a => a.statut === 'actif' && a.offre_nom === filtreAbo));

    // 4. Tri
    if (tri === 'alpha') {
      const keyOf = (c) => {
        const pro = c.type_client && c.type_client !== 'particulier';
        return (pro ? (c.nom_structure || c.nom || '') : `${c.prenom || ''} ${c.nom || ''}`).trim().toLowerCase();
      };
      list = [...list].sort((a, b) => keyOf(a).localeCompare(keyOf(b), 'fr'));
    }
    // tri === 'recent' : on garde l'ordre serveur (updated_at desc), pas de tri.

    return list;
  }, [clientsList, search, filtrePrimaire, filtreStatut, filtreType, filtreAbo, tri]);

  // Pagination 8/page (cf. components/ui/Pagination.js)
  const { paginated, currentPage, totalPages, setPage } = usePagination(filtered, PAGE_SIZE);

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
        <span className="count-badge">{clientsList.length}</span>
        <Link
          href="/clients/importer"
          className="izi-btn izi-btn-secondary invite-btn"
          title="Importer des élèves depuis un fichier CSV"
        >
          <Upload size={15} /> <span className="invite-btn-label">Importer</span>
        </Link>
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
        clients={clientsList}
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

      {/* Tri */}
      <div className="tri-bar animate-slide-up">
        <span className="tri-label">Trier&nbsp;:</span>
        <button
          className={`tri-btn ${tri === 'alpha' ? 'active' : ''}`}
          onClick={() => setTri('alpha')}
          type="button"
        >
          A → Z
        </button>
        <button
          className={`tri-btn ${tri === 'recent' ? 'active' : ''}`}
          onClick={() => setTri('recent')}
          type="button"
        >
          Récents
        </button>
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
            {['tous', 'actif', 'fidele', 'prospect', 'inactif', 'archive'].map(s => (
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
        <EmptyState
          icon="👥"
          title={search ? 'Aucun résultat' : `Aucun ${(vocab.client || 'élève').toLowerCase()}`}
          description={search ? 'Essaie avec un autre terme' : `Ajoute ton premier ${(vocab.client || 'élève').toLowerCase()} pour commencer`}
        >
          {!search && (
            <Link href="/clients/nouveau" className="izi-btn izi-btn-primary">
              <Plus size={18} /> Ajouter
            </Link>
          )}
        </EmptyState>
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
                      <span
                        className={`izi-badge izi-badge-${statutInfo.color} izi-badge-clickable`}
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setStatutDropdown(statutDropdown === client.id ? null : client.id); }}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); setStatutDropdown(statutDropdown === client.id ? null : client.id); } }}
                        role="button"
                        tabIndex={0}
                      >
                        {statutInfo.label}
                      </span>
                      {statutDropdown === client.id && (
                        <div className="statut-dropdown" ref={statutDropRef} onClick={e => { e.preventDefault(); e.stopPropagation(); }}>
                          {Object.entries(STATUTS_CLIENT).map(([key, info]) => (
                            <button
                              key={key}
                              className={`statut-dropdown-item ${client.statut === key ? 'active' : ''}`}
                              onClick={() => changeClientStatut(client.id, key)}
                            >
                              <span className={`izi-badge izi-badge-${info.color}`} style={{ fontSize: '0.6875rem' }}>{info.label}</span>
                            </button>
                          ))}
                        </div>
                      )}
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

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onChange={setPage}
            label="élèves"
          />
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
        .tri-bar {
          display: flex; align-items: center; gap: 6px;
          margin-bottom: 12px;
        }
        .tri-label {
          font-size: 0.75rem; font-weight: 500;
          color: var(--text-secondary, #666);
        }
        .tri-btn {
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
        .tri-btn:hover { border-color: var(--brand); color: var(--brand-700); }
        .tri-btn.active {
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
          position: relative;
        }
        .izi-badge-clickable {
          cursor: pointer;
          transition: opacity 0.15s ease;
        }
        .izi-badge-clickable:hover { opacity: 0.8; }
        .statut-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          z-index: 50;
          background: white;
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          box-shadow: var(--shadow-md, 0 4px 12px rgba(0,0,0,0.1));
          padding: 4px;
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 120px;
          margin-top: 4px;
        }
        .statut-dropdown-item {
          display: flex;
          align-items: center;
          padding: 6px 8px;
          border: none;
          background: transparent;
          cursor: pointer;
          border-radius: 4px;
          font-family: inherit;
          transition: background 0.12s ease;
        }
        .statut-dropdown-item:hover { background: var(--brand-light, #f5f0eb); }
        .statut-dropdown-item.active { background: var(--brand-light, #f5f0eb); }
        .client-chevron {
          color: var(--text-muted);
          flex-shrink: 0;
        }
      `}</style>
    </div>
  );
}

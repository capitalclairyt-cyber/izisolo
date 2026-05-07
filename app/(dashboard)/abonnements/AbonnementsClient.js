'use client';

import { useState, useMemo, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import Link from 'next/link';
import {
  Ticket, CalendarCheck, Zap, Search,
  CheckCircle2, XCircle, AlertTriangle, Clock,
  ChevronRight, CreditCard, TrendingUp, Users,
  Banknote, FileText, Landmark,
} from 'lucide-react';
import { formatDate, formatMontant } from '@/lib/utils';
import { toneForAbonnement } from '@/lib/tones';
import Pagination, { usePagination } from '@/components/ui/Pagination';

// ─── Types d'offre ───────────────────────────────────────────────────────────
const TYPE_CONFIG = {
  carnet:       { Icon: Ticket,       label: 'Carnet',      color: '#6366f1' },
  abonnement:   { Icon: CalendarCheck, label: 'Abonnement', color: '#0ea5e9' },
  cours_unique: { Icon: Zap,          label: 'À l\'unité',  color: '#f59e0b' },
};

// ─── Modes de paiement ───────────────────────────────────────────────────────
const MODE_ICONES = { especes: Banknote, cheque: FileText, virement: Landmark, CB: CreditCard };

// ─── Statuts ─────────────────────────────────────────────────────────────────
const STATUT_CONFIG = {
  actif:   { Icon: CheckCircle2,  label: 'Actif',    bg: '#ecfdf5', color: '#059669', border: '#6ee7b7' },
  epuise:  { Icon: AlertTriangle, label: 'Épuisé',   bg: '#fffbeb', color: '#d97706', border: '#fcd34d' },
  expire:  { Icon: Clock,         label: 'Expiré',   bg: '#fff7ed', color: '#ea580c', border: '#fdba74' },
  annule:  { Icon: XCircle,       label: 'Annulé',   bg: '#fef2f2', color: '#dc2626', border: '#fca5a5' },
};

const FILTRES = [
  { id: 'tous',    label: 'Tous' },
  { id: 'actif',   label: 'Actifs' },
  { id: 'epuise',  label: 'Épuisés' },
  { id: 'expire',  label: 'Expirés' },
  { id: 'annule',  label: 'Annulés' },
];

function displayName(client) {
  if (!client) return 'Client inconnu';
  if (client.nom_structure) return client.nom_structure;
  const parts = [client.prenom, client.nom].filter(Boolean);
  return parts.join(' ') || 'Client sans nom';
}

function SeancesBar({ utilisees, total }) {
  if (!total) return null;
  const pct = Math.min(100, Math.round((utilisees / total) * 100));
  const reste = total - utilisees;
  const couleur = reste <= 1 ? '#ef4444' : reste <= 3 ? '#f59e0b' : '#10b981';
  return (
    <div className="seances-bar-wrapper">
      <div className="seances-bar-track">
        <div className="seances-bar-fill" style={{ width: `${pct}%`, background: couleur }} />
      </div>
      <span className="seances-bar-label" style={{ color: couleur }}>
        {utilisees}/{total} séances
      </span>
    </div>
  );
}

export default function AbonnementsClient({ abonnements: initAbo, paiementsParAbo: initPaiements }) {
  const [abonnements, setAbonnements]         = useState(initAbo || []);
  const [paiementsParAbo, setPaiementsParAbo] = useState(initPaiements || {});
  const [loadingData, setLoadingData]         = useState(!initAbo);

  useEffect(() => {
    if (initAbo) return; // données passées depuis un parent — pas besoin de fetch
    const fetchData = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      const [{ data: abos }, { data: paiements }] = await Promise.all([
        supabase
          .from('abonnements')
          .select('*, clients(id, prenom, nom, nom_structure, type_client, statut, email, telephone)')
          .eq('profile_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('paiements')
          .select('id, abonnement_id, montant, mode_paiement, created_at')
          .eq('profile_id', user.id),
      ]);

      setAbonnements(abos || []);

      const map = {};
      (paiements || []).forEach(p => {
        if (!map[p.abonnement_id]) map[p.abonnement_id] = [];
        map[p.abonnement_id].push(p);
      });
      setPaiementsParAbo(map);
      setLoadingData(false);
    };
    fetchData();
  }, [initAbo]);

  const [filtre, setFiltre]   = useState('tous');
  const [search, setSearch]   = useState('');
  const [sort, setSort]       = useState('date_desc'); // date_desc | nom_asc | statut

  // Stats
  const stats = useMemo(() => {
    const actifs    = abonnements.filter(a => a.statut === 'actif').length;
    const caTotal   = abonnements.reduce((sum, a) => {
      const paiements = paiementsParAbo[a.id] || [];
      return sum + paiements.reduce((s, p) => s + (p.montant || 0), 0);
    }, 0);
    return { total: abonnements.length, actifs, caTotal };
  }, [abonnements, paiementsParAbo]);

  // Filtrage + recherche
  const filtered = useMemo(() => {
    let list = abonnements;
    if (filtre !== 'tous') list = list.filter(a => a.statut === filtre);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(a => {
        const nom = displayName(a.clients).toLowerCase();
        const offre = (a.offre_nom || '').toLowerCase();
        return nom.includes(q) || offre.includes(q);
      });
    }
    // Tri
    if (sort === 'nom_asc') {
      list = [...list].sort((a, b) => displayName(a.clients).localeCompare(displayName(b.clients), 'fr'));
    } else if (sort === 'statut') {
      const order = { actif: 0, epuise: 1, expire: 2, annule: 3 };
      list = [...list].sort((a, b) => (order[a.statut] ?? 9) - (order[b.statut] ?? 9));
    } else {
      // date_desc (default)
      list = [...list].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    return list;
  }, [abonnements, filtre, search, sort]);

  // Pagination 8/page
  const { paginated: abosPaginated, currentPage, totalPages, setPage } = usePagination(filtered, 8);

  // Comptes par statut pour les badges de filtre
  const counts = useMemo(() => {
    const c = { tous: abonnements.length };
    abonnements.forEach(a => { c[a.statut] = (c[a.statut] || 0) + 1; });
    return c;
  }, [abonnements]);

  if (loadingData) {
    return (
      <div className="abo-page">
        <div className="abo-header animate-fade-in">
          <div>
            <h1 className="abo-title">Abonnements</h1>
            <p className="abo-subtitle">Chargement…</p>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1,2,3,4].map(i => (
            <div key={i} style={{ height: 80, borderRadius: 10, background: 'var(--border)', opacity: 0.5, animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))}
        </div>
        <style jsx global>{`@keyframes pulse { 0%,100%{opacity:.5} 50%{opacity:.25} }`}</style>
      </div>
    );
  }

  return (
    <div className="abo-page">

      {/* ── En-tête ── */}
      <div className="abo-header animate-fade-in">
        <div>
          <h1 className="abo-title">Abonnements</h1>
          <p className="abo-subtitle">{stats.total} au total · {stats.actifs} actifs</p>
        </div>
      </div>

      {/* ── Statistiques ── */}
      <div className="abo-stats animate-slide-up">
        <div className="abo-stat-card">
          <Users size={18} style={{ color: 'var(--brand)' }} />
          <div>
            <div className="abo-stat-value">{stats.actifs}</div>
            <div className="abo-stat-label">Actifs</div>
          </div>
        </div>
        <div className="abo-stat-card">
          <TrendingUp size={18} style={{ color: '#10b981' }} />
          <div>
            <div className="abo-stat-value">{formatMontant(stats.caTotal)}</div>
            <div className="abo-stat-label">CA encaissé</div>
          </div>
        </div>
        <div className="abo-stat-card">
          <Ticket size={18} style={{ color: '#6366f1' }} />
          <div>
            <div className="abo-stat-value">{stats.total}</div>
            <div className="abo-stat-label">Total</div>
          </div>
        </div>
      </div>

      {/* ── Filtres ── */}
      <div className="abo-filters animate-slide-up">
        {FILTRES.map(f => (
          <button
            key={f.id}
            className={`abo-filter-btn ${filtre === f.id ? 'active' : ''}`}
            onClick={() => setFiltre(f.id)}
          >
            {f.label}
            {counts[f.id] > 0 && (
              <span className="abo-filter-count">{counts[f.id]}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Barre de recherche + tri ── */}
      <div className="abo-toolbar animate-slide-up">
        <div className="abo-search-wrapper">
          <Search size={16} className="abo-search-icon" />
          <input
            className="abo-search"
            placeholder="Rechercher un élève ou une offre…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="abo-sort izi-input" value={sort} onChange={e => setSort(e.target.value)}>
          <option value="date_desc">Plus récents</option>
          <option value="nom_asc">Nom A→Z</option>
          <option value="statut">Par statut</option>
        </select>
      </div>

      {/* ── Liste ── */}
      {filtered.length === 0 ? (
        <div className="abo-empty animate-fade-in">
          <Ticket size={36} style={{ color: 'var(--text-muted)' }} />
          {search ? (
            <>
              <p>Aucun abonnement trouvé</p>
              <button className="izi-btn izi-btn-secondary" onClick={() => setSearch('')}>
                Effacer la recherche
              </button>
            </>
          ) : (
            <>
              <p style={{ fontWeight: 600 }}>Aucun abonnement actif</p>
              <p style={{ fontSize: '0.8125rem', maxWidth: 320, margin: 0 }}>
                Crée d'abord une offre, puis assigne-la à un·e élève depuis sa fiche pour démarrer un abonnement.
              </p>
              <Link href="/offres/nouveau" className="izi-btn izi-btn-primary">
                Créer une offre
              </Link>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="abo-list animate-slide-up">
            {abosPaginated.map(abo => <AboCard key={abo.id} abo={abo} paiements={paiementsParAbo[abo.id] || []} />)}
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onChange={setPage}
            label="abonnements"
          />
        </>
      )}

      <style jsx global>{`
        .abo-page { display: flex; flex-direction: column; gap: 16px; padding-bottom: 40px; }

        /* Header */
        .abo-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
        .abo-title  { font-size: 1.375rem; font-weight: 800; color: var(--text-primary); }
        .abo-subtitle { font-size: 0.8125rem; color: var(--text-muted); margin-top: 2px; }

        /* Stats */
        .abo-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
        .abo-stat-card {
          display: flex; align-items: center; gap: 10px;
          padding: 12px 14px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
        }
        .abo-stat-value { font-size: 1.125rem; font-weight: 800; color: var(--text-primary); }
        .abo-stat-label { font-size: 0.6875rem; color: var(--text-muted); }

        /* Filtres */
        .abo-filters { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 2px; }
        .abo-filters::-webkit-scrollbar { display: none; }
        .abo-filter-btn {
          display: flex; align-items: center; gap: 5px;
          padding: 7px 14px;
          border-radius: var(--radius-full);
          border: 1.5px solid var(--border);
          background: var(--bg-card);
          font-size: 0.8125rem; font-weight: 600;
          color: var(--text-secondary);
          cursor: pointer; transition: all var(--transition-fast);
          white-space: nowrap; flex-shrink: 0;
        }
        .abo-filter-btn.active {
          border-color: var(--brand); background: var(--brand-light); color: var(--brand-700);
        }
        .abo-filter-count {
          background: var(--brand); color: white;
          font-size: 0.6875rem; font-weight: 700;
          padding: 1px 6px; border-radius: 99px;
        }
        .abo-filter-btn.active .abo-filter-count {
          background: var(--brand-700);
        }

        /* Toolbar */
        .abo-toolbar { display: flex; gap: 8px; }
        .abo-search-wrapper { position: relative; flex: 1; }
        .abo-search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--text-muted); }
        .abo-search { width: 100%; padding: 9px 12px 9px 32px; border: 1px solid var(--border); border-radius: var(--radius-md); background: var(--bg-card); font-size: 0.875rem; color: var(--text-primary); }
        .abo-search::placeholder { color: var(--text-muted); }
        .abo-sort { min-width: 130px; max-width: 160px; font-size: 0.8125rem; }

        /* Liste */
        .abo-list { display: flex; flex-direction: column; gap: 10px; }
        .abo-empty {
          display: flex; flex-direction: column; align-items: center; gap: 12px;
          padding: 48px 24px; text-align: center; color: var(--text-muted);
          font-size: 0.9375rem;
        }

        /* Card */
        .abo-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-left-width: 6px;
          border-radius: var(--radius-md);
          padding: 14px 16px;
          display: flex; align-items: flex-start; gap: 12px;
          transition: box-shadow var(--transition-fast);
          text-decoration: none; color: inherit;
        }
        .abo-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.08); }
        /* Tons par statut d'abonnement */
        .abo-card--rose     { background: var(--tone-rose-bg);     border-left-color: var(--tone-rose-accent); }
        .abo-card--sage     { background: var(--tone-sage-bg);     border-left-color: var(--tone-sage-accent); }
        .abo-card--sand     { background: var(--tone-sand-bg);     border-left-color: var(--tone-sand-accent); }
        .abo-card--lavender { background: var(--tone-lavender-bg); border-left-color: var(--tone-lavender-accent); }

        .abo-card-icon {
          width: 40px; height: 40px; border-radius: var(--radius-sm);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }

        .abo-card-body { flex: 1; min-width: 0; }
        .abo-card-top  { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
        .abo-card-client { font-weight: 700; font-size: 0.9375rem; color: var(--text-primary); }
        .abo-card-offre  { font-size: 0.8125rem; color: var(--text-secondary); margin-top: 1px; }

        .abo-statut-badge {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 3px 9px; border-radius: var(--radius-full);
          font-size: 0.6875rem; font-weight: 700;
          border: 1px solid;
          flex-shrink: 0;
        }

        .abo-card-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 8px; }
        .abo-meta-item {
          display: flex; align-items: center; gap: 4px;
          font-size: 0.75rem; color: var(--text-muted);
        }

        .abo-card-arrow { color: var(--text-muted); flex-shrink: 0; margin-top: 2px; }

        /* Séances bar */
        .seances-bar-wrapper { display: flex; align-items: center; gap: 8px; margin-top: 8px; }
        .seances-bar-track { flex: 1; height: 5px; border-radius: 99px; background: var(--border); overflow: hidden; max-width: 100px; }
        .seances-bar-fill  { height: 100%; border-radius: 99px; transition: width 0.4s ease; }
        .seances-bar-label { font-size: 0.75rem; font-weight: 600; }

        /* Mode paiement chip */
        .abo-mode-chip {
          display: inline-flex; align-items: center; gap: 3px;
          padding: 2px 7px; border-radius: 99px;
          font-size: 0.6875rem; font-weight: 500;
          background: var(--cream, #faf8f5);
          border: 1px solid var(--border);
          color: var(--text-secondary);
        }

        @media (max-width: 400px) {
          .abo-stats { grid-template-columns: repeat(3, 1fr); }
          .abo-stat-card { padding: 10px; gap: 6px; }
          .abo-stat-value { font-size: 1rem; }
        }
      `}</style>
    </div>
  );
}

// ─── Carte individuelle ───────────────────────────────────────────────────────
function AboCard({ abo, paiements }) {
  const typeCfg   = TYPE_CONFIG[abo.type] || TYPE_CONFIG.abonnement;
  const statutCfg = STATUT_CONFIG[abo.statut] || STATUT_CONFIG.annule;
  const StatutIcon = statutCfg.Icon;
  const TypeIcon   = typeCfg.Icon;

  // Montant total payé pour cet abonnement
  const montantPaye = paiements.reduce((s, p) => s + (p.montant || 0), 0);
  const modePrincipal = paiements[0]?.mode_paiement;
  const ModePaiementIcon = modePrincipal ? (MODE_ICONES[modePrincipal] || CreditCard) : null;

  // Date de fin
  const aujourd = new Date();
  const dateFin  = abo.date_fin ? new Date(abo.date_fin) : null;
  const isExpiringSoon = dateFin && abo.statut === 'actif'
    && (dateFin - aujourd) / (1000 * 60 * 60 * 24) <= 14;

  const seancesRestantes = (abo.seances_total || 0) - (abo.seances_utilisees || 0);
  const tone = toneForAbonnement(abo.statut, seancesRestantes);

  return (
    <Link href={`/clients/${abo.client_id}`} className={`abo-card abo-card--${tone}`}>
      {/* Icône type */}
      <div className="abo-card-icon" style={{ background: typeCfg.color + '18' }}>
        <TypeIcon size={20} style={{ color: typeCfg.color }} />
      </div>

      {/* Corps */}
      <div className="abo-card-body">
        <div className="abo-card-top">
          <div>
            <div className="abo-card-client">{displayName(abo.clients)}</div>
            <div className="abo-card-offre">{abo.offre_nom}</div>
          </div>
          <div
            className="abo-statut-badge"
            style={{ background: statutCfg.bg, color: statutCfg.color, borderColor: statutCfg.border }}
          >
            <StatutIcon size={10} />
            {statutCfg.label}
          </div>
        </div>

        {/* Barre séances pour les carnets */}
        {abo.type === 'carnet' && abo.seances_total && (
          <SeancesBar utilisees={abo.seances_utilisees || 0} total={abo.seances_total} />
        )}

        {/* Méta-infos */}
        <div className="abo-card-meta">
          {montantPaye > 0 && (
            <span className="abo-meta-item">
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{formatMontant(montantPaye)}</span>
            </span>
          )}
          {ModePaiementIcon && (
            <span className="abo-mode-chip">
              <ModePaiementIcon size={11} />
              {modePrincipal}
            </span>
          )}
          {dateFin && (
            <span className="abo-meta-item" style={{ color: isExpiringSoon ? '#ea580c' : 'var(--text-muted)' }}>
              <Clock size={12} />
              {isExpiringSoon ? 'Expire ' : 'Fin : '}
              {formatDate(dateFin, { year: false })}
            </span>
          )}
          {abo.created_at && (
            <span className="abo-meta-item">
              <CalendarCheck size={12} />
              {formatDate(abo.created_at, { year: false })}
            </span>
          )}
        </div>
      </div>

      <ChevronRight size={16} className="abo-card-arrow" />
    </Link>
  );
}


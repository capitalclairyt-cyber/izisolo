'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, Plus, User, Building2, Phone, Mail, ChevronRight, Filter, Send } from 'lucide-react';
import { getVocabulaire } from '@/lib/vocabulaire';
import { STATUTS_CLIENT } from '@/lib/constantes';
import { toneForClient } from '@/lib/tones';
import InviteModal from './InviteModal';

export default function ClientsClient({ clients, profile }) {
  const vocab = getVocabulaire(profile?.metier || 'yoga', profile?.vocabulaire);
  const [search, setSearch] = useState('');
  const [filtreStatut, setFiltreStatut] = useState('tous');
  const [inviteOpen, setInviteOpen] = useState(false);

  const [filtreType, setFiltreType] = useState('tous'); // 'tous' | 'particulier' | 'pro'

  const filtered = useMemo(() => {
    let list = clients;
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
    if (filtreStatut !== 'tous') {
      list = list.filter(c => c.statut === filtreStatut);
    }
    if (filtreType === 'particulier') {
      list = list.filter(c => !c.type_client || c.type_client === 'particulier');
    } else if (filtreType === 'pro') {
      list = list.filter(c => c.type_client && c.type_client !== 'particulier');
    }
    return list;
  }, [clients, search, filtreStatut, filtreType]);

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

      {/* Filtres type */}
      <div className="filters animate-slide-up">
        {[
          { key: 'tous', label: 'Tous' },
          { key: 'particulier', label: 'Particuliers' },
          { key: 'pro', label: 'Pros' },
        ].map(t => (
          <button
            key={t.key}
            className={`filter-btn ${filtreType === t.key ? 'active' : ''}`}
            onClick={() => setFiltreType(t.key)}
          >
            {t.label}
          </button>
        ))}
        <div className="filter-divider" />
        {['tous', 'actif', 'fidele', 'prospect', 'inactif'].map(s => (
          <button
            key={s}
            className={`filter-btn ${filtreStatut === s ? 'active' : ''}`}
            onClick={() => setFiltreStatut(s)}
          >
            {s === 'tous' ? 'Tous' : STATUTS_CLIENT[s]?.label || s}
          </button>
        ))}
      </div>

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
        <div className="clients-list animate-slide-up">
          {filtered.map(client => {
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
        .page-header h1 {
          font-size: 1.375rem;
          font-weight: 700;
        }
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
          .invite-btn-label { display: none; }
          .invite-btn { padding: 6px 10px; }
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

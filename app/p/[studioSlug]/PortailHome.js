'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { MapPin, Calendar, Clock, Users, ChevronRight, Search, CreditCard, Ticket, CalendarCheck, Zap } from 'lucide-react';

const TYPE_ICONS = { carnet: Ticket, abonnement: CalendarCheck, cours_unique: Zap };

const JOURS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const MOIS = ['jan', 'fév', 'mar', 'avr', 'mai', 'jun', 'jul', 'aoû', 'sep', 'oct', 'nov', 'déc'];

function formatDateCourt(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((date - today) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'Aujourd\'hui';
  if (diff === 1) return 'Demain';
  return `${JOURS[date.getDay()]} ${d} ${MOIS[m - 1]}`;
}

function formatHeure(h) {
  if (!h) return '';
  const [hh, mm] = h.split(':');
  return mm === '00' ? `${parseInt(hh)}h` : `${parseInt(hh)}h${mm}`;
}

function PlacesBadge({ capacite, inscrits }) {
  if (!capacite) return null;
  const dispo = capacite - inscrits;
  if (dispo <= 0) return <span className="portail-tag portail-tag-amber">Complet</span>;
  if (dispo <= 3) return <span className="portail-tag portail-tag-amber">{dispo} place{dispo > 1 ? 's' : ''}</span>;
  return <span className="portail-tag portail-tag-green">Places disponibles</span>;
}

export default function PortailHome({ profile, cours, offresStripe = [], studioSlug }) {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');

  // Tous les types uniques présents dans les cours
  const types = useMemo(() => {
    return [...new Set(cours.map(c => c.type_cours).filter(Boolean))];
  }, [cours]);

  const filtered = useMemo(() => {
    return cours.filter(c => {
      const matchSearch = !search ||
        (c.nom || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.type_cours || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.lieu || '').toLowerCase().includes(search.toLowerCase());
      const matchType = !filterType || c.type_cours === filterType;
      return matchSearch && matchType;
    });
  }, [cours, search, filterType]);

  // Grouper par date
  const grouped = useMemo(() => {
    const map = new Map();
    filtered.forEach(c => {
      if (!map.has(c.date)) map.set(c.date, []);
      map.get(c.date).push(c);
    });
    return [...map.entries()];
  }, [filtered]);

  return (
    <div>
      {/* Studio header */}
      <div className="portail-studio-header">
        <div className="portail-studio-avatar">
          {profile.photo_url
            ? <img src={profile.photo_url} alt={profile.studio_nom} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
            : <span style={{ fontSize: '2rem' }}>🌿</span>
          }
        </div>
        <div>
          <h1 className="portail-studio-name">{profile.studio_nom}</h1>
          <div className="portail-studio-meta">
            {profile.metier && <span>{profile.metier}</span>}
            {(profile.ville || profile.code_postal) && (
              <span className="portail-studio-ville">
                <MapPin size={12} />
                {[profile.ville, profile.code_postal].filter(Boolean).join(' · ')}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="portail-filters">
        <div className="portail-search-wrap">
          <Search size={15} style={{ color: '#aaa', flexShrink: 0 }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un cours…"
            className="portail-search-input"
          />
        </div>
        {types.length > 1 && (
          <div className="portail-type-pills">
            <button
              onClick={() => setFilterType('')}
              className={`portail-pill ${!filterType ? 'active' : ''}`}
            >Tous</button>
            {types.map(t => (
              <button
                key={t}
                onClick={() => setFilterType(filterType === t ? '' : t)}
                className={`portail-pill ${filterType === t ? 'active' : ''}`}
              >{t}</button>
            ))}
          </div>
        )}
      </div>

      {/* Liste des cours */}
      {cours.length === 0 ? (
        <div className="portail-empty">
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📅</div>
          <p style={{ fontWeight: 600, margin: '0 0 6px' }}>Aucun cours à venir</p>
          <p style={{ color: '#888', fontSize: '0.875rem', margin: 0 }}>
            Les prochains cours seront affichés ici.
          </p>
        </div>
      ) : grouped.length === 0 ? (
        <div className="portail-empty">
          <p style={{ color: '#888' }}>Aucun cours correspond à ta recherche</p>
        </div>
      ) : grouped.map(([date, coursDate]) => (
        <div key={date} className="portail-day-group">
          <div className="portail-day-label">{formatDateCourt(date)}</div>
          {coursDate.map(c => {
            const dispo = c.capacite_max ? c.capacite_max - c.nbInscrits : null;
            const complet = dispo !== null && dispo <= 0;
            return (
              <Link
                key={c.id}
                href={`/p/${studioSlug}/cours/${c.id}`}
                className={`portail-cours-card ${complet ? 'complet' : ''}`}
              >
                <div className="portail-cours-info">
                  <div className="portail-cours-nom">{c.nom}</div>
                  <div className="portail-cours-details">
                    <span><Clock size={12} /> {formatHeure(c.heure)}{c.duree ? ` · ${c.duree}min` : ''}</span>
                    {c.lieu && <span><MapPin size={12} /> {c.lieu}</span>}
                    {c.type_cours && <span className="portail-tag portail-tag-rose">{c.type_cours}</span>}
                  </div>
                </div>
                <div className="portail-cours-right">
                  <PlacesBadge capacite={c.capacite_max} inscrits={c.nbInscrits} />
                  <ChevronRight size={16} style={{ color: '#ccc' }} />
                </div>
              </Link>
            );
          })}
        </div>
      ))}

      {/* Section "Acheter en ligne" — affichée uniquement si au moins 1 offre a un Stripe Payment Link */}
      {offresStripe.length > 0 && (
        <div className="portail-stripe-section">
          <div className="portail-stripe-header">
            <CreditCard size={16} style={{ color: '#635bff' }} />
            <h2>Acheter en ligne</h2>
          </div>
          <p className="portail-stripe-desc">
            Paye ton carnet ou abonnement par CB en quelques clics.
          </p>
          <div className="portail-stripe-grid">
            {offresStripe.map(o => {
              const Icon = TYPE_ICONS[o.type] || Ticket;
              return (
                <a
                  key={o.id}
                  href={o.stripe_payment_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="portail-stripe-card"
                >
                  <div className="portail-stripe-card-icon">
                    <Icon size={18} />
                  </div>
                  <div className="portail-stripe-card-info">
                    <div className="portail-stripe-card-nom">{o.nom}</div>
                    {o.seances && (
                      <div className="portail-stripe-card-meta">{o.seances} séance{o.seances > 1 ? 's' : ''}</div>
                    )}
                  </div>
                  <div className="portail-stripe-card-prix">
                    {o.prix}€
                  </div>
                </a>
              );
            })}
          </div>
          <p className="portail-stripe-trust">
            🔒 Paiement sécurisé via Stripe — IziSolo ne stocke aucune donnée bancaire.
          </p>
        </div>
      )}

      <style jsx global>{`
        .portail-studio-header {
          display: flex; align-items: center; gap: 16px;
          margin-bottom: 24px; padding-bottom: 20px;
          border-bottom: 1px solid #f0ebe8;
        }
        .portail-studio-avatar {
          width: 64px; height: 64px; border-radius: 50%;
          background: #f8f0f0; display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; overflow: hidden;
        }
        .portail-studio-name { font-size: 1.375rem; font-weight: 800; margin: 0 0 4px; color: #1a1a2e; }
        .portail-studio-meta { display: flex; flex-wrap: wrap; gap: 10px; font-size: 0.875rem; color: #888; align-items: center; }
        .portail-studio-ville { display: flex; align-items: center; gap: 4px; }

        .portail-filters { margin-bottom: 20px; display: flex; flex-direction: column; gap: 10px; }
        .portail-search-wrap {
          display: flex; align-items: center; gap: 8px;
          background: white; border: 1.5px solid #f0ebe8; border-radius: 10px;
          padding: 9px 12px;
        }
        .portail-search-input { flex: 1; border: none; outline: none; font-size: 0.9rem; background: transparent; }
        .portail-type-pills { display: flex; gap: 6px; flex-wrap: wrap; }
        .portail-pill {
          padding: 5px 12px; border-radius: 99px;
          border: 1px solid #e8e0db; background: white;
          font-size: 0.8125rem; font-weight: 500; cursor: pointer;
          color: #888; transition: all 0.15s;
        }
        .portail-pill:hover { border-color: #d4a0a0; color: #d4a0a0; }
        .portail-pill.active { background: #d4a0a0; border-color: #d4a0a0; color: white; }

        .portail-day-group { margin-bottom: 20px; }
        .portail-day-label {
          font-size: 0.8125rem; font-weight: 700; color: #888;
          text-transform: uppercase; letter-spacing: 0.05em;
          margin-bottom: 8px; padding-left: 2px;
        }
        .portail-cours-card {
          display: flex; align-items: center; justify-content: space-between; gap: 12px;
          background: white; border-radius: 14px; padding: 16px;
          box-shadow: 0 1px 6px rgba(0,0,0,0.05); margin-bottom: 8px;
          text-decoration: none; color: inherit; transition: box-shadow 0.15s, transform 0.1s;
        }
        .portail-cours-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.1); transform: translateY(-1px); }
        .portail-cours-card.complet { opacity: 0.6; }
        .portail-cours-info { flex: 1; min-width: 0; }
        .portail-cours-nom { font-weight: 700; font-size: 1rem; margin-bottom: 6px; color: #1a1a2e; }
        .portail-cours-details { display: flex; flex-wrap: wrap; gap: 8px; font-size: 0.8125rem; color: #888; align-items: center; }
        .portail-cours-details span { display: flex; align-items: center; gap: 4px; }
        .portail-cours-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }

        .portail-empty {
          text-align: center; padding: 48px 24px;
          color: #888; background: white; border-radius: 16px;
          box-shadow: 0 1px 6px rgba(0,0,0,0.04);
        }
      `}</style>
    </div>
  );
}

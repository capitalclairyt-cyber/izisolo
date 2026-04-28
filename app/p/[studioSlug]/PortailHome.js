'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { MapPin, Calendar, Clock, Users, ChevronRight, Search, CreditCard, Ticket, CalendarCheck, Zap, Instagram, Facebook, Globe, Award, BookOpen } from 'lucide-react';

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

export default function PortailHome({ profile, cours, offresStripe = [], offresPubliques = [], studioSlug, isPreview = false }) {
  const hasAbout = !!(profile.bio || profile.philosophie || profile.formations || profile.annees_experience);
  const hasSocial = !!(profile.instagram_url || profile.facebook_url || profile.website_url);
  const faq = Array.isArray(profile.faq_publique) ? profile.faq_publique.filter(f => f?.q && f?.a) : [];
  const adresseComplete = [profile.adresse, profile.code_postal, profile.ville].filter(Boolean).join(', ');
  const mapsQuery = adresseComplete ? encodeURIComponent(adresseComplete) : null;
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
      {isPreview && (
        <div style={{
          background: '#fffaf0', border: '1px solid #ffe0b2', color: '#7c4a03',
          padding: '10px 14px', borderRadius: 10, marginBottom: 16,
          fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: 8,
        }}>
          👁 <strong>Mode aperçu</strong> — tu vois ton brouillon, pas encore publié.
        </div>
      )}

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

      {/* Section "À propos" — bio, philosophie, formations, années d'expérience */}
      {hasAbout && (
        <section className="portail-about">
          <h2 className="portail-section-title">À propos</h2>
          <div className="portail-about-card">
            {profile.bio && <p className="portail-about-bio">{profile.bio}</p>}
            {profile.philosophie && (
              <p className="portail-about-philo"><em>{profile.philosophie}</em></p>
            )}
            <div className="portail-about-meta">
              {profile.annees_experience && (
                <span className="portail-about-pill">
                  <Award size={13} /> {profile.annees_experience} an{profile.annees_experience > 1 ? 's' : ''} d'expérience
                </span>
              )}
              {profile.formations && (
                <span className="portail-about-pill">
                  <BookOpen size={13} /> {profile.formations}
                </span>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Section "Tarifs" publique — uniquement si afficher_tarifs activé */}
      {profile.afficher_tarifs && offresPubliques.length > 0 && (
        <section className="portail-prices">
          <h2 className="portail-section-title">Tarifs</h2>
          <div className="portail-prices-grid">
            {offresPubliques.map(o => {
              const Icon = TYPE_ICONS[o.type] || Ticket;
              const sub =
                o.type === 'carnet'      ? `Carnet de ${o.seances} séances` :
                o.type === 'abonnement'  ? (o.duree_jours ? `Abonnement ${o.duree_jours} jours` : 'Abonnement') :
                                            'Cours à l\'unité';
              return (
                <div key={o.id} className="portail-price-card">
                  <div className="portail-price-icon"><Icon size={18} /></div>
                  <div className="portail-price-info">
                    <div className="portail-price-nom">{o.nom}</div>
                    <div className="portail-price-sub">{sub}</div>
                  </div>
                  <div className="portail-price-prix">{o.prix}€</div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Section "Adresse & horaires" — carte Maps + horaires */}
      {(adresseComplete || profile.horaires_studio) && (
        <section className="portail-venue">
          <h2 className="portail-section-title">Où nous trouver</h2>
          <div className="portail-venue-card">
            {adresseComplete && (
              <div className="portail-venue-row">
                <MapPin size={16} />
                <div>
                  <div className="portail-venue-addr">{adresseComplete}</div>
                  {mapsQuery && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="portail-venue-link"
                    >
                      Itinéraire Google Maps →
                    </a>
                  )}
                </div>
              </div>
            )}
            {profile.horaires_studio && (
              <div className="portail-venue-row">
                <Clock size={16} />
                <div className="portail-venue-hours">{profile.horaires_studio}</div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Section "FAQ" publique */}
      {faq.length > 0 && (
        <section className="portail-faq">
          <h2 className="portail-section-title">Questions fréquentes</h2>
          <div className="portail-faq-list">
            {faq.map((item, i) => (
              <details key={i} className="portail-faq-item">
                <summary className="portail-faq-q">{item.q}</summary>
                <p className="portail-faq-a">{item.a}</p>
              </details>
            ))}
          </div>
        </section>
      )}

      {/* Section "Réseaux sociaux & site" */}
      {hasSocial && (
        <section className="portail-social">
          <div className="portail-social-row">
            {profile.instagram_url && (
              <a href={profile.instagram_url} target="_blank" rel="noopener noreferrer" className="portail-social-link" aria-label="Instagram">
                <Instagram size={18} />
              </a>
            )}
            {profile.facebook_url && (
              <a href={profile.facebook_url} target="_blank" rel="noopener noreferrer" className="portail-social-link" aria-label="Facebook">
                <Facebook size={18} />
              </a>
            )}
            {profile.website_url && (
              <a href={profile.website_url} target="_blank" rel="noopener noreferrer" className="portail-social-link" aria-label="Site web">
                <Globe size={18} />
              </a>
            )}
          </div>
        </section>
      )}

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

        /* Sections enrichies (v14) */
        .portail-section-title {
          font-size: 0.8125rem; font-weight: 700; color: #888;
          text-transform: uppercase; letter-spacing: 0.05em;
          margin: 32px 0 12px; padding-left: 2px;
        }

        /* À propos */
        .portail-about-card {
          background: white; border-radius: 16px; padding: 20px;
          box-shadow: 0 1px 6px rgba(0,0,0,0.05);
        }
        .portail-about-bio { font-size: 0.9375rem; color: #1a1a2e; line-height: 1.6; margin: 0 0 12px; }
        .portail-about-philo {
          font-size: 0.9rem; color: #555; line-height: 1.6; margin: 0 0 14px;
          padding-left: 12px; border-left: 3px solid #d4a0a0;
        }
        .portail-about-meta { display: flex; flex-wrap: wrap; gap: 8px; }
        .portail-about-pill {
          display: inline-flex; align-items: center; gap: 6px;
          background: #faf8f5; border: 1px solid #f0ebe8;
          border-radius: 99px; padding: 5px 12px;
          font-size: 0.8125rem; color: #555;
        }
        .portail-about-pill svg { color: #d4a0a0; flex-shrink: 0; }

        /* Tarifs publics */
        .portail-prices-grid {
          display: flex; flex-direction: column; gap: 8px;
        }
        .portail-price-card {
          display: flex; align-items: center; gap: 12px;
          background: white; border-radius: 14px; padding: 14px 16px;
          box-shadow: 0 1px 6px rgba(0,0,0,0.05);
        }
        .portail-price-icon {
          width: 36px; height: 36px; border-radius: 10px;
          background: #fce8e8; color: #d4a0a0;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .portail-price-info { flex: 1; min-width: 0; }
        .portail-price-nom { font-weight: 600; font-size: 0.9375rem; color: #1a1a2e; }
        .portail-price-sub { font-size: 0.75rem; color: #888; margin-top: 2px; }
        .portail-price-prix { font-weight: 700; font-size: 1.125rem; color: #d4a0a0; }

        /* Venue */
        .portail-venue-card {
          background: white; border-radius: 16px; padding: 18px 20px;
          box-shadow: 0 1px 6px rgba(0,0,0,0.05);
          display: flex; flex-direction: column; gap: 14px;
        }
        .portail-venue-row {
          display: flex; align-items: flex-start; gap: 10px;
          font-size: 0.9375rem; color: #1a1a2e;
        }
        .portail-venue-row svg { color: #d4a0a0; flex-shrink: 0; margin-top: 2px; }
        .portail-venue-addr { font-weight: 600; line-height: 1.4; }
        .portail-venue-hours { white-space: pre-wrap; line-height: 1.5; color: #555; font-size: 0.875rem; }
        .portail-venue-link {
          display: inline-block; margin-top: 4px;
          font-size: 0.8125rem; color: #d4a0a0; text-decoration: none; font-weight: 600;
        }
        .portail-venue-link:hover { text-decoration: underline; }

        /* FAQ */
        .portail-faq-list { display: flex; flex-direction: column; gap: 6px; }
        .portail-faq-item {
          background: white; border-radius: 12px; padding: 14px 18px;
          box-shadow: 0 1px 6px rgba(0,0,0,0.05);
        }
        .portail-faq-item[open] { background: #faf8f5; }
        .portail-faq-q {
          font-weight: 600; color: #1a1a2e; cursor: pointer;
          font-size: 0.9375rem; list-style: none; position: relative; padding-right: 24px;
        }
        .portail-faq-q::-webkit-details-marker { display: none; }
        .portail-faq-q::after {
          content: '+'; position: absolute; right: 0; top: 0;
          font-size: 1.25rem; color: #d4a0a0; line-height: 1; transition: transform 0.2s;
        }
        .portail-faq-item[open] .portail-faq-q::after { content: '−'; }
        .portail-faq-a {
          margin: 10px 0 0; color: #555; font-size: 0.875rem; line-height: 1.6;
          padding-top: 10px; border-top: 1px solid #f0ebe8;
        }

        /* Social */
        .portail-social { margin-top: 24px; }
        .portail-social-row {
          display: flex; gap: 10px; justify-content: center;
        }
        .portail-social-link {
          width: 40px; height: 40px; border-radius: 50%;
          background: white; color: #888; border: 1px solid #f0ebe8;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.15s;
        }
        .portail-social-link:hover { color: #d4a0a0; border-color: #d4a0a0; transform: translateY(-2px); }
      `}</style>
    </div>
  );
}

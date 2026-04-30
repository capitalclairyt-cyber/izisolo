'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { MapPin, Calendar, Clock, Users, ChevronRight, ChevronLeft, Search, CreditCard, Ticket, CalendarCheck, Zap, Instagram, Facebook, Globe, Award, BookOpen, LayoutGrid, List } from 'lucide-react';
import { toneForCours } from '@/lib/tones';

// Helpers semaine
function getWeekStart(date) {
  // Lundi = 1, Dimanche = 0 → on veut le lundi de la semaine
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}
function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}
function fmtIsoDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
function fmtWeekRange(start) {
  const end = addDays(start, 6);
  const sameMonth = start.getMonth() === end.getMonth();
  const sameYear  = start.getFullYear() === end.getFullYear();
  if (sameMonth) {
    return `${start.getDate()}–${end.getDate()} ${MOIS[end.getMonth()]}${sameYear ? '' : ' ' + end.getFullYear()}`;
  }
  return `${start.getDate()} ${MOIS[start.getMonth()]} – ${end.getDate()} ${MOIS[end.getMonth()]}`;
}
const JOURS_LONG = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

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

export default function PortailHome({ profile, cours, offresStripe = [], offresPubliques = [], sondageActif = null, studioSlug, isPreview = false }) {
  const hasAbout = !!(profile.bio || profile.philosophie || profile.formations || profile.annees_experience);
  const hasSocial = !!(profile.instagram_url || profile.facebook_url || profile.website_url);
  const faq = Array.isArray(profile.faq_publique) ? profile.faq_publique.filter(f => f?.q && f?.a) : [];
  const adresseComplete = [profile.adresse, profile.code_postal, profile.ville].filter(Boolean).join(', ');
  const mapsQuery = adresseComplete ? encodeURIComponent(adresseComplete) : null;
  const hasTarifs = !!(profile.afficher_tarifs && offresPubliques.length > 0);
  const hasInfos  = !!(adresseComplete || profile.horaires_studio || faq.length > 0 || hasSocial);

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [tab, setTab] = useState('cours'); // 'cours' | 'propos' | 'tarifs' | 'infos'
  const [viewMode, setViewMode] = useState('week'); // 'week' | 'list'
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));

  const weekEnd = addDays(weekStart, 6);
  const weekStartIso = fmtIsoDate(weekStart);
  const weekEndIso   = fmtIsoDate(weekEnd);

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

  // En mode "semaine" on filtre aussi par plage de dates
  const filteredForView = useMemo(() => {
    if (viewMode !== 'week') return filtered;
    return filtered.filter(c => c.date >= weekStartIso && c.date <= weekEndIso);
  }, [filtered, viewMode, weekStartIso, weekEndIso]);

  // Grouper par date
  const grouped = useMemo(() => {
    const map = new Map();
    filteredForView.forEach(c => {
      if (!map.has(c.date)) map.set(c.date, []);
      map.get(c.date).push(c);
    });
    return [...map.entries()];
  }, [filteredForView]);

  // Pour la vue semaine : on construit les 7 jours (même vides) pour qu'ils soient tous représentés
  const weekDays = useMemo(() => {
    if (viewMode !== 'week') return null;
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = addDays(weekStart, i);
      const iso = fmtIsoDate(d);
      const todayIso = fmtIsoDate(new Date());
      days.push({
        date: d,
        iso,
        isToday: iso === todayIso,
        cours: filteredForView.filter(c => c.date === iso),
      });
    }
    return days;
  }, [viewMode, weekStart, filteredForView]);

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

      {/* Bandeau sondage actif */}
      {sondageActif && (
        <Link
          href={`/p/${studioSlug}/sondage/${sondageActif.slug}`}
          style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 14px', borderRadius: 14, marginBottom: 16,
            background: 'linear-gradient(135deg, var(--brand-light), white)',
            border: '1px solid var(--brand-200, #f0d0d0)',
            textDecoration: 'none', color: 'inherit',
          }}
        >
          <div style={{
            width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
            background: 'var(--brand)', color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.25rem',
          }}>✨</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
              {sondageActif.titre}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
              Aide {profile.studio_nom} à construire son planning idéal — 30 secondes
            </div>
          </div>
          <span style={{
            background: 'var(--brand)', color: 'white',
            padding: '6px 12px', borderRadius: 99,
            fontSize: '0.75rem', fontWeight: 700,
            flexShrink: 0,
          }}>Répondre →</span>
        </Link>
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

      {/* CTA Cours d'essai (si activé par le pro) */}
      {profile.essai_actif && (
        <Link href={`/p/${studioSlug}/essai`} className="portail-essai-cta">
          <div className="portail-essai-cta-icon">✨</div>
          <div className="portail-essai-cta-body">
            <div className="portail-essai-cta-title">
              {profile.essai_paiement === 'gratuit'
                ? 'Réserve ton cours d\'essai offert'
                : `Réserve ton cours d\'essai · ${profile.essai_prix}€`}
            </div>
            <div className="portail-essai-cta-sub">
              Découvre le studio dans l'ambiance d'un vrai cours.
            </div>
          </div>
          <ChevronRight size={18} className="portail-essai-cta-arrow" />
        </Link>
      )}

      {/* Onglets */}
      <div className="portail-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'cours'}
          onClick={() => setTab('cours')}
          className={`portail-tab ${tab === 'cours' ? 'is-active' : ''}`}
        >
          <Calendar size={14} /> Cours
        </button>
        {hasAbout && (
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'propos'}
            onClick={() => setTab('propos')}
            className={`portail-tab ${tab === 'propos' ? 'is-active' : ''}`}
          >
            <Award size={14} /> À propos
          </button>
        )}
        {hasTarifs && (
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'tarifs'}
            onClick={() => setTab('tarifs')}
            className={`portail-tab ${tab === 'tarifs' ? 'is-active' : ''}`}
          >
            <Ticket size={14} /> Tarifs
          </button>
        )}
        {hasInfos && (
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'infos'}
            onClick={() => setTab('infos')}
            className={`portail-tab ${tab === 'infos' ? 'is-active' : ''}`}
          >
            <MapPin size={14} /> Infos
          </button>
        )}
      </div>

      {/* === ONGLET COURS === */}
      {tab === 'cours' && <>
      {/* Switch vue + nav semaine */}
      <div className="portail-view-bar">
        <div className="portail-view-toggle" role="tablist" aria-label="Mode d'affichage">
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'week'}
            onClick={() => setViewMode('week')}
            className={`portail-view-btn ${viewMode === 'week' ? 'is-active' : ''}`}
          >
            <LayoutGrid size={13} /> Semaine
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'list'}
            onClick={() => setViewMode('list')}
            className={`portail-view-btn ${viewMode === 'list' ? 'is-active' : ''}`}
          >
            <List size={13} /> Liste
          </button>
        </div>
        {viewMode === 'week' && (
          <div className="portail-week-nav">
            <button
              type="button"
              onClick={() => setWeekStart(addDays(weekStart, -7))}
              className="portail-week-nav-btn"
              aria-label="Semaine précédente"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="portail-week-label">{fmtWeekRange(weekStart)}</span>
            <button
              type="button"
              onClick={() => setWeekStart(addDays(weekStart, 7))}
              className="portail-week-nav-btn"
              aria-label="Semaine suivante"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
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

      {/* Vue semaine : tous les jours affichés (même vides) */}
      {viewMode === 'week' && weekDays && (
        <div className="portail-week-grid">
          {weekDays.map(day => (
            <div key={day.iso} className={`portail-week-day ${day.isToday ? 'is-today' : ''}`}>
              <div className="portail-week-day-label">
                <span className="portail-week-day-name">{JOURS_LONG[day.date.getDay()]}</span>
                <span className="portail-week-day-num">{day.date.getDate()}</span>
                {day.isToday && <span className="portail-week-day-badge">Aujourd'hui</span>}
              </div>
              {day.cours.length === 0 ? (
                <div className="portail-week-day-empty">—</div>
              ) : day.cours.map(c => {
                const dispo = c.capacite_max ? c.capacite_max - c.nbInscrits : null;
                const complet = dispo !== null && dispo <= 0;
                const tone = toneForCours(c.type_cours);
                return (
                  <Link
                    key={c.id}
                    href={`/p/${studioSlug}/cours/${c.id}`}
                    className={`portail-cours-card portail-cours-card--${tone} ${complet ? 'complet' : ''}`}
                  >
                    <div className="portail-cours-info">
                      <div className="portail-cours-nom">{c.nom}</div>
                      <div className="portail-cours-details">
                        <span><Clock size={12} /> {formatHeure(c.heure)}{c.duree_minutes ? ` · ${c.duree_minutes}min` : ''}</span>
                        {c.lieu && <span><MapPin size={12} /> {c.lieu}</span>}
                        {c.type_cours && <span className={`portail-tag portail-tag-${tone}`}>{c.type_cours}</span>}
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
          {filteredForView.length === 0 && (
            <div className="portail-empty" style={{ marginTop: 8 }}>
              <p style={{ color: '#888', margin: 0 }}>Aucun cours cette semaine</p>
            </div>
          )}
        </div>
      )}

      {/* Vue liste : groupé par date sur 60 jours (comportement initial) */}
      {viewMode === 'list' && cours.length === 0 ? (
        <div className="portail-empty">
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📅</div>
          <p style={{ fontWeight: 600, margin: '0 0 6px' }}>Aucun cours à venir</p>
          <p style={{ color: '#888', fontSize: '0.875rem', margin: 0 }}>
            Les prochains cours seront affichés ici.
          </p>
        </div>
      ) : viewMode === 'list' && grouped.length === 0 ? (
        <div className="portail-empty">
          <p style={{ color: '#888' }}>Aucun cours correspond à ta recherche</p>
        </div>
      ) : viewMode === 'list' && grouped.map(([date, coursDate]) => (
        <div key={date} className="portail-day-group">
          <div className="portail-day-label">{formatDateCourt(date)}</div>
          {coursDate.map(c => {
            const dispo = c.capacite_max ? c.capacite_max - c.nbInscrits : null;
            const complet = dispo !== null && dispo <= 0;
            const tone = toneForCours(c.type_cours);
            return (
              <Link
                key={c.id}
                href={`/p/${studioSlug}/cours/${c.id}`}
                className={`portail-cours-card portail-cours-card--${tone} ${complet ? 'complet' : ''}`}
              >
                <div className="portail-cours-info">
                  <div className="portail-cours-nom">{c.nom}</div>
                  <div className="portail-cours-details">
                    <span><Clock size={12} /> {formatHeure(c.heure)}{c.duree_minutes ? ` · ${c.duree_minutes}min` : ''}</span>
                    {c.lieu && <span><MapPin size={12} /> {c.lieu}</span>}
                    {c.type_cours && <span className={`portail-tag portail-tag-${tone}`}>{c.type_cours}</span>}
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
      </>}
      {/* === / ONGLET COURS === */}

      {/* === ONGLET À PROPOS === */}
      {tab === 'propos' && hasAbout && (
        <section className="portail-about">
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

      {/* === ONGLET TARIFS === */}
      {tab === 'tarifs' && hasTarifs && (
        <section className="portail-prices">
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

      {/* === ONGLET INFOS === */}
      {tab === 'infos' && hasInfos && <>
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

        {hasSocial && (
          <section className="portail-social">
            <h2 className="portail-section-title">Suivre le studio</h2>
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
      </>}

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

        /* CTA Cours d'essai */
        .portail-essai-cta {
          display: flex; align-items: center; gap: 14px;
          padding: 14px 16px; margin-bottom: 18px;
          background: linear-gradient(135deg, var(--tone-rose-bg-soft, #fdf6f4), white);
          border: 1.5px solid var(--tone-rose-accent, #c47070);
          border-radius: 16px;
          text-decoration: none; color: inherit;
          transition: transform 0.15s, box-shadow 0.15s;
          box-shadow: 0 2px 12px rgba(196, 112, 112, 0.08);
        }
        .portail-essai-cta:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 18px rgba(196, 112, 112, 0.15);
        }
        .portail-essai-cta-icon {
          width: 44px; height: 44px; flex-shrink: 0;
          font-size: 1.4rem;
          background: white; border: 1.5px solid var(--tone-rose-accent, #c47070);
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
        }
        .portail-essai-cta-body { flex: 1; min-width: 0; }
        .portail-essai-cta-title {
          font-weight: 700; font-size: 0.9375rem;
          color: var(--tone-rose-ink, #8b3838);
        }
        .portail-essai-cta-sub {
          font-size: 0.8125rem; color: #888; margin-top: 2px;
        }
        .portail-essai-cta-arrow {
          color: var(--tone-rose-accent, #c47070); flex-shrink: 0;
        }

        /* Onglets de navigation portail */
        .portail-tabs {
          display: flex;
          gap: 4px;
          margin-bottom: 20px;
          padding: 4px;
          background: #faf6f0;
          border: 1px solid #ecdfd5;
          border-radius: 999px;
          overflow-x: auto;
          scrollbar-width: none;
        }
        .portail-tabs::-webkit-scrollbar { display: none; }
        .portail-tab {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 8px 14px;
          font-size: 0.8125rem; font-weight: 600;
          color: #a89c93;
          background: transparent; border: none;
          border-radius: 999px;
          cursor: pointer;
          white-space: nowrap;
          transition: all .15s;
        }
        .portail-tab:hover { color: #1a1612; }
        .portail-tab.is-active {
          background: white;
          color: #1a1612;
          box-shadow: 0 1px 3px rgba(70, 35, 25, 0.08);
        }

        /* View bar (toggle semaine/liste + nav semaine) */
        .portail-view-bar {
          display: flex; align-items: center; justify-content: space-between;
          gap: 10px; margin-bottom: 14px; flex-wrap: wrap;
        }
        .portail-view-toggle {
          display: inline-flex; gap: 2px; padding: 3px;
          background: #faf6f0; border: 1px solid #ecdfd5; border-radius: 999px;
        }
        .portail-view-btn {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 6px 12px;
          font-size: 0.75rem; font-weight: 600;
          color: #a89c93;
          background: transparent; border: none; border-radius: 999px;
          cursor: pointer; transition: all .15s;
        }
        .portail-view-btn:hover { color: #1a1612; }
        .portail-view-btn.is-active {
          background: white; color: #1a1612;
          box-shadow: 0 1px 3px rgba(70, 35, 25, 0.06);
        }
        .portail-week-nav {
          display: inline-flex; align-items: center; gap: 4px;
          font-size: 0.8125rem; font-weight: 600;
          color: #1a1612;
        }
        .portail-week-nav-btn {
          width: 30px; height: 30px;
          display: inline-flex; align-items: center; justify-content: center;
          background: white; border: 1px solid #ecdfd5; border-radius: 50%;
          color: #888; cursor: pointer; transition: all .15s;
        }
        .portail-week-nav-btn:hover { color: #1a1612; border-color: #1a1612; }
        .portail-week-label {
          padding: 0 10px; min-width: 110px; text-align: center;
        }

        /* Vue semaine — colonnes par jour */
        .portail-week-grid {
          display: flex; flex-direction: column; gap: 16px;
        }
        .portail-week-day {
          background: white;
          border: 1px solid #f0ebe8;
          border-radius: 14px;
          padding: 12px 14px;
        }
        .portail-week-day.is-today {
          border-color: var(--brand);
          box-shadow: 0 2px 12px rgba(212, 160, 160, 0.18);
        }
        .portail-week-day-label {
          display: flex; align-items: baseline; gap: 8px;
          font-size: 0.875rem; font-weight: 700; color: #1a1612;
          margin-bottom: 10px; padding-bottom: 8px;
          border-bottom: 1px dashed #ecdfd5;
        }
        .portail-week-day-name { text-transform: uppercase; letter-spacing: 0.04em; font-size: 0.75rem; }
        .portail-week-day-num  { font-size: 1.125rem; font-weight: 800; color: #1a1612; }
        .portail-week-day-badge {
          margin-left: auto;
          padding: 2px 8px; border-radius: 999px;
          background: var(--brand); color: white;
          font-size: 0.6875rem; font-weight: 700;
        }
        .portail-week-day-empty {
          color: #ccc; text-align: center; padding: 8px 0;
          font-size: 0.875rem;
        }
        /* Sur tablet+, afficher 2 colonnes pour exploiter l'espace */
        @media (min-width: 768px) {
          .portail-week-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        }

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
          border-left: 6px solid transparent;
        }
        .portail-cours-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.1); transform: translateY(-1px); }
        .portail-cours-card.complet { opacity: 0.6; }
        .portail-cours-info { flex: 1; min-width: 0; }
        .portail-cours-nom { font-weight: 700; font-size: 1rem; margin-bottom: 6px; color: #1a1a2e; }
        .portail-cours-details { display: flex; flex-wrap: wrap; gap: 8px; font-size: 0.8125rem; color: #888; align-items: center; }
        .portail-cours-details span { display: flex; align-items: center; gap: 4px; }
        .portail-cours-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }

        /* Tons par type de cours : fond soft tinté + bord épais accent */
        .portail-cours-card--rose     { background: var(--tone-rose-bg-soft);     border-left-color: var(--tone-rose-accent); }
        .portail-cours-card--sage     { background: var(--tone-sage-bg-soft);     border-left-color: var(--tone-sage-accent); }
        .portail-cours-card--sand     { background: var(--tone-sand-bg-soft);     border-left-color: var(--tone-sand-accent); }
        .portail-cours-card--lavender { background: var(--tone-lavender-bg-soft); border-left-color: var(--tone-lavender-accent); }
        .portail-cours-card--ink      { background: var(--tone-ink-bg-soft);      border-left-color: var(--tone-ink-bg); }

        .portail-tag-rose     { background: var(--tone-rose-bg);     color: var(--tone-rose-ink); }
        .portail-tag-sage     { background: var(--tone-sage-bg);     color: var(--tone-sage-ink); }
        .portail-tag-sand     { background: var(--tone-sand-bg);     color: var(--tone-sand-ink); }
        .portail-tag-lavender { background: var(--tone-lavender-bg); color: var(--tone-lavender-ink); }
        .portail-tag-ink      { background: var(--tone-ink-bg);      color: var(--tone-ink-text); }

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

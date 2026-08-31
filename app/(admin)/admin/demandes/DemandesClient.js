'use client';

import { useState } from 'react';
import Link from 'next/link';
import { STATUTS_DEMANDE, DELAI_HEURES, lienSite } from '@/lib/demande-studio';

const TONS = {
  warning: { bg: '#3a2e14', fg: '#fbbf24' },
  info: { bg: '#12304a', fg: '#60a5fa' },
  success: { bg: '#13341f', fg: '#4ade80' },
  neutral: { bg: '#2a2a2a', fg: '#999' },
};

const fmt = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};

/** Depuis quand la demande attend, en heures. Le délai annoncé est public. */
function heuresDepuis(iso) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);
}

export default function DemandesClient({ demandes: initiales, migrationManquante }) {
  const [demandes, setDemandes] = useState(initiales);
  const [filtre, setFiltre] = useState('');
  const [enCours, setEnCours] = useState('');

  const majStatut = async (id, statut) => {
    setEnCours(id);
    try {
      const res = await fetch('/api/admin/demandes/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ demandeId: id, statut }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Erreur');
      setDemandes(prev => prev.map(d => (d.id === id ? { ...d, statut } : d)));
    } catch (e) {
      alert(String(e.message || e));
    } finally {
      setEnCours('');
    }
  };

  const visibles = filtre ? demandes.filter(d => d.statut === filtre) : demandes;
  const nouvelles = demandes.filter(d => d.statut === 'nouvelle').length;

  return (
    <div>
      <h1 style={{ margin: '0 0 6px' }}>🎁 Demandes de studio</h1>
      <p style={{ color: '#999', fontSize: '0.9rem', margin: '0 0 18px' }}>
        Le guichet public <Link href="/creer-mon-studio" style={{ color: '#b87333' }}>/creer-mon-studio</Link>.
        Promesse affichée : <strong>{DELAI_HEURES} h ouvrées</strong>. L&apos;accusé de réception
        part tout seul et réclame le planning, les tarifs et la liste d&apos;élèves (sans obligation).
      </p>

      {migrationManquante && (
        <div style={{ background: '#3a2e14', color: '#fbbf24', padding: '12px 16px', borderRadius: 10, marginBottom: 18, fontSize: '0.9rem' }}>
          Migration <code>v96</code> pas encore appliquée : les demandes ne sont pas enregistrées.
          Elles arrivent quand même par email à bonjour@izisolo.fr, avec tout le nécessaire.
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
        <button onClick={() => setFiltre('')} style={puce(!filtre)}>Toutes ({demandes.length})</button>
        {Object.entries(STATUTS_DEMANDE).map(([k, v]) => (
          <button key={k} onClick={() => setFiltre(k)} style={puce(filtre === k)}>
            {v.label} ({demandes.filter(d => d.statut === k).length})
          </button>
        ))}
      </div>

      {nouvelles > 0 && (
        <p style={{ color: '#fbbf24', fontSize: '0.85rem', margin: '0 0 14px' }}>
          {nouvelles} demande{nouvelles > 1 ? 's' : ''} en attente.
        </p>
      )}

      {visibles.length === 0 ? (
        <p style={{ color: '#666' }}>Aucune demande{filtre ? ' dans cet état' : ''}.</p>
      ) : visibles.map(d => {
        const ton = TONS[STATUTS_DEMANDE[d.statut]?.ton] || TONS.neutral;
        const h = heuresDepuis(d.created_at);
        const enRetard = d.statut === 'nouvelle' && h > DELAI_HEURES;
        return (
          <div key={d.id} style={carte}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'baseline' }}>
              <div>
                <strong style={{ fontSize: '1.05rem' }}>{d.prenom} {d.nom || ''}</strong>
                {d.studio_nom && <span style={{ color: '#999' }}> · {d.studio_nom}</span>}
                {d.activite && <span style={{ color: '#999' }}> · {d.activite}</span>}
                {d.ville && <span style={{ color: '#999' }}> · {d.ville}</span>}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {enRetard && (
                  <span style={{ ...badge, background: '#4a1414', color: '#f87171' }}>
                    {h} h d&apos;attente
                  </span>
                )}
                <span style={{ ...badge, background: ton.bg, color: ton.fg }}>
                  {STATUTS_DEMANDE[d.statut]?.label || d.statut}
                </span>
              </div>
            </div>

            <div style={{ color: '#aaa', fontSize: '0.85rem', margin: '6px 0 10px' }}>
              {fmt(d.created_at)} · <a href={`mailto:${d.email}`} style={lien}>{d.email}</a>
              {d.telephone && <> · <a href={`tel:${d.telephone}`} style={lien}>{d.telephone}</a></>}
              {(() => {
                // Le site est du texte libre saisi par une inconnue : seul un
                // http(s) valide devient un lien (lib/demande-studio). Le reste
                // s'affiche tel quel — on montre ce qu'elle a écrit, sans en
                // faire une URL vers notre propre domaine ni un javascript:.
                const { href, texte } = lienSite(d.site_web);
                if (!texte) return null;
                return <> · {href
                  ? <a href={href} target="_blank" rel="noopener noreferrer" style={lien}>{texte}</a>
                  : <span title="Adresse non cliquable : ce n'est pas une URL valide">{texte}</span>}</>;
              })()}
            </div>

            {d.planning && <Bloc titre="Planning" texte={d.planning} />}
            {d.offres && <Bloc titre="Tarifs" texte={d.offres} />}
            {d.message && <Bloc titre="Message" texte={d.message} />}

            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              <Link
                href={`/admin/studios/nouveau?prenom=${encodeURIComponent(d.prenom || '')}&email=${encodeURIComponent(d.email || '')}&studio=${encodeURIComponent(d.studio_nom || '')}&metier=${encodeURIComponent((d.activite || '').toLowerCase())}`}
                style={{ ...bouton, background: '#b87333', color: '#fff', textDecoration: 'none' }}
              >
                🔑 Créer son studio
              </Link>
              {Object.entries(STATUTS_DEMANDE)
                .filter(([k]) => k !== d.statut)
                .map(([k, v]) => (
                  <button key={k} onClick={() => majStatut(d.id, k)} disabled={enCours === d.id} style={bouton}>
                    {v.label}
                  </button>
                ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Bloc({ titre, texte }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ color: '#777', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{titre}</div>
      <div style={{ color: '#ddd', fontSize: '0.9rem', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{texte}</div>
    </div>
  );
}

const carte = {
  background: '#1c1c1c', border: '1px solid #2e2e2e', borderRadius: 12,
  padding: '16px 18px', marginBottom: 14,
};
const badge = { borderRadius: 999, padding: '2px 10px', fontSize: '0.72rem', fontWeight: 700 };
const bouton = {
  background: '#262626', border: '1px solid #3a3a3a', color: '#ddd',
  borderRadius: 8, padding: '7px 12px', fontSize: '0.82rem', cursor: 'pointer',
};
const puce = (actif) => ({
  ...bouton,
  background: actif ? '#b87333' : '#262626',
  color: actif ? '#fff' : '#ddd',
  fontWeight: actif ? 700 : 400,
});
const lien = { color: '#60a5fa' };

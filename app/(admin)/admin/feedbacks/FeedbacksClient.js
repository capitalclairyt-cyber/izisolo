'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';

const TYPES = {
  bug:    { emoji: '🐛', label: 'Bug',        couleur: '#f87171' },
  manque: { emoji: '🧩', label: 'Il manque',  couleur: '#fb923c' },
  confus: { emoji: '😵', label: 'Pas clair',  couleur: '#facc15' },
  kiff:   { emoji: '💛', label: 'Kiff',       couleur: '#4ade80' },
  autre:  { emoji: '💬', label: 'Autre',      couleur: '#94a3b8' },
};

const STATUTS = {
  new:      { label: 'Nouveau',    couleur: '#60a5fa' },
  triaged:  { label: 'Trié',       couleur: '#facc15' },
  resolved: { label: 'Résolu',     couleur: '#4ade80' },
  wontfix:  { label: 'Sans suite', couleur: '#64748b' },
};

const FILTRES = [
  { key: 'new',      label: 'Nouveaux' },
  { key: 'triaged',  label: 'Triés' },
  { key: 'resolved', label: 'Résolus' },
  { key: 'wontfix',  label: 'Sans suite' },
  { key: 'tous',     label: 'Tous' },
];

function relatif(iso) {
  if (!iso) return '';
  const j = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (j === 0) return "aujourd'hui";
  if (j === 1) return 'hier';
  if (j < 30) return `il y a ${j} j`;
  return new Date(iso).toLocaleDateString('fr-FR');
}

export default function FeedbacksClient({ initialFeedbacks, profilById, tronque }) {
  const [feedbacks, setFeedbacks] = useState(initialFeedbacks);
  const [filtre, setFiltre] = useState('new');
  const [noteEdit, setNoteEdit] = useState(null); // { id, texte }
  const [saving, setSaving] = useState(false);
  const [erreur, setErreur] = useState(null);

  const nbNouveaux = feedbacks.filter(f => f.status === 'new').length;
  const filtered = useMemo(
    () => (filtre === 'tous' ? feedbacks : feedbacks.filter(f => f.status === filtre)),
    [feedbacks, filtre]
  );

  async function update(id, patch) {
    setSaving(true);
    setErreur(null);
    try {
      const res = await fetch('/api/admin/feedbacks/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedbackId: id, ...patch }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Erreur ${res.status}`);
      }
      setFeedbacks(prev => prev.map(f => f.id === id ? {
        ...f,
        ...(patch.status ? { status: patch.status } : {}),
        ...(patch.admin_note !== undefined ? { admin_note: patch.admin_note || null } : {}),
      } : f));
    } catch (e) {
      setErreur(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h1 className="admin-title" style={{ marginBottom: '4px' }}>💬 Feedbacks des testeuses</h1>
        <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>
          Tout ce qui arrive par le widget « Un avis ? » de l'app —{' '}
          {nbNouveaux > 0 ? `${nbNouveaux} nouveau${nbNouveaux > 1 ? 'x' : ''} à trier.` : 'rien de nouveau à trier. ✨'}
        </p>
      </div>

      {erreur && (
        <div style={{ background: '#2a1a1a', border: '1px solid #f87171', borderRadius: '8px', padding: '10px 14px', color: '#f87171', fontSize: '0.875rem' }}>
          Erreur : {erreur}
        </div>
      )}

      {/* Filtres par statut */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {FILTRES.map(f => {
          const n = f.key === 'tous' ? feedbacks.length : feedbacks.filter(x => x.status === f.key).length;
          return (
            <button
              key={f.key}
              onClick={() => setFiltre(f.key)}
              style={{
                background: filtre === f.key ? '#2d2d3f' : 'transparent',
                border: `1px solid ${filtre === f.key ? '#4f4f6f' : '#2d2d3f'}`,
                borderRadius: '999px', padding: '5px 12px', cursor: 'pointer',
                color: filtre === f.key ? '#e2e8f0' : '#94a3b8', fontSize: '0.8125rem',
              }}
            >
              {f.label} <span style={{ color: '#64748b' }}>({n})</span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="admin-card" style={{ textAlign: 'center', color: '#64748b', padding: '32px' }}>
          Aucun feedback {filtre !== 'tous' ? `« ${FILTRES.find(f => f.key === filtre)?.label} »` : ''} pour l'instant.
        </div>
      ) : filtered.map(f => {
        const t = TYPES[f.type] || TYPES.autre;
        const profil = profilById[f.user_id];
        return (
          <div key={f.id} className="admin-card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* En-tête : type + qui + quand + où */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span style={{
                background: `${t.couleur}22`, color: t.couleur, border: `1px solid ${t.couleur}55`,
                borderRadius: '999px', padding: '2px 10px', fontSize: '0.75rem', fontWeight: 700,
              }}>
                {t.emoji} {t.label}
              </span>
              {profil ? (
                <Link href={`/admin/studios/${f.user_id}`} style={{ color: '#e2e8f0', fontSize: '0.8125rem', fontWeight: 600, textDecoration: 'none' }}>
                  {profil.prenom || '—'} · {profil.studio_nom || profil.studio_slug || 'sans studio'} →
                </Link>
              ) : (
                <span style={{ color: '#64748b', fontSize: '0.8125rem' }}>profil supprimé</span>
              )}
              <span style={{ color: '#475569', fontSize: '0.75rem', marginLeft: 'auto' }}>{relatif(f.created_at)}</span>
            </div>

            {/* Le message — le contenu principal */}
            <div style={{ color: '#e2e8f0', fontSize: '0.9rem', lineHeight: 1.65, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {f.message}
            </div>

            {f.url && (
              <div style={{ color: '#475569', fontSize: '0.72rem' }}>
                Depuis : <code style={{ color: '#64748b' }}>{f.url}</code>
              </div>
            )}

            {/* Triage */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', borderTop: '1px solid #1e293b', paddingTop: '10px' }}>
              {Object.entries(STATUTS).map(([key, s]) => (
                <button
                  key={key}
                  disabled={saving || f.status === key}
                  onClick={() => update(f.id, { status: key })}
                  style={{
                    background: f.status === key ? `${s.couleur}22` : 'transparent',
                    border: `1px solid ${f.status === key ? s.couleur : '#2d2d3f'}`,
                    borderRadius: '6px', padding: '3px 10px',
                    cursor: f.status === key ? 'default' : 'pointer',
                    color: f.status === key ? s.couleur : '#94a3b8', fontSize: '0.75rem',
                    opacity: saving ? 0.6 : 1,
                  }}
                >
                  {s.label}
                </button>
              ))}

              {noteEdit?.id === f.id ? (
                <span style={{ display: 'flex', gap: '6px', alignItems: 'center', flex: 1, minWidth: '220px' }}>
                  <input
                    autoFocus
                    value={noteEdit.texte}
                    onChange={e => setNoteEdit({ id: f.id, texte: e.target.value })}
                    onKeyDown={e => {
                      if (e.key === 'Enter') { update(f.id, { admin_note: noteEdit.texte.trim() }); setNoteEdit(null); }
                      if (e.key === 'Escape') setNoteEdit(null);
                    }}
                    placeholder="Note interne (Entrée pour sauver)"
                    style={{ flex: 1, background: '#0f0f1a', border: '1px solid #2d2d3f', borderRadius: '6px', padding: '4px 8px', color: '#e2e8f0', fontSize: '0.78rem' }}
                  />
                  <button onClick={() => { update(f.id, { admin_note: noteEdit.texte.trim() }); setNoteEdit(null); }} style={{ background: 'none', border: 'none', color: '#4ade80', cursor: 'pointer', fontSize: '0.78rem' }}>OK</button>
                </span>
              ) : (
                <button
                  onClick={() => setNoteEdit({ id: f.id, texte: f.admin_note || '' })}
                  style={{ background: 'none', border: 'none', color: f.admin_note ? '#94a3b8' : '#475569', cursor: 'pointer', fontSize: '0.75rem', marginLeft: 'auto', textAlign: 'right' }}
                  title="Note interne"
                >
                  {f.admin_note ? `📝 ${f.admin_note}` : '+ note'}
                </button>
              )}
            </div>
          </div>
        );
      })}

      {tronque && (
        <div style={{ color: '#475569', fontSize: '0.75rem', textAlign: 'center' }}>
          Affichage limité aux 500 plus récents.
        </div>
      )}
    </div>
  );
}

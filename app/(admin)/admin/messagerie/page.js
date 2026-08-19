'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { estLuParProf } from '@/lib/messagerie-support';

// ─── /admin/messagerie — messagerie support prof ↔ IziSolo (v87) ─────────────
// Les profs écrivent depuis leur messagerie (fil épinglé « Équipe IziSolo ») ;
// l'équipe lit et répond ici. Réponse = sender_type 'izisolo' (aucun compte en
// particulier), la prof est prévenue par email instantané (dédup par message).
// Pattern /admin/demo : page client + routes withRoute auth:'admin'.

const POLL_LISTE = 30000;
const POLL_FIL = 8000;

export default function AdminMessageriePage() {
  const [convs, setConvs] = useState([]);
  const [migrationRequise, setMigrationRequise] = useState(false);
  const [loading, setLoading] = useState(true);
  const [listErr, setListErr] = useState('');
  const [selected, setSelected] = useState(null); // {id, studio_nom, prenom}
  // Initier un fil (2026-08-19, retour Colin : « obligé d'attendre qu'elle écrive »)
  const [studios, setStudios] = useState(null); // null = pas chargés
  const [showPicker, setShowPicker] = useState(false);
  const [pickedStudio, setPickedStudio] = useState('');
  const [initBusy, setInitBusy] = useState(false);

  const chargerListe = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/messagerie/conversations', { cache: 'no-store' });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || `Erreur ${res.status}`);
      setConvs(j.conversations || []);
      setMigrationRequise(!!j.migration_requise);
      setListErr('');
    } catch (e) {
      setListErr(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    chargerListe();
    const t = setInterval(chargerListe, POLL_LISTE);
    return () => clearInterval(t);
  }, [chargerListe]);

  // Ouvre (crée si besoin) LE fil support d'une prof — utilisé par le picker
  // et par le bouton « Répondre » des feedbacks (?studio=<profileId>).
  const ouvrirPourProfil = useCallback(async (profileId) => {
    setInitBusy(true);
    setListErr('');
    try {
      const res = await fetch('/api/admin/messagerie/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile_id: profileId }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.conversation) throw new Error(j.error || `Erreur ${res.status}`);
      setSelected({ id: j.conversation.id, studio_nom: j.studio?.studio_nom, prenom: j.studio?.prenom, profile_id: profileId });
      setShowPicker(false);
      setPickedStudio('');
    } catch (e) {
      setListErr(e.message);
    } finally {
      setInitBusy(false);
    }
  }, []);

  // Arrivée depuis un feedback : /admin/messagerie?studio=<profileId>.
  // window.location plutôt que useSearchParams : page 100 % client, pas de
  // Suspense à introduire pour un paramètre lu une seule fois.
  useEffect(() => {
    const studioParam = new URLSearchParams(window.location.search).get('studio');
    if (studioParam) ouvrirPourProfil(studioParam);
  }, [ouvrirPourProfil]);

  const ouvrirPicker = async () => {
    setShowPicker(v => !v);
    if (studios !== null) return;
    try {
      const res = await fetch('/api/admin/messagerie/studios');
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || `Erreur ${res.status}`);
      setStudios(j.studios || []);
    } catch (e) {
      setListErr(e.message);
      setStudios([]);
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 6px' }}>💬 Messagerie profs</h1>
      <p style={{ color: '#64748b', margin: '0 0 16px', fontSize: '0.9rem' }}>
        Les messages que les profs envoient à l&apos;équipe depuis leur fil « Équipe IziSolo ».
        Répondre ici = la prof reçoit un email instantané.
      </p>

      {/* Initier une conversation — sans attendre que la prof écrive */}
      {!selected && (
        <div style={{ marginBottom: 20 }}>
          <button type="button" onClick={ouvrirPicker} style={btnPrimaire}>
            ✉️ Écrire à une prof
          </button>
          {showPicker && (
            <div style={{ ...carte, marginTop: 10, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              {studios === null ? (
                <span style={texte}>Chargement des studios…</span>
              ) : (
                <>
                  <select
                    value={pickedStudio}
                    onChange={e => setPickedStudio(e.target.value)}
                    style={{ flex: 1, minWidth: 240, padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: '0.875rem', background: 'white' }}
                  >
                    <option value="">— Choisir un studio —</option>
                    {studios.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.studio_nom}{s.prenom ? ` · ${s.prenom}` : ''}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => pickedStudio && ouvrirPourProfil(pickedStudio)}
                    disabled={!pickedStudio || initBusy}
                    style={{ ...btnPrimaire, opacity: !pickedStudio || initBusy ? 0.6 : 1 }}
                  >
                    {initBusy ? '⏳' : 'Ouvrir le fil'}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {migrationRequise && (
        <div style={{ ...carte, background: '#fffbeb', borderColor: '#fcd34d' }}>
          ⚠️ La migration <code>v87</code> (messagerie support) n&apos;est pas appliquée —
          aucun fil ne peut exister pour l&apos;instant. Applique <code>migrations-v87-messagerie-support.sql</code>.
        </div>
      )}
      {listErr && <p style={{ color: '#dc2626', fontSize: '0.875rem' }}>❌ {listErr}</p>}

      {selected ? (
        <FilSupport
          conv={selected}
          onBack={() => { setSelected(null); chargerListe(); }}
        />
      ) : loading ? (
        <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Chargement…</p>
      ) : convs.length === 0 ? (
        !migrationRequise && (
          <div style={carte}>
            <p style={{ ...texte, margin: 0 }}>
              Aucun message pour l&apos;instant. Les fils apparaissent dès qu&apos;une prof écrit.
            </p>
          </div>
        )
      ) : (
        <div style={{ ...carte, padding: 0, overflow: 'hidden' }}>
          {convs.map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelected(c)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                padding: '12px 16px', background: c.non_lue ? '#fef9f2' : 'white',
                border: 'none', borderBottom: '1px solid #e2e8f0',
                textAlign: 'left', cursor: 'pointer',
              }}
            >
              <div style={{
                width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                background: c.non_lue ? '#b87333' : '#f1f5f9',
                color: c.non_lue ? 'white' : '#64748b',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: '0.9rem',
              }}>
                {(c.studio_nom?.[0] || '?').toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
                  <span style={{ fontWeight: c.non_lue ? 800 : 600, fontSize: '0.9rem', color: '#0f172a' }}>
                    {c.studio_nom}{c.prenom ? ` · ${c.prenom}` : ''}
                    {c.non_lue && <span style={{
                      marginLeft: 8, background: '#b87333', color: 'white', borderRadius: 999,
                      padding: '1px 8px', fontSize: '0.65rem', fontWeight: 700, verticalAlign: 'middle',
                    }}>à répondre</span>}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8', flexShrink: 0 }}>
                    {formatDate(c.last_message_at)}
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.dernier?.sender_type === 'izisolo' ? 'Équipe : ' : ''}
                  {c.dernier?.content || ''}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Emojis rapides du composeur (retour Colin 2026-08-19 : « les emojis
// classiques (yoga) ») — insérés au curseur, pas seulement en fin de texte.
const EMOJIS_RAPIDES = ['🧘', '🙏', '🌿', '💛', '✨', '😊', '👍', '🎉', '💪', '☀️'];

function FilSupport({ conv, onBack }) {
  const [messages, setMessages] = useState([]);
  const [studio, setStudio] = useState(null);
  // Accusé de lecture (admin only) : dernière ouverture du fil par la PROF.
  const [profLastReadAt, setProfLastReadAt] = useState(null);
  // « Aucun message » ne doit s'afficher qu'APRÈS le premier chargement —
  // avant, le fil semblait vide pendant la 1re requête (lambda froide en
  // prod = quelques secondes, retour Colin 2026-08-19).
  const [chargement, setChargement] = useState(true);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState('');
  const scrollRef = useRef(null);
  const readPosted = useRef(false);
  const draftRef = useRef(null);

  const insererEmoji = (emoji) => {
    const ta = draftRef.current;
    if (!ta) { setDraft(d => d + emoji); return; }
    const debut = ta.selectionStart ?? draft.length;
    const fin = ta.selectionEnd ?? draft.length;
    const next = draft.slice(0, debut) + emoji + draft.slice(fin);
    setDraft(next);
    requestAnimationFrame(() => {
      ta.focus();
      const pos = debut + emoji.length;
      ta.setSelectionRange(pos, pos);
    });
  };

  const charger = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/messagerie/conversations/${conv.id}/messages`, { cache: 'no-store' });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || `Erreur ${res.status}`);
      setMessages(j.messages || []);
      setStudio(j.studio || null);
      setProfLastReadAt(j.prof_last_read_at || null);
      setErr('');
    } catch (e) {
      setErr(e.message);
    } finally {
      setChargement(false);
    }
  }, [conv.id]);

  useEffect(() => {
    charger();
    const t = setInterval(charger, POLL_FIL);
    return () => clearInterval(t);
  }, [charger]);

  // Ouvrir le fil = lu (une seule fois par ouverture)
  useEffect(() => {
    if (readPosted.current) return;
    readPosted.current = true;
    fetch(`/api/admin/messagerie/conversations/${conv.id}/read`, { method: 'POST' }).catch(() => {});
  }, [conv.id]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const envoyer = async () => {
    const content = draft.trim();
    if (!content || sending) return;
    setSending(true);
    setErr('');
    try {
      const res = await fetch(`/api/admin/messagerie/conversations/${conv.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || `Erreur ${res.status}`);
      setDraft('');
      await charger();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ ...carte, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: 'min(80vh, 820px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
        <button type="button" onClick={onBack} style={btnSecondaire}>← Retour</button>
        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>
          {studio?.studio_nom || conv.studio_nom}{(studio?.prenom || conv.prenom) ? ` · ${studio?.prenom || conv.prenom}` : ''}
        </div>
        {(studio?.profile_id || conv.profile_id) && (
          <a href={`/admin/studios/${studio?.profile_id || conv.profile_id}`} style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#b87333', fontWeight: 600, textDecoration: 'none' }}>
            Fiche studio →
          </a>
        )}
      </div>

      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: 14, background: 'white' }}>
        {messages.map(m => (
          <div key={m.id} style={{ display: 'flex', justifyContent: m.sender_type === 'izisolo' ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
            <div style={{
              maxWidth: '75%', padding: '9px 13px', borderRadius: 14, fontSize: '0.875rem', lineHeight: 1.45,
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              background: m.sender_type === 'izisolo' ? '#b87333' : '#f1f5f9',
              color: m.sender_type === 'izisolo' ? 'white' : '#0f172a',
              borderBottomRightRadius: m.sender_type === 'izisolo' ? 4 : 14,
              borderBottomLeftRadius: m.sender_type === 'izisolo' ? 14 : 4,
            }}>
              {m.content || (m.message_type === 'photo' ? '📷 Photo' : '📎 Fichier')}
              {(Array.isArray(m.media_urls) ? m.media_urls : []).map((u, i) => {
                const url = typeof u === 'string' ? u : u?.url;
                return url ? (
                  <div key={i}>
                    <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', fontSize: '0.8rem' }}>
                      📎 pièce jointe {i + 1}
                    </a>
                  </div>
                ) : null;
              })}
              <div style={{ fontSize: '0.65rem', opacity: 0.7, marginTop: 3, textAlign: 'right' }}>
                {formatDate(m.created_at)}
                {/* Accusé de lecture — côté ADMIN uniquement, la prof ne voit
                    jamais l'équivalent. Se met à jour au poll (8 s). */}
                {m.sender_type === 'izisolo' && (
                  estLuParProf(m.created_at, profLastReadAt)
                    ? <span title="Lu par la prof" style={{ marginLeft: 6 }}>✓✓ Lu</span>
                    : <span title="Pas encore ouvert par la prof" style={{ marginLeft: 6 }}>✓ Envoyé</span>
                )}
              </div>
            </div>
          </div>
        ))}
        {messages.length === 0 && (
          <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
            {chargement ? '⏳ Chargement du fil…' : 'Aucun message.'}
          </p>
        )}
      </div>

      {err && <p style={{ color: '#dc2626', fontSize: '0.8rem', margin: '6px 14px' }}>❌ {err}</p>}

      <div style={{ padding: 12, borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
        <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
          {EMOJIS_RAPIDES.map(e => (
            <button
              key={e}
              type="button"
              onClick={() => insererEmoji(e)}
              title={`Insérer ${e}`}
              style={{
                width: 32, height: 32, border: '1px solid #e2e8f0', borderRadius: 8,
                background: 'white', cursor: 'pointer', fontSize: '1.05rem', lineHeight: 1,
              }}
            >
              {e}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <textarea
            ref={draftRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) envoyer(); }}
            rows={5}
            maxLength={4000}
            placeholder="Réponds à la prof… (Ctrl+Entrée pour envoyer)"
            style={{
              flex: 1, padding: '10px 13px', border: '1px solid #cbd5e1', borderRadius: 10,
              fontSize: '0.9rem', fontFamily: 'inherit', resize: 'vertical',
              minHeight: 110, lineHeight: 1.5,
            }}
          />
          <button type="button" onClick={envoyer} disabled={sending || !draft.trim()} style={{ ...btnPrimaire, alignSelf: 'flex-end', opacity: sending || !draft.trim() ? 0.6 : 1 }}>
            {sending ? '⏳' : 'Envoyer'}
          </button>
        </div>
      </div>
    </div>
  );
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay
    ? d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

const carte = {
  background: 'white', border: '1px solid #e2e8f0', borderRadius: 12,
  padding: '16px 18px', marginBottom: 16, maxWidth: 860,
  fontSize: '0.875rem', color: '#475569',
};
const texte = { fontSize: '0.875rem', color: '#475569', lineHeight: 1.55 };
const btnPrimaire = {
  padding: '9px 18px', background: '#b87333', color: 'white', border: 'none',
  borderRadius: 99, fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', whiteSpace: 'nowrap',
};
const btnSecondaire = {
  padding: '6px 12px', background: 'white', color: '#334155', border: '1px solid #cbd5e1',
  borderRadius: 99, fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer', whiteSpace: 'nowrap',
};

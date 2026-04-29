'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, MessageSquare, Megaphone, Plus, Search, X, Send, Loader2, Users } from 'lucide-react';
import ConversationList from '@/components/messagerie/ConversationList';
import ChatRoom from '@/components/messagerie/ChatRoom';
import { useToast } from '@/components/ui/ToastProvider';

const SCOPES = [
  { value: 'tous',        label: 'Tous mes élèves',        desc: 'Tous les élèves actifs/fidèles/prospects' },
  { value: 'cours',       label: 'Inscrits d\'un cours',  desc: 'Élèves marqués présents (ou inscrits) à un cours précis' },
  { value: 'type_cours',  label: 'Habitué·es d\'un type', desc: 'Tous ceux qui ont assisté à un type de cours (90 derniers jours)' },
  { value: 'abonnement',  label: 'Détenteurs d\'une offre', desc: 'Tous ceux qui ont un abonnement actif sur cette offre' },
  { value: 'clients',     label: 'Sélection libre',         desc: 'Choisis manuellement les destinataires' },
];

export default function MessagerieClient({ profile, clients, cours, offres }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  // Onglet : 'conversations' | 'annoncer'
  const initialTab = searchParams.get('tab') === 'annoncer' ? 'annoncer' : 'conversations';
  const [tab, setTab] = useState(initialTab);

  // Conversation sélectionnée (pour split view sur desktop)
  const [selectedConvId, setSelectedConvId] = useState(searchParams.get('conv') || null);

  // ── Onglet Annoncer ─────────────────────────────────────────────────
  const [scope, setScope]            = useState('tous');
  const [coursId, setCoursId]        = useState('');
  const [typeCours, setTypeCours]    = useState('');
  const [offreId, setOffreId]        = useState('');
  const [clientIds, setClientIds]    = useState(new Set());
  const [searchClient, setSearchClient] = useState('');
  const [content, setContent]        = useState('');
  const [mode, setMode]              = useState('individuel'); // 'individuel'|'groupe' (pour scope=cours)
  const [sending, setSending]        = useState(false);

  // Démarrer une conversation 1-to-1 (depuis fiche élève via ?with=clientId)
  useEffect(() => {
    const withClient = searchParams.get('with');
    if (withClient) {
      (async () => {
        const res = await fetch('/api/messagerie/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'client', client_id: withClient }),
        });
        const json = await res.json();
        if (res.ok && json.conversation) {
          setSelectedConvId(json.conversation.id);
          setTab('conversations');
        }
      })();
    }
  }, [searchParams]);

  const typesCoursList = useMemo(() => {
    return [...new Set(cours.map(c => c.type_cours).filter(Boolean))];
  }, [cours]);

  const clientsFiltres = useMemo(() => {
    const q = searchClient.toLowerCase().trim();
    if (!q) return clients;
    return clients.filter(c =>
      `${c.prenom || ''} ${c.nom || ''}`.toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q)
    );
  }, [clients, searchClient]);

  // Compteur de destinataires
  const nbDestinataires = useMemo(() => {
    if (scope === 'tous') return clients.length;
    if (scope === 'cours' && coursId && mode === 'groupe') return 1; // 1 conv groupe
    if (scope === 'clients') return clientIds.size;
    return null; // inconnu côté client
  }, [scope, coursId, mode, clientIds, clients.length]);

  const canAnnounce = content.trim().length > 0 && (
    scope === 'tous' ||
    (scope === 'cours' && coursId) ||
    (scope === 'type_cours' && typeCours) ||
    (scope === 'abonnement' && offreId) ||
    (scope === 'clients' && clientIds.size > 0)
  );

  const handleAnnounce = async () => {
    if (!canAnnounce) return;
    setSending(true);
    try {
      const body = {
        content: content.trim(),
        scope,
        mode,
        cours_id: scope === 'cours' ? coursId : undefined,
        type_cours: scope === 'type_cours' ? typeCours : undefined,
        offre_id: scope === 'abonnement' ? offreId : undefined,
        client_ids: scope === 'clients' ? [...clientIds] : undefined,
      };
      const res = await fetch('/api/messagerie/announce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erreur');
      toast.success(`Envoyé à ${json.count} conversation${json.count > 1 ? 's' : ''} !`);
      setContent('');
      setClientIds(new Set());
      setTab('conversations');
    } catch (err) {
      toast.error('Erreur : ' + err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="msg-page">
      <header className="msg-header">
        {selectedConvId ? (
          <button onClick={() => setSelectedConvId(null)} className="back-btn" aria-label="Retour">
            <ArrowLeft size={18} />
          </button>
        ) : null}
        <h1>{selectedConvId ? '' : 'Messagerie'}</h1>
      </header>

      {!selectedConvId && (
        <div className="msg-tabs">
          <button
            type="button"
            className={`msg-tab ${tab === 'conversations' ? 'active' : ''}`}
            onClick={() => setTab('conversations')}
          >
            <MessageSquare size={14} /> Conversations
          </button>
          <button
            type="button"
            className={`msg-tab ${tab === 'annoncer' ? 'active' : ''}`}
            onClick={() => setTab('annoncer')}
          >
            <Megaphone size={14} /> Annoncer
          </button>
        </div>
      )}

      {selectedConvId ? (
        <div className="msg-chat-container">
          <ChatRoom
            conversationId={selectedConvId}
            viewerKind="pro"
            onMessageSent={() => {}}
          />
        </div>
      ) : tab === 'conversations' ? (
        <div className="msg-list-wrap">
          <ConversationList
            onSelect={setSelectedConvId}
            selectedId={selectedConvId}
          />
        </div>
      ) : (
        // Onglet Annoncer
        <div className="msg-announce">
          <div className="ann-section">
            <label className="ann-label">À qui ?</label>
            <div className="ann-scope-pills">
              {SCOPES.map(s => (
                <button
                  key={s.value}
                  type="button"
                  className={`ann-scope ${scope === s.value ? 'active' : ''}`}
                  onClick={() => setScope(s.value)}
                  title={s.desc}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {scope === 'cours' && (
            <div className="ann-section">
              <label className="ann-label">Quel cours ?</label>
              <select className="izi-input" value={coursId} onChange={(e) => setCoursId(e.target.value)}>
                <option value="">— Choisir un cours —</option>
                {cours.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.nom} · {new Date(c.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })} {c.heure?.slice(0, 5)}
                  </option>
                ))}
              </select>
              <div className="ann-mode">
                <label className={`ann-mode-opt ${mode === 'individuel' ? 'active' : ''}`}>
                  <input type="radio" name="mode" value="individuel" checked={mode === 'individuel'} onChange={(e) => setMode(e.target.value)} />
                  <span>1 message à chacun (conversations privées)</span>
                </label>
                <label className={`ann-mode-opt ${mode === 'groupe' ? 'active' : ''}`}>
                  <input type="radio" name="mode" value="groupe" checked={mode === 'groupe'} onChange={(e) => setMode(e.target.value)} />
                  <span>1 conversation de groupe (tous voient les réponses)</span>
                </label>
              </div>
            </div>
          )}

          {scope === 'type_cours' && (
            <div className="ann-section">
              <label className="ann-label">Quel type de cours ?</label>
              <select className="izi-input" value={typeCours} onChange={(e) => setTypeCours(e.target.value)}>
                <option value="">— Choisir un type —</option>
                {typesCoursList.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          )}

          {scope === 'abonnement' && (
            <div className="ann-section">
              <label className="ann-label">Quelle offre ?</label>
              <select className="izi-input" value={offreId} onChange={(e) => setOffreId(e.target.value)}>
                <option value="">— Choisir une offre —</option>
                {offres.map(o => <option key={o.id} value={o.id}>{o.nom}</option>)}
              </select>
            </div>
          )}

          {scope === 'clients' && (
            <div className="ann-section">
              <label className="ann-label">Sélection ({clientIds.size})</label>
              <div className="ann-search">
                <Search size={14} />
                <input
                  type="text"
                  placeholder="Rechercher un élève…"
                  value={searchClient}
                  onChange={(e) => setSearchClient(e.target.value)}
                />
              </div>
              <div className="ann-clients-list">
                {clientsFiltres.slice(0, 50).map(c => (
                  <label key={c.id} className={`ann-client ${clientIds.has(c.id) ? 'selected' : ''}`}>
                    <input
                      type="checkbox"
                      checked={clientIds.has(c.id)}
                      onChange={() => {
                        setClientIds(prev => {
                          const next = new Set(prev);
                          if (next.has(c.id)) next.delete(c.id); else next.add(c.id);
                          return next;
                        });
                      }}
                    />
                    <span>{c.prenom} {c.nom}</span>
                  </label>
                ))}
                {clientsFiltres.length > 50 && (
                  <p className="ann-more">+ {clientsFiltres.length - 50} autres — affine ta recherche</p>
                )}
              </div>
            </div>
          )}

          <div className="ann-section">
            <label className="ann-label">Message</label>
            <textarea
              className="izi-input"
              rows={5}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={4000}
              placeholder="Ex : Le cours de mardi 19h30 est annulé, on se retrouve mercredi à la place. Bonne soirée !"
            />
            <p className="ann-hint">{content.length}/4000 — chaque destinataire recevra ce message dans sa conversation avec toi. Il pourra te répondre.</p>
          </div>

          <button
            type="button"
            className="izi-btn izi-btn-primary ann-send"
            onClick={handleAnnounce}
            disabled={!canAnnounce || sending}
          >
            {sending ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
            {sending ? 'Envoi…' : nbDestinataires !== null
              ? `Envoyer à ${nbDestinataires} destinataire${nbDestinataires > 1 ? 's' : ''}`
              : 'Envoyer'}
          </button>
        </div>
      )}

      <style jsx global>{`
        .msg-page {
          display: flex; flex-direction: column;
          height: calc(100vh - var(--bottom-nav-height, 0px) - 20px);
          padding-bottom: 0;
        }
        @media (min-width: 1024px) {
          .msg-page { height: 100vh; }
        }

        .msg-header {
          display: flex; align-items: center; gap: 12px;
          padding-bottom: 10px;
        }
        .msg-header h1 { font-size: 1.25rem; font-weight: 700; }
        .back-btn {
          width: 38px; height: 38px; border-radius: var(--radius-sm);
          border: 1px solid var(--border); background: var(--bg-card);
          display: flex; align-items: center; justify-content: center;
          color: var(--text-secondary); text-decoration: none; cursor: pointer;
        }

        .msg-tabs {
          display: inline-flex; background: var(--bg-soft, #faf8f5);
          border: 1px solid var(--border); border-radius: 99px;
          padding: 3px; gap: 2px; align-self: flex-start;
          margin-bottom: 10px;
        }
        .msg-tab {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 7px 14px; border: none; background: transparent;
          border-radius: 99px; cursor: pointer;
          font-size: 0.8125rem; font-weight: 600; color: var(--text-muted);
        }
        .msg-tab.active {
          background: white; color: var(--brand);
          box-shadow: 0 1px 3px rgba(0,0,0,0.06);
        }

        .msg-list-wrap {
          flex: 1; overflow-y: auto;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 12px;
        }
        .msg-chat-container {
          flex: 1; min-height: 0;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 12px;
          overflow: hidden;
        }

        /* Annoncer */
        .msg-announce {
          flex: 1; overflow-y: auto;
          display: flex; flex-direction: column; gap: 16px;
          padding: 4px;
        }
        .ann-section { display: flex; flex-direction: column; gap: 8px; }
        .ann-label { font-size: 0.8125rem; font-weight: 700; color: var(--text-secondary); }

        .ann-scope-pills { display: flex; flex-wrap: wrap; gap: 6px; }
        .ann-scope {
          padding: 7px 14px; border: 1.5px solid var(--border);
          background: var(--bg-card); border-radius: 99px;
          font-size: 0.8125rem; font-weight: 500;
          cursor: pointer; color: var(--text-secondary);
          transition: all 0.15s;
        }
        .ann-scope:hover { border-color: var(--brand-200, #f0d0d0); }
        .ann-scope.active { background: var(--brand); color: white; border-color: var(--brand); }

        .ann-mode { display: flex; flex-direction: column; gap: 6px; margin-top: 8px; }
        .ann-mode-opt {
          display: flex; align-items: center; gap: 8px;
          padding: 8px 12px; border: 1.5px solid var(--border);
          border-radius: 10px; cursor: pointer; font-size: 0.8125rem;
        }
        .ann-mode-opt.active { border-color: var(--brand); background: var(--brand-light); }
        .ann-mode-opt input { accent-color: var(--brand); }

        .ann-search {
          display: flex; align-items: center; gap: 6px;
          padding: 6px 12px; border: 1px solid var(--border); border-radius: 10px;
          background: white;
        }
        .ann-search input { flex: 1; border: none; outline: none; font-size: 0.875rem; }
        .ann-clients-list {
          max-height: 280px; overflow-y: auto;
          border: 1px solid var(--border); border-radius: 10px;
          background: white;
        }
        .ann-client {
          display: flex; align-items: center; gap: 10px;
          padding: 8px 12px; border-bottom: 1px solid var(--border);
          cursor: pointer; font-size: 0.875rem;
        }
        .ann-client:last-child { border-bottom: none; }
        .ann-client.selected { background: var(--brand-light); }
        .ann-client input { accent-color: var(--brand); }
        .ann-more { padding: 8px 12px; font-size: 0.7rem; color: var(--text-muted); text-align: center; }

        .ann-hint { font-size: 0.7rem; color: var(--text-muted); margin-top: -2px; }

        .ann-send {
          align-self: flex-start; padding: 10px 20px;
          display: inline-flex; align-items: center; gap: 8px;
        }

        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 0.8s linear infinite; }
      `}</style>
    </div>
  );
}

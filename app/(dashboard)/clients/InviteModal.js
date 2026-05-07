'use client';

/**
 * Modal "Inviter une élève / un prospect"
 *
 * Donne au prof 2 façons de partager son portail (le SMS arrivera en V2,
 * pour l'instant grisé) :
 *   1) 📋 Copier le lien   — pour coller dans n'importe quel canal
 *   2) ✉️ Email            — ouvre le client mail (mailto:?subject&body=)
 *
 * 2 modes pour le destinataire :
 *   - "Nouveau contact" (par défaut) : saisie libre prénom + email d'un
 *     prospect qui n'est pas encore en CRM. C'est l'usage principal de la
 *     fonctionnalité.
 *   - "Élève déjà enregistré" : recherche dans les élèves existants pour
 *     pré-remplir prénom + email (utile si on veut renvoyer le lien à
 *     quelqu'un qui n'a pas encore créé son espace).
 */

import { useState, useMemo, useEffect } from 'react';
import { X, Copy, Check, Mail, Link as LinkIcon, User, Search, UserPlus } from 'lucide-react';

export default function InviteModal({ open, onClose, profile, clients = [] }) {
  const [tab, setTab] = useState('lien'); // 'lien' | 'email' (sms désactivé V2)
  const [copied, setCopied] = useState(false);

  // Mode du destinataire : 'new' (saisie libre) | 'existing' (sélection CRM)
  const [recipientMode, setRecipientMode] = useState('new');
  const [search, setSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);

  // Saisie libre (mode 'new')
  const [newPrenom, setNewPrenom] = useState('');
  const [newEmail, setNewEmail] = useState('');

  const studioSlug = profile?.studio_slug;
  const studioNom = profile?.studio_nom || 'mon studio';
  const profPrenom = profile?.prenom || '';

  // URL de base — côté client uniquement
  const portailUrl = typeof window !== 'undefined' && studioSlug
    ? `${window.location.origin}/p/${studioSlug}/connexion`
    : `https://izisolo.fr/p/${studioSlug || 'mon-studio'}/connexion`;

  // Prenom + email cibles selon le mode (saisie libre OU élève sélectionnée)
  const prenomCible = (recipientMode === 'new' ? newPrenom : selectedClient?.prenom) || '';
  const emailCible  = (recipientMode === 'new' ? newEmail : selectedClient?.email) || '';

  // Templates — utilisent prenom du destinataire si saisi, sinon générique
  const salutation = prenomCible ? `Salut ${prenomCible}` : 'Coucou';

  const sujetEmail = `Ton espace ${studioNom}`;
  const corpsEmail = `${salutation},

J'utilise un nouvel outil pour gérer les inscriptions, suivre tes cours et te tenir au courant : IziSolo.

Pour créer ton espace, rien de plus simple :
1. Va sur : ${portailUrl}
2. Tape l'email auquel tu reçois ce message (important pour qu'on soit reliées dans le système)
3. Tu reçois un lien magique par email — clique dessus, c'est tout

Ensuite tu pourras voir tes cours réservés, t'inscrire à de nouveaux cours et garder un œil sur ton carnet de séances.

Pas de mot de passe à retenir, c'est juste ton email à chaque fois.

À très vite${profPrenom ? ' — ' + profPrenom : ''} 🌿`;

  // Filtrage des clients
  const clientsFiltres = useMemo(() => {
    if (!search.trim()) return clients.slice(0, 8);
    const q = search.toLowerCase();
    return clients.filter(c =>
      (c.prenom || '').toLowerCase().includes(q) ||
      (c.nom || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q)
    ).slice(0, 8);
  }, [clients, search]);

  // Reset au close
  useEffect(() => {
    if (!open) {
      setCopied(false);
      setSearch('');
      setSelectedClient(null);
      setNewPrenom('');
      setNewEmail('');
      setRecipientMode('new');
      setTab('lien');
    }
  }, [open]);

  // Lock scroll body quand modal ouverte
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback : sélection manuelle
      alert('Copie manuelle requise');
    }
  };

  const mailtoHref = (() => {
    return `mailto:${emailCible}?subject=${encodeURIComponent(sujetEmail)}&body=${encodeURIComponent(corpsEmail)}`;
  })();

  return (
    <div className="invite-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="invite-sheet animate-slide-up">
        <div className="invite-header">
          <span className="invite-title">📨 Inviter une élève</span>
          <button className="invite-close" onClick={onClose} aria-label="Fermer">
            <X size={20} />
          </button>
        </div>

        <div className="invite-body">
          {/* === Choix du destinataire === */}
          <div className="invite-section">
            <div className="invite-section-title">Destinataire</div>

            {/* Toggle Nouveau / Existant */}
            <div className="invite-recipient-modes">
              <button
                type="button"
                className={`invite-mode-btn ${recipientMode === 'new' ? 'active' : ''}`}
                onClick={() => { setRecipientMode('new'); setSelectedClient(null); }}
              >
                <UserPlus size={14} /> Nouveau contact
              </button>
              <button
                type="button"
                className={`invite-mode-btn ${recipientMode === 'existing' ? 'active' : ''}`}
                onClick={() => { setRecipientMode('existing'); setNewPrenom(''); setNewEmail(''); }}
              >
                <User size={14} /> Élève existant
              </button>
            </div>

            {/* Mode "Nouveau contact" : saisie libre prénom + email */}
            {recipientMode === 'new' && (
              <div className="invite-new-form">
                <input
                  className="izi-input"
                  placeholder="Prénom (optionnel)"
                  value={newPrenom}
                  onChange={e => setNewPrenom(e.target.value)}
                />
                <input
                  className="izi-input"
                  type="email"
                  placeholder="email@exemple.fr"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                />
                <p className="invite-help-small">
                  Cet email sera utilisé comme identifiant côté élève. Pas besoin
                  qu'iel soit déjà en CRM — l'invitation crée juste le contact.
                </p>
              </div>
            )}

            {/* Mode "Élève existant" : recherche dans le CRM */}
            {recipientMode === 'existing' && (
              <>
                {selectedClient ? (
                  <div className="selected-client">
                    <div className="selected-client-avatar">
                      {((selectedClient.prenom?.[0] || '') + (selectedClient.nom?.[0] || '')).toUpperCase() || '?'}
                    </div>
                    <div className="selected-client-info">
                      <div className="selected-client-name">
                        {[selectedClient.prenom, selectedClient.nom].filter(Boolean).join(' ')}
                      </div>
                      <div className="selected-client-meta">
                        {selectedClient.email || selectedClient.telephone || 'pas de coordonnées'}
                      </div>
                    </div>
                    <button
                      className="izi-btn izi-btn-ghost"
                      onClick={() => setSelectedClient(null)}
                      type="button"
                    >
                      Changer
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="invite-search-wrap">
                      <Search size={16} className="invite-search-icon" />
                      <input
                        className="izi-input invite-search-input"
                        placeholder="Chercher une élève par nom..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                      />
                    </div>
                    {clientsFiltres.length > 0 && (
                      <div className="invite-clients-list">
                        {clientsFiltres.map(c => (
                          <button
                            key={c.id}
                            className="invite-client-item"
                            onClick={() => setSelectedClient(c)}
                            type="button"
                          >
                            <span className="invite-client-name">
                              {[c.prenom, c.nom].filter(Boolean).join(' ') || c.nom_structure || '?'}
                            </span>
                            <span className="invite-client-meta">
                              {c.email ? c.email : (c.telephone || 'pas de coordonnées')}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                    {!search && clients.length === 0 && (
                      <p className="invite-empty">
                        <User size={14} /> Pas encore d'élève dans ton CRM. Bascule sur "Nouveau contact".
                      </p>
                    )}
                  </>
                )}
              </>
            )}
          </div>

          {/* === Tabs === SMS désactivé V2 (grisé avec badge "Bientôt") */}
          <div className="invite-tabs">
            <button
              className={`invite-tab ${tab === 'lien' ? 'active' : ''}`}
              onClick={() => setTab('lien')}
              type="button"
            >
              <LinkIcon size={14} /> Lien
            </button>
            <button
              className={`invite-tab ${tab === 'email' ? 'active' : ''}`}
              onClick={() => setTab('email')}
              type="button"
            >
              <Mail size={14} /> Email
            </button>
            <button
              className="invite-tab invite-tab-disabled"
              disabled
              type="button"
              title="SMS arrivera dans une prochaine version"
            >
              SMS <span className="invite-soon-badge">Bientôt</span>
            </button>
          </div>

          {/* === Tab content === */}
          {tab === 'lien' && (
            <div className="invite-tab-content">
              <p className="invite-help">
                Copie ce lien et envoie-le à ton élève par WhatsApp, Messenger, ou tout autre canal.
              </p>
              <div className="invite-link-box">
                <code>{portailUrl}</code>
              </div>
              <button
                className={`izi-btn izi-btn-primary invite-action-btn ${copied ? 'copied' : ''}`}
                onClick={() => handleCopy(portailUrl)}
                type="button"
              >
                {copied ? <><Check size={16} /> Copié !</> : <><Copy size={16} /> Copier le lien</>}
              </button>
            </div>
          )}

          {tab === 'email' && (
            <div className="invite-tab-content">
              <p className="invite-help">
                Ouvre ton client email avec le message déjà rédigé.
                {!emailCible && ' Saisis un email au-dessus pour pré-remplir le destinataire.'}
              </p>
              <div className="invite-email-subject">
                <strong>Objet :</strong> {sujetEmail}
              </div>
              <div className="invite-preview">{corpsEmail}</div>
              <div className="invite-actions-row">
                <button
                  className="izi-btn izi-btn-secondary"
                  onClick={() => handleCopy(`Objet : ${sujetEmail}\n\n${corpsEmail}`)}
                  type="button"
                >
                  {copied ? <><Check size={16} /> Copié</> : <><Copy size={16} /> Copier</>}
                </button>
                <a
                  href={mailtoHref}
                  className="izi-btn izi-btn-primary"
                >
                  <Mail size={16} /> Ouvrir mail
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        .invite-backdrop {
          position: fixed; inset: 0;
          background: rgba(0, 0, 0, 0.45);
          z-index: 200;
          display: flex; align-items: flex-end; justify-content: center;
        }
        @media (min-width: 600px) {
          .invite-backdrop { align-items: center; }
        }
        .invite-sheet {
          background: var(--bg-card);
          border-radius: var(--radius-lg) var(--radius-lg) 0 0;
          width: 100%; max-width: 520px; max-height: 92vh;
          display: flex; flex-direction: column; overflow: hidden;
        }
        @media (min-width: 600px) {
          .invite-sheet { border-radius: var(--radius-lg); }
        }
        .invite-header {
          display: flex; align-items: center; gap: 8px;
          padding: 16px 16px 12px;
          border-bottom: 1px solid var(--border);
          flex-shrink: 0;
        }
        .invite-title { flex: 1; font-weight: 700; font-size: 1rem; color: var(--text-primary); }
        .invite-close {
          background: none; border: none;
          width: 36px; height: 36px;
          display: flex; align-items: center; justify-content: center;
          color: var(--text-secondary);
          cursor: pointer;
          border-radius: var(--radius-sm);
        }
        .invite-close:hover { background: var(--cream-dark); }
        .invite-body {
          padding: 16px;
          overflow-y: auto;
          display: flex; flex-direction: column; gap: 18px;
        }
        .invite-section {
          display: flex; flex-direction: column; gap: 8px;
        }
        .invite-section-title {
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: var(--text-muted);
        }
        .invite-search-wrap { position: relative; }
        .invite-search-icon {
          position: absolute; left: 12px; top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
          pointer-events: none;
        }
        .invite-search-input { padding-left: 36px; }
        .invite-clients-list {
          display: flex; flex-direction: column; gap: 4px;
          max-height: 200px; overflow-y: auto;
          margin-top: 6px;
        }
        .invite-client-item {
          display: flex; flex-direction: column; gap: 2px;
          align-items: flex-start;
          padding: 10px 12px;
          background: var(--cream);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          cursor: pointer;
          text-align: left;
          transition: all var(--transition-fast);
        }
        .invite-client-item:hover {
          border-color: var(--brand);
          background: var(--brand-light);
        }
        .invite-client-name { font-weight: 600; font-size: 0.9375rem; color: var(--text-primary); }
        .invite-client-meta { font-size: 0.75rem; color: var(--text-muted); }
        .invite-empty {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 0.8125rem; color: var(--text-muted);
          margin: 0; padding: 8px 0;
        }
        .selected-client {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 12px;
          background: var(--brand-light);
          border: 1px solid var(--brand-200, #f0d0d0);
          border-radius: var(--radius-md);
        }
        .selected-client-avatar {
          width: 36px; height: 36px;
          border-radius: 50%;
          background: var(--brand);
          color: white;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.8125rem; font-weight: 700;
          flex-shrink: 0;
        }
        .selected-client-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
        .selected-client-name { font-weight: 600; font-size: 0.9375rem; color: var(--text-primary); }
        .selected-client-meta { font-size: 0.75rem; color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; }

        /* Tabs */
        .invite-tabs {
          display: flex; gap: 2px;
          border-bottom: 1px solid var(--border);
          margin: 0 -16px;
          padding: 0 12px;
        }
        .invite-tab {
          display: inline-flex; align-items: center; gap: 6px;
          background: none; border: none;
          padding: 12px 14px;
          font-size: 0.8125rem; font-weight: 500;
          color: var(--text-muted);
          cursor: pointer;
          border-bottom: 2px solid transparent;
          margin-bottom: -1px;
          transition: all var(--transition-fast);
        }
        .invite-tab:hover { color: var(--text-secondary); }
        .invite-tab.active {
          color: var(--brand-700);
          border-bottom-color: var(--brand);
          font-weight: 600;
        }
        .invite-tab-content {
          display: flex; flex-direction: column; gap: 12px;
        }
        .invite-help {
          font-size: 0.8125rem;
          color: var(--text-secondary);
          margin: 0;
          line-height: 1.5;
        }
        .invite-link-box {
          padding: 12px 14px;
          background: var(--cream);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          word-break: break-all;
        }
        .invite-link-box code {
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 0.8125rem;
          color: var(--brand-700);
        }
        .invite-preview {
          padding: 12px 14px;
          background: var(--cream);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          font-size: 0.875rem;
          color: var(--text-primary);
          white-space: pre-wrap;
          line-height: 1.5;
          max-height: 240px;
          overflow-y: auto;
        }
        .invite-email-subject {
          padding: 8px 14px;
          background: var(--bg-soft, #faf8f5);
          border-radius: var(--radius-sm);
          font-size: 0.8125rem;
          color: var(--text-secondary);
        }
        .invite-actions-row {
          display: flex; gap: 8px;
        }
        .invite-actions-row .izi-btn { flex: 1; justify-content: center; }
        .invite-action-btn {
          width: 100%;
          justify-content: center;
        }
        .invite-action-btn.copied { background: #4ade80; }

        /* Toggle modes destinataire */
        .invite-recipient-modes {
          display: flex; gap: 6px;
          background: var(--cream, #faf8f5);
          padding: 3px; border-radius: 99px;
          border: 1px solid var(--border, #e5e0d8);
        }
        .invite-mode-btn {
          flex: 1;
          display: inline-flex; align-items: center; justify-content: center; gap: 6px;
          padding: 8px 14px;
          background: none; border: none;
          font-size: 0.8125rem; font-weight: 500;
          color: var(--text-muted, #888);
          cursor: pointer;
          border-radius: 99px;
          transition: all var(--transition-fast);
          font-family: inherit;
        }
        .invite-mode-btn.active {
          background: white;
          color: var(--brand-700, #8c5826);
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          font-weight: 600;
        }
        .invite-new-form {
          display: flex; flex-direction: column; gap: 8px;
        }
        .invite-help-small {
          font-size: 0.75rem; color: var(--text-muted, #888);
          margin: 4px 0 0; line-height: 1.5;
        }

        /* Tab désactivé V2 (SMS) */
        .invite-tab-disabled {
          opacity: 0.45;
          cursor: not-allowed !important;
        }
        .invite-tab-disabled:hover { color: var(--text-muted) !important; }
        .invite-soon-badge {
          margin-left: 6px;
          padding: 1px 6px;
          background: var(--brand, #b87333);
          color: white;
          border-radius: 99px;
          font-size: 0.6rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
      `}</style>
    </div>
  );
}

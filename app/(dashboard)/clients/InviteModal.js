'use client';

/**
 * Modal "Inviter mes élèves"
 *
 * Donne au prof 3 façons de partager son portail avec ses élèves :
 *   1) 📋 Copier le lien   — pour coller dans n'importe quel canal
 *   2) 💬 SMS              — ouvre l'app SMS du téléphone (sms:?body=)
 *   3) ✉️ Email            — ouvre le client mail (mailto:?subject&body=)
 *
 * Les templates intègrent automatiquement le nom du studio + prénom de
 * la prof + lien complet vers /p/{slug}/connexion.
 *
 * Optionnel : sélectionner une élève existante pour pré-remplir
 * son prénom + son email / téléphone dans le template.
 */

import { useState, useMemo, useEffect } from 'react';
import { X, Copy, Check, MessageSquare, Mail, Link as LinkIcon, User, Search } from 'lucide-react';

export default function InviteModal({ open, onClose, profile, clients = [] }) {
  const [tab, setTab] = useState('lien'); // 'lien' | 'sms' | 'email'
  const [copied, setCopied] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);

  const studioSlug = profile?.studio_slug;
  const studioNom = profile?.studio_nom || 'mon studio';
  const profPrenom = profile?.prenom || '';

  // URL de base — côté client uniquement
  const portailUrl = typeof window !== 'undefined' && studioSlug
    ? `${window.location.origin}/p/${studioSlug}/connexion`
    : `https://izisolo.fr/p/${studioSlug || 'mon-studio'}/connexion`;

  // Templates — utilisent prenom de l'élève si sélectionnée, sinon générique
  const prenomCible = selectedClient?.prenom || '';
  const salutation = prenomCible ? `Salut ${prenomCible}` : 'Coucou';

  const messageSMS = `${salutation}, j'utilise ${studioNom} sur IziSolo pour gérer les inscriptions et te tenir au courant des cours. Crée ton espace en 30 sec ici : ${portailUrl} (utilise bien cet email pour qu'on soit reliées). Belle journée ${profPrenom ? '— ' + profPrenom : ''}`;

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

  // Téléphone valide pour sms: ? on retire les espaces et +33 → 0
  const formatTelForSms = (tel) => {
    if (!tel) return '';
    return tel.replace(/[\s.-]/g, '').replace(/^\+33/, '0');
  };

  const smsHref = (() => {
    const tel = formatTelForSms(selectedClient?.telephone);
    return `sms:${tel}?body=${encodeURIComponent(messageSMS)}`;
  })();

  const mailtoHref = (() => {
    const to = selectedClient?.email || '';
    return `mailto:${to}?subject=${encodeURIComponent(sujetEmail)}&body=${encodeURIComponent(corpsEmail)}`;
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
          {/* === Sélection élève (optionnel) === */}
          <div className="invite-section">
            <div className="invite-section-title">
              Élève (optionnel — pré-remplit le message)
            </div>
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
                    <User size={14} /> Pas encore d'élève dans ton CRM. Tu peux quand même copier le lien et le partager.
                  </p>
                )}
              </>
            )}
          </div>

          {/* === Tabs === */}
          <div className="invite-tabs">
            <button
              className={`invite-tab ${tab === 'lien' ? 'active' : ''}`}
              onClick={() => setTab('lien')}
              type="button"
            >
              <LinkIcon size={14} /> Lien
            </button>
            <button
              className={`invite-tab ${tab === 'sms' ? 'active' : ''}`}
              onClick={() => setTab('sms')}
              type="button"
            >
              <MessageSquare size={14} /> SMS
            </button>
            <button
              className={`invite-tab ${tab === 'email' ? 'active' : ''}`}
              onClick={() => setTab('email')}
              type="button"
            >
              <Mail size={14} /> Email
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

          {tab === 'sms' && (
            <div className="invite-tab-content">
              <p className="invite-help">
                Ouvre l'application SMS de ton téléphone avec le message déjà rédigé.
                {!selectedClient?.telephone && ' Choisis une élève au-dessus pour pré-remplir son numéro.'}
              </p>
              <div className="invite-preview">{messageSMS}</div>
              <div className="invite-actions-row">
                <button
                  className="izi-btn izi-btn-secondary"
                  onClick={() => handleCopy(messageSMS)}
                  type="button"
                >
                  {copied ? <><Check size={16} /> Copié</> : <><Copy size={16} /> Copier</>}
                </button>
                <a
                  href={smsHref}
                  className="izi-btn izi-btn-primary"
                >
                  <MessageSquare size={16} /> Envoyer SMS
                </a>
              </div>
            </div>
          )}

          {tab === 'email' && (
            <div className="invite-tab-content">
              <p className="invite-help">
                Ouvre ton client email avec le message déjà rédigé.
                {!selectedClient?.email && ' Choisis une élève au-dessus pour pré-remplir son adresse.'}
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
      `}</style>
    </div>
  );
}

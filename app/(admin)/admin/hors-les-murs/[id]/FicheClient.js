'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { FAMILLES, STATUTS, MOTIFS_ECART, PRIORITES, validerEmailLieu, lienMailto, CC_EQUIPE } from '@/lib/hors-les-murs';
import { carte, bandeau, bouton, boutonPlein, boutonVert, eteint, champ, etiquette, lien, pastille, fmtDate, fmtDateHeure, appeler } from '../styles';

export default function FicheClient({ fiche: initiale, voisins, migrationManquante }) {
  const [fiche, setFiche] = useState(initiale);
  const [objet, setObjet] = useState(initiale.objet);
  const [corps, setCorps] = useState(initiale.corps);
  const [commentaire, setCommentaire] = useState('');
  const [reponse, setReponse] = useState('');
  const [motif, setMotif] = useState('pas_le_moment');
  const [volet, setVolet] = useState(''); // 'modif' | 'reponse' | 'ecarter' | 'historique'
  const [occupe, setOccupe] = useState('');
  const [message, setMessage] = useState('');

  const validation = useMemo(() => validerEmailLieu({ objet, corps }), [objet, corps]);
  const modifie = objet !== fiche.objet || corps !== fiche.corps;
  const mailto = useMemo(() => lienMailto(fiche.destinataire?.email, { objet, corps }), [fiche.destinataire, objet, corps]);
  const statut = STATUTS[fiche.statut] || STATUTS.a_relire;
  const avantEnvoi = ['a_relire', 'modif_demandee', 'valide'].includes(fiche.statut);
  const apresEnvoi = ['envoye', 'repondu', 'en_cours'].includes(fiche.statut);

  const agir = (cle, body, apres) => async () => {
    setOccupe(cle); setMessage('');
    try {
      const r = await appeler(`/api/admin/hors-les-murs/${fiche.id}`, body);
      setFiche(r.fiche);
      if (typeof r.fiche.objet === 'string') setObjet(r.fiche.objet);
      if (typeof r.fiche.corps === 'string') setCorps(r.fiche.corps);
      setVolet('');
      if (apres) setMessage(apres(r));
    } catch (e) { setMessage(`💥 ${e.message}`); } finally { setOccupe(''); }
  };

  const copier = async () => {
    const texte = `À : ${fiche.destinataire?.email || fiche.destinataire?.nom || ''}\nCc : ${CC_EQUIPE}\nObjet : ${objet}\n\n${corps}`;
    try { await navigator.clipboard.writeText(texte); setMessage('Email copié : colle-le dans ta boîte ou dans le formulaire du site.'); }
    catch { setMessage('💥 Le presse-papiers est bloqué ici : sélectionne le texte à la main.'); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 12, fontSize: '0.82rem' }}>
        <Link href="/admin/hors-les-murs" style={lien}>← Toutes les pistes</Link>
        <span style={{ display: 'flex', gap: 14 }}>
          {voisins.precedente && <Link href={`/admin/hors-les-murs/${voisins.precedente.id}`} style={lien}>← {voisins.precedente.nom}</Link>}
          {voisins.suivante && <Link href={`/admin/hors-les-murs/${voisins.suivante.id}`} style={lien}>{voisins.suivante.nom} →</Link>}
        </span>
      </div>

      <h1 style={{ margin: '0 0 6px', fontSize: '1.5rem' }}>{fiche.nom}</h1>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 6 }}>
        <span style={pastille(statut.ton)}>{statut.label}</span>
        <span style={pastille('neutral')}>{FAMILLES[fiche.cat]?.court}</span>
        <span style={pastille(fiche.prio === 1 ? 'warning' : 'neutral')} title={PRIORITES[fiche.prio]}>Priorité {fiche.prio}</span>
        <span style={{ color: '#9a9a9a', fontSize: '0.86rem' }}>{fiche.lieu} · ≈ {fiche.km} km de Gillonnay</span>
      </div>
      <p style={{ color: '#888', fontSize: '0.85rem', margin: '0 0 16px' }}>Prochain geste : <strong style={{ color: '#ddd' }}>{statut.action}</strong>{fiche.envoye_at ? ` · envoyé le ${fmtDate(fiche.envoye_at)}` : ''}</p>

      {migrationManquante && <div style={bandeau}>Migration <code>v118</code> pas encore appliquée : tu peux lire et préparer, mais rien ne s&apos;enregistre pour l&apos;instant.</div>}
      {message && <div style={{ ...bandeau, background: message.startsWith('💥') ? '#4a1414' : '#13341f', color: message.startsWith('💥') ? '#f87171' : '#4ade80' }}>{message}</div>}
      {fiche.now && <div style={{ ...bandeau, background: '#4a2e10', color: '#f5b878' }}>⏰ {fiche.now}{fiche.echeance ? ` (${fmtDate(fiche.echeance)})` : ''}</div>}
      {fiche.commentaire && fiche.statut === 'modif_demandee' && (
        <div style={{ ...bandeau, background: '#12304a', color: '#93c5fd' }}>Ta demande de modif : « {fiche.commentaire} ». Colin reprend le texte ; tu seras prévenue.</div>
      )}
      {fiche.reponse && <div style={{ ...bandeau, background: '#13341f', color: '#86efac' }}>Réponse du lieu : « {fiche.reponse} »</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 16, alignItems: 'start' }} className="hlm-colonnes">
        <div>
          <div style={carte}>
            <div style={etiquette}>La fiche, vérifiée sur place le 14 septembre 2026</div>
            <Ligne k="Qui">{fiche.gest}</Ligne>
            <Ligne k="Contact">{fiche.contact}</Ligne>
            <Ligne k="Déjà chez eux">{fiche.deja}</Ligne>
            <Ligne k="Saison">{fiche.saison}</Ligne>
            <Ligne k="Prix">{fiche.prix} <span style={{ color: '#777' }}>(indicatif)</span></Ligne>
            <div style={{ marginTop: 8, fontSize: '0.8rem' }}><a href={fiche.src} target="_blank" rel="noopener noreferrer" style={lien}>Ouvrir la page source ↗</a></div>
          </div>

          <div style={carte}>
            <div style={etiquette}>Le mini-projet</div>
            <h2 style={{ margin: '0 0 8px', fontSize: '1.15rem', color: '#f0d9c0' }}>{fiche.projet.titre}</h2>
            <p style={{ margin: '0 0 10px', color: '#ddd', lineHeight: 1.5 }}>{fiche.projet.concept}</p>
            <Ligne k="Format">{fiche.projet.format}</Ligne>
            <Ligne k="Déroulé">{fiche.projet.deroule}</Ligne>
            <Ligne k="L'argent">{fiche.projet.prix}</Ligne>
            <Ligne k="Pour eux">{fiche.projet.gain_lieu}</Ligne>
            <Ligne k="On demande">{fiche.projet.demande}</Ligne>
            <Ligne k="Attention">{fiche.projet.attention}</Ligne>
          </div>
        </div>

        <div style={{ ...carte, position: 'sticky', top: 12, borderColor: fiche.statut === 'valide' ? '#2f7a4a' : '#2e2e2e' }}>
          <div style={etiquette}>L&apos;email, depuis ta boîte</div>
          <div style={{ fontSize: '0.86rem', color: '#bbb', marginBottom: 10 }}>
            À : <strong style={{ color: '#eee' }}>{fiche.destinataire?.email || fiche.destinataire?.nom}</strong>
            {!fiche.destinataire?.email && <span style={{ color: '#f5b878' }}> · pas d&apos;adresse affichée : {fiche.destinataire?.canal || 'formulaire du site'}. Copie le texte et colle-le.</span>}
            <span style={{ color: '#777' }}> · copie à {CC_EQUIPE}</span>
          </div>
          <label style={{ display: 'block', marginBottom: 8 }}>
            <div style={etiquette}>Objet</div>
            <input value={objet} onChange={(e) => setObjet(e.target.value)} disabled={!avantEnvoi} style={{ ...champ, width: '100%' }} />
          </label>
          <label style={{ display: 'block' }}>
            <div style={etiquette}>Texte</div>
            <textarea value={corps} onChange={(e) => setCorps(e.target.value)} disabled={!avantEnvoi} rows={18} style={{ ...champ, width: '100%', lineHeight: 1.5, resize: 'vertical' }} />
          </label>
          {!validation.ok && (
            <ul style={{ margin: '8px 0 0', paddingLeft: 18, color: '#f87171', fontSize: '0.8rem' }}>
              {validation.erreurs.map((e) => <li key={e}>{e}</li>)}
            </ul>
          )}
          {modifie && avantEnvoi && <div style={{ color: '#fbbf24', fontSize: '0.8rem', marginTop: 6 }}>Texte modifié, pas encore enregistré.</div>}

          {avantEnvoi && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
              <button onClick={agir('enr', { action: 'enregistrer', objet, corps }, () => 'Texte enregistré.')} disabled={!!occupe || !validation.ok || !modifie || migrationManquante} style={{ ...bouton, ...((!validation.ok || !modifie || migrationManquante) ? eteint : {}) }}>Enregistrer le texte</button>
              <button onClick={() => setVolet(volet === 'modif' ? '' : 'modif')} disabled={!!occupe} style={bouton}>✍️ Demander une modif</button>
              {fiche.statut !== 'valide' && (
                <button onClick={agir('val', { action: 'valider', objet, corps }, () => 'Validé : il n’attend plus que ton clic sur Envoyer.')} disabled={!!occupe || !validation.ok || migrationManquante} style={{ ...boutonVert, ...((!validation.ok || migrationManquante) ? eteint : {}) }}>✅ Valider tel quel</button>
              )}
              {mailto
                ? <a href={mailto} onClick={() => setMessage('Ta boîte s’ouvre avec l’email prérempli. Quand il est parti, clique sur « Je l’ai envoyé ».')} style={{ ...boutonPlein, textDecoration: 'none', ...(!validation.ok ? eteint : {}) }} aria-disabled={!validation.ok}>📤 Envoyer depuis ma boîte</a>
                : <button onClick={copier} style={boutonPlein}>📋 Copier l&apos;email</button>}
              {mailto && <button onClick={copier} style={bouton}>📋 Copier</button>}
              <button onClick={agir('env', { action: 'marquer_envoye', objet, corps }, () => 'Noté comme envoyé. On attend la réponse.')} disabled={!!occupe || !validation.ok || migrationManquante} style={{ ...bouton, ...((!validation.ok || migrationManquante) ? eteint : {}) }}>Je l&apos;ai envoyé</button>
              <button onClick={() => setVolet(volet === 'ecarter' ? '' : 'ecarter')} disabled={!!occupe} style={{ ...bouton, color: '#999' }}>Écarter</button>
            </div>
          )}
          {apresEnvoi && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
              <button onClick={() => setVolet(volet === 'reponse' ? '' : 'reponse')} disabled={!!occupe} style={boutonVert}>💬 Ils ont répondu</button>
              {fiche.statut !== 'en_cours' && <button onClick={agir('enc', { action: 'en_cours' }, () => 'En cours : repérage, dates, devis.')} disabled={!!occupe || migrationManquante} style={bouton}>En cours de discussion</button>}
              {mailto && <a href={mailto} style={{ ...bouton, textDecoration: 'none' }}>📤 Réécrire depuis ma boîte</a>}
              <button onClick={() => setVolet(volet === 'ecarter' ? '' : 'ecarter')} disabled={!!occupe} style={{ ...bouton, color: '#999' }}>Écarter</button>
            </div>
          )}
          {fiche.statut === 'ecarte' && (
            <div style={{ marginTop: 12 }}>
              <div style={{ color: '#999', fontSize: '0.85rem', marginBottom: 8 }}>Écartée : {MOTIFS_ECART[fiche.motif_ecart] || 'sans motif'}.</div>
              <button onClick={agir('rem', { action: 'remettre' }, () => 'De retour dans la liste, à relire.')} disabled={!!occupe || migrationManquante} style={bouton}>Remettre dans la liste</button>
            </div>
          )}

          {volet === 'modif' && (
            <div style={{ marginTop: 12, padding: 12, background: '#141414', borderRadius: 8 }}>
              <div style={etiquette}>Ce que tu veux changer (Colin reçoit ton mot par email)</div>
              <textarea value={commentaire} onChange={(e) => setCommentaire(e.target.value)} rows={3} placeholder="Ex : trop long, enlève le paragraphe sur le tarif, et propose plutôt un samedi matin" style={{ ...champ, width: '100%' }} />
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button onClick={agir('mod', { action: 'demander_modif', commentaire }, (r) => r.notification === 'envoyee' ? 'Demande envoyée à Colin.' : `Demande enregistrée (email à Colin : ${r.notification}).`)} disabled={!!occupe || commentaire.trim().length < 5 || migrationManquante} style={{ ...boutonPlein, ...((commentaire.trim().length < 5 || migrationManquante) ? eteint : {}) }}>Envoyer la demande</button>
                <button onClick={() => setVolet('')} style={bouton}>Annuler</button>
              </div>
            </div>
          )}
          {volet === 'reponse' && (
            <div style={{ marginTop: 12, padding: 12, background: '#141414', borderRadius: 8 }}>
              <div style={etiquette}>Ce qu&apos;ils ont dit, en une phrase</div>
              <textarea value={reponse} onChange={(e) => setReponse(e.target.value)} rows={3} placeholder="Ex : OK pour un repérage jeudi 10 h, ils préfèrent le forfait" style={{ ...champ, width: '100%' }} />
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button onClick={agir('rep', { action: 'reponse', reponse }, () => 'Réponse notée.')} disabled={!!occupe || migrationManquante} style={{ ...boutonVert, ...(migrationManquante ? eteint : {}) }}>Enregistrer la réponse</button>
                <button onClick={() => setVolet('')} style={bouton}>Annuler</button>
              </div>
            </div>
          )}
          {volet === 'ecarter' && (
            <div style={{ marginTop: 12, padding: 12, background: '#141414', borderRadius: 8 }}>
              <div style={etiquette}>Pourquoi on l&apos;écarte</div>
              <select value={motif} onChange={(e) => setMotif(e.target.value)} style={{ ...champ, width: '100%' }}>
                {Object.entries(MOTIFS_ECART).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button onClick={agir('eca', { action: 'ecarter', motif }, () => 'Écartée. Elle reste retrouvable avec le filtre « Écarté ».')} disabled={!!occupe || migrationManquante} style={{ ...bouton, ...(migrationManquante ? eteint : {}) }}>Écarter cette piste</button>
                <button onClick={() => setVolet('')} style={bouton}>Annuler</button>
              </div>
            </div>
          )}

          {fiche.historique?.length > 0 && (
            <div style={{ marginTop: 14, borderTop: '1px solid #2a2a2a', paddingTop: 8 }}>
              <button onClick={() => setVolet(volet === 'historique' ? '' : 'historique')} style={{ ...bouton, padding: '4px 8px', fontSize: '0.75rem' }}>Historique ({fiche.historique.length})</button>
              {volet === 'historique' && (
                <ul style={{ margin: '8px 0 0', paddingLeft: 16, color: '#999', fontSize: '0.8rem' }}>
                  {[...fiche.historique].reverse().map((h, i) => (
                    <li key={i}>{fmtDateHeure(h.quand)} · {h.action}{h.commentaire ? ` : « ${h.commentaire} »` : ''}{h.reponse ? ` : « ${h.reponse} »` : ''}{h.motif ? ` (${MOTIFS_ECART[h.motif] || h.motif})` : ''}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
      <style>{`@media (max-width: 900px) { .hlm-colonnes { grid-template-columns: 1fr !important; } .hlm-colonnes > div:last-child { position: static !important; } }`}</style>
    </div>
  );
}

function Ligne({ k, children }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '96px 1fr', gap: 10, padding: '5px 0', borderTop: '1px solid #262626', fontSize: '0.86rem' }}>
      <div style={{ color: '#888', textTransform: 'uppercase', fontSize: '0.68rem', letterSpacing: '0.06em', paddingTop: 3 }}>{k}</div>
      <div style={{ color: '#d8d8d8', lineHeight: 1.45 }}>{children}</div>
    </div>
  );
}

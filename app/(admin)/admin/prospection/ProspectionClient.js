'use client';

import { useMemo, useState } from 'react';
import {
  STATUTS_PROSPECT, MOTIFS_ECART, SOURCES, SEUIL_ENVOIS, SEUIL_TAUX, DELAI_RELANCE_JOURS, TIRAGE_MAX,
  rendreEmail, validerTexte, urlSite, statsProspection, relanceDue,
} from '@/lib/prospection';

const TONS = {
  warning: { bg: '#3a2e14', fg: '#fbbf24' },
  info: { bg: '#12304a', fg: '#60a5fa' },
  success: { bg: '#13341f', fg: '#4ade80' },
  neutral: { bg: '#2a2a2a', fg: '#999' },
};
const fmt = (iso) => (iso ? new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' }) : '');

async function appeler(url, body, methode = 'PATCH') {
  const res = await fetch(url, { method: methode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Erreur ${res.status}`);
  return json;
}

export default function ProspectionClient({ prospects: initiaux, emails: initEmails, compteurs: initCompteurs, migrationManquante }) {
  const [prospects, setProspects] = useState(initiaux);
  const [emails, setEmails] = useState(initEmails);
  const [compteurs, setCompteurs] = useState(initCompteurs);
  const [occupe, setOccupe] = useState('');
  const [message, setMessage] = useState('');
  const [nbTirage, setNbTirage] = useState(5);
  const [ajout, setAjout] = useState({ nom: '', email: '', ville: '', site: '', source: 'site' });
  const [voirEcartees, setVoirEcartees] = useState(false);

  const emailsPar = useMemo(() => {
    const m = {};
    for (const e of emails) (m[e.prospect_id] ||= []).push(e);
    return m;
  }, [emails]);

  const aRediger = prospects.filter((p) => p.statut === 'en_cours');
  const programmes = emails.filter((e) => e.statut === 'programme').map((e) => ({ email: e, prospect: prospects.find((p) => p.id === e.prospect_id) })).filter((x) => x.prospect);
  const contactees = prospects.filter((p) => p.statut === 'contactee');
  const relancesARediger = contactees.filter((p) => (emailsPar[p.id] || []).some((e) => e.relance && e.statut === 'brouillon'));
  const repondus = prospects.filter((p) => p.statut === 'repondu');
  const ecartees = prospects.filter((p) => p.statut === 'ecartee');
  const stats = statsProspection({ envoyes: compteurs.envoyes || 0, repondus: compteurs.repondus || 0 });

  const majProspect = (p) => setProspects((prev) => prev.some((x) => x.id === p.id) ? prev.map((x) => (x.id === p.id ? p : x)) : [p, ...prev]);
  const majEmail = (e) => setEmails((prev) => prev.some((x) => x.id === e.id) ? prev.map((x) => (x.id === e.id ? e : x)) : [...prev, e]);
  const retirerBrouillons = (prospectId) => setEmails((prev) => prev.filter((e) => !(e.prospect_id === prospectId && e.statut === 'brouillon')));

  const agir = async (cle, fn) => {
    setOccupe(cle); setMessage('');
    try { await fn(); } catch (e) { setMessage(`💥 ${e.message}`); } finally { setOccupe(''); }
  };

  const tirer = () => agir('tirage', async () => {
    const r = await appeler('/api/admin/prospection/tirage', { n: Number(nbTirage) }, 'POST');
    for (const { prospect, email } of r.tires) { majProspect(prospect); majEmail(email); }
    setCompteurs((c) => ({ ...c, a_contacter: r.restants }));
    setMessage(r.tires.length ? `${r.tires.length} prof${r.tires.length > 1 ? 's' : ''} à rédiger. Va lire chaque site avant d'écrire.` : 'La pile est vide.');
  });

  const ajouter = () => agir('ajout', async () => {
    const r = await appeler('/api/admin/prospection/ajouter', ajout, 'POST');
    majProspect(r.prospect); majEmail(r.email);
    setAjout({ nom: '', email: '', ville: '', site: '', source: 'site' });
    setMessage(r.reprise ? 'Elle était dans la pile : brouillon prêt.' : 'Fiche créée, brouillon prêt.');
  });

  const actionProspect = (p, body) => agir(`p-${p.id}`, async () => {
    const r = await appeler(`/api/admin/prospection/prospects/${p.id}`, body);
    if (r.prospect) majProspect(r.prospect);
    if (r.email) majEmail(r.email);
    if (body.action === 'ecarter' || body.action === 'remettre') retirerBrouillons(p.id);
    if (body.action === 'remettre') setCompteurs((c) => ({ ...c, a_contacter: (c.a_contacter || 0) + 1 }));
    if (body.action === 'ecarter') setCompteurs((c) => ({ ...c, ecartee: (c.ecartee || 0) + 1 }));
    if (body.action === 'repondu') setCompteurs((c) => ({ ...c, repondus: (c.repondus || 0) + 1 }));
    if (body.action === 'non_repondu') setCompteurs((c) => ({ ...c, repondus: Math.max(0, (c.repondus || 0) - 1) }));
  });

  const actionEmail = (email, body) => agir(`e-${email.id}`, async () => {
    const r = await appeler(`/api/admin/prospection/emails/${email.id}`, body);
    majEmail(r.email);
    const prospect = prospects.find((p) => p.id === email.prospect_id);
    if (!prospect) return;
    // Le serveur a déjà déplacé la prof : on reflète sans recharger.
    if (body.action === 'envoyer') {
      if (prospect.statut !== 'contactee' && prospect.statut !== 'repondu') {
        majProspect({ ...prospect, statut: 'contactee' });
        setCompteurs((c) => ({ ...c, envoyes: (c.envoyes || 0) + 1 }));
      }
      setMessage(r.programme ? `Programmé pour ${prospect.nom}.` : `Envoyé à ${prospect.nom}.`);
    }
    if (body.action === 'annuler') {
      const autres = emails.some((e) => e.prospect_id === prospect.id && e.id !== email.id && ['programme', 'envoye'].includes(e.statut));
      if (!autres) {
        majProspect({ ...prospect, statut: 'en_cours' });
        setCompteurs((c) => ({ ...c, envoyes: Math.max(0, (c.envoyes || 0) - 1) }));
      }
      setMessage(`Envoi annulé pour ${prospect.nom}, l'email est revenu en brouillon.`);
    }
  });

  return (
    <div>
      <h1 style={{ margin: '0 0 6px' }}>✉️ Prospection</h1>
      <p style={{ color: '#999', fontSize: '0.9rem', margin: '0 0 18px' }}>
        Quelques emails par jour, chacun écrit pour une personne après avoir lu son site, signés Maude depuis bonjour@izisolo.fr.
        Un seul lien (izisolo.fr/creer-mon-studio), une relance au plus, jamais de troisième. Les réponses arrivent sur bonjour@izisolo.fr.
      </p>

      {migrationManquante && (
        <div style={bandeau}>Migration <code>v109</code> pas encore appliquée : rien n&apos;est enregistré ici. Les outils en ligne de commande restent utilisables en attendant.</div>
      )}
      {message && <div style={{ ...bandeau, background: message.startsWith('💥') ? '#4a1414' : '#13341f', color: message.startsWith('💥') ? '#f87171' : '#4ade80' }}>{message}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 18 }}>
        <Stat label="Dans la pile" valeur={compteurs.a_contacter || 0} />
        <Stat label="À rédiger" valeur={aRediger.length} ton="warning" />
        <Stat label="Programmés" valeur={programmes.length} ton="info" />
        <Stat label="Envoyés" valeur={stats.envoyes} sub={`objectif ${SEUIL_ENVOIS}, reste ${stats.restants}`} />
        <Stat label="Réponses" valeur={stats.repondus} sub={stats.envoyes ? `${Math.round(stats.taux * 100)} %` : ''} ton="success" />
      </div>
      {stats.changerAngle && (
        <div style={{ ...bandeau, background: '#4a1414', color: '#f87171' }}>
          {SEUIL_ENVOIS} emails envoyés et moins de {Math.round(SEUIL_TAUX * 100)} % de réponses : on change l&apos;angle avant de continuer.
        </div>
      )}

      <div style={{ ...carte, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <div style={etiquette}>Le tirage du jour</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="number" min={1} max={TIRAGE_MAX} value={nbTirage} onChange={(e) => setNbTirage(e.target.value)} style={{ ...champ, width: 64 }} aria-label="Nombre de profs à tirer" />
            <button onClick={tirer} disabled={!!occupe || migrationManquante} style={{ ...bouton, background: '#b87333', color: '#fff' }}>🎲 Tirer des profs de la pile</button>
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 280 }}>
          <div style={etiquette}>Ou une prof trouvée à la main</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <input placeholder="Nom" value={ajout.nom} onChange={(e) => setAjout({ ...ajout, nom: e.target.value })} style={{ ...champ, width: 150 }} />
            <input placeholder="email" value={ajout.email} onChange={(e) => setAjout({ ...ajout, email: e.target.value })} style={{ ...champ, width: 200 }} />
            <input placeholder="Ville" value={ajout.ville} onChange={(e) => setAjout({ ...ajout, ville: e.target.value })} style={{ ...champ, width: 120 }} />
            <input placeholder="Site" value={ajout.site} onChange={(e) => setAjout({ ...ajout, site: e.target.value })} style={{ ...champ, width: 200 }} />
            <select value={ajout.source} onChange={(e) => setAjout({ ...ajout, source: e.target.value })} style={champ} aria-label="D'où vient l'adresse">
              {Object.keys(SOURCES).map((k) => <option key={k} value={k}>{k === 'site' ? 'son site' : k}</option>)}
            </select>
            <button onClick={ajouter} disabled={!!occupe || migrationManquante || !ajout.nom || !ajout.email} style={bouton}>＋ Ajouter</button>
          </div>
        </div>
      </div>

      <Section titre={`À rédiger (${aRediger.length})`} vide="Rien à rédiger. Tire des profs de la pile.">
        {aRediger.map((p) => {
          const brouillon = (emailsPar[p.id] || []).find((e) => e.statut === 'brouillon');
          return brouillon
            ? <CarteRedaction key={p.id} prospect={p} email={brouillon} occupe={occupe} onEmail={actionEmail} onProspect={actionProspect} />
            : <CarteProspect key={p.id} prospect={p} occupe={occupe} onProspect={actionProspect} />;
        })}
      </Section>

      <Section titre={`Programmés (${programmes.length})`} vide="Aucun envoi en attente.">
        {programmes.map(({ email, prospect }) => (
          <div key={email.id} style={carte}>
            <Entete prospect={prospect} extra={`part ${fmt(email.programme_at)}`} />
            <div style={{ color: '#ddd', fontSize: '0.9rem', margin: '6px 0' }}><strong>{email.objet}</strong></div>
            <button onClick={() => actionEmail(email, { action: 'annuler' }, () => majProspect({ ...prospect, statut: 'en_cours' }))} disabled={!!occupe} style={bouton}>✋ Annuler l&apos;envoi</button>
          </div>
        ))}
      </Section>

      {relancesARediger.length > 0 && (
        <Section titre={`Relances à rédiger (${relancesARediger.length})`}>
          {relancesARediger.map((p) => {
            const brouillon = (emailsPar[p.id] || []).find((e) => e.relance && e.statut === 'brouillon');
            return <CarteRedaction key={p.id} prospect={p} email={brouillon} occupe={occupe} onEmail={actionEmail} onProspect={actionProspect} relance />;
          })}
        </Section>
      )}

      <Section titre={`Contactées, sans réponse (${contactees.length})`} vide="Personne n'attend de réponse.">
        {contactees.map((p) => {
          const envoyes = (emailsPar[p.id] || []).filter((e) => e.statut === 'envoye');
          const premier = envoyes.find((e) => !e.relance) || envoyes[0];
          const due = relanceDue({ envoye_at: premier?.envoye_at, dejaRelancee: (emailsPar[p.id] || []).some((e) => e.relance) });
          return (
            <div key={p.id} style={carte}>
              <Entete prospect={p} extra={premier ? `envoyé ${fmt(premier.envoye_at)}${envoyes.length > 1 ? ' · relancée' : ''}` : ''} />
              <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                <button onClick={() => actionProspect(p, { action: 'repondu' })} disabled={!!occupe} style={{ ...bouton, background: '#13341f', color: '#4ade80' }}>💬 A répondu</button>
                {due && <button onClick={() => actionProspect(p, { action: 'relance' })} disabled={!!occupe} style={bouton}>↻ Préparer la relance</button>}
                {!due && envoyes.length === 1 && <span style={{ color: '#777', fontSize: '0.8rem', alignSelf: 'center' }}>relance possible {DELAI_RELANCE_JOURS} jours après l&apos;envoi</span>}
                <Ecarter prospect={p} occupe={occupe} onProspect={actionProspect} />
              </div>
            </div>
          );
        })}
      </Section>

      <Section titre={`Ont répondu (${repondus.length})`} vide="Pas encore de réponse.">
        {repondus.map((p) => (
          <div key={p.id} style={carte}>
            <Entete prospect={p} extra={`réponse ${fmt(p.repondu_at)}`} />
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button onClick={() => actionProspect(p, { action: 'non_repondu' })} disabled={!!occupe} style={bouton}>Erreur, pas de réponse</button>
            </div>
          </div>
        ))}
      </Section>

      <div style={{ marginTop: 22 }}>
        <button onClick={() => setVoirEcartees((v) => !v)} style={bouton}>{voirEcartees ? 'Masquer' : 'Voir'} les écartées ({compteurs.ecartee || 0})</button>
        {voirEcartees && ecartees.map((p) => (
          <div key={p.id} style={{ ...carte, marginTop: 10 }}>
            <Entete prospect={p} extra={MOTIFS_ECART[p.motif_ecart] || p.motif_ecart || ''} />
          </div>
        ))}
      </div>
    </div>
  );
}

function CarteRedaction({ prospect, email, occupe, onEmail, onProspect, relance = false }) {
  const [objet, setObjet] = useState(email.objet);
  const [corps, setCorps] = useState(email.corps);
  const [heure, setHeure] = useState('');
  const [apercu, setApercu] = useState(false);
  const validation = validerTexte({ objet, corps });
  const modifie = objet !== email.objet || corps !== email.corps;
  const cle = `e-${email.id}`;
  let rendu = null;
  try { rendu = apercu ? rendreEmail({ to: prospect.email, source: prospect.source, objet, corps }) : null; } catch { rendu = null; }

  const enregistrer = () => onEmail(email, { action: 'enregistrer', objet, corps });
  const envoyer = async (a) => {
    // On enregistre d'abord ce qui est à l'écran : l'envoi lit la base.
    if (modifie) await onEmail(email, { action: 'enregistrer', objet, corps });
    await onEmail(email, a ? { action: 'envoyer', a } : { action: 'envoyer' });
  };

  return (
    <div style={{ ...carte, borderColor: relance ? '#3a2e14' : '#2e2e2e' }}>
      <Entete prospect={prospect} extra={relance ? 'relance' : ''} />
      {prospect.notes && <div style={{ color: '#aaa', fontSize: '0.85rem', margin: '4px 0 8px', whiteSpace: 'pre-wrap' }}>{prospect.notes}</div>}
      <input value={objet} onChange={(e) => setObjet(e.target.value)} placeholder="Objet" style={{ ...champ, width: '100%', marginTop: 8 }} aria-label="Objet" />
      <textarea value={corps} onChange={(e) => setCorps(e.target.value)} rows={12} style={{ ...champ, width: '100%', marginTop: 6, fontFamily: 'inherit', lineHeight: 1.5, resize: 'vertical' }} aria-label="Corps de l'email" />
      {!validation.ok && (
        <ul style={{ color: '#fbbf24', fontSize: '0.82rem', margin: '6px 0 0', paddingLeft: 18 }}>
          {validation.erreurs.map((er) => <li key={er}>{er}</li>)}
        </ul>
      )}
      <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <button onClick={enregistrer} disabled={!!occupe || !modifie} style={bouton}>💾 Enregistrer</button>
        <button onClick={() => setApercu((v) => !v)} style={bouton}>{apercu ? 'Fermer l’aperçu' : '👁 Aperçu'}</button>
        {/* Un bouton désactivé qui garde sa couleur pleine ment : on l'éteint. */}
        <button onClick={() => envoyer(null)} disabled={!!occupe || !validation.ok} style={{ ...bouton, background: '#b87333', color: '#fff', ...(validation.ok ? {} : eteint) }}>📨 Envoyer maintenant</button>
        <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
          <input type="time" value={heure} onChange={(e) => setHeure(e.target.value)} style={champ} aria-label="Heure d'envoi (Paris)" />
          <button onClick={() => envoyer(heure)} disabled={!!occupe || !validation.ok || !heure} style={{ ...bouton, ...(validation.ok && heure ? {} : eteint) }}>⏰ Programmer à cette heure</button>
        </span>
        <span style={{ flex: 1 }} />
        {!relance && <button onClick={() => onProspect(prospect, { action: 'remettre' })} disabled={!!occupe} style={bouton}>↩ Remettre dans la pile</button>}
        <Ecarter prospect={prospect} occupe={occupe} onProspect={onProspect} />
      </div>
      {occupe === cle && <div style={{ color: '#999', fontSize: '0.8rem', marginTop: 6 }}>Un instant…</div>}
      {apercu && rendu && (
        <div style={{ marginTop: 12, background: '#fbf7f1', color: '#2c2118', borderRadius: 10, padding: '14px 16px', fontFamily: 'Georgia, serif', fontSize: '0.95rem', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
          <div style={{ color: '#7a6a5c', fontSize: '0.8rem', marginBottom: 8 }}>De : Maude Pontet, IziSolo · À : {prospect.email} · Objet : {rendu.sujet}</div>
          {rendu.text}
        </div>
      )}
    </div>
  );
}

function CarteProspect({ prospect, occupe, onProspect }) {
  return (
    <div style={carte}>
      <Entete prospect={prospect} extra="sans brouillon" />
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <button onClick={() => onProspect(prospect, { action: 'remettre' })} disabled={!!occupe} style={bouton}>↩ Remettre dans la pile</button>
        <Ecarter prospect={prospect} occupe={occupe} onProspect={onProspect} />
      </div>
    </div>
  );
}

function Ecarter({ prospect, occupe, onProspect }) {
  return (
    <select
      value=""
      onChange={(e) => { if (e.target.value) onProspect(prospect, { action: 'ecarter', motif: e.target.value }); }}
      disabled={!!occupe}
      style={{ ...champ, color: '#f87171' }}
      aria-label="Écarter cette prof"
    >
      <option value="">🗑 Écarter…</option>
      {Object.entries(MOTIFS_ECART).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
    </select>
  );
}

function Entete({ prospect: p, extra }) {
  const ton = TONS[STATUTS_PROSPECT[p.statut]?.ton] || TONS.neutral;
  const site = urlSite(p.site);
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'baseline' }}>
        <div>
          <strong style={{ fontSize: '1.05rem' }}>{p.nom}</strong>
          {p.ville && <span style={{ color: '#999' }}> · {p.ville}</span>}
          {p.specialite && p.specialite !== 'Yoga' && <span style={{ color: '#999' }}> · {p.specialite}</span>}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {extra && <span style={{ color: '#aaa', fontSize: '0.8rem' }}>{extra}</span>}
          <span style={{ ...badge, background: ton.bg, color: ton.fg }}>{STATUTS_PROSPECT[p.statut]?.label || p.statut}</span>
        </div>
      </div>
      <div style={{ color: '#aaa', fontSize: '0.85rem', marginTop: 4 }}>
        <a href={`mailto:${p.email}`} style={lien}>{p.email}</a>
        {site && <> · <a href={site} target="_blank" rel="noopener noreferrer" style={lien}>{site.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}</a></>}
        {!site && p.site && <> · <span title="Adresse non cliquable">{p.site}</span></>}
        <span> · source : {p.source}</span>
      </div>
    </div>
  );
}

function Section({ titre, vide, children }) {
  const contenu = Array.isArray(children) ? children.filter(Boolean) : (children ? [children] : []);
  return (
    <section style={{ marginTop: 22 }}>
      <h2 style={{ fontSize: '1rem', color: '#ccc', margin: '0 0 10px' }}>{titre}</h2>
      {contenu.length ? contenu : (vide && <p style={{ color: '#666', fontSize: '0.9rem' }}>{vide}</p>)}
    </section>
  );
}

function Stat({ label, valeur, sub, ton }) {
  const t = ton ? TONS[ton] : null;
  return (
    <div style={{ ...carte, marginBottom: 0, padding: '12px 14px' }}>
      <div style={{ color: '#888', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: t ? t.fg : '#eee' }}>{valeur}</div>
      {sub && <div style={{ color: '#777', fontSize: '0.75rem' }}>{sub}</div>}
    </div>
  );
}

const carte = { background: '#1c1c1c', border: '1px solid #2e2e2e', borderRadius: 12, padding: '16px 18px', marginBottom: 14 };
const bandeau = { background: '#3a2e14', color: '#fbbf24', padding: '12px 16px', borderRadius: 10, marginBottom: 18, fontSize: '0.9rem' };
const badge = { borderRadius: 999, padding: '2px 10px', fontSize: '0.72rem', fontWeight: 700 };
const bouton = { background: '#262626', border: '1px solid #3a3a3a', color: '#ddd', borderRadius: 8, padding: '7px 12px', fontSize: '0.82rem', cursor: 'pointer' };
const eteint = { opacity: 0.4, cursor: 'not-allowed' };
const champ = { background: '#141414', border: '1px solid #3a3a3a', color: '#eee', borderRadius: 8, padding: '7px 10px', fontSize: '0.85rem' };
const etiquette = { color: '#888', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 };
const lien = { color: '#60a5fa' };

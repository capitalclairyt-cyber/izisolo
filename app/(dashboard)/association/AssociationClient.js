'use client';

import { useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Landmark, BadgeCheck, FileText, Users, Plus, Trash2, Loader2, Check, Download, ExternalLink, Send, Printer, Pencil } from 'lucide-react';
import AideContextuelle from '@/components/AideContextuelle';
import { useToast } from '@/components/ui/ToastProvider';
import { FONCTIONS, CODES_FONCTION, FONCTIONS_BUREAU, labelFonction, TYPES_DOCUMENT, CODES_DOCUMENT, TYPES_A_VERSION, classerDocuments, TYPES_AG, DELAI_CONVOCATION_JOURS, joursAvant, quorum, adherentesAJour, saisonsProposees } from '@/lib/vie-asso';
import { labelIntervenante } from '@/lib/intervenante';
import { labelRole } from '@/lib/studio-membre';

const ONGLETS = [
  { id: 'bureau', label: 'Bureau', Icone: Landmark },
  { id: 'adhesions', label: 'Adhésions', Icone: BadgeCheck },
  { id: 'documents', label: 'Documents', Icone: FileText },
  { id: 'assemblees', label: 'Assemblées', Icone: Users },
];
const fmtJour = (d) => (d ? String(d).slice(0, 10).split('-').reverse().join('/') : '');
const fmtLong = (d) => (d ? new Date(`${String(d).slice(0, 10)}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '');

/**
 * L'écran Association (v113). Quatre volets, une question chacun : « qui est
 * au bureau ? », « qui est à jour d'adhésion ? », « où sont nos papiers ? »,
 * « quand est l'AG, qui vient, le quorum est-il là ? ». L'écran affiche, les
 * routes décident.
 */
export default function AssociationClient({ studioNom, rna, identifiantFacturation, aujourdhui, membresInit, clients, adhesionsInit, documentsInit, assembleesInit, indisponible, peutDocuments, peutArgent, peutEquipe }) {
  const sp = useSearchParams();
  const [onglet, setOnglet] = useState(() => (ONGLETS.some(o => o.id === sp.get('onglet')) ? sp.get('onglet') : 'bureau'));
  const [membres, setMembres] = useState(membresInit || []);
  const [adhesions, setAdhesions] = useState(adhesionsInit || []);
  const [documents, setDocuments] = useState(documentsInit || []);
  const [assemblees, setAssemblees] = useState(assembleesInit || []);
  const aJour = useMemo(() => adherentesAJour(adhesions, aujourdhui), [adhesions, aujourdhui]);

  return (
    <div className="cp-page as-page">
      <header className="cp-entete">
        <h1>Association <AideContextuelle ancre="association" titre="Tuto : la vie de ton association" /></h1>
        <p>{studioNom}{rna ? ` · RNA ${rna}` : ''} : le bureau, les adhésions, les documents et l&apos;assemblée générale.</p>
      </header>

      {indisponible && (
        <div className="cp-alerte" data-testid="association-indisponible">
          <strong>La vie de l&apos;association arrive très bientôt.</strong>
          <p>Cette mise à jour n&apos;est pas encore appliquée sur ta structure : les adhésions, les documents et les assemblées s&apos;afficheront dès qu&apos;elle le sera. Le bureau, lui, se règle déjà depuis Équipe.</p>
        </div>
      )}

      <div className="cp-onglets" role="tablist">
        {ONGLETS.map(({ id, label, Icone }) => (
          <button key={id} type="button" role="tab" aria-selected={onglet === id} className={`cp-onglet ${onglet === id ? 'actif' : ''}`} onClick={() => setOnglet(id)} data-testid={`association-onglet-${id}`}>
            <Icone size={15} /> {label}
            {id === 'adhesions' && aJour.size > 0 && <span className="cp-pastille">{aJour.size}</span>}
          </button>
        ))}
      </div>

      {onglet === 'bureau' && <Bureau membres={membres} setMembres={setMembres} peutEquipe={peutEquipe} />}
      {onglet === 'adhesions' && <Adhesions adhesions={adhesions} setAdhesions={setAdhesions} clients={clients} aJour={aJour} aujourdhui={aujourdhui} peutArgent={peutArgent} identifiantFacturation={identifiantFacturation} />}
      {onglet === 'documents' && <Documents documents={documents} setDocuments={setDocuments} assemblees={assemblees} membres={membres} peutDocuments={peutDocuments} />}
      {onglet === 'assemblees' && <Assemblees assemblees={assemblees} setAssemblees={setAssemblees} adhesions={adhesions} documents={documents} aujourdhui={aujourdhui} peutDocuments={peutDocuments} />}

      <style jsx global>{`
        .cp-page { max-width: 960px; }
        .cp-entete h1 { font-family: var(--font-fraunces, Georgia, serif); font-size: 1.8rem; margin: 0 0 4px; }
        .cp-entete p { margin: 0 0 18px; color: var(--text-soft, #7a6f6a); }
        .cp-alerte { padding: 14px 16px; border-radius: 14px; background: #fffbeb; border: 1px solid #fde68a; color: #92400e; margin-bottom: 16px; }
        .cp-alerte p { margin: 4px 0 0; font-size: .9rem; }
        .cp-onglets { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 18px; }
        .cp-onglet { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 999px; border: 1px solid rgba(0,0,0,.1); background: #fff; font: inherit; font-size: .88rem; cursor: pointer; color: inherit; }
        .cp-onglet.actif { background: var(--brand, #b87333); border-color: var(--brand, #b87333); color: #fff; }
        .cp-pastille { background: #fff; color: var(--brand, #b87333); border-radius: 999px; font-size: .7rem; padding: 1px 6px; font-weight: 700; }
        .cp-onglet:not(.actif) .cp-pastille { background: var(--brand, #b87333); color: #fff; }
        .cp-tuiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 10px; margin-bottom: 16px; }
        .cp-tuile { background: #fff; border: 1px solid rgba(0,0,0,.07); border-radius: 14px; padding: 12px 14px; }
        .cp-tuile-label { font-size: .76rem; color: var(--text-soft, #7a6f6a); }
        .cp-tuile-valeur { font-size: 1.25rem; font-weight: 700; }
        .cp-form { background: #fff; border: 1px solid rgba(0,0,0,.07); border-radius: 14px; padding: 16px; margin-bottom: 16px; }
        .cp-champs { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; }
        .cp-champs label { display: flex; flex-direction: column; gap: 4px; font-size: .78rem; color: var(--text-soft, #7a6f6a); }
        .cp-champs input, .cp-champs select, .cp-champs textarea { padding: 9px 11px; border-radius: 9px; border: 1px solid rgba(0,0,0,.13); font: inherit; font-size: .9rem; background: #fdfcfb; color: inherit; }
        .cp-champs .large { grid-column: 1 / -1; }
        .cp-actions { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-top: 12px; }
        .cp-liste { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
        .cp-ligne { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; padding: 11px 14px; border-radius: 12px; background: #fff; border: 1px solid rgba(0,0,0,.07); }
        .cp-ligne-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .cp-ligne-titre { font-weight: 600; font-size: .95rem; }
        .cp-ligne-meta { font-size: .78rem; color: var(--text-soft, #7a6f6a); display: flex; gap: 8px; flex-wrap: wrap; }
        .cp-badge { font-size: .68rem; padding: 2px 8px; border-radius: 999px; background: #f5f5f4; border: 1px solid rgba(0,0,0,.08); color: #57534e; }
        .cp-badge.ok { background: #ecfdf5; border-color: #a7f3d0; color: #047857; }
        .cp-badge.attention { background: #fffbeb; border-color: #fde68a; color: #92400e; }
        .cp-badge.bureau { background: #eef2ff; border-color: #c7d2fe; color: #3730a3; }
        .cp-boutons { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
        .cp-icone { background: none; border: none; cursor: pointer; color: var(--text-soft, #7a6f6a); padding: 6px; border-radius: 8px; }
        .cp-icone.danger { color: #b91c1c; }
        .cp-vide { padding: 24px; text-align: center; color: var(--text-soft, #7a6f6a); background: #fff; border: 1px dashed rgba(0,0,0,.12); border-radius: 14px; line-height: 1.5; }
        .cp-note { font-size: .8rem; color: var(--text-soft, #7a6f6a); line-height: 1.5; margin: 8px 0 0; }
        .cp-spin { animation: cp-rot 1s linear infinite; }
        @keyframes cp-rot { to { transform: rotate(360deg); } }
        .as-select-inline { padding: 6px 9px; border-radius: 8px; border: 1px solid rgba(0,0,0,.13); font: inherit; font-size: .82rem; background: #fff; color: inherit; }
        .as-lien { display: inline-flex; align-items: center; gap: 4px; font-size: .8rem; color: var(--brand, #b87333); text-decoration: underline; background: none; border: none; padding: 0; cursor: pointer; font-family: inherit; }
        .as-quorum { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; margin-top: 8px; font-size: .84rem; }
        .as-quorum input { width: 70px; padding: 6px 8px; border-radius: 8px; border: 1px solid rgba(0,0,0,.13); font: inherit; }
        .as-odj { white-space: pre-wrap; font-size: .82rem; color: var(--text-soft, #7a6f6a); margin: 4px 0 0; line-height: 1.5; }
      `}</style>
    </div>
  );
}

// ── 1. Le bureau ─────────────────────────────────────────────────────────────
function Bureau({ membres, setMembres, peutEquipe }) {
  const { toast } = useToast();
  const [envoi, setEnvoi] = useState(null);
  const bureau = membres.filter(m => FONCTIONS_BUREAU.includes(m.fonction));
  const autres = membres.filter(m => !FONCTIONS_BUREAU.includes(m.fonction));

  const poser = async (m, fonction) => {
    setEnvoi(m.id);
    try {
      const res = await fetch(`/api/equipe/${m.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fonction: fonction || null }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error || 'Modification impossible.'); return; }
      setMembres(prev => prev.map(x => (x.id === m.id ? { ...x, fonction: fonction || null } : x)));
      toast.success(fonction ? `${labelIntervenante(m)} : ${labelFonction(fonction)}.` : 'Fonction retirée.');
    } finally { setEnvoi(null); }
  };

  const Ligne = ({ m }) => (
    <li className="cp-ligne" data-testid="bureau-membre">
      <div className="cp-ligne-info">
        <span className="cp-ligne-titre">{labelIntervenante(m)}{m.role === 'proprietaire' ? ' (le compte de l\'association)' : ''}</span>
        <span className="cp-ligne-meta">
          <span className="cp-badge">{labelRole(m.role)}</span>
          {m.fonction && <span className="cp-badge bureau" data-testid="bureau-fonction">{labelFonction(m.fonction)}</span>}
          {m.statut === 'invite' && <span className="cp-badge attention">Invitation en attente</span>}
        </span>
      </div>
      {peutEquipe && m.role !== 'proprietaire' && (
        <div className="cp-boutons">
          {envoi === m.id ? <Loader2 size={14} className="cp-spin" /> : (
            <select className="as-select-inline" value={m.fonction || ''} onChange={e => poser(m, e.target.value)} aria-label="Fonction" data-testid="bureau-select-fonction">
              <option value="">Aucune fonction</option>
              {CODES_FONCTION.map(c => <option key={c} value={c}>{FONCTIONS[c].label}</option>)}
            </select>
          )}
        </div>
      )}
    </li>
  );

  return (
    <section data-testid="association-bureau">
      <p className="cp-note" style={{ margin: '0 0 12px' }}>
        Une fonction est une étiquette (équipe, PV, convocations) qui <strong>propose</strong> des droits à l&apos;invitation. Les droits appliqués sont ceux cochés dans <Link href="/equipe">Équipe</Link>, case par case. Changer la fonction ici ne change pas les droits.
      </p>
      {bureau.length === 0 ? (
        <div className="cp-vide">Aucune fonction du bureau posée pour l&apos;instant. Invite tes membres depuis <Link href="/equipe">Équipe</Link> en choisissant leur fonction (présidente, trésorière, secrétaire…), ou pose-la ci-dessous.</div>
      ) : (
        <ul className="cp-liste">{bureau.map(m => <Ligne key={m.id} m={m} />)}</ul>
      )}
      {autres.length > 0 && (
        <>
          <h3 style={{ fontSize: '.95rem', margin: '18px 0 8px' }}>Profs et bénévoles</h3>
          <ul className="cp-liste">{autres.map(m => <Ligne key={m.id} m={m} />)}</ul>
        </>
      )}
    </section>
  );
}

// ── 2. Les adhésions ─────────────────────────────────────────────────────────
function Adhesions({ adhesions, setAdhesions, clients, aJour, aujourdhui, peutArgent, identifiantFacturation }) {
  const { toast } = useToast();
  const saisons = saisonsProposees(aujourdhui);
  const [saison, setSaison] = useState(saisons[0]?.id || '');
  const parClient = useMemo(() => Object.fromEntries((clients || []).map(c => [c.id, c])), [clients]);
  const liste = adhesions.filter(a => !saison || a.saison === saison);
  const nomDe = (id) => { const c = parClient[id]; return c ? `${c.prenom || ''} ${c.nom || ''}`.trim() : 'Fiche archivée'; };
  const encaissee = liste.reduce((s, a) => s + (a.montant || 0), 0);

  const annuler = async (a) => {
    if (!confirm(`Annuler l'adhésion ${a.saison} de ${nomDe(a.client_id)} ?`)) return;
    const res = await fetch(`/api/adhesions/${a.id}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { toast.error(data.error || 'Annulation impossible.'); return; }
    setAdhesions(prev => prev.filter(x => x.id !== a.id));
    toast.success('Adhésion annulée.');
  };

  return (
    <section data-testid="association-adhesions">
      <div className="cp-tuiles">
        <div className="cp-tuile"><div className="cp-tuile-label">Adhérentes à jour aujourd&apos;hui</div><div className="cp-tuile-valeur" data-testid="adhesions-a-jour">{aJour.size}</div></div>
        <div className="cp-tuile"><div className="cp-tuile-label">Adhésions {saison}</div><div className="cp-tuile-valeur">{liste.length}</div></div>
        <div className="cp-tuile"><div className="cp-tuile-label">Cotisations {saison}</div><div className="cp-tuile-valeur">{encaissee.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} €</div></div>
      </div>
      <div className="cp-actions" style={{ marginTop: 0, marginBottom: 12 }}>
        <select className="as-select-inline" value={saison} onChange={e => setSaison(e.target.value)} data-testid="adhesions-saison">
          {saisons.map(s => <option key={s.id} value={s.id}>{s.label || s.id}</option>)}
          <option value="">Toutes les saisons</option>
        </select>
        <Link href="/clients?filtre=adherentes" className="as-lien">Voir la liste des adhérentes à jour <ExternalLink size={12} /></Link>
      </div>
      <p className="cp-note" style={{ margin: '0 0 12px' }}>
        Une adhésion s&apos;enregistre depuis la <strong>fiche</strong> de la personne (bloc « Adhésion » → « Enregistrer une adhésion »), après avoir créé une offre de type « Adhésion » (Offres → Créer). Elle ne donne droit à aucune séance et ne passe jamais par le tunnel des carnets.
        {!identifiantFacturation && <> Renseigne ton RNA ou SIRET dans Paramètres → Facturation pour que les reçus de cotisation portent un numéro.</>}
      </p>
      {liste.length === 0 ? (
        <div className="cp-vide">Aucune adhésion {saison ? `pour la saison ${saison}` : ''}.</div>
      ) : (
        <ul className="cp-liste">
          {liste.map(a => (
            <li key={a.id} className="cp-ligne" data-testid="adhesions-ligne">
              <div className="cp-ligne-info">
                <span className="cp-ligne-titre">{parClient[a.client_id] ? <Link href={`/clients/${a.client_id}`}>{nomDe(a.client_id)}</Link> : nomDe(a.client_id)}</span>
                <span className="cp-ligne-meta">
                  <span>{a.offre_nom} · {a.saison}</span>
                  <span>{fmtJour(a.date_debut)} → {fmtJour(a.date_fin)}</span>
                  <span>{a.montant > 0 ? `${a.montant} €` : 'offerte'}</span>
                  {aJour.has(a.client_id) && aJour.get(a.client_id).id === a.id && <span className="cp-badge ok">À jour</span>}
                </span>
              </div>
              <div className="cp-boutons">
                {a.paiement_id && <a className="as-lien" href={`/api/adhesions/${a.id}/recu`} target="_blank" rel="noopener"><Download size={12} /> Reçu</a>}
                {peutArgent && <button type="button" className="cp-icone danger" onClick={() => annuler(a)} title="Annuler l'adhésion"><Trash2 size={14} /></button>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ── 3. Les documents ─────────────────────────────────────────────────────────
function Documents({ documents, setDocuments, assemblees, membres, peutDocuments }) {
  const { toast } = useToast();
  const [ouvert, setOuvert] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [upload, setUpload] = useState(false);
  const fichier = useRef(null);
  const [form, setForm] = useState({ type: 'statuts', titre: '', url: '', date_document: '', assemblee_id: '', membre_id: '' });
  const maj = (p) => setForm(f => ({ ...f, ...p }));
  const { courants, historique } = classerDocuments(documents);

  const deposer = async (file) => {
    if (!file) return;
    setUpload(true);
    try {
      const fd = new FormData(); fd.append('file', file);
      const res = await fetch('/api/association/documents/upload', { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error || 'Téléversement impossible.'); return; }
      maj({ url: data.url, titre: form.titre || data.titre || '' });
      toast.success('Fichier déposé.');
    } finally { setUpload(false); }
  };

  const enregistrer = async () => {
    setEnvoi(true);
    try {
      const res = await fetch('/api/association/documents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, assemblee_id: form.assemblee_id || null, membre_id: form.membre_id || null, date_document: form.date_document || null }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error || 'Enregistrement impossible.'); return; }
      setDocuments(prev => [data.document, ...prev]);
      setOuvert(false);
      setForm({ type: 'statuts', titre: '', url: '', date_document: '', assemblee_id: '', membre_id: '' });
      toast.success('Document enregistré.');
    } finally { setEnvoi(false); }
  };

  const retirer = async (d) => {
    if (!confirm(`Retirer « ${d.titre} » ? Le fichier ne sera plus listé ici.`)) return;
    const res = await fetch(`/api/association/documents/${d.id}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { toast.error(data.error || 'Suppression impossible.'); return; }
    setDocuments(prev => prev.filter(x => x.id !== d.id));
    toast.success('Document retiré.');
  };

  const Ligne = ({ d, courant }) => (
    <li className="cp-ligne" data-testid="documents-ligne">
      <div className="cp-ligne-info">
        <span className="cp-ligne-titre">{d.titre}</span>
        <span className="cp-ligne-meta">
          <span className="cp-badge">{TYPES_DOCUMENT[d.type]?.label || d.type}</span>
          {courant && <span className="cp-badge ok">Version courante</span>}
          {d.date_document && <span>du {fmtJour(d.date_document)}</span>}
          <span>déposé le {fmtJour(d.created_at)}</span>
        </span>
      </div>
      <div className="cp-boutons">
        <a className="as-lien" href={d.url} target="_blank" rel="noopener"><ExternalLink size={12} /> Ouvrir</a>
        {peutDocuments && <button type="button" className="cp-icone danger" onClick={() => retirer(d)} title="Retirer"><Trash2 size={14} /></button>}
      </div>
    </li>
  );

  return (
    <section data-testid="association-documents">
      <p className="cp-note" style={{ margin: '0 0 12px' }}>
        Statuts, récépissé de préfecture, règlement intérieur, assurance, agrément, PV d&apos;assemblée, contrats. Toute l&apos;équipe peut les lire ; les déposer demande le droit « Gérer les documents ». Jamais publics, jamais visibles des élèves. Pas de signature électronique : un document signé se dépose scanné.
      </p>
      {peutDocuments && !ouvert && (
        <div className="cp-actions" style={{ marginTop: 0, marginBottom: 12 }}>
          <button type="button" className="izi-btn btn-sm izi-btn-primary" onClick={() => setOuvert(true)} data-testid="documents-ouvrir"><Plus size={14} /> Déposer un document</button>
        </div>
      )}
      {ouvert && (
        <div className="cp-form" data-testid="documents-form">
          <div className="cp-champs">
            <label>Type
              <select value={form.type} onChange={e => maj({ type: e.target.value })} data-testid="documents-type">
                {CODES_DOCUMENT.map(c => <option key={c} value={c}>{TYPES_DOCUMENT[c].label}</option>)}
              </select>
            </label>
            <label>Titre
              <input type="text" value={form.titre} onChange={e => maj({ titre: e.target.value })} placeholder={TYPES_DOCUMENT[form.type].label} data-testid="documents-titre" />
            </label>
            <label>Date du document
              <input type="date" value={form.date_document} onChange={e => maj({ date_document: e.target.value })} />
            </label>
            {form.type === 'pv_ag' && (
              <label>Assemblée
                <select value={form.assemblee_id} onChange={e => maj({ assemblee_id: e.target.value })}>
                  <option value="">Aucune</option>
                  {assemblees.map(ag => <option key={ag.id} value={ag.id}>{ag.titre} · {fmtJour(ag.date)}</option>)}
                </select>
              </label>
            )}
            {form.type === 'contrat' && (
              <label>Intervenante
                <select value={form.membre_id} onChange={e => maj({ membre_id: e.target.value })}>
                  <option value="">Aucune</option>
                  {membres.filter(m => m.role !== 'proprietaire').map(m => <option key={m.id} value={m.id}>{labelIntervenante(m)}</option>)}
                </select>
              </label>
            )}
            <label className="large">Fichier (PDF ou photo, 10 Mo max)
              <input ref={fichier} type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={e => deposer(e.target.files?.[0])} data-testid="documents-fichier" />
              {upload && <span><Loader2 size={12} className="cp-spin" /> Dépôt en cours…</span>}
              {form.url && <span style={{ color: '#047857' }}><Check size={12} /> Fichier déposé</span>}
            </label>
          </div>
          <p className="cp-note">{TYPES_DOCUMENT[form.type].aide}{TYPES_A_VERSION.includes(form.type) ? ' Le dernier déposé devient la version courante, les précédents restent dans l\'historique.' : ''}</p>
          <div className="cp-actions">
            <button type="button" className="izi-btn btn-sm izi-btn-primary" onClick={enregistrer} disabled={envoi || !form.url} data-testid="documents-enregistrer">{envoi ? <Loader2 size={14} className="cp-spin" /> : <Check size={14} />} Enregistrer</button>
            <button type="button" className="izi-btn btn-sm izi-btn-ghost" onClick={() => setOuvert(false)} disabled={envoi}>Annuler</button>
          </div>
        </div>
      )}
      {documents.length === 0 ? (
        <div className="cp-vide">Aucun document pour l&apos;instant.</div>
      ) : (
        <>
          {Object.keys(courants).length > 0 && (
            <>
              <h3 style={{ fontSize: '.95rem', margin: '4px 0 8px' }}>Versions courantes</h3>
              <ul className="cp-liste">{TYPES_A_VERSION.filter(t => courants[t]).map(t => <Ligne key={courants[t].id} d={courants[t]} courant />)}</ul>
            </>
          )}
          {historique.length > 0 && (
            <>
              <h3 style={{ fontSize: '.95rem', margin: '18px 0 8px' }}>Autres documents et historique</h3>
              <ul className="cp-liste">{historique.map(d => <Ligne key={d.id} d={d} />)}</ul>
            </>
          )}
        </>
      )}
    </section>
  );
}

// ── 4. Les assemblées ────────────────────────────────────────────────────────
function Assemblees({ assemblees, setAssemblees, adhesions, documents, aujourdhui, peutDocuments }) {
  const { toast } = useToast();
  const [ouvert, setOuvert] = useState(false);
  const [edite, setEdite] = useState(null);
  const [envoi, setEnvoi] = useState(null);
  const vide = { type: 'ordinaire', titre: '', date: '', heure: '', lieu: '', ordre_du_jour: '' };
  const [form, setForm] = useState(vide);
  const maj = (p) => setForm(f => ({ ...f, ...p }));
  const pvDe = (ag) => documents.find(d => d.id === ag.pv_document_id) || documents.find(d => d.type === 'pv_ag' && d.assemblee_id === ag.id);

  const ouvrirCreation = () => { setEdite(null); setForm(vide); setOuvert(true); };
  const ouvrirEdition = (ag) => { setEdite(ag.id); setForm({ type: ag.type, titre: ag.titre || '', date: ag.date || '', heure: ag.heure || '', lieu: ag.lieu || '', ordre_du_jour: ag.ordre_du_jour || '' }); setOuvert(true); };

  const enregistrer = async () => {
    setEnvoi('form');
    try {
      const res = await fetch(edite ? `/api/association/assemblees/${edite}` : '/api/association/assemblees', { method: edite ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, heure: form.heure || null, lieu: form.lieu || null, ordre_du_jour: form.ordre_du_jour || null }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error || 'Enregistrement impossible.'); return; }
      setAssemblees(prev => edite ? prev.map(x => (x.id === edite ? data.assemblee : x)) : [data.assemblee, ...prev]);
      setOuvert(false);
      toast.success(edite ? 'Assemblée modifiée.' : 'Assemblée créée.');
    } finally { setEnvoi(null); }
  };

  const convoquer = async (ag) => {
    const nb = adherentesAJour(adhesions, ag.date).size;
    const delai = joursAvant(ag.date, aujourdhui);
    const avert = delai < DELAI_CONVOCATION_JOURS ? `\n\nAttention : l'assemblée est dans ${delai} jour(s). La plupart des statuts demandent ${DELAI_CONVOCATION_JOURS} jours de délai : vérifie les tiens.` : '';
    if (!confirm(`Convoquer les ${nb} adhérente(s) à jour au ${fmtJour(ag.date)} par la messagerie (message dans leur espace + email) ?${avert}`)) return;
    setEnvoi(ag.id);
    try {
      const res = await fetch(`/api/association/assemblees/${ag.id}/convoquer`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error || 'La convocation n\'a pas pu partir.'); return; }
      setAssemblees(prev => prev.map(x => (x.id === ag.id ? { ...x, convocation_envoyee_at: new Date().toISOString(), convoques: data.convoques } : x)));
      toast.success(`Convocation envoyée à ${data.convoques} adhérente(s).`);
    } finally { setEnvoi(null); }
  };

  const tenir = async (ag, presentes, pouvoirs) => {
    setEnvoi(ag.id);
    try {
      const res = await fetch(`/api/association/assemblees/${ag.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ statut: 'tenue', presentes: Number(presentes) || 0, pouvoirs: Number(pouvoirs) || 0 }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error || 'Enregistrement impossible.'); return; }
      setAssemblees(prev => prev.map(x => (x.id === ag.id ? data.assemblee : x)));
      toast.success('Assemblée tenue : présentes et pouvoirs enregistrés.');
    } finally { setEnvoi(null); }
  };

  const supprimerOuAnnuler = async (ag) => {
    if (ag.convocation_envoyee_at) {
      if (!confirm(`Annuler « ${ag.titre} » du ${fmtJour(ag.date)} ? Les convoquées ne sont PAS prévenues automatiquement : écris-leur depuis la messagerie.`)) return;
      const res = await fetch(`/api/association/assemblees/${ag.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ statut: 'annulee' }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error || 'Annulation impossible.'); return; }
      setAssemblees(prev => prev.map(x => (x.id === ag.id ? data.assemblee : x)));
      toast.success('Assemblée annulée.');
      return;
    }
    if (!confirm(`Supprimer « ${ag.titre} » du ${fmtJour(ag.date)} ?`)) return;
    const res = await fetch(`/api/association/assemblees/${ag.id}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { toast.error(data.error || 'Suppression impossible.'); return; }
    setAssemblees(prev => prev.filter(x => x.id !== ag.id));
    toast.success('Assemblée supprimée.');
  };

  return (
    <section data-testid="association-assemblees">
      <p className="cp-note" style={{ margin: '0 0 12px' }}>
        Convocation par la messagerie aux adhérentes à jour au jour de l&apos;AG, feuille d&apos;émargement imprimable, quorum après la séance, PV déposé comme document. Le délai de convocation de tes statuts est rappelé, jamais imposé. Pas de vote électronique : il se fait en séance.
      </p>
      {peutDocuments && !ouvert && (
        <div className="cp-actions" style={{ marginTop: 0, marginBottom: 12 }}>
          <button type="button" className="izi-btn btn-sm izi-btn-primary" onClick={ouvrirCreation} data-testid="ag-ouvrir"><Plus size={14} /> Nouvelle assemblée</button>
        </div>
      )}
      {ouvert && (
        <div className="cp-form" data-testid="ag-form">
          <div className="cp-champs">
            <label>Type
              <select value={form.type} onChange={e => maj({ type: e.target.value })} data-testid="ag-type">
                {Object.entries(TYPES_AG).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
            <label>Titre (facultatif)
              <input type="text" value={form.titre} onChange={e => maj({ titre: e.target.value })} placeholder={TYPES_AG[form.type]} data-testid="ag-titre" />
            </label>
            <label>Date
              <input type="date" value={form.date} onChange={e => maj({ date: e.target.value })} data-testid="ag-date" />
            </label>
            <label>Heure
              <input type="time" value={form.heure} onChange={e => maj({ heure: e.target.value })} data-testid="ag-heure" />
            </label>
            <label className="large">Lieu
              <input type="text" value={form.lieu} onChange={e => maj({ lieu: e.target.value })} placeholder="Salle des fêtes, 12 rue…" data-testid="ag-lieu" />
            </label>
            <label className="large">Ordre du jour
              <textarea rows={5} value={form.ordre_du_jour} onChange={e => maj({ ordre_du_jour: e.target.value })} placeholder={'1. Rapport moral\n2. Rapport financier\n3. Renouvellement du bureau\n4. Questions diverses'} data-testid="ag-odj" />
            </label>
          </div>
          <div className="cp-actions">
            <button type="button" className="izi-btn btn-sm izi-btn-primary" onClick={enregistrer} disabled={envoi === 'form' || !form.date} data-testid="ag-enregistrer">{envoi === 'form' ? <Loader2 size={14} className="cp-spin" /> : <Check size={14} />} Enregistrer</button>
            <button type="button" className="izi-btn btn-sm izi-btn-ghost" onClick={() => setOuvert(false)} disabled={envoi === 'form'}>Annuler</button>
          </div>
        </div>
      )}
      {assemblees.length === 0 ? (
        <div className="cp-vide">Aucune assemblée pour l&apos;instant.</div>
      ) : (
        <ul className="cp-liste">
          {assemblees.map(ag => <CarteAG key={ag.id} ag={ag} adhesions={adhesions} pv={pvDe(ag)} aujourdhui={aujourdhui} peutDocuments={peutDocuments} envoi={envoi === ag.id} onConvoquer={() => convoquer(ag)} onTenir={(p, v) => tenir(ag, p, v)} onEditer={() => ouvrirEdition(ag)} onSupprimer={() => supprimerOuAnnuler(ag)} />)}
        </ul>
      )}
    </section>
  );
}

function CarteAG({ ag, adhesions, pv, aujourdhui, peutDocuments, envoi, onConvoquer, onTenir, onEditer, onSupprimer }) {
  const [presentes, setPresentes] = useState(ag.presentes ?? '');
  const [pouvoirs, setPouvoirs] = useState(ag.pouvoirs ?? '');
  const total = adherentesAJour(adhesions, ag.date).size;
  const q = quorum({ adherentesAJourAuJour: total, presentes: ag.presentes || 0, pouvoirs: ag.pouvoirs || 0 });
  const delai = joursAvant(ag.date, aujourdhui);
  const passee = ag.date < aujourdhui;
  return (
    <li className="cp-ligne" style={{ alignItems: 'flex-start' }} data-testid="ag-ligne" data-statut={ag.statut}>
      <div className="cp-ligne-info" style={{ flex: 1 }}>
        <span className="cp-ligne-titre">{ag.titre}</span>
        <span className="cp-ligne-meta">
          <span>{fmtLong(ag.date)}{ag.heure ? ` à ${ag.heure}` : ''}</span>
          {ag.lieu && <span>· {ag.lieu}</span>}
          {ag.statut === 'annulee' && <span className="cp-badge attention">Annulée</span>}
          {ag.statut === 'tenue' && <span className="cp-badge ok">Tenue</span>}
          {ag.statut === 'a_venir' && ag.convocation_envoyee_at && <span className="cp-badge ok" data-testid="ag-convoquee">Convoquée · {ag.convoques} adhérente(s)</span>}
          {ag.statut === 'a_venir' && !ag.convocation_envoyee_at && !passee && <span className="cp-badge attention">À convoquer{delai >= 0 ? ` · dans ${delai} j` : ''}</span>}
        </span>
        {ag.ordre_du_jour && <p className="as-odj">{ag.ordre_du_jour}</p>}
        <div className="as-quorum" data-testid="ag-quorum">
          <span><strong>{total}</strong> adhérente(s) à jour au jour de l&apos;AG</span>
          {ag.statut === 'tenue' ? (
            <span>· <strong>{ag.presentes || 0}</strong> présentes + <strong>{ag.pouvoirs || 0}</strong> pouvoirs = <strong data-testid="ag-quorum-pct">{q.pourcentage} %</strong> (à comparer à tes statuts)</span>
          ) : (peutDocuments && ag.statut !== 'annulee' && (
            <>
              <label>Présentes <input type="number" min="0" value={presentes} onChange={e => setPresentes(e.target.value)} data-testid="ag-presentes" /></label>
              <label>Pouvoirs <input type="number" min="0" value={pouvoirs} onChange={e => setPouvoirs(e.target.value)} data-testid="ag-pouvoirs" /></label>
              <button type="button" className="izi-btn btn-sm izi-btn-secondary" onClick={() => onTenir(presentes, pouvoirs)} disabled={envoi} data-testid="ag-tenir"><Check size={13} /> AG tenue</button>
            </>
          ))}
        </div>
        {pv && <span className="cp-ligne-meta" style={{ marginTop: 6 }}><a className="as-lien" href={pv.url} target="_blank" rel="noopener"><FileText size={12} /> PV : {pv.titre}</a></span>}
        {ag.statut === 'tenue' && !pv && <span className="cp-note">Dépose le PV signé dans Documents (type « PV d&apos;assemblée », rattaché à cette AG).</span>}
      </div>
      <div className="cp-boutons">
        <Link href={`/association/ag/${ag.id}/emargement`} className="izi-btn btn-sm izi-btn-ghost" target="_blank" data-testid="ag-emargement"><Printer size={13} /> Feuille d&apos;émargement</Link>
        {peutDocuments && ag.statut === 'a_venir' && !ag.convocation_envoyee_at && (
          <button type="button" className="izi-btn btn-sm izi-btn-primary" onClick={onConvoquer} disabled={envoi || total === 0} data-testid="ag-convoquer" title={total === 0 ? 'Aucune adhérente à jour à cette date' : ''}>{envoi ? <Loader2 size={13} className="cp-spin" /> : <Send size={13} />} Convoquer</button>
        )}
        {peutDocuments && ag.statut === 'a_venir' && <button type="button" className="cp-icone" onClick={onEditer} title="Modifier"><Pencil size={14} /></button>}
        {peutDocuments && ag.statut !== 'annulee' && <button type="button" className="cp-icone danger" onClick={onSupprimer} title={ag.convocation_envoyee_at ? 'Annuler' : 'Supprimer'}><Trash2 size={14} /></button>}
      </div>
    </li>
  );
}

'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Wallet, Receipt, FileText, Download, Plus, Trash2, Loader2, Check, Paperclip, ExternalLink, Pencil } from 'lucide-react';
import AideContextuelle from '@/components/AideContextuelle';
import { useToast } from '@/components/ui/ToastProvider';
import { CATEGORIES_DEPENSE, CODES_CATEGORIE, MODES_REGLEMENT_DEPENSE, totauxDepenses } from '@/lib/depenses';
import { derniersMois, labelMois, euros, resumeReleve, labelRemuneration } from '@/lib/remuneration';
import { STATUTS_PRESTATION } from '@/lib/prestations';

const ONGLETS = [
  { id: 'depenses', label: 'Dépenses', Icone: Wallet },
  { id: 'releves', label: 'Relevés', Icone: FileText },
  { id: 'prestations', label: 'Prestations', Icone: Receipt },
  { id: 'export', label: 'Export', Icone: Download },
];
const MODE_LABEL = { virement: 'Virement', cb: 'CB', especes: 'Espèces', cheque: 'Chèque', prelevement: 'Prélèvement' };
const fmtJour = (d) => (d ? String(d).slice(0, 10).split('-').reverse().join('/') : '');
const aujourdhui = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });

/**
 * L'écran Compta d'une structure (v112). Quatre volets, un par question :
 * « qu'est-ce que je dépense ? », « combien je dois à chaque intervenante
 * ce mois-ci ? », « où en sont leurs prestations ? », « donne-moi le fichier
 * de l'exercice ». Rien n'est calculé ici qui ne le soit aussi côté serveur :
 * l'écran affiche, les routes décident.
 */
export default function ComptaClient({ studioNom, typeStructure, exercice, exercices, depensesInit, membres, prestationsInit, indisponible, peutGerer }) {
  const sp = useSearchParams();
  const [onglet, setOnglet] = useState(() => (ONGLETS.some(o => o.id === sp.get('onglet')) ? sp.get('onglet') : 'depenses'));
  const [depenses, setDepenses] = useState(depensesInit || []);
  const [prestations, setPrestations] = useState(prestationsInit || []);

  return (
    <div className="cp-page">
      <header className="cp-entete">
        <h1>Compta <AideContextuelle ancre="compta" titre="Tuto : l'argent de ta structure" /></h1>
        <p>L&apos;argent de {studioNom} : dépenses, relevés d&apos;intervenantes, prestations, export d&apos;exercice.</p>
      </header>

      {indisponible && (
        <div className="cp-alerte" data-testid="compta-indisponible">
          <strong>La compta arrive très bientôt.</strong>
          <p>Cette mise à jour n&apos;est pas encore appliquée sur ta structure : les dépenses et les relevés s&apos;afficheront dès qu&apos;elle le sera.</p>
        </div>
      )}

      <div className="cp-onglets" role="tablist">
        {ONGLETS.map(({ id, label, Icone }) => (
          <button key={id} type="button" role="tab" aria-selected={onglet === id} className={`cp-onglet ${onglet === id ? 'actif' : ''}`} onClick={() => setOnglet(id)} data-testid={`compta-onglet-${id}`}>
            <Icone size={15} /> {label}
            {id === 'prestations' && prestations.some(p => p.statut === 'facturee') && <span className="cp-pastille">{prestations.filter(p => p.statut === 'facturee').length}</span>}
          </button>
        ))}
      </div>

      {onglet === 'depenses' && <Depenses depenses={depenses} setDepenses={setDepenses} membres={membres} exercice={exercice} peutGerer={peutGerer} />}
      {onglet === 'releves' && <Releves membres={membres} peutGerer={peutGerer} onValide={(p) => { setPrestations(prev => [p, ...prev]); setOnglet('prestations'); }} />}
      {onglet === 'prestations' && <Prestations prestations={prestations} setPrestations={setPrestations} setDepenses={setDepenses} peutGerer={peutGerer} />}
      {onglet === 'export' && <Export exercices={exercices} exerciceCourant={exercice} typeStructure={typeStructure} />}

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
        .cp-montant { font-weight: 700; white-space: nowrap; }
        .cp-badge { font-size: .68rem; padding: 2px 8px; border-radius: 999px; background: #f5f5f4; border: 1px solid rgba(0,0,0,.08); color: #57534e; }
        .cp-badge.a_regler, .cp-badge.emise { background: #fffbeb; border-color: #fde68a; color: #92400e; }
        .cp-badge.reglee { background: #ecfdf5; border-color: #a7f3d0; color: #047857; }
        .cp-badge.facturee { background: #eff6ff; border-color: #bfdbfe; color: #1d4ed8; }
        .cp-boutons { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
        .cp-icone { background: none; border: none; cursor: pointer; color: var(--text-soft, #7a6f6a); padding: 6px; border-radius: 8px; }
        .cp-icone.danger { color: #b91c1c; }
        .cp-vide { padding: 24px; text-align: center; color: var(--text-soft, #7a6f6a); background: #fff; border: 1px dashed rgba(0,0,0,.12); border-radius: 14px; }
        .cp-table { width: 100%; border-collapse: collapse; font-size: .88rem; background: #fff; border-radius: 12px; overflow: hidden; }
        .cp-table th, .cp-table td { padding: 8px 10px; text-align: left; border-bottom: 1px solid rgba(0,0,0,.06); }
        .cp-table th { font-size: .74rem; color: var(--text-soft, #7a6f6a); font-weight: 600; }
        .cp-table td.num, .cp-table th.num { text-align: right; }
        .cp-note { font-size: .8rem; color: var(--text-soft, #7a6f6a); line-height: 1.5; margin: 8px 0 0; }
        .cp-spin { animation: cp-rot 1s linear infinite; }
        @keyframes cp-rot { to { transform: rotate(360deg); } }
        .cp-scroll { overflow-x: auto; }
      `}</style>
    </div>
  );
}

// ── Dépenses ──────────────────────────────────────────────────────────────────
function Depenses({ depenses, setDepenses, membres, exercice, peutGerer }) {
  const { toast } = useToast();
  const vide = { libelle: '', date: aujourdhui(), montant_ttc: '', categorie: 'autre', fournisseur: '', montant_ht: '', tva_taux: '', statut: 'reglee', mode_reglement: 'virement', membre_id: '', justificatif_url: '', notes: '' };
  const [form, setForm] = useState(vide);
  const [ouvert, setOuvert] = useState(false);
  const [edite, setEdite] = useState(null);
  const [envoi, setEnvoi] = useState(false);
  const [upload, setUpload] = useState(false);
  const maj = (patch) => setForm(f => ({ ...f, ...patch }));
  const totaux = useMemo(() => totauxDepenses(depenses), [depenses]);

  const ouvrirEdition = (d) => {
    setEdite(d.id);
    setForm({ ...vide, ...Object.fromEntries(Object.entries(d).map(([k, v]) => [k, v ?? ''])) });
    setOuvert(true);
  };

  const enregistrer = async () => {
    setEnvoi(true);
    try {
      const res = await fetch(edite ? `/api/depenses/${edite}` : '/api/depenses', {
        method: edite ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, membre_id: form.membre_id || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error || 'Enregistrement impossible.'); return; }
      setDepenses(prev => edite ? prev.map(d => (d.id === edite ? data.depense : d)) : [data.depense, ...prev]);
      setForm(vide); setOuvert(false); setEdite(null);
      toast.success(edite ? 'Dépense modifiée.' : 'Dépense enregistrée.');
    } catch { toast.error('Enregistrement impossible, réessaie.'); }
    finally { setEnvoi(false); }
  };

  const supprimer = async (d) => {
    if (!confirm(`Supprimer « ${d.libelle} » (${euros(d.montant_ttc)}) ?`)) return;
    const res = await fetch(`/api/depenses/${d.id}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { toast.error(data.error || 'Suppression impossible.'); return; }
    setDepenses(prev => prev.filter(x => x.id !== d.id));
    toast.success('Dépense supprimée.');
  };

  const deposer = async (file) => {
    if (!file) return;
    setUpload(true);
    try {
      const fd = new FormData(); fd.append('file', file);
      const res = await fetch('/api/depenses/justificatif', { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error || 'Téléversement impossible.'); return; }
      maj({ justificatif_url: data.url });
      toast.success('Justificatif joint.');
    } finally { setUpload(false); }
  };

  return (
    <section data-testid="compta-depenses">
      <div className="cp-tuiles">
        <div className="cp-tuile"><div className="cp-tuile-label">{exercice.label} · dépenses</div><div className="cp-tuile-valeur" data-testid="compta-total-depenses">{euros(totaux.ttc)}</div></div>
        <div className="cp-tuile"><div className="cp-tuile-label">À régler</div><div className="cp-tuile-valeur">{euros(totaux.a_regler)}</div></div>
        <div className="cp-tuile"><div className="cp-tuile-label">Réglées</div><div className="cp-tuile-valeur">{euros(totaux.reglees)}</div></div>
      </div>

      {peutGerer && !ouvert && (
        <div className="cp-actions" style={{ marginBottom: 14, marginTop: 0 }}>
          <button type="button" className="izi-btn btn-sm izi-btn-primary" onClick={() => { setForm(vide); setEdite(null); setOuvert(true); }} data-testid="compta-ajouter-depense">
            <Plus size={15} /> Ajouter une dépense
          </button>
        </div>
      )}

      {ouvert && (
        <div className="cp-form" data-testid="compta-form-depense">
          <div className="cp-champs">
            <label className="large">Quoi ? *<input value={form.libelle} maxLength={160} placeholder="Location salle, tapis, assurance…" onChange={e => maj({ libelle: e.target.value })} data-testid="dep-libelle" /></label>
            <label>Date *<input type="date" value={form.date} onChange={e => maj({ date: e.target.value })} /></label>
            <label>Montant TTC *<input type="text" inputMode="decimal" value={form.montant_ttc} placeholder="120" onChange={e => maj({ montant_ttc: e.target.value })} data-testid="dep-montant" /></label>
            <label>Catégorie<select value={form.categorie} onChange={e => maj({ categorie: e.target.value })}>{CODES_CATEGORIE.map(c => <option key={c} value={c}>{CATEGORIES_DEPENSE[c].emoji} {CATEGORIES_DEPENSE[c].label}</option>)}</select></label>
            <label>Fournisseur<input value={form.fournisseur} maxLength={120} onChange={e => maj({ fournisseur: e.target.value })} /></label>
            <label>Montant HT (facultatif)<input type="text" inputMode="decimal" value={form.montant_ht} onChange={e => maj({ montant_ht: e.target.value })} /></label>
            <label>TVA % (facultatif)<input type="text" inputMode="decimal" value={form.tva_taux} onChange={e => maj({ tva_taux: e.target.value })} /></label>
            <label>Statut<select value={form.statut} onChange={e => maj({ statut: e.target.value })}><option value="reglee">Réglée</option><option value="a_regler">À régler</option></select></label>
            {form.statut === 'reglee' && <label>Mode<select value={form.mode_reglement} onChange={e => maj({ mode_reglement: e.target.value })}>{MODES_REGLEMENT_DEPENSE.map(m => <option key={m} value={m}>{MODE_LABEL[m]}</option>)}</select></label>}
            {membres.length > 0 && <label>Intervenante (facultatif)<select value={form.membre_id} onChange={e => maj({ membre_id: e.target.value })}><option value="">Aucune</option>{membres.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}</select></label>}
            <label className="large">Justificatif
              <span style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <input type="file" accept="application/pdf,image/*" onChange={e => deposer(e.target.files?.[0])} disabled={upload} />
                {upload && <Loader2 size={14} className="cp-spin" />}
                {form.justificatif_url && <a href={form.justificatif_url} target="_blank" rel="noreferrer" className="cp-badge"><Paperclip size={11} /> joint</a>}
              </span>
            </label>
            <label className="large">Note<textarea rows={2} value={form.notes} maxLength={600} onChange={e => maj({ notes: e.target.value })} /></label>
          </div>
          <div className="cp-actions">
            <button type="button" className="izi-btn btn-sm izi-btn-primary" onClick={enregistrer} disabled={envoi} data-testid="dep-enregistrer">
              {envoi ? <Loader2 size={15} className="cp-spin" /> : <Check size={15} />} {edite ? 'Modifier' : 'Enregistrer'}
            </button>
            <button type="button" className="izi-btn btn-sm izi-btn-ghost" onClick={() => { setOuvert(false); setEdite(null); }}>Annuler</button>
          </div>
        </div>
      )}

      {depenses.length === 0 ? (
        <div className="cp-vide">Aucune dépense sur {exercice.label.toLowerCase()}. {peutGerer ? 'Ajoute la première : loyer de salle, assurance, matériel…' : ''}</div>
      ) : (
        <ul className="cp-liste" data-testid="compta-liste-depenses">
          {depenses.map(d => (
            <li key={d.id} className="cp-ligne">
              <div className="cp-ligne-info">
                <span className="cp-ligne-titre">{CATEGORIES_DEPENSE[d.categorie]?.emoji} {d.libelle}</span>
                <span className="cp-ligne-meta">
                  <span>{fmtJour(d.date)}</span>
                  <span>{CATEGORIES_DEPENSE[d.categorie]?.label || d.categorie}</span>
                  {d.fournisseur && <span>{d.fournisseur}</span>}
                  {d.membre_id && membres.find(m => m.id === d.membre_id) && <span>{membres.find(m => m.id === d.membre_id).label}</span>}
                  {d.justificatif_url && <a href={d.justificatif_url} target="_blank" rel="noreferrer"><Paperclip size={11} /> justificatif</a>}
                </span>
              </div>
              <div className="cp-boutons">
                <span className={`cp-badge ${d.statut}`}>{d.statut === 'a_regler' ? 'À régler' : `Réglée${d.date_reglement ? ` le ${fmtJour(d.date_reglement)}` : ''}`}</span>
                <span className="cp-montant">{euros(d.montant_ttc)}</span>
                {peutGerer && !d.prestation_id && (
                  <>
                    <button type="button" className="cp-icone" onClick={() => ouvrirEdition(d)} aria-label="Modifier"><Pencil size={15} /></button>
                    <button type="button" className="cp-icone danger" onClick={() => supprimer(d)} aria-label="Supprimer"><Trash2 size={15} /></button>
                  </>
                )}
                {d.prestation_id && <span className="cp-badge">relevé</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ── Relevés ───────────────────────────────────────────────────────────────────
function Releves({ membres, peutGerer, onValide }) {
  const { toast } = useToast();
  const mois = useMemo(() => derniersMois(6), []);
  const [membreId, setMembreId] = useState(membres[0]?.id || '');
  const [moisChoisi, setMoisChoisi] = useState(mois[1] || mois[0]);
  const [releve, setReleve] = useState(null);
  const [erreur, setErreur] = useState('');
  const [charge, setCharge] = useState(false);
  const [montant, setMontant] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const membre = membres.find(m => m.id === membreId);

  const charger = useCallback(async () => {
    if (!membreId) return;
    setCharge(true); setErreur(''); setReleve(null);
    try {
      const res = await fetch(`/api/equipe/${membreId}/releve?mois=${moisChoisi}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setErreur(data.error || 'Relevé indisponible.'); return; }
      setReleve(data.releve);
      setMontant(data.releve?.montant_du != null ? String(data.releve.montant_du) : '');
    } catch { setErreur('Relevé indisponible, réessaie.'); }
    finally { setCharge(false); }
  }, [membreId, moisChoisi]);

  useEffect(() => { charger(); }, [charger]);

  const valider = async () => {
    if (!releve) return;
    const m = montant === '' ? null : Number(String(montant).replace(',', '.'));
    if (!confirm(`Valider le relevé de ${membre?.label} pour ${labelMois(moisChoisi)}${m != null ? ` : ${euros(m)}` : ''} ?\n\nUne prestation est créée, la dépense passe « à régler », et ${membre?.label} reçoit le relevé par email.`)) return;
    setEnvoi(true);
    try {
      const res = await fetch(`/api/equipe/${membreId}/releve`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mois: moisChoisi, montant: m }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error || 'Validation impossible.'); return; }
      toast.success('Relevé validé : la prestation est créée.');
      onValide?.(data.prestation);
    } catch { toast.error('Validation impossible, réessaie.'); }
    finally { setEnvoi(false); }
  };

  if (!membres.length) {
    return <div className="cp-vide">Aucune intervenante dans l&apos;équipe. Invite tes profs depuis la page Équipe, puis désigne qui donne chaque séance : le relevé se calcule tout seul.</div>;
  }

  return (
    <section data-testid="compta-releves">
      <div className="cp-form">
        <div className="cp-champs">
          <label>Intervenante<select value={membreId} onChange={e => setMembreId(e.target.value)} data-testid="releve-membre">{membres.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}</select></label>
          <label>Mois<select value={moisChoisi} onChange={e => setMoisChoisi(e.target.value)} data-testid="releve-mois">{mois.map(m => <option key={m} value={m}>{labelMois(m)}</option>)}</select></label>
          <label>Rémunération convenue<span style={{ fontSize: '.9rem', color: 'inherit', padding: '9px 0' }}>{membre?.remuneration ? labelRemuneration(membre.remuneration) : 'Rien de convenu (à régler sur la page Équipe)'}</span></label>
        </div>
        <p className="cp-note">Le relevé compte les séances passées où {membre?.label || 'elle'} est désignée intervenante (« Qui donne cette séance ? »), leurs présentes pointées, et le chiffre d&apos;affaires rattaché : carnets décomptés au prorata, séances payées à l&apos;unité. Rien n&apos;est inventé : un abonnement illimité n&apos;a pas de prix par séance, et le relevé le dit.</p>
      </div>

      {charge && <p className="cp-note"><Loader2 size={14} className="cp-spin" /> Calcul du relevé…</p>}
      {erreur && <div className="cp-alerte">{erreur}</div>}
      {releve && (
        <div data-testid="releve-resultat">
          <div className="cp-tuiles">
            <div className="cp-tuile"><div className="cp-tuile-label">Séances</div><div className="cp-tuile-valeur" data-testid="releve-nb-seances">{releve.nb_seances}</div></div>
            <div className="cp-tuile"><div className="cp-tuile-label">Heures</div><div className="cp-tuile-valeur">{String(releve.heures).replace('.', ',')}</div></div>
            <div className="cp-tuile"><div className="cp-tuile-label">Présentes</div><div className="cp-tuile-valeur">{releve.nb_presentes}</div></div>
            <div className="cp-tuile"><div className="cp-tuile-label">CA rattaché{releve.ca_inconnu ? ' (plancher)' : ''}</div><div className="cp-tuile-valeur">{euros(releve.ca)}</div></div>
            <div className="cp-tuile"><div className="cp-tuile-label">Montant dû</div><div className="cp-tuile-valeur" data-testid="releve-montant-du">{releve.montant_du != null ? euros(releve.montant_du) : '—'}</div></div>
          </div>
          <div className="cp-scroll">
            <table className="cp-table">
              <thead><tr><th>Date</th><th>Séance</th><th className="num">Durée</th><th className="num">Présentes</th><th className="num">CA</th></tr></thead>
              <tbody>
                {releve.lignes.map(l => (
                  <tr key={l.id}><td>{fmtJour(l.date)}{l.heure ? ` ${l.heure}` : ''}</td><td>{l.nom}</td><td className="num">{l.duree_minutes} min</td><td className="num">{l.nb_presentes}</td><td className="num">{euros(l.ca)}{l.ca_inconnu ? ' *' : ''}</td></tr>
                ))}
                {releve.lignes.length === 0 && <tr><td colSpan={5} style={{ color: 'var(--text-soft, #7a6f6a)' }}>Aucune séance passée sur ce mois.</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="cp-actions">
            <a className="izi-btn btn-sm izi-btn-ghost" href={`/api/equipe/${membreId}/releve?mois=${moisChoisi}&format=pdf`} target="_blank" rel="noreferrer"><Download size={14} /> PDF</a>
            {peutGerer && (
              <>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '.85rem' }}>
                  Montant à valider <input type="text" inputMode="decimal" value={montant} onChange={e => setMontant(e.target.value)} style={{ width: 90, padding: '7px 9px', borderRadius: 8, border: '1px solid rgba(0,0,0,.13)', font: 'inherit' }} data-testid="releve-montant" /> €
                </label>
                <button type="button" className="izi-btn btn-sm izi-btn-primary" onClick={valider} disabled={envoi || (releve.nb_seances === 0 && !montant)} data-testid="releve-valider">
                  {envoi ? <Loader2 size={15} className="cp-spin" /> : <Check size={15} />} Valider le relevé
                </button>
              </>
            )}
          </div>
          <p className="cp-note">Valider fige ce relevé : une prestation naît, ta dépense « Séances de {membre?.label} » passe à régler, et {membre?.label} reçoit le PDF{membre?.a_un_compte ? ' avec « Facturer » dans son IziSolo' : ''}.</p>
        </div>
      )}
    </section>
  );
}

// ── Prestations ───────────────────────────────────────────────────────────────
function Prestations({ prestations, setPrestations, setDepenses, peutGerer }) {
  const { toast } = useToast();
  const [reglage, setReglage] = useState(null); // id en cours de règlement
  const [date, setDate] = useState(aujourdhui());
  const [mode, setMode] = useState('virement');
  const [envoi, setEnvoi] = useState(false);

  const regler = async (p) => {
    setEnvoi(true);
    try {
      const res = await fetch(`/api/prestations/${p.id}/regler`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date, mode }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error || 'Règlement impossible.'); return; }
      setPrestations(prev => prev.map(x => (x.id === p.id ? { ...x, statut: 'reglee', statut_label: STATUTS_PRESTATION.reglee.label, reglee_at: new Date().toISOString() } : x)));
      setDepenses(prev => prev.map(d => (d.prestation_id === p.id ? { ...d, statut: 'reglee', date_reglement: date, mode_reglement: mode } : d)));
      setReglage(null);
      toast.success(p.membre_a_un_compte ? "Réglée : l'encaissement est chez elle." : 'Réglée.');
    } finally { setEnvoi(false); }
  };

  const retirer = async (p) => {
    if (!confirm(`Retirer le relevé de ${p.membre_label} pour ${p.periode_label} ? La dépense « à régler » disparaît.`)) return;
    const res = await fetch(`/api/prestations/${p.id}/regler`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { toast.error(data.error || 'Retrait impossible.'); return; }
    setPrestations(prev => prev.filter(x => x.id !== p.id));
    setDepenses(prev => prev.filter(d => d.prestation_id !== p.id));
    toast.success('Relevé retiré.');
  };

  if (!prestations.length) return <div className="cp-vide">Aucune prestation. Valide le relevé d&apos;une intervenante (onglet Relevés) : elle apparaît ici, à facturer, facturée, puis réglée.</div>;

  return (
    <section data-testid="compta-prestations">
      <ul className="cp-liste">
        {prestations.map(p => (
          <li key={p.id} className="cp-ligne" data-testid="prestation-ligne" data-statut={p.statut}>
            <div className="cp-ligne-info">
              <span className="cp-ligne-titre">{p.membre_label || 'Intervenante'} · {p.periode_label}</span>
              <span className="cp-ligne-meta">
                <span>{resumeReleve(p.releve)}</span>
                {p.facture_numero && <a href={`/api/prestations/${p.id}/facture`} target="_blank" rel="noreferrer"><ExternalLink size={11} /> facture {p.facture_numero}</a>}
                {!p.membre_a_un_compte && <span>sans compte IziSolo : elle facture à sa façon</span>}
              </span>
            </div>
            <div className="cp-boutons">
              <span className={`cp-badge ${p.statut}`}>{p.statut_label}</span>
              <span className="cp-montant">{euros(p.montant)}</span>
              {peutGerer && p.statut !== 'reglee' && reglage !== p.id && (
                <button type="button" className="izi-btn btn-sm izi-btn-primary" onClick={() => setReglage(p.id)} data-testid="prestation-regler">Réglée</button>
              )}
              {peutGerer && p.statut === 'emise' && <button type="button" className="cp-icone danger" onClick={() => retirer(p)} aria-label="Retirer le relevé"><Trash2 size={15} /></button>}
            </div>
            {reglage === p.id && (
              <div className="cp-actions" style={{ flexBasis: '100%' }}>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ padding: '7px 9px', borderRadius: 8, border: '1px solid rgba(0,0,0,.13)', font: 'inherit' }} />
                <select value={mode} onChange={e => setMode(e.target.value)} style={{ padding: '7px 9px', borderRadius: 8, border: '1px solid rgba(0,0,0,.13)', font: 'inherit' }}>{MODES_REGLEMENT_DEPENSE.map(m => <option key={m} value={m}>{MODE_LABEL[m]}</option>)}</select>
                <button type="button" className="izi-btn btn-sm izi-btn-primary" onClick={() => regler(p)} disabled={envoi} data-testid="prestation-confirmer-reglement">{envoi ? <Loader2 size={14} className="cp-spin" /> : <Check size={14} />} Confirmer</button>
                <button type="button" className="izi-btn btn-sm izi-btn-ghost" onClick={() => setReglage(null)}>Annuler</button>
              </div>
            )}
          </li>
        ))}
      </ul>
      <p className="cp-note">« Réglée » solde la dépense chez toi ; si l&apos;intervenante a son IziSolo, l&apos;encaissement apparaît dans ses revenus et sa facture passe « payée ».</p>
    </section>
  );
}

// ── Export ────────────────────────────────────────────────────────────────────
function Export({ exercices, exerciceCourant, typeStructure }) {
  const [ex, setEx] = useState(exerciceCourant?.id || exercices[0]?.id);
  return (
    <section data-testid="compta-export">
      <div className="cp-form">
        <div className="cp-champs">
          <label>Exercice<select value={ex} onChange={e => setEx(e.target.value)} data-testid="export-exercice">{exercices.map(e => <option key={e.id} value={e.id}>{e.label} ({fmtJour(e.from)} au {fmtJour(e.to)})</option>)}</select></label>
        </div>
        <div className="cp-actions">
          <a className="izi-btn btn-sm izi-btn-primary" href={`/api/export/compta-csv?exercice=${encodeURIComponent(ex)}`} data-testid="export-telecharger"><Download size={14} /> Télécharger le CSV</a>
        </div>
        <p className="cp-note">
          Un seul fichier : les recettes encaissées (à la date d&apos;encaissement), les dépenses avec leur justificatif, le récapitulatif par catégorie et le résultat.
          {typeStructure === 'association' ? ' L\'exercice suit ta saison, de septembre à août : c\'est le rapport financier de ton assemblée générale.' : ' L\'exercice suit l\'année civile.'}
        </p>
      </div>
    </section>
  );
}


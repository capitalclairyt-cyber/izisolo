'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Upload, ArrowLeft, Check, Loader2, FileText, AlertCircle, PartyPopper, Send, Camera } from 'lucide-react';
// TARGETS et autoMap vivent dans la lib depuis le 2026-09-17 : la lecture
// d'une photo de liste fabrique des en-têtes qui doivent être reconnus ici,
// et ce contrat est verrouillé par `import-photo.spec.js`.
import { parseCSV, decodeCSVBuffer, TARGETS, autoMap } from '@/lib/csv-import';
import { resumeLecture } from '@/lib/import-photo';

export default function ImporterClientsPage() {
  const router = useRouter();
  const fileRef = useRef(null);
  const photoRef = useRef(null);
  const [step, setStep] = useState('upload'); // upload | map | done
  const [fileName, setFileName] = useState('');
  // Lecture d'une photo de liste (2026-09-17) : le résumé de ce qui a été lu,
  // affiché sur la carte de l'étape 2. Null quand on vient d'un CSV.
  const [lecture, setLecture] = useState(null);
  const [lisantPhoto, setLisantPhoto] = useState(false);
  const [rows, setRows] = useState([]);        // toutes les lignes du CSV
  const [headerRow, setHeaderRow] = useState(true);
  const [mapping, setMapping] = useState({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [report, setReport] = useState(null);
  // Invitation groupée post-import : null | { sent, errors, total, running }
  const [inviteState, setInviteState] = useState(null);

  const headers = rows[0] || [];
  const dataRows = headerRow ? rows.slice(1) : rows;

  const onFile = (file) => {
    if (!file) return;
    setError('');
    const reader = new FileReader();
    reader.onload = (e) => {
      // Octets bruts → décodage tolérant (UTF-8 / ANSI Excel / UTF-16) : forcer
      // l'UTF-8 sur un export Excel FR détruisait les accents (é → �) en DB.
      const parsed = parseCSV(decodeCSVBuffer(e.target.result));
      if (parsed.length < 1) { setError("Ce fichier semble vide ou illisible."); return; }
      setRows(parsed);
      setFileName(file.name);
      setLecture(null);
      setMapping(autoMap(parsed[0] || []));
      setHeaderRow(true);
      setStep('map');
    };
    reader.onerror = () => setError("Impossible de lire le fichier.");
    reader.readAsArrayBuffer(file);
  };

  // ── Lire une photo de LISTE (2026-09-17) ──────────────────────────────────
  // Même compression que l'import d'une fiche par photo (clients/nouveau) :
  // une photo de téléphone dépasse la limite de body de Vercel.
  const compresserImage = (file) => new Promise((resolve, reject) => {
    const MAX_DIM = 1568; // au-delà, le modèle redimensionne de toute façon
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (!width || !height) { URL.revokeObjectURL(url); reject(new Error('Image illisible')); return; }
      if (Math.max(width, height) > MAX_DIM) {
        const ratio = MAX_DIM / Math.max(width, height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      URL.revokeObjectURL(url);
      resolve({ media_type: 'image/jpeg', data: dataUrl.split(',')[1] });
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image illisible')); };
    img.src = url;
  });

  const onPhoto = async (file) => {
    if (!file || lisantPhoto) return;
    setError('');
    setLisantPhoto(true);
    try {
      const { media_type, data } = await compresserImage(file);
      const res = await fetch('/api/clients/extract-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ media_type, data, mode: 'liste' }),
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(out.error || "La lecture de la photo n'a pas abouti.");
      const lignes = out.rows || [];
      if (lignes.length < 2) throw new Error("Aucune personne lue sur cette photo.");
      // Les lignes arrivent au format de parseCSV : la suite de l'écran
      // (correspondance, aperçu, import) ne change pas d'un iota.
      setRows(lignes);
      setFileName(file.name || 'Photo de liste');
      setLecture(resumeLecture({ lignes: out.lignes || [], ignorees: out.ignorees || 0, tronque: !!out.tronque }));
      setMapping(autoMap(lignes[0] || []));
      setHeaderRow(true);
      setStep('map');
    } catch (e) {
      setError(e.message);
    } finally {
      setLisantPhoto(false);
      if (photoRef.current) photoRef.current.value = '';
    }
  };

  const buildClients = () => {
    const out = [];
    for (const r of dataRows) {
      const c = {};
      for (const t of TARGETS) {
        const idx = mapping[t.key];
        if (idx != null && idx >= 0) c[t.key] = (r[idx] || '').trim();
      }
      out.push(c);
    }
    return out;
  };

  const handleImport = async () => {
    setSubmitting(true);
    setError('');
    try {
      const clients = buildClients();
      const res = await fetch('/api/clients/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clients }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || 'Erreur lors de l\'import.');
      setReport(data);
      setInviteState(null);
      setStep('done');
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Invitation groupée : envoie à chaque importé·e (avec email) son lien
  // d'accès portail via POST /api/invite, en séquentiel avec progression.
  // /api/invite est idempotent (fiche déjà créée par l'import → pas de
  // doublon) et génère un magic link frais à chaque envoi.
  const handleInviteAll = async () => {
    const invitables = report?.invitables || [];
    if (!invitables.length || inviteState?.running) return;
    let sent = 0, errors = 0;
    setInviteState({ sent, errors, total: invitables.length, running: true });
    for (const inv of invitables) {
      try {
        const res = await fetch('/api/invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: inv.email, prenom: inv.prenom }),
        });
        if (res.ok) sent++; else errors++;
      } catch {
        errors++;
      }
      setInviteState({ sent, errors, total: invitables.length, running: true });
    }
    setInviteState({ sent, errors, total: invitables.length, running: false });
  };

  // ── Aperçu : 6 premières lignes mappées ──
  // Sauf pour une PHOTO : là, chaque valeur peut avoir été mal lue, et l'écran
  // demande justement de relire. Six lignes sur quarante feraient de cette
  // consigne un mensonge → on les montre TOUTES (le tableau défile).
  const preview = (lecture ? dataRows : dataRows.slice(0, 6)).map((r) => {
    const o = {};
    for (const t of TARGETS) {
      const idx = mapping[t.key];
      o[t.key] = (idx != null && idx >= 0) ? (r[idx] || '') : '';
    }
    return o;
  });
  const mappedCount = TARGETS.filter(t => mapping[t.key] >= 0).length;

  return (
    <div className="imp-wrap animate-fade-in">
      <Link href="/clients" className="imp-back"><ArrowLeft size={15} /> Retour aux élèves</Link>
      <h1>Importer mes élèves</h1>
      <p className="imp-sub">Tu viens d'un autre outil ou d'un tableur&nbsp;? Exporte ta liste en CSV, et récupère tout ici en quelques secondes.</p>

      {error && <div className="imp-error"><AlertCircle size={16} /> {error}</div>}

      {/* ÉTAPE 1 — Upload */}
      {step === 'upload' && (
        <div
          className="imp-drop"
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('over'); }}
          onDragLeave={(e) => e.currentTarget.classList.remove('over')}
          onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove('over'); onFile(e.dataTransfer.files?.[0]); }}
        >
          <div className="imp-drop-icon"><Upload size={26} /></div>
          <div className="imp-drop-title">Glisse ton fichier CSV ici</div>
          <div className="imp-drop-sub">ou clique pour le choisir</div>
          <input ref={fileRef} type="file" accept=".csv,text/csv,text/plain" hidden
            onChange={(e) => onFile(e.target.files?.[0])} />
          <p className="imp-tip">Astuce&nbsp;: depuis Excel ou ton ancien logiciel, choisis «&nbsp;Enregistrer sous&nbsp;» → CSV. Les colonnes prénom, nom, email, téléphone sont reconnues automatiquement.</p>
        </div>
      )}

      {/* ÉTAPE 1 bis — Photo d'une liste papier. Elle retombe sur le MÊME
          écran de correspondance que le CSV : rien n'est enregistré sans
          que tu aies relu. */}
      {step === 'upload' && (
        <div className="imp-photo" data-testid="imp-photo-bloc">
          <div className="imp-photo-txt">
            <div className="imp-photo-title"><Camera size={17} /> Tu n&apos;as que du papier&nbsp;?</div>
            <p>Photographie ta liste d&apos;élèves, une page à la fois. Je la lis et je te la présente ligne par ligne, pour que tu vérifies avant d&apos;enregistrer.</p>
          </div>
          <button
            type="button"
            className="imp-photo-btn"
            data-testid="imp-photo-btn"
            disabled={lisantPhoto}
            onClick={() => photoRef.current?.click()}
          >
            {lisantPhoto ? <><Loader2 size={15} className="imp-spin" /> Lecture en cours…</> : <><Camera size={15} /> Lire une photo de liste</>}
          </button>
          <input ref={photoRef} type="file" accept="image/*" capture="environment" hidden
            onChange={(e) => onPhoto(e.target.files?.[0])} />
          {lisantPhoto && <p className="imp-photo-patience" data-testid="imp-photo-patience">Une liste longue demande une vingtaine de secondes. Ne ferme pas cette page.</p>}
        </div>
      )}

      {/* ÉTAPE 2 — Mapping + aperçu */}
      {step === 'map' && (
        <>
          <div className="imp-filecard">
            {lecture ? <Camera size={18} /> : <FileText size={18} />}
            <span><b>{fileName}</b> · {dataRows.length} ligne{dataRows.length > 1 ? 's' : ''} · {mappedCount} colonne{mappedCount > 1 ? 's' : ''} reconnue{mappedCount > 1 ? 's' : ''}</span>
            <button className="imp-link" onClick={() => { setStep('upload'); setRows([]); setLecture(null); }}>Changer de fichier</button>
          </div>
          {lecture && (
            <div className="imp-lecture" data-testid="imp-lecture">
              <AlertCircle size={15} />
              <span><b>{lecture}</b>. Relis chaque ligne&nbsp;: une photo se lit bien, elle ne se devine pas. Corrige ce qui manque après l&apos;import, sur la fiche de l&apos;élève.</span>
            </div>
          )}

          <label className="imp-check">
            <input type="checkbox" checked={headerRow} onChange={(e) => setHeaderRow(e.target.checked)} />
            La première ligne contient les titres de colonnes
          </label>

          <div className="imp-section-title">Vérifie la correspondance des colonnes</div>
          <div className="imp-map">
            {TARGETS.map(t => (
              <div key={t.key} className="imp-map-row">
                <span className="imp-map-label">{t.label}</span>
                <select
                  className="imp-select"
                  value={mapping[t.key] ?? -1}
                  onChange={(e) => setMapping(m => ({ ...m, [t.key]: parseInt(e.target.value, 10) }))}
                >
                  <option value={-1}>Ignorer cette colonne</option>
                  {headers.map((h, i) => (
                    <option key={i} value={i}>{headerRow ? (h || `Colonne ${i + 1}`) : `Colonne ${i + 1}`}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="imp-section-title">Aperçu ({Math.min(dataRows.length, 6)} sur {dataRows.length})</div>
          <div className="imp-preview-wrap">
            <table className="imp-preview">
              <thead><tr>{TARGETS.map(t => <th key={t.key}>{t.label}</th>)}</tr></thead>
              <tbody>
                {preview.map((o, i) => (
                  <tr key={i}>{TARGETS.map(t => <td key={t.key}>{o[t.key] || <span className="imp-empty">—</span>}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="imp-note">
            Les élèves seront ajoutés avec le statut «&nbsp;prospect&nbsp;». Les doublons (même email déjà présent) sont ignorés automatiquement, jamais écrasés.
          </div>

          <div className="imp-actions">
            <button className="izi-btn izi-btn-primary" onClick={handleImport} disabled={submitting || dataRows.length === 0}>
              {submitting ? <><Loader2 size={16} className="spin" /> Import en cours…</> : <><Upload size={16} /> Importer {dataRows.length} élève{dataRows.length > 1 ? 's' : ''}</>}
            </button>
          </div>
        </>
      )}

      {/* ÉTAPE 3 — Rapport */}
      {step === 'done' && report && (
        <div className="imp-done">
          <div className="imp-done-icon"><PartyPopper size={30} /></div>
          <h2>{report.importes > 0 ? 'C\'est importé !' : 'Import terminé'}</h2>
          <div className="imp-stats">
            <div className="imp-stat ok"><b>{report.importes}</b><span>élève{report.importes > 1 ? 's' : ''} ajouté{report.importes > 1 ? 's' : ''}</span></div>
            {report.doublons > 0 && <div className="imp-stat"><b>{report.doublons}</b><span>doublon{report.doublons > 1 ? 's' : ''} ignoré{report.doublons > 1 ? 's' : ''}</span></div>}
            {report.bloques_limite > 0 && <div className="imp-stat warn"><b>{report.bloques_limite}</b><span>bloqué{report.bloques_limite > 1 ? 's' : ''} par la limite du plan</span></div>}
            {report.invalides > 0 && <div className="imp-stat"><b>{report.invalides}</b><span>ligne{report.invalides > 1 ? 's' : ''} vide{report.invalides > 1 ? 's' : ''}</span></div>}
          </div>
          {report.bloques_limite > 0 && (
            <p className="imp-upsell">Réessaie l'import pour ajouter les élèves restants.</p>
          )}

          {/* Invitation groupée : envoyer leur lien d'accès aux importés */}
          {(report.invitables?.length || 0) > 0 && (
            <div className="imp-invite-card">
              {!inviteState ? (
                <>
                  <div className="imp-invite-title">📨 Envoie-leur leur accès élève&nbsp;?</div>
                  <p className="imp-invite-sub">
                    Chaque élève avec un email reçoit un lien de connexion direct à ton
                    portail : réservations, carnet de séances, messages, sans mot de passe.
                  </p>
                  <button className="izi-btn izi-btn-primary" onClick={handleInviteAll}>
                    <Send size={16} /> Inviter les {report.invitables.length} élève{report.invitables.length > 1 ? 's' : ''} par email
                  </button>
                </>
              ) : inviteState.running ? (
                <div className="imp-invite-progress">
                  <Loader2 size={18} className="spin" />
                  <span>Envoi en cours… {inviteState.sent + inviteState.errors}/{inviteState.total}</span>
                </div>
              ) : (
                <div className="imp-invite-done">
                  <Check size={18} />
                  <span>
                    {inviteState.sent} invitation{inviteState.sent > 1 ? 's' : ''} envoyée{inviteState.sent > 1 ? 's' : ''}
                    {inviteState.errors > 0 && ` · ${inviteState.errors} en échec (tu pourras les ré-inviter depuis leur fiche)`}
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="imp-actions" style={{ justifyContent: 'center' }}>
            <button className="izi-btn izi-btn-primary" onClick={() => router.push('/clients')}><Check size={16} /> Voir mes élèves</button>
            <button className="izi-btn izi-btn-secondary" onClick={() => { setStep('upload'); setRows([]); setReport(null); setInviteState(null); }}>Importer un autre fichier</button>
          </div>
        </div>
      )}

      {/* Global exprès : .imp-back habille un <Link> (composant custom) que
          styled-jsx scoped ne hashe pas — en scoped, la règle ne matchait
          jamais et « Retour aux élèves » s'affichait en lien bleu navigateur
          (sweep liens hors charte, retour Colin 2026-08-19). */}
      <style jsx global>{`
        .imp-wrap{max-width:760px}
        .imp-back{display:inline-flex;align-items:center;gap:6px;color:var(--text-secondary,#888);
          font-size:.875rem;text-decoration:none;margin-bottom:14px}
        .imp-back:hover{color:var(--brand,#B87333)}
        h1{margin:0 0 6px}
        .imp-sub{color:var(--text-secondary,#6B5D52);margin:0 0 22px;line-height:1.55}
        .imp-error{display:flex;align-items:center;gap:8px;background:#fff0f0;border:1px solid #ffcdd2;
          color:#c62828;border-radius:10px;padding:11px 14px;margin-bottom:16px;font-size:.92rem}
        .imp-drop{border:2px dashed var(--line,#E7DCCD);border-radius:18px;padding:46px 24px;text-align:center;
          cursor:pointer;transition:.18s;background:var(--bg-card,#fff)}
        .imp-drop:hover,.imp-drop.over{border-color:var(--brand,#B87333);background:#FCF8F2}
        .imp-drop-icon{width:60px;height:60px;border-radius:50%;background:#F0E6DA;color:var(--brand,#B87333);
          display:flex;align-items:center;justify-content:center;margin:0 auto 14px}
        .imp-drop-title{font-weight:700;font-size:1.05rem;color:var(--text-primary,#3A2E26)}
        .imp-drop-sub{color:var(--text-secondary,#9A8C7E);font-size:.9rem;margin-top:3px}
        .imp-tip{margin:18px auto 0;max-width:440px;font-size:.82rem;color:var(--text-secondary,#9A8C7E);line-height:1.5}

        /* Photo d'une liste papier (2026-09-17) */
        .imp-photo{margin-top:16px;border:1px solid var(--line,#E7DCCD);border-radius:16px;padding:18px 20px;
          background:#FCF8F2;display:flex;flex-wrap:wrap;align-items:center;gap:14px}
        .imp-photo-txt{flex:1 1 260px;min-width:0}
        .imp-photo-title{display:flex;align-items:center;gap:7px;font-weight:700;font-size:.95rem;
          color:var(--text-primary,#3A2E26)}
        .imp-photo-txt p{margin:5px 0 0;font-size:.84rem;line-height:1.5;color:var(--text-secondary,#6B5D52)}
        .imp-photo-btn{display:inline-flex;align-items:center;gap:7px;padding:10px 16px;border-radius:11px;
          border:1px solid var(--brand,#B87333);background:var(--brand,#B87333);color:#fff;font-weight:600;
          font-size:.88rem;cursor:pointer;white-space:nowrap}
        .imp-photo-btn:disabled{opacity:.65;cursor:default}
        .imp-photo-patience{flex:1 1 100%;margin:0;font-size:.8rem;color:var(--text-secondary,#9A8C7E)}
        .imp-spin{animation:imp-rot 1s linear infinite}
        @keyframes imp-rot{to{transform:rotate(360deg)}}
        .imp-lecture{display:flex;align-items:flex-start;gap:9px;margin:-4px 0 14px;padding:11px 14px;
          border-radius:12px;background:#FFF8E8;border:1px solid #F0DCA8;font-size:.84rem;line-height:1.5;
          color:var(--text-primary,#3A2E26)}
        .imp-lecture svg{flex:none;margin-top:2px;color:#B8860B}
        /* Une photo montre TOUTES ses lignes : le tableau défile plutôt que
           de s'étirer sur trois écrans. */
        .imp-preview-wrap{max-height:52vh;overflow-y:auto}
        .imp-filecard{display:flex;align-items:center;gap:10px;background:var(--bg-card,#fff);
          border:1px solid var(--line,#E7DCCD);border-radius:12px;padding:12px 16px;color:var(--text-primary,#3A2E26);font-size:.9rem}
        .imp-filecard b{font-weight:700}
        .imp-link{margin-left:auto;background:none;border:none;color:var(--brand,#B87333);cursor:pointer;
          font-size:.85rem;font-weight:600;text-decoration:underline}
        .imp-check{display:flex;align-items:center;gap:9px;margin:16px 2px;font-size:.92rem;color:var(--text-secondary,#6B5D52);cursor:pointer}
        .imp-check input{width:17px;height:17px;accent-color:var(--brand,#B87333)}
        .imp-section-title{font-weight:700;color:var(--text-primary,#3A2E26);margin:22px 0 10px;font-size:.98rem}
        .imp-map{display:grid;grid-template-columns:repeat(auto-fill,minmax(330px,1fr));gap:10px}
        .imp-map-row{display:flex;align-items:center;gap:10px}
        .imp-map-label{flex:0 0 130px;font-size:.9rem;color:var(--text-secondary,#6B5D52)}
        .imp-select{flex:1;padding:8px 10px;border:1px solid var(--line,#E7DCCD);border-radius:9px;
          background:#fff;font-size:.9rem;color:var(--text-primary,#3A2E26)}
        .imp-preview-wrap{overflow-x:auto;border:1px solid var(--line,#E7DCCD);border-radius:12px}
        table.imp-preview{width:100%;border-collapse:collapse;font-size:.85rem;min-width:560px}
        .imp-preview th{text-align:left;background:#F3ECE1;color:var(--text-secondary,#6B5D52);font-weight:700;
          font-size:.7rem;text-transform:uppercase;letter-spacing:.05em;padding:8px 11px;white-space:nowrap}
        .imp-preview td{padding:7px 11px;border-top:1px solid var(--line,#E7DCCD);color:var(--text-primary,#3A2E26);white-space:nowrap}
        .imp-empty{color:#cdbfae}
        .imp-note{background:#FCF8F2;border:1px solid var(--line,#E7DCCD);border-radius:10px;padding:11px 14px;
          font-size:.86rem;color:var(--text-secondary,#6B5D52);margin-top:16px;line-height:1.5}
        .imp-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:20px}
        .imp-done{text-align:center;background:var(--bg-card,#fff);border:1px solid var(--line,#E7DCCD);
          border-radius:18px;padding:34px 24px;box-shadow:0 8px 24px rgba(58,46,38,.06)}
        .imp-done-icon{width:64px;height:64px;border-radius:50%;background:#EAEFE2;color:#7C8B6A;
          display:flex;align-items:center;justify-content:center;margin:0 auto 14px}
        .imp-done h2{margin:0 0 18px}
        .imp-stats{display:flex;gap:14px;justify-content:center;flex-wrap:wrap;margin-bottom:8px}
        .imp-stat{background:#F7F2EA;border-radius:12px;padding:14px 20px;min-width:120px}
        .imp-stat b{display:block;font-size:1.7rem;font-weight:800;color:var(--text-primary,#3A2E26);line-height:1}
        .imp-stat span{font-size:.78rem;color:var(--text-secondary,#9A8C7E)}
        .imp-stat.ok{background:#EAEFE2}.imp-stat.ok b{color:#5d7245}
        .imp-stat.warn{background:#FFF6E6}.imp-stat.warn b{color:#8A6420}
        .imp-upsell{color:#8A6420;font-size:.9rem;margin:6px 0 18px}
        .imp-invite-card{background:#FCF8F2;border:1px solid var(--line,#E7DCCD);border-radius:14px;
          padding:18px 16px;margin:0 auto 20px;max-width:440px;text-align:center}
        .imp-invite-title{font-weight:700;color:var(--text-primary,#3A2E26);margin-bottom:4px}
        .imp-invite-sub{font-size:.85rem;color:var(--text-secondary,#6B5D52);margin:0 0 14px;line-height:1.5}
        .imp-invite-progress,.imp-invite-done{display:flex;align-items:center;justify-content:center;gap:8px;
          font-size:.9rem;color:var(--text-primary,#3A2E26);padding:6px 0}
        .imp-invite-done{color:#3d7a44;font-weight:600}
        :global(.spin){animation:impspin .8s linear infinite}
        @keyframes impspin{to{transform:rotate(360deg)}}
      `}</style>
    </div>
  );
}

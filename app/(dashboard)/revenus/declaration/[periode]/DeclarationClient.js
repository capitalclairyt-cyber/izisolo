'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Printer, Copy, Check, Download, FileText, Loader2, CheckCircle2, AlertTriangle,
} from 'lucide-react';
import { useToast } from '@/components/ui/ToastProvider';
import { formatMontant } from '@/lib/utils';
import { montantFr } from '@/lib/urssaf';
import { labelMode } from '@/lib/modes-paiement';
import { montantADeclarer, texteEcart } from '@/lib/declaration-archive';

const fmtJour = (d) => (d ? String(d).slice(0, 10).split('-').reverse().join('/') : '');

export default function DeclarationClient({
  periode, lignes, totaux, estimation, config, emetteur, archive, statut: statutInitial, ecart, snapshot,
}) {
  const { toast } = useToast();
  const [copie, setCopie] = useState(false);
  const [statut, setStatut] = useState(statutInitial);
  const [declareeAt, setDeclareeAt] = useState(archive?.declaree_at || null);
  const [enCours, setEnCours] = useState(false);
  const [telechargement, setTelechargement] = useState('');
  const pingEnvoye = useRef(false);

  const aDeclarer = montantADeclarer(totaux.brut);

  // Trace de consultation : c'est le « retrouver ce qui a été demandé ». Une
  // seule fois par montage (StrictMode monte deux fois en dev).
  useEffect(() => {
    if (pingEnvoye.current) return;
    pingEnvoye.current = true;
    fetch('/api/urssaf/declaration', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ periodeId: periode.id, action: 'consultee', montant: totaux.brut, snapshot }),
    }).catch(() => { /* l'archive est un confort, jamais un bloqueur */ });
  }, [periode.id, totaux.brut, snapshot]);

  const copier = async () => {
    try {
      await navigator.clipboard.writeText(String(aDeclarer));
      setCopie(true);
      setTimeout(() => setCopie(false), 2200);
    } catch {
      toast.warning(`Copie impossible sur cet appareil. Le montant est : ${aDeclarer}`);
    }
  };

  const marquerDeclaree = async () => {
    setEnCours(true);
    try {
      const res = await fetch('/api/urssaf/declaration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periodeId: periode.id, action: 'declaree', montant: totaux.brut, snapshot }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Enregistrement impossible');
      setStatut('declaree');
      setDeclareeAt(json.declaree_at || new Date().toISOString());
      toast.success('Période marquée comme déclarée ✓');
    } catch (err) {
      toast.error(String(err.message || err));
    } finally {
      setEnCours(false);
    }
  };

  const telecharger = async (quoi) => {
    setTelechargement(quoi);
    try {
      const url = quoi === 'livre'
        ? `/api/export/livre-recettes?periode=${periode.id}`
        : `/api/export/paiements-csv?periode=${periode.id}&base=encaissement&statut=paid`;
      const res = await fetch(url);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error(j.error || 'Téléchargement indisponible.');
        return;
      }
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = quoi === 'livre'
        ? `izisolo-livre-recettes-${periode.id}.pdf`
        : `izisolo-encaissements-${periode.id}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
    } catch (err) {
      toast.error('Téléchargement impossible : ' + err.message);
    } finally {
      setTelechargement('');
    }
  };

  const parMois = Object.entries(totaux.parMois || {}).sort(([a], [b]) => a.localeCompare(b));
  const parMode = Object.entries(totaux.parMode || {}).sort((a, b) => b[1] - a[1]);

  return (
    <div className="decl-page">
      <div className="decl-toolbar">
        <Link href="/revenus" className="decl-retour"><ArrowLeft size={16} /> Revenus</Link>
        <div className="decl-toolbar-actions">
          <button onClick={() => window.print()} className="izi-btn izi-btn-ghost">
            <Printer size={14} /> Imprimer
          </button>
          <button onClick={() => telecharger('csv')} className="izi-btn izi-btn-ghost" disabled={!!telechargement}>
            {telechargement === 'csv' ? <Loader2 size={14} className="spin" /> : <Download size={14} />} CSV
          </button>
          <button onClick={() => telecharger('livre')} className="izi-btn izi-btn-ghost" disabled={!!telechargement}>
            {telechargement === 'livre' ? <Loader2 size={14} className="spin" /> : <FileText size={14} />} Livre des recettes
          </button>
        </div>
      </div>

      <div className="decl-feuille">
        <header className="decl-entete">
          <div>
            <div className="decl-studio">{emetteur.nom}</div>
            {emetteur.siret && <div className="decl-meta">SIRET {emetteur.siret}</div>}
            {emetteur.ville && <div className="decl-meta">{emetteur.ville}</div>}
          </div>
          <div className="decl-entete-droite">
            <div className="decl-titre">Déclaration URSSAF</div>
            <div className="decl-meta">{periode.label}</div>
            <div className="decl-meta">du {fmtJour(periode.from)} au {fmtJour(periode.to)}</div>
          </div>
        </header>

        <section className="decl-hero">
          <div>
            <div className="decl-label">Montant à déclarer</div>
            <div className="decl-montant">{aDeclarer} €</div>
            <div className="decl-meta">
              {totaux.nombre} encaissement{totaux.nombre > 1 ? 's' : ''} · total exact {formatMontant(totaux.brut)}
            </div>
          </div>
          <div className="decl-hero-actions">
            <button onClick={copier} className="izi-btn izi-btn-primary">
              {copie ? <Check size={15} /> : <Copy size={15} />} {copie ? 'Copié' : 'Copier'}
            </button>
          </div>
        </section>

        <div className={`decl-statut decl-statut-${statut}`}>
          {statut === 'declaree' ? (
            <><CheckCircle2 size={15} /> Déclarée{declareeAt ? ` le ${fmtJour(declareeAt)}` : ''}
              {archive?.montant_declare != null && ` pour ${montantADeclarer(archive.montant_declare)} €`}.</>
          ) : statut === 'en_retard' ? (
            <><AlertTriangle size={15} /> Échéance dépassée depuis le {periode.echeanceLabel}. Déclare dès que possible.</>
          ) : statut === 'en_cours' ? (
            <>Période en cours, le montant bouge encore. Échéance le {periode.echeanceLabel}.</>
          ) : (
            <>À déclarer avant le {periode.echeanceLabel} sur autoentrepreneur.urssaf.fr.</>
          )}
        </div>

        {ecart && (
          <div className="decl-ecart">
            <AlertTriangle size={15} /> {texteEcart(ecart)}
          </div>
        )}

        {estimation?.estimable && (
          <section className="decl-bloc">
            <h2>Ce que tu auras à payer, environ</h2>
            <table className="decl-mini">
              <tbody>
                <tr><td>Cotisations {montantFr(config.taux_cotisations)} %</td><td>{formatMontant(estimation.cotisations)}</td></tr>
                <tr><td>Formation professionnelle {montantFr(config.taux_cfp)} %</td><td>{formatMontant(estimation.cfp)}</td></tr>
                {estimation.liberatoire > 0 && (
                  <tr><td>Versement libératoire {montantFr(config.taux_liberatoire)} %</td><td>{formatMontant(estimation.liberatoire)}</td></tr>
                )}
                <tr className="decl-total"><td>À prévoir</td><td>{formatMontant(estimation.total)}</td></tr>
              </tbody>
            </table>
            <p className="decl-note">
              Estimation d&apos;après les taux que tu as saisis. Le montant officiel est celui que l&apos;URSSAF
              calcule après ta déclaration.
            </p>
          </section>
        )}

        <div className="decl-colonnes">
          {parMois.length > 0 && (
            <section className="decl-bloc">
              <h2>Par mois</h2>
              <table className="decl-mini">
                <tbody>
                  {parMois.map(([mois, m]) => (
                    <tr key={mois}><td>{mois}</td><td>{formatMontant(m)}</td></tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
          {parMode.length > 0 && (
            <section className="decl-bloc">
              <h2>Par mode de règlement</h2>
              <table className="decl-mini">
                <tbody>
                  {parMode.map(([mode, m]) => (
                    <tr key={mode}><td>{labelMode(mode)}</td><td>{formatMontant(m)}</td></tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </div>

        <section className="decl-bloc">
          <h2>Le détail des encaissements</h2>
          {lignes.length === 0 ? (
            <p className="decl-note">Aucun encaissement sur cette période. Déclarer zéro reste obligatoire.</p>
          ) : (
            <div className="decl-table-wrap">
              <table className="decl-table">
                <thead>
                  <tr>
                    <th>Date</th><th>Origine</th><th>Nature</th><th>Mode</th><th className="decl-num">Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {lignes.map(l => (
                    <tr key={l.id}>
                      <td>{fmtJour(l.date)}</td>
                      <td>{l.client || <span className="decl-vide">Non renseigné</span>}</td>
                      <td>{l.intitule}</td>
                      <td>{labelMode(l.mode)}</td>
                      <td className="decl-num">{montantFr(l.montant)} €</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={4}>TOTAL ({totaux.nombre})</td>
                    <td className="decl-num">{montantFr(totaux.brut)} €</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </section>

        <p className="decl-note">
          Le montant à déclarer est le brut payé par l&apos;élève : en micro-entreprise, les frais ne se
          déduisent pas. IziSolo ne compte que ce qui a été enregistré ici, alors si tu encaisses aussi
          ailleurs, ajoute-le avant de déclarer.
        </p>

        {statut !== 'declaree' && periode.cloturee && (
          <div className="decl-marquer">
            <button onClick={marquerDeclaree} className="izi-btn izi-btn-primary" disabled={enCours}>
              {enCours ? <Loader2 size={15} className="spin" /> : <CheckCircle2 size={15} />}
              J&apos;ai déclaré ces {aDeclarer} €
            </button>
            <span className="decl-note">
              On garde une photo de ce montant : si la période change plus tard, tu le sauras.
            </span>
          </div>
        )}
      </div>

      <style jsx>{`
        .decl-page { max-width: 900px; margin: 0 auto; padding-bottom: 40px; }
        .decl-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 14px; }
        .decl-toolbar-actions { display: flex; gap: 8px; flex-wrap: wrap; }
        .decl-feuille {
          background: var(--bg-card); border: 1px solid var(--border);
          border-radius: var(--radius-lg, 14px); padding: 24px;
          display: flex; flex-direction: column; gap: 20px;
        }
        .decl-entete { display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; border-bottom: 1px solid var(--border); padding-bottom: 14px; }
        .decl-entete-droite { text-align: right; }
        .decl-studio { font-size: 1.0625rem; font-weight: 800; color: var(--text-primary); }
        .decl-titre { font-size: 1rem; font-weight: 700; color: var(--brand); }
        .decl-meta { font-size: 0.8125rem; color: var(--text-muted); }
        .decl-hero { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
        .decl-label { font-size: 0.75rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; }
        .decl-montant { font-size: 2.5rem; font-weight: 800; color: var(--brand); line-height: 1.1; margin: 2px 0; }
        .decl-statut { font-size: 0.8125rem; font-weight: 600; padding: 9px 12px; border-radius: var(--radius-md); display: flex; align-items: center; gap: 7px; background: var(--brand-light); color: var(--text-secondary); }
        .decl-statut-declaree { background: #dcfce7; color: #166534; }
        .decl-statut-en_retard { background: #fee2e2; color: #b91c1c; }
        .decl-ecart { font-size: 0.8125rem; padding: 9px 12px; border-radius: var(--radius-md); background: #fef3c7; color: #92400e; display: flex; align-items: flex-start; gap: 7px; }
        .decl-bloc h2 { font-size: 0.8125rem; font-weight: 700; color: var(--text-primary); text-transform: uppercase; letter-spacing: 0.04em; margin: 0 0 8px; }
        .decl-colonnes { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .decl-mini { width: 100%; border-collapse: collapse; font-size: 0.8125rem; }
        .decl-mini td { padding: 4px 0; color: var(--text-secondary); }
        .decl-mini td:last-child { text-align: right; font-weight: 600; color: var(--text-primary); }
        .decl-mini .decl-total td { border-top: 1px solid var(--border); padding-top: 7px; font-weight: 700; }
        .decl-table-wrap { overflow-x: auto; }
        .decl-table { width: 100%; border-collapse: collapse; font-size: 0.8125rem; }
        .decl-table th { text-align: left; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted); padding: 6px 8px; border-bottom: 1px solid var(--border); white-space: nowrap; }
        .decl-table td { padding: 6px 8px; color: var(--text-secondary); border-bottom: 1px solid var(--border-soft, #f0ebe5); }
        .decl-table tfoot td { font-weight: 700; color: var(--text-primary); border-top: 2px solid var(--border); border-bottom: none; }
        .decl-num { text-align: right; white-space: nowrap; }
        .decl-vide { color: var(--text-muted); font-style: italic; }
        .decl-note { font-size: 0.75rem; color: var(--text-muted); margin: 6px 0 0; line-height: 1.5; }
        .decl-marquer { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; border-top: 1px solid var(--border); padding-top: 16px; }
        @media (max-width: 640px) {
          .decl-colonnes { grid-template-columns: 1fr; }
          .decl-montant { font-size: 2rem; }
          .decl-entete-droite { text-align: left; }
        }
        /* Impression : la feuille seule, sans cadre ni actions. La déco de
           l'app (sidebar, widget feedback) est masquée par le bloc global. */
        @media print {
          .decl-toolbar, .decl-marquer { display: none; }
          .decl-page { max-width: none; padding: 0; }
          .decl-feuille { border: none; border-radius: 0; padding: 0; background: white; }
          .decl-table { font-size: 0.72rem; }
        }
      `}</style>
      {/* .decl-retour stylise un <Link> (COMPOSANT) : une règle scopée ne
          l'atteint jamais, styled-jsx ne hashe que les éléments DOM natifs.
          Oublier cette règle sortait un lien bleu souligné de navigateur —
          attrapé par une capture, pas par un test de présence de classe. */}
      <style jsx global>{`
        .decl-retour {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 0.8125rem; font-weight: 600;
          color: var(--text-secondary); text-decoration: none;
        }
        .decl-retour:hover { color: var(--brand); }

        @media print {
          .sidebar, .feedback-fab-wrapper, .bottom-nav { display: none !important; }
          .dashboard-content { padding: 0 !important; margin: 0 !important; }
          body { background: white !important; }
        }
      `}</style>
    </div>
  );
}

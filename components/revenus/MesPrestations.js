'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Briefcase, FileText, Loader2, ExternalLink } from 'lucide-react';
import { useToast } from '@/components/ui/ToastProvider';
import { euros, resumeReleve } from '@/lib/remuneration';

/**
 * « Mes prestations » (v112, pont 4 côté INTERVENANTE) : les relevés validés
 * par les structures où je donne des cours, dans MES revenus. « Facturer »
 * émet ma facture (v2, non acquittée, dans ma séquence) et l'envoie ; quand la
 * structure règle, l'encaissement arrive tout seul dans la liste des paiements
 * (mode virement, date), donc dans mon assiette URSSAF.
 *
 * Rendu seulement pour une personne qui a au moins une appartenance ailleurs
 * (la page ne fait pas payer cette requête à toutes les profs seules).
 */
export default function MesPrestations() {
  const { toast } = useToast();
  const [prestations, setPrestations] = useState(null);
  const [enCours, setEnCours] = useState(null);

  useEffect(() => {
    let vivant = true;
    fetch('/api/prestations').then(r => r.json()).then(d => { if (vivant) setPrestations(d.prestations || []); }).catch(() => { if (vivant) setPrestations([]); });
    return () => { vivant = false; };
  }, []);

  const facturer = async (p) => {
    if (!confirm(`Émettre ta facture pour ${p.structure_nom}, ${p.periode_label} (${euros(p.montant)}) ?\n\nElle prend le prochain numéro de ta séquence et part à la structure en PDF.`)) return;
    setEnCours(p.id);
    try {
      const res = await fetch(`/api/prestations/${p.id}/facturer`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.code === 'SANS_SIRET') toast.error(data.error);
        else toast.error(data.error || 'Facture impossible.');
        return;
      }
      setPrestations(prev => prev.map(x => (x.id === p.id ? { ...x, statut: 'facturee', statut_label: 'Facturée', facture_numero: data.facture?.numero_affiche || null, facture_id: data.facture?.id || null } : x)));
      toast.success(`Facture ${data.facture?.numero_affiche} émise et envoyée.`);
    } finally { setEnCours(null); }
  };

  if (!prestations || prestations.length === 0) return null;

  return (
    <section className="izi-card mp-bloc animate-slide-up" data-testid="mes-prestations">
      <div className="mp-entete">
        <Briefcase size={16} />
        <h2>Mes prestations</h2>
        <span className="mp-aide">Les relevés validés par les structures où tu donnes des cours. Facture en un clic ; l&apos;encaissement arrive ici quand elles règlent.</span>
      </div>
      <ul className="mp-liste">
        {prestations.map(p => (
          <li key={p.id} className="mp-ligne" data-testid="mes-prestations-ligne" data-statut={p.statut}>
            <div className="mp-info">
              <span className="mp-titre">{p.structure_nom} · {p.periode_label}</span>
              <span className="mp-meta">{resumeReleve(p.releve)}{p.facture_numero ? ` · facture ${p.facture_numero}` : ''}</span>
            </div>
            <div className="mp-droite">
              <span className={`mp-badge ${p.statut}`}>{p.statut_label}</span>
              <span className="mp-montant">{euros(p.montant)}</span>
              {p.statut === 'emise' && (
                <button type="button" className="izi-btn btn-sm izi-btn-primary" onClick={() => facturer(p)} disabled={enCours === p.id} data-testid="mes-prestations-facturer">
                  {enCours === p.id ? <Loader2 size={14} className="mp-spin" /> : <FileText size={14} />} Facturer
                </button>
              )}
              {p.facture_id && <a className="izi-btn btn-sm izi-btn-ghost" href={`/api/prestations/${p.id}/facture`} target="_blank" rel="noreferrer"><ExternalLink size={13} /> PDF</a>}
            </div>
          </li>
        ))}
      </ul>
      <p className="mp-note">Pas encore de SIRET ? <Link href="/parametres/facturation">Renseigne ta facturation</Link> avant d&apos;émettre : une facture sans numéro d&apos;entreprise n&apos;en est pas une.</p>
      <style jsx global>{`
        .mp-bloc { margin-bottom: 18px; }
        .mp-entete { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 10px; }
        .mp-entete h2 { margin: 0; font-size: 1rem; }
        .mp-aide { flex-basis: 100%; font-size: .8rem; color: var(--text-soft, #7a6f6a); }
        .mp-liste { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
        .mp-ligne { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 12px; border-radius: 12px; background: #fafaf9; border: 1px solid rgba(0,0,0,.06); }
        .mp-info { display: flex; flex-direction: column; gap: 2px; }
        .mp-titre { font-weight: 600; font-size: .93rem; }
        .mp-meta { font-size: .78rem; color: var(--text-soft, #7a6f6a); }
        .mp-droite { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .mp-montant { font-weight: 700; }
        .mp-badge { font-size: .68rem; padding: 2px 8px; border-radius: 999px; background: #f5f5f4; border: 1px solid rgba(0,0,0,.08); color: #57534e; }
        .mp-badge.emise { background: #fffbeb; border-color: #fde68a; color: #92400e; }
        .mp-badge.facturee { background: #eff6ff; border-color: #bfdbfe; color: #1d4ed8; }
        .mp-badge.reglee { background: #ecfdf5; border-color: #a7f3d0; color: #047857; }
        .mp-note { margin: 10px 0 0; font-size: .78rem; color: var(--text-soft, #7a6f6a); }
        .mp-spin { animation: mp-rot 1s linear infinite; }
        @keyframes mp-rot { to { transform: rotate(360deg); } }
      `}</style>
    </section>
  );
}

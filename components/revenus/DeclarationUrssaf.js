'use client';

// ============================================================================
// Bloc « Ma déclaration URSSAF » (v93) — le chiffre à recopier, rien d'autre.
//
// Ce que la prof doit obtenir en une seconde : le montant encaissé sur la
// période close, arrondi à l'euro comme le formulaire URSSAF l'attend, et la
// date avant laquelle elle doit le saisir. Le reste (estimation, détail par
// mois, documents) est secondaire et se déplie.
//
// Les totaux viennent de /api/urssaf/recap, JAMAIS des paiements déjà chargés
// par la page : celle-ci ne tient que 12 mois, et un récap annuel de l'an
// dernier serait faux par troncature silencieuse.
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Landmark, Copy, Check, Loader2, FileText, ChevronDown, ExternalLink, Eye, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/components/ui/ToastProvider';
import AideContextuelle from '@/components/AideContextuelle';
import { formatMontant } from '@/lib/utils';
import { montantFr } from '@/lib/urssaf';
import { texteEcart, STATUTS } from '@/lib/declaration-archive';

export default function DeclarationUrssaf() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [periodeId, setPeriodeId] = useState(null);
  const [copie, setCopie] = useState(false);
  const [detail, setDetail] = useState(false);
  const [telechargement, setTelechargement] = useState(false);

  const charger = useCallback(async (id) => {
    setChargement(true);
    try {
      const q = id ? `?periode=${encodeURIComponent(id)}` : '';
      const res = await fetch(`/api/urssaf/recap${q}`);
      if (!res.ok) { setData(null); return; }
      const j = await res.json();
      setData(j);
      setPeriodeId(j.periode?.id || null);
    } catch {
      setData(null);
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => { charger(null); }, [charger]);

  // État de chargement : styles EN LIGNE, pas de classe. Les règles scopées de
  // ce composant vivent dans le `return` principal — une branche qui sort plus
  // tôt n'en monte aucune et sortirait nue (le bandeau d'invitation s'était
  // fait avoir de la même façon, cf. StylesGlobaux plus bas).
  if (chargement && !data) {
    return (
      <div className="izi-card" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 16px' }}>
        <Loader2 size={16} className="spin" />
        <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Calcul de ton récapitulatif…</span>
      </div>
    );
  }
  if (!data) return null;

  // Pas encore configurée : une invitation discrète, pas un bloc de chiffres
  // qu'on n'a pas le droit d'inventer.
  if (!data.configuree) {
    return (
      <>
        <Link href="/parametres?tab=profil&s=activite" className="urssaf-invite izi-card">
          <Landmark size={18} />
          <span>
            <strong>Prépare ta déclaration URSSAF</strong>
            <em>Dis-nous comment tu déclares, on te sortira le montant à recopier à chaque échéance.</em>
          </span>
          <ExternalLink size={15} />
        </Link>
        <StylesGlobaux />
      </>
    );
  }

  const { periode, periodes = [], totaux, estimation } = data;
  // Le formulaire URSSAF se saisit en euros entiers.
  const aDeclarer = Math.round(totaux.brut);
  const enRetard = periode.cloturee && periode.joursRestants !== null && periode.joursRestants < 0;

  const copier = async () => {
    try {
      await navigator.clipboard.writeText(String(aDeclarer));
      setCopie(true);
      setTimeout(() => setCopie(false), 2200);
    } catch {
      toast.warning(`Copie impossible sur cet appareil. Le montant est : ${aDeclarer}`);
    }
  };

  const telechargerLivre = async () => {
    setTelechargement(true);
    try {
      const res = await fetch(`/api/export/livre-recettes?periode=${encodeURIComponent(periode.id)}`);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error(j.error || 'Livre des recettes indisponible pour le moment.');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `izisolo-livre-recettes-${periode.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error('Téléchargement impossible : ' + e.message);
    } finally {
      setTelechargement(false);
    }
  };

  return (
    <div className="urssaf-card izi-card animate-slide-up">
      <div className="urssaf-head">
        <div className="urssaf-title">
          <Landmark size={17} /> Ma déclaration URSSAF
          <AideContextuelle ancre="urssaf" titre="Tuto : préparer ta déclaration URSSAF" />
        </div>
        <select
          className="urssaf-select"
          value={periodeId || ''}
          onChange={e => { setPeriodeId(e.target.value); charger(e.target.value); }}
          aria-label="Période à déclarer"
        >
          {periodes.map(p => (
            <option key={p.id} value={p.id}>{p.label}{p.cloturee ? '' : ' (en cours)'}</option>
          ))}
        </select>
      </div>

      <div className="urssaf-main">
        <div>
          <div className="urssaf-label">
            {periode.cloturee ? 'Montant à déclarer' : 'Encaissé depuis le début de la période'}
          </div>
          <div className="urssaf-montant">
            {chargement ? <Loader2 size={22} className="spin" /> : `${montantFr(aDeclarer).replace(',00', '')} €`}
          </div>
          <div className="urssaf-muted">
            {totaux.nombre} encaissement{totaux.nombre > 1 ? 's' : ''} · total exact {formatMontant(totaux.brut)}
          </div>
        </div>
        <button onClick={copier} className="izi-btn izi-btn-primary urssaf-copy" disabled={chargement}>
          {copie ? <Check size={15} /> : <Copy size={15} />}
          {copie ? 'Copié' : 'Copier'}
        </button>
      </div>

      {periode.cloturee ? (
        <div className={`urssaf-echeance ${enRetard ? 'retard' : ''}`}>
          {enRetard
            ? `Échéance dépassée depuis le ${periode.echeanceLabel}. Déclare dès que possible.`
            : `À déclarer avant le ${periode.echeanceLabel}${periode.joursRestants <= 15 ? ` (dans ${periode.joursRestants} jour${periode.joursRestants > 1 ? 's' : ''})` : ''}.`}
        </div>
      ) : (
        <div className="urssaf-echeance">
          Période en cours, le montant bouge encore. Tu déclareras avant le {periode.echeanceLabel}.
        </div>
      )}

      {data.ecart && (
        <div className="urssaf-ecart">
          <AlertTriangle size={14} /> {texteEcart(data.ecart)}
        </div>
      )}

      <div className="urssaf-liens">
        <Link href={`/revenus/declaration/${periode.id}`} className="urssaf-cta">
          <Eye size={15} /> Voir le détail à l&apos;écran
        </Link>
      </div>

      <button className="urssaf-toggle" onClick={() => setDetail(d => !d)} aria-expanded={detail}>
        <ChevronDown size={14} style={{ transform: detail ? 'rotate(180deg)' : 'none' }} />
        {detail ? 'Masquer le détail' : 'Voir le détail et les documents'}
      </button>

      {detail && (
        <div className="urssaf-detail">
          {estimation?.estimable && (
            <div className="urssaf-estim">
              <div className="urssaf-estim-title">Ce que tu auras à payer, environ</div>
              <div className="urssaf-estim-row">
                <span>Cotisations {montantFr(estimation.config.taux_cotisations)} %</span>
                <strong>{formatMontant(estimation.cotisations)}</strong>
              </div>
              <div className="urssaf-estim-row">
                <span>Formation pro {montantFr(estimation.config.taux_cfp)} %</span>
                <strong>{formatMontant(estimation.cfp)}</strong>
              </div>
              {estimation.liberatoire > 0 && (
                <div className="urssaf-estim-row">
                  <span>Versement libératoire {montantFr(estimation.config.taux_liberatoire)} %</span>
                  <strong>{formatMontant(estimation.liberatoire)}</strong>
                </div>
              )}
              <div className="urssaf-estim-row total">
                <span>À prévoir</span>
                <strong>{formatMontant(estimation.total)}</strong>
              </div>
              <p className="urssaf-muted">
                Estimation d&apos;après les taux que tu as saisis. Le montant officiel est celui que
                l&apos;URSSAF calcule après ta déclaration.
              </p>
            </div>
          )}

          {Object.keys(totaux.parMois || {}).length > 1 && (
            <div className="urssaf-mois">
              {Object.entries(totaux.parMois).sort(([a], [b]) => a.localeCompare(b)).map(([mois, m]) => (
                <div key={mois} className="urssaf-mois-row">
                  <span>{mois}</span><strong>{formatMontant(m)}</strong>
                </div>
              ))}
            </div>
          )}

          {(data.historique || []).some(h => h.periode.cloturee) && (
            <div className="urssaf-histo">
              <div className="urssaf-histo-titre">Mes déclarations</div>
              {data.historique.filter(h => h.periode.cloturee).map(h => (
                <Link key={h.periode.id} href={`/revenus/declaration/${h.periode.id}`} className="urssaf-histo-ligne">
                  <span className="urssaf-histo-label">{h.periode.label}</span>
                  <span className={`urssaf-histo-statut st-${h.statut}`}>
                    {h.statut === 'declaree' && <CheckCircle2 size={12} />}
                    {STATUTS[h.statut]?.label || h.statut}
                    {h.montantDeclare != null ? ` · ${h.montantDeclare} €` : ''}
                  </span>
                </Link>
              ))}
            </div>
          )}

          <div className="urssaf-actions">
            <button onClick={telechargerLivre} className="izi-btn izi-btn-ghost" disabled={telechargement}>
              {telechargement ? <Loader2 size={14} className="spin" /> : <FileText size={14} />}
              Livre des recettes (PDF)
            </button>
            <Link href="/parametres?tab=profil&s=activite" className="urssaf-lien">Modifier mes réglages</Link>
          </div>
          <p className="urssaf-muted">
            Le livre des recettes est le registre chronologique que tu dois tenir en micro-entreprise.
            Il reprend chaque encaissement de la période, avec sa référence et son mode de règlement.
          </p>
        </div>
      )}

      <style jsx>{`
        .urssaf-card { padding: 16px; display: flex; flex-direction: column; gap: 12px; }
        .urssaf-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
        .urssaf-title { display: flex; align-items: center; gap: 7px; font-size: 0.9375rem; font-weight: 700; color: var(--text-primary); }
        .urssaf-select {
          border: 1px solid var(--border); border-radius: var(--radius-full);
          padding: 5px 10px; font-size: 0.8125rem; font-weight: 600;
          background: var(--bg-card); color: var(--text-secondary); max-width: 100%;
        }
        .urssaf-main { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
        .urssaf-label { font-size: 0.75rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; }
        .urssaf-montant { font-size: 2rem; font-weight: 800; color: var(--brand); line-height: 1.15; margin: 2px 0; }
        .urssaf-muted { font-size: 0.75rem; color: var(--text-muted); margin: 0; }
        .urssaf-copy { flex-shrink: 0; }
        .urssaf-echeance {
          font-size: 0.8125rem; font-weight: 600; color: var(--text-secondary);
          background: var(--brand-light); border-radius: var(--radius-md); padding: 8px 10px;
        }
        .urssaf-echeance.retard { background: #fee2e2; color: #b91c1c; }
        .urssaf-toggle {
          display: flex; align-items: center; gap: 5px; background: none; border: none; cursor: pointer;
          font-size: 0.8125rem; font-weight: 600; color: var(--brand); padding: 0; align-self: flex-start;
        }
        .urssaf-detail { display: flex; flex-direction: column; gap: 12px; border-top: 1px solid var(--border); padding-top: 12px; }
        .urssaf-estim-title { font-size: 0.8125rem; font-weight: 700; color: var(--text-primary); margin-bottom: 6px; }
        .urssaf-estim-row { display: flex; justify-content: space-between; gap: 12px; font-size: 0.8125rem; color: var(--text-secondary); padding: 3px 0; }
        .urssaf-estim-row.total { border-top: 1px solid var(--border); margin-top: 4px; padding-top: 6px; color: var(--text-primary); }
        .urssaf-mois { display: flex; flex-direction: column; gap: 2px; }
        .urssaf-mois-row { display: flex; justify-content: space-between; font-size: 0.8125rem; color: var(--text-secondary); }
        .urssaf-actions { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
        .urssaf-ecart { display: flex; align-items: flex-start; gap: 7px; font-size: 0.8125rem; background: #fef3c7; color: #92400e; border-radius: var(--radius-md); padding: 8px 10px; }
        .urssaf-liens { display: flex; gap: 10px; flex-wrap: wrap; }
        .urssaf-histo { display: flex; flex-direction: column; gap: 2px; }
        .urssaf-histo-titre { font-size: 0.8125rem; font-weight: 700; color: var(--text-primary); margin-bottom: 4px; }
        @media (max-width: 480px) {
          .urssaf-montant { font-size: 1.75rem; }
          .urssaf-copy { width: 100%; justify-content: center; }
        }
      `}</style>
      <StylesGlobaux />
    </div>
  );
}

// .urssaf-invite et .urssaf-lien stylent un <Link> (COMPOSANT) : une règle
// scopée ne les atteint jamais, styled-jsx ne hashe que les éléments DOM
// natifs (piège maison, bible §12 — le bandeau sortait en lien bleu souligné).
// Extrait dans son propre composant parce que les DEUX branches de rendu en
// ont besoin : la première version ne le montait que dans la branche
// « configurée », donc l'invitation était nue, ce qu'une capture a montré.
function StylesGlobaux() {
  return (
    <style jsx global>{`
      .urssaf-invite {
        display: flex; align-items: center; gap: 12px; padding: 12px 14px;
        text-decoration: none; color: var(--text-primary);
      }
      .urssaf-invite:hover { border-color: var(--brand); }
      .urssaf-invite strong { display: block; font-size: 0.875rem; font-weight: 700; }
      .urssaf-invite em { display: block; font-style: normal; font-size: 0.8125rem; color: var(--text-muted); }
      .urssaf-invite span { flex: 1; min-width: 0; }
      .urssaf-invite > svg:first-child { color: var(--brand); flex-shrink: 0; }
      .urssaf-invite > svg:last-child { color: var(--text-muted); flex-shrink: 0; }
      .urssaf-cta {
        display: inline-flex; align-items: center; gap: 7px;
        padding: 8px 14px; border-radius: var(--radius-full);
        border: 1px solid var(--brand); color: var(--brand);
        font-size: 0.8125rem; font-weight: 700; text-decoration: none;
      }
      .urssaf-cta:hover { background: var(--brand-light); }
      .urssaf-histo-ligne {
        display: flex; align-items: center; justify-content: space-between; gap: 10px;
        padding: 6px 8px; border-radius: var(--radius-md);
        text-decoration: none; font-size: 0.8125rem; color: var(--text-secondary);
      }
      .urssaf-histo-ligne:hover { background: var(--brand-light); }
      .urssaf-histo-statut { display: inline-flex; align-items: center; gap: 4px; font-weight: 600; color: var(--text-muted); }
      .urssaf-histo-statut.st-declaree { color: #166534; }
      .urssaf-histo-statut.st-en_retard { color: #b91c1c; }
      .urssaf-lien { font-size: 0.8125rem; font-weight: 600; color: var(--brand); text-decoration: none; }
      .urssaf-lien:hover { text-decoration: underline; }
    `}</style>
  );
}

'use client';

// Carte « Ma déclaration URSSAF » (v93). FRANCE SEULEMENT : la rubrique est
// masquée par lib/parametres-rubriques quand le pays n'a pas de déclaration
// automatisable (v105), et la carte le re-vérifie (le commentaire ne suffit
// pas, leçon du proof pays). Découpe mécanique de page.js.
import { Landmark } from 'lucide-react';
import { aDeclarationAutomatisable } from '@/lib/pays';
import { REGIMES, PERIODICITES, configUrssafAffichee, sanitizeConfigUrssaf } from '@/lib/urssaf';
import { useParametres, BtnSauver } from '../ParametresContext';

export default function UrssafCarte() {
  const { profile, setUrssaf } = useParametres();
  if (!aDeclarationAutomatisable(profile?.pays)) return null;
  const u = configUrssafAffichee(profile.urssaf_config);
  const configuree = !!sanitizeConfigUrssaf(profile.urssaf_config);

  return (
    <div className="section izi-card">
      <div className="section-top"><div className="section-icon"><Landmark size={20} /></div><h2>Ma déclaration URSSAF</h2></div>
      <p className="section-desc">
        Dis-nous comment tu déclares : IziSolo te prépare le montant à recopier à chaque échéance,
        sur la page <strong>Revenus</strong>. On compte ce que tu as <strong>réellement encaissé</strong>,
        jamais ce qui est encore dû.
      </p>

      <div className="form-group">
        <label className="form-label">Ton régime</label>
        <select className="izi-input" value={u.regime} onChange={e => setUrssaf('regime', e.target.value)}>
          {Object.entries(REGIMES).map(([k, r]) => (
            <option key={k} value={k}>{r.label}</option>
          ))}
        </select>
        <p className="form-hint">{REGIMES[u.regime]?.hint}</p>
      </div>

      <div className="form-group">
        <label className="form-label">Tu déclares</label>
        <select className="izi-input" value={u.periodicite} onChange={e => setUrssaf('periodicite', e.target.value)}>
          {Object.entries(PERIODICITES).map(([k, p]) => (
            <option key={k} value={k}>{p.label}</option>
          ))}
        </select>
        <p className="form-hint">Le choix que tu as fait à ta création d'entreprise. Il fixe tes échéances.</p>
      </div>

      {u.regime !== 'autre' && (
        <>
          <div className="urssaf-taux-row">
            <div className="form-group">
              <label className="form-label">Taux de cotisations</label>
              <div className="urssaf-pct">
                <input className="izi-input" type="number" step="0.1" min="0" max="100" value={u.taux_cotisations} onChange={e => setUrssaf('taux_cotisations', e.target.value)} />
                <span>%</span>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Formation pro (CFP)</label>
              <div className="urssaf-pct">
                <input className="izi-input" type="number" step="0.05" min="0" max="100" value={u.taux_cfp} onChange={e => setUrssaf('taux_cfp', e.target.value)} />
                <span>%</span>
              </div>
            </div>
          </div>
          <p className="form-hint" style={{ marginTop: '-4px' }}>
            Ces taux changent d&apos;une année à l&apos;autre et selon ta caisse de retraite.
            Recopie ceux de ton compte <a href="https://www.autoentrepreneur.urssaf.fr" target="_blank" rel="noopener noreferrer">autoentrepreneur.urssaf.fr</a>.
            Ce que t&apos;affiche IziSolo reste une estimation, jamais un montant officiel.
          </p>

          <div className="form-group">
            <label className="izi-check">
              <input type="checkbox" checked={!!u.versement_liberatoire} onChange={e => setUrssaf('versement_liberatoire', e.target.checked)} />
              <span>J&apos;ai opté pour le versement libératoire de l&apos;impôt</span>
            </label>
            {u.versement_liberatoire && (
              <div className="urssaf-pct" style={{ marginTop: 8, maxWidth: 160 }}>
                <input className="izi-input" type="number" step="0.1" min="0" max="10" value={u.taux_liberatoire} onChange={e => setUrssaf('taux_liberatoire', e.target.value)} />
                <span>%</span>
              </div>
            )}
          </div>
        </>
      )}

      <div className="form-group">
        <label className="izi-check">
          <input type="checkbox" checked={u.rappel_email !== false} onChange={e => setUrssaf('rappel_email', e.target.checked)} />
          <span>Préviens-moi par email quand c&apos;est l&apos;heure de déclarer</span>
        </label>
        <p className="form-hint">Un seul email par période, le lendemain de sa clôture, avec le montant déjà calculé.</p>
      </div>

      {!configuree && (
        <p className="form-hint" style={{ color: 'var(--c-accent-deep, #8a5a2b)' }}>
          Enregistre pour activer ton récapitulatif sur la page Revenus.
        </p>
      )}
      <BtnSauver carte="urssaf" />
    </div>
  );
}

'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { FAMILLES, STATUTS, compteurs, trier, filtrer, occasionsProches, relancesDues } from '@/lib/hors-les-murs';
import { carte, bandeau, bouton, champ, etiquette, lien, pastille, fmtDate } from './styles';

const KM = [0, 15, 30, 60];

export default function HorsLesMursClient({ fiches, migrationManquante, erreurLecture }) {
  const [famille, setFamille] = useState('toutes');
  const [statut, setStatut] = useState('actives');
  const [prio, setPrio] = useState(0);
  const [kmMax, setKmMax] = useState(0);
  const [q, setQ] = useState('');

  const c = useMemo(() => compteurs(fiches), [fiches]);
  const occasions = useMemo(() => occasionsProches(fiches), [fiches]);
  const relances = useMemo(() => relancesDues(fiches), [fiches]);
  const visibles = useMemo(() => trier(filtrer(fiches, { famille, statut, prio, kmMax, q })), [fiches, famille, statut, prio, kmMax, q]);

  return (
    <div>
      <h1 style={{ margin: '0 0 6px' }}>🌿 Hors les murs</h1>
      <p style={{ color: '#999', fontSize: '0.9rem', margin: '0 0 6px', maxWidth: 760 }}>
        Des lieux qui ont déjà leur public, un mini-projet pour chacun, et un email prêt à partir de ta boîte (maude@maude-yoga.com).
        Tu ouvres une piste, tu lis, puis tu demandes une modif ou tu valides et tu envoies tel quel. Ensuite tu notes ce qu'il se passe.
      </p>
      <p style={{ color: '#666', fontSize: '0.8rem', margin: '0 0 18px' }}>
        Chaque fiche a été vérifiée sur la page de l&apos;exploitant le jour de sa rédaction. Le mode d&apos;emploi : <Link href="/admin/guides/hors-les-murs" style={lien}>guide « Hors les murs »</Link>.
      </p>

      {migrationManquante && (
        <div style={bandeau}>Migration <code>v118</code> pas encore appliquée : tu peux tout lire, mais tes validations et tes commentaires ne sont pas enregistrés pour l&apos;instant.</div>
      )}
      {erreurLecture && <div style={{ ...bandeau, background: '#4a1414', color: '#f87171' }}>Lecture du suivi en échec : {erreurLecture}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 18 }}>
        <Stat label="À relire" valeur={c.a_relire} sub={c.a_relire_prio1 ? `dont ${c.a_relire_prio1} en priorité 1` : ''} ton="warning" />
        <Stat label="Prêts à partir" valeur={c.valide} ton="success" />
        <Stat label="Modif demandée" valeur={c.modif_demandee} ton="info" />
        <Stat label="Envoyés" valeur={c.envoye} />
        <Stat label="Réponses" valeur={c.repondu + c.en_cours} ton="success" />
        <Stat label="Écartés" valeur={c.ecarte} />
      </div>

      {(occasions.length > 0 || relances.length > 0) && (
        <div style={{ ...carte, borderColor: '#5a4020' }}>
          <div style={etiquette}>Cette semaine</div>
          {occasions.map((f) => (
            <div key={f.id} style={ligneAgenda}>
              <span style={{ ...pastille('warning'), minWidth: 74, textAlign: 'center' }}>{f.joursRestants === 0 ? 'aujourd’hui' : `J − ${f.joursRestants}`}</span>
              <span style={{ flex: 1 }}>
                <Link href={`/admin/hors-les-murs/${f.id}`} style={{ ...lien, fontWeight: 600 }}>{f.nom}</Link>
                <span style={{ color: '#888' }}> · {fmtDate(f.echeance)} · {f.now}</span>
              </span>
            </div>
          ))}
          {relances.map((f) => (
            <div key={`r-${f.id}`} style={ligneAgenda}>
              <span style={{ ...pastille('info'), minWidth: 74, textAlign: 'center' }}>relance</span>
              <span style={{ flex: 1 }}>
                <Link href={`/admin/hors-les-murs/${f.id}`} style={{ ...lien, fontWeight: 600 }}>{f.nom}</Link>
                <span style={{ color: '#888' }}> · envoyé le {fmtDate(f.envoye_at)}, sans réponse depuis dix jours : un petit mot, une seule fois</span>
              </span>
            </div>
          ))}
        </div>
      )}

      <div style={{ ...carte, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          <Chip actif={famille === 'toutes'} onClick={() => setFamille('toutes')}>Tout</Chip>
          {Object.entries(FAMILLES).map(([k, v]) => <Chip key={k} actif={famille === k} onClick={() => setFamille(k)}>{v.court}</Chip>)}
        </div>
        <select value={statut} onChange={(e) => setStatut(e.target.value)} style={champ} aria-label="Statut">
          <option value="actives">Toutes sauf écartées</option>
          <option value="tous">Toutes</option>
          {Object.entries(STATUTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={prio} onChange={(e) => setPrio(Number(e.target.value))} style={champ} aria-label="Priorité">
          <option value={0}>Toutes priorités</option>
          <option value={1}>Priorité 1</option><option value={2}>Priorité 2</option><option value={3}>Priorité 3</option>
        </select>
        <select value={kmMax} onChange={(e) => setKmMax(Number(e.target.value))} style={champ} aria-label="Distance">
          {KM.map((k) => <option key={k} value={k}>{k ? `≤ ${k} km` : 'Toute distance'}</option>)}
        </select>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chercher un lieu, une commune…" style={{ ...champ, minWidth: 220, flex: 1 }} aria-label="Recherche" />
      </div>

      <div style={{ color: '#777', fontSize: '0.8rem', margin: '0 0 8px' }}>{visibles.length} piste{visibles.length > 1 ? 's' : ''} sur {c.total}</div>

      <div style={{ display: 'grid', gap: 8 }}>
        {visibles.map((f) => (
          <Link key={f.id} href={`/admin/hors-les-murs/${f.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{ ...carte, marginBottom: 0, padding: '12px 16px', display: 'grid', gridTemplateColumns: '1fr auto', gap: '4px 14px', alignItems: 'center', borderColor: f.statut === 'valide' ? '#2f7a4a' : '#2e2e2e' }}>
              <div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                  <strong style={{ color: '#e8e8e8', fontSize: '0.98rem' }}>{f.nom}</strong>
                  <span style={pastille(STATUTS[f.statut]?.ton)}>{STATUTS[f.statut]?.label}</span>
                  <span style={{ ...pastille(f.prio === 1 ? 'warning' : 'neutral'), background: f.prio === 1 ? '#4a2e10' : '#242424', color: f.prio === 1 ? '#f5b878' : '#888' }}>P{f.prio}</span>
                  {f.texteModifie && <span style={pastille('info')}>texte retouché</span>}
                </div>
                <div style={{ color: '#9a9a9a', fontSize: '0.82rem', marginTop: 3 }}>
                  {f.lieu} · ≈ {f.km} km · {FAMILLES[f.cat]?.court}
                  {f.titreProjet ? <span style={{ color: '#c9a37a' }}> · {f.titreProjet}</span> : null}
                  {f.prixProjet ? <span> · {f.prixProjet.split(/[;.]/)[0]}</span> : null}
                </div>
              </div>
              <span style={{ ...bouton, fontSize: '0.78rem', padding: '6px 10px', whiteSpace: 'nowrap' }}>{STATUTS[f.statut]?.action} →</span>
            </div>
          </Link>
        ))}
        {visibles.length === 0 && <div style={{ ...carte, color: '#888' }}>Rien avec ces filtres.</div>}
      </div>
    </div>
  );
}

function Chip({ actif, onClick, children }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={actif}
      style={{ ...bouton, padding: '6px 11px', fontSize: '0.8rem', background: actif ? '#b87333' : '#262626', borderColor: actif ? '#b87333' : '#3a3a3a', color: actif ? '#fff' : '#ccc' }}>
      {children}
    </button>
  );
}

function Stat({ label, valeur, sub, ton }) {
  const couleur = { warning: '#fbbf24', info: '#60a5fa', success: '#4ade80' }[ton] || '#e8e8e8';
  return (
    <div style={{ ...carte, marginBottom: 0, padding: '12px 14px' }}>
      <div style={etiquette}>{label}</div>
      <div style={{ fontSize: '1.6rem', fontWeight: 700, color: couleur, lineHeight: 1.1 }}>{valeur}</div>
      {sub ? <div style={{ color: '#777', fontSize: '0.75rem', marginTop: 3 }}>{sub}</div> : null}
    </div>
  );
}

const ligneAgenda = { display: 'flex', gap: 10, alignItems: 'center', padding: '6px 0', borderTop: '1px solid #2a2a2a', fontSize: '0.88rem' };

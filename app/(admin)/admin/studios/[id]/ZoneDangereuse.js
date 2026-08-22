'use client';

import { useState } from 'react';

/**
 * Zone dangereuse de la fiche studio : suppression DÉFINITIVE du compte.
 *
 * Trois écrans, dans cet ordre, et jamais de raccourci :
 *   1. rien (un bouton discret) ;
 *   2. l'INVENTAIRE de ce qui va disparaître, avec les avertissements et la
 *      liste honnête de ce qui survivra ;
 *   3. le nom du studio à retaper.
 *
 * L'inventaire est une route séparée en lecture seule : ouvrir ce panneau ne
 * peut rien casser.
 */
export default function ZoneDangereuse({ profileId, studioNom }) {
  const [ouvert, setOuvert] = useState(false);
  const [chargement, setChargement] = useState(false);
  const [inv, setInv] = useState(null);
  const [erreur, setErreur] = useState('');
  const [saisie, setSaisie] = useState('');
  const [orphelins, setOrphelins] = useState(true);
  const [suppression, setSuppression] = useState(false);
  const [fini, setFini] = useState(null);

  const ouvrir = async () => {
    setOuvert(true);
    setChargement(true);
    setErreur('');
    try {
      const res = await fetch('/api/admin/studios/inventaire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || `Erreur ${res.status}`);
      setInv(json);
    } catch (err) {
      setErreur(String(err.message || err));
    } finally {
      setChargement(false);
    }
  };

  const supprimer = async () => {
    setSuppression(true);
    setErreur('');
    try {
      const res = await fetch('/api/admin/studios/supprimer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId, confirmation: saisie, supprimerOrphelins: orphelins }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || `Erreur ${res.status}`);
      setFini(json);
    } catch (err) {
      setErreur(String(err.message || err));
    } finally {
      setSuppression(false);
    }
  };

  const nomAttendu = (studioNom || '').trim();
  const peutSupprimer = nomAttendu
    && saisie.trim().replace(/\s+/g, ' ') === nomAttendu.replace(/\s+/g, ' ')
    && (inv?.refus || []).length === 0;

  const carte = { border: '1px solid #7f1d1d', borderRadius: '10px', background: '#1a1013', padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' };
  const btnDanger = { padding: '8px 14px', borderRadius: '8px', border: '1px solid #7f1d1d', background: '#2a1216', color: '#fca5a5', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' };
  const btnNeutre = { padding: '8px 14px', borderRadius: '8px', border: '1px solid #2d2d3f', background: '#1a1a28', color: '#cbd5e1', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' };
  const titre = { color: '#f87171', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' };

  if (fini) {
    return (
      <div style={carte}>
        <div style={titre}>Studio supprimé</div>
        <div style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>{fini.resume}</div>
        {fini.avertissement && (
          <div style={{ color: '#fbbf24', fontSize: '0.8rem' }}>{fini.avertissement}</div>
        )}
        {(fini.orphelinsEchoues || []).length > 0 && (
          <div style={{ color: '#fbbf24', fontSize: '0.8rem' }}>
            Comptes élèves non supprimés : {fini.orphelinsEchoues.join(', ')}
          </div>
        )}
        <a href="/admin/users" style={{ ...btnNeutre, textDecoration: 'none', display: 'inline-block', width: 'fit-content' }}>
          ← Retour à la liste des comptes
        </a>
      </div>
    );
  }

  if (!ouvert) {
    return (
      <div style={carte}>
        <div style={titre}>Zone dangereuse</div>
        <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
          Supprimer ce studio efface définitivement le compte et TOUT ce qu&apos;il contient.
          Il n&apos;y a pas de corbeille.
        </div>
        <button type="button" style={{ ...btnDanger, width: 'fit-content' }} onClick={ouvrir}>
          🗑 Supprimer ce studio…
        </button>
      </div>
    );
  }

  const i = inv?.inventaire || {};
  const nb = (v) => (v === null || v === undefined ? '?' : v);
  const lignes = [
    ['Élèves', i.clients],
    ['Séances', i.cours],
    ['Offres', i.offres],
    ['Carnets & abos', i.abonnements],
    ['Présences', i.presences],
    ['Paiements', i.paiements],
    ['Factures émises', i.factures],
    ['Conversations', i.conversations],
  ];

  return (
    <div style={carte}>
      <div style={titre}>Zone dangereuse · suppression définitive</div>

      {chargement && <div style={{ color: '#94a3b8', fontSize: '0.82rem' }}>Inventaire en cours…</div>}

      {inv && (
        <>
          <div style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>
            <strong>{inv.profil.studio_nom || 'Studio sans nom'}</strong>
            {inv.profil.email ? ` · ${inv.profil.email}` : ''}
            {inv.profil.est_test ? ' · compte de test' : ''}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '6px' }}>
            {lignes.map(([label, valeur]) => (
              <div key={label} style={{ background: '#12121c', borderRadius: '6px', padding: '7px 10px' }}>
                <div style={{ color: '#64748b', fontSize: '0.7rem' }}>{label}</div>
                <div style={{ color: nb(valeur) ? '#e2e8f0' : '#475569', fontSize: '0.95rem', fontWeight: 700 }}>{nb(valeur)}</div>
              </div>
            ))}
            <div style={{ background: '#12121c', borderRadius: '6px', padding: '7px 10px' }}>
              <div style={{ color: '#64748b', fontSize: '0.7rem' }}>Encaissé</div>
              <div style={{ color: i.encaisse ? '#4ade80' : '#475569', fontSize: '0.95rem', fontWeight: 700 }}>
                {i.encaisse === null ? '?' : `${i.encaisse} €`}
              </div>
            </div>
          </div>

          {(inv.refus || []).length > 0 && (
            <div style={{ border: '1px solid #7f1d1d', borderRadius: '8px', padding: '10px', background: '#2a1216' }}>
              <div style={{ color: '#fca5a5', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>Suppression impossible</div>
              {inv.refus.map((r, k) => (
                <div key={k} style={{ color: '#fecaca', fontSize: '0.8rem' }}>{r}</div>
              ))}
            </div>
          )}

          {(inv.avertissements || []).map((a, k) => (
            <div key={k} style={{ color: a.niveau === 'grave' ? '#f87171' : '#fbbf24', fontSize: '0.8rem' }}>
              {a.niveau === 'grave' ? '🔴' : '🟠'} {a.texte}
            </div>
          ))}

          {inv.orphelinsPotentiels !== 0 && (
            <label style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', color: '#cbd5e1', fontSize: '0.8rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={orphelins}
                onChange={e => setOrphelins(e.target.checked)}
                style={{ marginTop: '2px' }}
              />
              <span>
                Supprimer aussi les <strong>{inv.orphelinsPotentiels === null ? '?' : inv.orphelinsPotentiels} compte(s) élève</strong> qui
                n&apos;auront plus aucune fiche nulle part. Ceux qui appartiennent aussi à un autre studio sont laissés intacts.
              </span>
            </label>
          )}

          <details>
            <summary style={{ color: '#64748b', fontSize: '0.78rem', cursor: 'pointer' }}>Ce que la suppression ne fait PAS</summary>
            <ul style={{ color: '#64748b', fontSize: '0.78rem', margin: '6px 0 0', paddingLeft: '18px' }}>
              {(inv.ceQuiReste || []).map((c, k) => <li key={k}>{c}</li>)}
            </ul>
          </details>

          {(inv.refus || []).length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ color: '#94a3b8', fontSize: '0.78rem' }}>
                Retape le nom du studio pour confirmer : <strong style={{ color: '#e2e8f0' }}>{nomAttendu || '(ce studio n\'a pas de nom, suppression bloquée)'}</strong>
              </label>
              <input
                value={saisie}
                onChange={e => setSaisie(e.target.value)}
                placeholder={nomAttendu}
                autoComplete="off"
                style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #2d2d3f', background: '#12121c', color: '#e2e8f0', fontSize: '0.85rem' }}
              />
            </div>
          )}
        </>
      )}

      {erreur && <div style={{ color: '#f87171', fontSize: '0.8rem' }} role="alert">{erreur}</div>}

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button type="button" style={btnNeutre} onClick={() => { setOuvert(false); setSaisie(''); setErreur(''); }} disabled={suppression}>
          Annuler
        </button>
        <button
          type="button"
          style={{ ...btnDanger, opacity: peutSupprimer && !suppression ? 1 : 0.4, cursor: peutSupprimer && !suppression ? 'pointer' : 'not-allowed' }}
          onClick={supprimer}
          disabled={!peutSupprimer || suppression}
        >
          {suppression ? 'Suppression…' : 'Supprimer définitivement'}
        </button>
      </div>
    </div>
  );
}

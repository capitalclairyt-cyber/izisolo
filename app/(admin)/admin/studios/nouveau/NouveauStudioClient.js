'use client';

import { useState } from 'react';
import Link from 'next/link';

/**
 * Studio CONCIERGE — le cockpit de la visio : créer le studio de la
 * prospecte, ouvrir le lien de connexion pour le paramétrer devant elle,
 * puis lui envoyer le lien d'appropriation (elle choisit son mot de passe).
 * Toujours avec son accord : elle est en visio, on lui dit ce qu'on fait.
 */
const METIERS = [
  ['yoga', 'Yoga'], ['pilates', 'Pilates'], ['danse', 'Danse'],
  ['musique', 'Musique'], ['coaching', 'Coaching'], ['arts', 'Arts'],
  ['autre', 'Autre'],
];

export default function NouveauStudioClient() {
  const [prenom, setPrenom] = useState('');
  const [email, setEmail] = useState('');
  const [studioNom, setStudioNom] = useState('');
  const [metier, setMetier] = useState('yoga');
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState('');
  const [resultat, setResultat] = useState(null); // { profileId, slug, loginLink }
  const [copie, setCopie] = useState(false);
  const [appropriation, setAppropriation] = useState(''); // '' | 'envoi' | 'ok' | message d'erreur

  const creer = async (e) => {
    e.preventDefault();
    setOccupe(true);
    setErreur('');
    try {
      const res = await fetch('/api/admin/studios/creer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prenom, email, studioNom, metier }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || `Erreur ${res.status}`);
      setResultat(json);
    } catch (err) {
      setErreur(String(err.message || err));
    } finally {
      setOccupe(false);
    }
  };

  const copierLien = async () => {
    if (!resultat?.loginLink) return;
    try {
      await navigator.clipboard.writeText(resultat.loginLink);
      setCopie(true);
      setTimeout(() => setCopie(false), 2500);
    } catch { /* clipboard refusé : le lien reste sélectionnable */ }
  };

  const envoyerAppropriation = async () => {
    setAppropriation('envoi');
    try {
      const res = await fetch('/api/admin/studios/appropriation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: resultat.profileId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || `Erreur ${res.status}`);
      setAppropriation('ok');
    } catch (err) {
      setAppropriation(String(err.message || err));
    }
  };

  const champ = { display: 'block', width: '100%', maxWidth: 420, padding: '10px 12px', marginBottom: 12, background: '#1a1a28', border: '1px solid #2d2d3f', borderRadius: 8, color: '#e2e8f0', fontSize: '0.9rem' };
  const bouton = { padding: '10px 18px', border: 'none', borderRadius: 9, background: '#4ade80', color: '#0c1210', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer' };

  return (
    <div>
      <h1 className="admin-title" style={{ marginBottom: 4 }}>🎁 Créer un studio (concierge)</h1>
      <p style={{ maxWidth: 720, color: '#64748b', fontSize: '0.875rem', margin: '0 0 20px', lineHeight: 1.55 }}>
        Le geste de la visio : tu crées son studio, tu le paramètres devant elle
        avec le lien de connexion, et en fin d&apos;appel tu lui envoies le lien
        d&apos;appropriation (elle choisit son mot de passe). Son essai de 14 jours
        démarre à la création. À faire AVEC son accord, elle est en face.
      </p>

      {!resultat ? (
        <form onSubmit={creer} className="admin-card" style={{ maxWidth: 520 }}>
          <label style={{ color: '#94a3b8', fontSize: '0.8125rem' }}>Prénom de la prof</label>
          <input style={champ} value={prenom} onChange={e => setPrenom(e.target.value)} required maxLength={80} placeholder="Claire" />
          <label style={{ color: '#94a3b8', fontSize: '0.8125rem' }}>Son email (celui du compte)</label>
          <input style={champ} type="email" value={email} onChange={e => setEmail(e.target.value)} required maxLength={200} placeholder="claire@exemple.fr" />
          <label style={{ color: '#94a3b8', fontSize: '0.8125rem' }}>Nom du studio</label>
          <input style={champ} value={studioNom} onChange={e => setStudioNom(e.target.value)} required minLength={2} maxLength={120} placeholder="Studio Claire Yoga" />
          <label style={{ color: '#94a3b8', fontSize: '0.8125rem' }}>Activité</label>
          <select style={champ} value={metier} onChange={e => setMetier(e.target.value)}>
            {METIERS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          {erreur && <p style={{ color: '#f87171', fontSize: '0.8125rem' }} role="alert">{erreur}</p>}
          <button type="submit" style={bouton} disabled={occupe}>
            {occupe ? 'Création…' : 'Créer le studio'}
          </button>
        </form>
      ) : (
        <div className="admin-card" style={{ maxWidth: 640 }}>
          <p style={{ color: '#4ade80', fontWeight: 700, margin: '0 0 10px' }}>✅ Studio créé : {studioNom}</p>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: '0 0 14px' }}>
            Portail : <a href={`https://www.izisolo.fr/p/${resultat.slug}`} target="_blank" rel="noreferrer" style={{ color: '#60a5fa' }}>izisolo.fr/p/{resultat.slug}</a>
            {' '}· Fiche admin : <Link href={`/admin/studios/${resultat.profileId}`} style={{ color: '#60a5fa' }}>ouvrir</Link>
          </p>

          <p style={{ color: '#e2e8f0', fontWeight: 600, margin: '0 0 6px' }}>1. Paramétrer devant elle</p>
          <p style={{ color: '#94a3b8', fontSize: '0.8125rem', margin: '0 0 8px' }}>
            Ouvre ce lien de connexion une-fois DANS UN AUTRE NAVIGATEUR ou en
            navigation privée (pour ne pas toucher ta session capsule) : tu es
            elle, configure cours et offres en partage d&apos;écran.
          </p>
          {resultat.loginLink ? (
            <p style={{ display: 'flex', gap: 10, flexWrap: 'wrap', margin: '0 0 16px' }}>
              <button type="button" style={bouton} onClick={copierLien}>{copie ? 'Copié ✓' : 'Copier le lien de connexion'}</button>
              <a href={resultat.loginLink} target="_blank" rel="noreferrer" style={{ ...bouton, background: '#1e3a5f', color: '#60a5fa', textDecoration: 'none' }}>Ouvrir</a>
            </p>
          ) : (
            <p style={{ color: '#fb923c', fontSize: '0.8125rem' }}>Lien non généré (regénérable depuis la fiche studio).</p>
          )}

          <p style={{ color: '#e2e8f0', fontWeight: 600, margin: '0 0 6px' }}>2. En fin de visio : elle s&apos;approprie</p>
          <p style={{ color: '#94a3b8', fontSize: '0.8125rem', margin: '0 0 8px' }}>
            Elle reçoit « {studioNom} est prêt » avec le lien pour choisir son
            mot de passe. Ensuite, guide-la pour installer l&apos;app sur son
            téléphone, et la visio est finie.
          </p>
          {appropriation === 'ok' ? (
            <p style={{ color: '#4ade80', fontWeight: 600 }}>✉️ Email d&apos;appropriation envoyé.</p>
          ) : (
            <>
              <button type="button" style={{ ...bouton, background: '#c98a4b', color: '#1a1612' }} onClick={envoyerAppropriation} disabled={appropriation === 'envoi'}>
                {appropriation === 'envoi' ? 'Envoi…' : "Envoyer le lien d'appropriation"}
              </button>
              {appropriation && appropriation !== 'envoi' && (
                <p style={{ color: '#f87171', fontSize: '0.8125rem', marginTop: 8 }} role="alert">{appropriation}</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

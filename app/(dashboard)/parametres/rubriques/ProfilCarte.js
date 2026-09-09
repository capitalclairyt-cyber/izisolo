'use client';

import { User, Mail, Home } from 'lucide-react';
import { useParametres, BtnSauver } from '../ParametresContext';

/** Carte « Mon profil » : la personne, pas le studio (découpe de page.js). */
export default function ProfilCarte() {
  const { profile, handleChange } = useParametres();
  return (
    <div className="section izi-card">
      <div className="section-top"><div className="section-icon"><User size={20} /></div><h2>Mon profil</h2></div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Prénom</label>
          <input className="izi-input" value={profile.prenom || ''} onChange={handleChange('prenom')} />
        </div>
        <div className="form-group">
          <label className="form-label">Nom</label>
          <input className="izi-input" value={profile.nom || ''} onChange={handleChange('nom')} />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label"><Mail size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }} />Email de contact</label>
        <input className="izi-input" type="email" value={profile.email_contact || ''} onChange={handleChange('email_contact')} placeholder="ton@email.com" />
        <p className="form-hint">C'est l'email affiché à tes élèves (portail, emails envoyés en ton nom). Il ne change pas ton email de connexion.</p>
      </div>
      <div className="form-group">
        <label className="form-label">Téléphone</label>
        <input className="izi-input" value={profile.telephone || ''} onChange={handleChange('telephone')} />
      </div>
      <div className="form-group">
        <label className="form-label"><Home size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }} />Adresse</label>
        <input className="izi-input" value={profile.adresse || ''} onChange={handleChange('adresse')} placeholder="Adresse postale" />
      </div>
      <BtnSauver carte="profil" />
    </div>
  );
}

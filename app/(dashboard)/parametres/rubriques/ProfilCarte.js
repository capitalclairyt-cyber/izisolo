'use client';

import { User, Mail, Home } from 'lucide-react';
import { resumeCarte } from '@/lib/parametres-rubriques';
import { useParametres, BtnSauver } from '../ParametresContext';
import CarteReglage from '../CarteReglage';

/** Carte « Mon profil » : la personne, pas le studio. */
export default function ProfilCarte() {
  const { profile, handleChange } = useParametres();
  return (
    <CarteReglage id="profil" titre="Mon profil" icone={User} resume={resumeCarte('profil', profile)} ouverte>
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
        <p className="form-hint">Celui que voient tes élèves. Ton email de connexion ne change pas.</p>
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
    </CarteReglage>
  );
}

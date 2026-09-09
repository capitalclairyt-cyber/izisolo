'use client';

// Anniversaires — réduit au réel (B2e) : cloche J-1/J-0 → clic → messagerie
// préremplie avec ce message → envoi MANUEL. Lot 2 : carte repliée, le
// résumé dit si c'est activé.
import { Cake, ToggleLeft, ToggleRight } from 'lucide-react';
import { resumeCarte } from '@/lib/parametres-rubriques';
import { useParametres, BtnSauver } from '../ParametresContext';
import CarteReglage from '../CarteReglage';

export default function AnniversairesCarte() {
  const { profile, setProfile, handleChange, marquer } = useParametres();
  const actif = (profile.anniversaire_mode || 'semi') !== 'off';
  return (
    <CarteReglage id="anniv" titre="Anniversaires" icone={Cake} resume={resumeCarte('anniv', profile)}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          type="button"
          className="param-toggle-switch"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'inline-flex' }}
          onClick={() => {
            setProfile(prev => ({ ...prev, anniversaire_mode: actif ? 'off' : 'manuel' }));
            marquer('anniv');
          }}
          aria-pressed={actif}
          aria-label="Activer les alertes anniversaire"
        >
          {actif
            ? <ToggleRight size={30} style={{ color: 'var(--brand)' }} />
            : <ToggleLeft size={30} style={{ color: 'var(--border)' }} />}
        </button>
        <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{actif ? 'Activé' : 'Désactivé'}</span>
      </div>
      <p className="section-desc">
        La veille et le jour J, une alerte dans ta cloche ouvre la messagerie avec ce message prérempli. Rien ne part tout seul.
      </p>

      {actif && (
        <div className="form-group">
          <label className="form-label">Message d'anniversaire</label>
          <textarea
            className="izi-input anniv-textarea"
            value={profile.anniversaire_message || ''}
            onChange={handleChange('anniversaire_message')}
            rows={3}
            placeholder="Joyeux anniversaire {prenom} ! 🎂"
          />
          <p className="form-hint"><code>{'{prenom}'}</code> devient le prénom de l'élève.</p>
          <div className="anniv-preview">
            <span className="anniv-preview-label">Aperçu :</span>
            {(profile.anniversaire_message || '')
              .replace(/\{\{\s*prenom\s*\}\}/g, 'Sophie')
              .replace(/\{\s*prenom\s*\}/g, 'Sophie')
              .replace(/\{\{\s*nom\s*\}\}/g, 'Martin')
              .replace(/\{\s*nom\s*\}/g, 'Martin')}
          </div>
        </div>
      )}
      <BtnSauver carte="anniv" />
    </CarteReglage>
  );
}

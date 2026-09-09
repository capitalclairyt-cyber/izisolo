'use client';

// Anniversaires — réduit au réel (B2e) : cloche J-1/J-0 → clic → messagerie
// préremplie avec ce message → envoi MANUEL. Découpe mécanique de page.js.
import { Cake, ToggleLeft, ToggleRight } from 'lucide-react';
import { useParametres, BtnSauver } from '../ParametresContext';

export default function AnniversairesCarte() {
  const { profile, setProfile, handleChange, marquer } = useParametres();
  const actif = (profile.anniversaire_mode || 'semi') !== 'off';
  return (
    <div className="section izi-card">
      <div className="section-top">
        <div className="section-icon"><Cake size={20} /></div>
        <h2>Anniversaires</h2>
        <button
          type="button"
          className="param-toggle-switch"
          style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'inline-flex' }}
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
      </div>
      <p className="section-desc">
        La veille et le jour J de l'anniversaire d'un·e élève, tu reçois une
        alerte dans ta cloche. Un clic ouvre la messagerie avec ton message
        prérempli : tu n'as plus qu'à l'envoyer (rien ne part tout seul).
      </p>

      {actif && (
        <div className="form-group">
          <label className="form-label">Message d'anniversaire</label>
          <p className="form-hint" style={{ marginTop: 0 }}>
            Utilise <code>{'{prenom}'}</code> pour personnaliser avec le prénom de l'élève.
          </p>
          <textarea
            className="izi-input anniv-textarea"
            value={profile.anniversaire_message || ''}
            onChange={handleChange('anniversaire_message')}
            rows={4}
            placeholder="Joyeux anniversaire {prenom} ! 🎂"
          />
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
    </div>
  );
}

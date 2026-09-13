'use client';

import { useState, useEffect } from 'react';
import { BadgeCheck, Plus, Download, Loader2, Check, Trash2, X } from 'lucide-react';
import { useToast } from '@/components/ui/ToastProvider';
import { createClient } from '@/lib/supabase';
import { saisonsProposees, adhesionAJour } from '@/lib/vie-asso';

const MODES = [
  { value: 'especes', label: 'Espèces' },
  { value: 'cheque', label: 'Chèque' },
  { value: 'virement', label: 'Virement' },
  { value: 'CB', label: 'CB' },
];
const fmtJour = (d) => (d ? String(d).slice(0, 10).split('-').reverse().join('/') : '');
const aujourdhui = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });

/**
 * Le bloc « Adhésion » de la fiche d'une adhérente (v113, lot 3 Associations
 * & Studios). Une association le voit, un studio jamais (la page ne le rend
 * que pour une association). Trois gestes : voir la saison en cours, en
 * ENREGISTRER une (offre de type « adhésion », saison, payée ou à régler,
 * mode de règlement déclaré), télécharger le reçu de cotisation.
 *
 * Une adhésion ne donne droit à aucune séance : elle ne passe JAMAIS par le
 * tunnel des carnets, et le pointage ne la résout pas.
 */
export default function AdhesionFiche({ client, adhesionsInit = [] }) {
  const { toast } = useToast();
  const [adhesions, setAdhesions] = useState(adhesionsInit || []);
  const [ouvert, setOuvert] = useState(false);
  const [offres, setOffres] = useState(null);
  const [envoi, setEnvoi] = useState(false);
  const saisons = saisonsProposees(aujourdhui());
  const [form, setForm] = useState({ offre_id: '', saison: saisons[0]?.id || '', montant: '', paye: true, mode: '', date: aujourdhui() });
  const maj = (p) => setForm(f => ({ ...f, ...p }));

  useEffect(() => {
    if (!ouvert || offres !== null) return;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.from('offres').select('id, nom, prix, type, actif').eq('type', 'adhesion').eq('actif', true).order('prix', { ascending: true });
      const liste = data || [];
      setOffres(liste);
      if (liste[0]) setForm(f => ({ ...f, offre_id: liste[0].id, montant: String(liste[0].prix ?? '') }));
    })();
  }, [ouvert, offres]);

  const choisirOffre = (id) => {
    const o = (offres || []).find(x => x.id === id);
    maj({ offre_id: id, montant: o ? String(o.prix ?? '') : form.montant });
  };

  const enregistrer = async () => {
    setEnvoi(true);
    try {
      const res = await fetch('/api/adhesions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: client.id, offre_id: form.offre_id || null, saison: form.saison, montant: form.montant === '' ? undefined : form.montant, paye: form.paye, mode: form.paye ? (form.mode || undefined) : undefined, date: form.date }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error || 'Enregistrement impossible.'); return; }
      setAdhesions(prev => [data.adhesion, ...prev]);
      setOuvert(false);
      toast.success(`Adhésion ${data.adhesion.saison} enregistrée.`);
    } catch { toast.error('Enregistrement impossible, réessaie.'); }
    finally { setEnvoi(false); }
  };

  const annuler = async (a) => {
    if (!confirm(`Annuler l'adhésion ${a.saison} de ${client.prenom} ? Un règlement déjà encaissé reste enregistré ; un règlement en attente est retiré.`)) return;
    const res = await fetch(`/api/adhesions/${a.id}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { toast.error(data.error || 'Annulation impossible.'); return; }
    setAdhesions(prev => prev.filter(x => x.id !== a.id));
    toast.success('Adhésion annulée.');
  };

  const today = aujourdhui();
  const courante = adhesions.find(a => adhesionAJour(a, today));

  return (
    <div className="adh-bloc" data-testid="adhesion-fiche" data-etat={courante ? 'a_jour' : 'sans'}>
      <div className="adh-tete">
        <BadgeCheck size={16} />
        <strong>Adhésion</strong>
        {courante
          ? <span className="izi-badge izi-badge-success" data-testid="adhesion-a-jour">À jour · saison {courante.saison}</span>
          : <span className="izi-badge izi-badge-warning" data-testid="adhesion-sans">Pas d&apos;adhésion à jour</span>}
        <button type="button" className="izi-btn btn-sm izi-btn-secondary adh-btn" onClick={() => setOuvert(true)} data-testid="adhesion-ouvrir"><Plus size={14} /> Enregistrer une adhésion</button>
      </div>

      {adhesions.length > 0 && (
        <ul className="adh-liste">
          {adhesions.map(a => (
            <li key={a.id} className="adh-ligne" data-testid="adhesion-ligne">
              <span className="adh-nom">{a.offre_nom} · saison {a.saison}</span>
              <span className="adh-det">{fmtJour(a.date_debut)} → {fmtJour(a.date_fin)}{a.montant > 0 ? ` · ${a.montant} €` : ' · offerte'}</span>
              {a.paiement_id && <a className="adh-lien" href={`/api/adhesions/${a.id}/recu`} target="_blank" rel="noopener" data-testid="adhesion-recu"><Download size={12} /> Reçu de cotisation</a>}
              <button type="button" className="adh-lien adh-danger" onClick={() => annuler(a)} title="Annuler cette adhésion"><Trash2 size={12} /></button>
            </li>
          ))}
        </ul>
      )}

      {ouvert && (
        <div className="adh-overlay" onClick={() => !envoi && setOuvert(false)}>
          <div className="adh-modal" onClick={e => e.stopPropagation()} role="dialog" aria-label="Enregistrer une adhésion" data-testid="adhesion-modal">
            <div className="adh-modal-tete">
              <h3>Enregistrer une adhésion</h3>
              <button type="button" className="adh-fermer" onClick={() => setOuvert(false)} aria-label="Fermer"><X size={16} /></button>
            </div>
            <p className="adh-intro">Pour {client.prenom} {client.nom}. Une adhésion couvre une saison (septembre à août) et ne donne droit à aucune séance.</p>

            {offres === null ? (
              <p className="adh-intro"><Loader2 size={14} className="adh-spin" /> Chargement des offres…</p>
            ) : offres.length === 0 ? (
              <p className="adh-vide">Aucune offre de type « Adhésion » pour l&apos;instant. Crée-la d&apos;abord (Offres → Créer → Adhésion) : un tarif par offre (plein, réduit, famille). Tu peux aussi enregistrer une adhésion offerte ci-dessous, sans offre.</p>
            ) : (
              <label className="adh-champ">
                <span>Offre</span>
                <select value={form.offre_id} onChange={e => choisirOffre(e.target.value)} data-testid="adhesion-offre">
                  {offres.map(o => <option key={o.id} value={o.id}>{o.nom} · {o.prix} €</option>)}
                  <option value="">Sans offre (adhésion offerte ou tarif libre)</option>
                </select>
              </label>
            )}

            <div className="adh-grille">
              <label className="adh-champ">
                <span>Saison</span>
                <select value={form.saison} onChange={e => maj({ saison: e.target.value })} data-testid="adhesion-saison">
                  {saisons.map(s => <option key={s.id} value={s.id}>{s.label || s.id}</option>)}
                </select>
              </label>
              <label className="adh-champ">
                <span>Montant (€)</span>
                <input type="text" inputMode="decimal" value={form.montant} onChange={e => maj({ montant: e.target.value })} placeholder="0 = offerte" data-testid="adhesion-montant" />
              </label>
            </div>

            <div className="adh-paye">
              <button type="button" className={`adh-choix ${form.paye ? 'actif' : ''}`} onClick={() => maj({ paye: true })} data-testid="adhesion-payee">Payée</button>
              <button type="button" className={`adh-choix ${!form.paye ? 'actif' : ''}`} onClick={() => maj({ paye: false, mode: '' })} data-testid="adhesion-a-regler">À régler plus tard</button>
            </div>
            {form.paye && Number(String(form.montant).replace(',', '.')) > 0 && (
              <div className="adh-grille">
                <label className="adh-champ">
                  <span>Comment l&apos;argent est arrivé</span>
                  <select value={form.mode} onChange={e => maj({ mode: e.target.value })} data-testid="adhesion-mode">
                    <option value="">Choisir…</option>
                    {MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </label>
                <label className="adh-champ">
                  <span>Date</span>
                  <input type="date" value={form.date} onChange={e => maj({ date: e.target.value })} />
                </label>
              </div>
            )}

            <div className="adh-actions">
              <button type="button" className="izi-btn btn-sm izi-btn-ghost" onClick={() => setOuvert(false)} disabled={envoi}>Annuler</button>
              <button type="button" className="izi-btn btn-sm izi-btn-primary" onClick={enregistrer} disabled={envoi || offres === null} data-testid="adhesion-enregistrer">
                {envoi ? <Loader2 size={14} className="adh-spin" /> : <Check size={14} />} Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .adh-bloc { margin: 0 0 14px; padding: 12px 14px; border-radius: 12px; background: #fff; border: 1px solid rgba(0,0,0,.07); font-size: .86rem; }
        .adh-tete { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; color: #3730a3; }
        .adh-tete strong { color: var(--text, #2a2320); }
        .adh-btn { margin-left: auto; }
        .adh-liste { list-style: none; margin: 10px 0 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
        .adh-ligne { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding: 6px 0; border-top: 1px dashed rgba(0,0,0,.07); }
        .adh-nom { font-weight: 600; }
        .adh-det { color: var(--text-soft, #7a6f6a); font-size: .8rem; }
        .adh-lien { display: inline-flex; align-items: center; gap: 4px; background: none; border: none; padding: 0; font: inherit; font-size: .78rem; color: var(--brand, #b87333); cursor: pointer; text-decoration: underline; }
        .adh-danger { color: #b91c1c; margin-left: auto; text-decoration: none; }
        .adh-overlay { position: fixed; inset: 0; background: rgba(30,20,15,.45); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 16px; }
        .adh-modal { background: #fff; border-radius: 16px; padding: 20px; width: min(520px, 100%); max-height: 92vh; overflow: auto; box-shadow: 0 20px 60px rgba(0,0,0,.25); }
        .adh-modal-tete { display: flex; align-items: center; justify-content: space-between; }
        .adh-modal-tete h3 { margin: 0; font-size: 1.05rem; }
        .adh-fermer { background: none; border: none; cursor: pointer; color: var(--text-soft, #7a6f6a); padding: 4px; }
        .adh-intro { margin: 6px 0 12px; color: var(--text-soft, #7a6f6a); font-size: .82rem; line-height: 1.5; }
        .adh-vide { margin: 0 0 12px; padding: 10px 12px; border-radius: 10px; background: #fffbeb; border: 1px solid #fde68a; color: #92400e; font-size: .82rem; line-height: 1.5; }
        .adh-champ { display: flex; flex-direction: column; gap: 4px; margin-bottom: 10px; font-size: .82rem; }
        .adh-champ > span { color: var(--text-soft, #7a6f6a); font-size: .76rem; }
        .adh-champ select, .adh-champ input { padding: 8px 10px; border-radius: 8px; border: 1px solid rgba(0,0,0,.13); font: inherit; font-size: .88rem; background: #fff; color: inherit; }
        .adh-grille { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .adh-paye { display: flex; gap: 8px; margin: 2px 0 10px; }
        .adh-choix { flex: 1; padding: 8px; border-radius: 10px; border: 1px solid rgba(0,0,0,.13); background: #fff; font: inherit; font-size: .84rem; cursor: pointer; }
        .adh-choix.actif { border-color: var(--brand, #b87333); background: #fff7ed; font-weight: 600; }
        .adh-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }
        .adh-spin { animation: adh-rot 1s linear infinite; }
        @keyframes adh-rot { to { transform: rotate(360deg); } }
        @media (max-width: 560px) { .adh-grille { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}

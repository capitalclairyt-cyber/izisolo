'use client';

import { useEffect, useState } from 'react';
import { Building2, Send, Loader2, Copy, Check } from 'lucide-react';
import { useToast } from '@/components/ui/ToastProvider';
import { useStudios, useStudioId } from '@/components/studio/StudioProvider';
import { TYPES_INVITABLES } from '@/lib/parrainage';
import { TYPES_STRUCTURE } from '@/lib/structure';

/**
 * « Ailleurs » : les structures où JE donne cours, et le pont 1 (lot 1
 * Associations & Studios) : faire entrer mon association ou mon studio sur
 * IziSolo. Un geste de la PERSONNE, sans plan : une prof gratuite y a droit.
 *
 * L'email part à l'ADRESSE DE LA STRUCTURE (pas la sienne) : une structure a
 * son propre compte (§6.1), et à la création de son espace la prof y est
 * membre automatiquement. L'écran montre aussi le lien, pour qu'elle puisse
 * l'envoyer elle-même par message si l'email dort dans un spam.
 */
export default function Ailleurs() {
  const { toast } = useToast();
  const studios = useStudios();
  const studioId = useStudioId();
  const autres = (studios || []).filter(s => s.id !== studioId);
  const [ouvert, setOuvert] = useState(false);
  const [form, setForm] = useState({ nom: '', email: '', type: 'association', message: '' });
  const [envoi, setEnvoi] = useState(false);
  const [invitations, setInvitations] = useState([]);
  const [indisponible, setIndisponible] = useState(false);
  const [lien, setLien] = useState(null);
  const [copie, setCopie] = useState(false);

  useEffect(() => {
    let vivant = true;
    fetch('/api/structures/inviter')
      .then(r => r.json())
      .then(d => { if (vivant) { setInvitations(d.invitations || []); setIndisponible(!!d.indisponible); } })
      .catch(() => {});
    return () => { vivant = false; };
  }, []);

  const inviter = async () => {
    setEnvoi(true);
    try {
      const res = await fetch('/api/structures/inviter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error || "L'invitation n'a pas pu partir."); return; }
      setInvitations(prev => [data.invitation, ...prev]);
      setLien(data.lien);
      setForm({ nom: '', email: '', type: 'association', message: '' });
      toast.success(`Invitation envoyée à ${data.invitation.nom_structure}.`);
    } catch {
      toast.error("L'invitation n'a pas pu partir, réessaie.");
    } finally {
      setEnvoi(false);
    }
  };

  const copier = async () => {
    try { await navigator.clipboard.writeText(lien); setCopie(true); setTimeout(() => setCopie(false), 2000); } catch { /* rien */ }
  };

  const statutLisible = (s) => s === 'acceptee' ? 'Espace créé, tu y es' : s === 'annulee' ? 'Annulée' : 'Envoyée, en attente';

  return (
    <section className="ail-bloc" data-testid="ailleurs">
      <h2 className="ail-titre"><Building2 size={18} /> Ailleurs</h2>
      <p className="ail-sous">Les structures où tu donnes des cours. Elles ont leur propre IziSolo, tu y es intervenante, et leurs séances apparaissent dans ton agenda.</p>

      {autres.length > 0 ? (
        <ul className="ail-liste">
          {autres.map(s => (
            <li key={s.id} className="ail-studio">
              <Building2 size={15} /> <strong>{s.nom}</strong>
              <span>tu y es intervenante · bascule dessus depuis le nom du studio, en haut de la barre latérale</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="ail-vide">Aucune pour l'instant.</p>
      )}

      <div className="ail-pont">
        <p className="ail-pont-texte">
          <strong>Tu donnes des cours dans une association ou un studio qui n'est pas encore sur IziSolo ?</strong>{' '}
          Fais-le entrer : la structure reçoit un lien, ouvre son espace en dix minutes (30 jours d'essai, sans carte), et tu y es déjà inscrite comme intervenante.
        </p>
        {!ouvert && (
          <button type="button" className="izi-btn btn-sm izi-btn-primary" onClick={() => setOuvert(true)} data-testid="ailleurs-inviter">
            <Send size={15} /> Inviter mon asso ou mon studio
          </button>
        )}
        {ouvert && (
          <div className="ail-form">
            <div className="ail-types" role="radiogroup" aria-label="Type de structure">
              {TYPES_INVITABLES.map(t => (
                <label key={t} className={`ail-type ${form.type === t ? 'on' : ''}`}>
                  <input type="radio" name="ail-type" value={t} checked={form.type === t} onChange={() => setForm(f => ({ ...f, type: t }))} />
                  <span>{TYPES_STRUCTURE[t].emoji} {TYPES_STRUCTURE[t].label}</span>
                </label>
              ))}
            </div>
            <label className="ail-champ">
              <span>Son nom</span>
              <input type="text" value={form.nom} maxLength={120} placeholder="Yoga pour tous Lyon 3" onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} />
            </label>
            <label className="ail-champ">
              <span>Son adresse email (pas la tienne : celle de la structure, ou de la personne qui la gère)</span>
              <input type="email" value={form.email} placeholder="contact@yogapourtous.fr" onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </label>
            <label className="ail-champ">
              <span>Un mot pour elle (facultatif)</span>
              <textarea rows={3} maxLength={600} value={form.message} placeholder="Je gère mes cours dessus depuis la rentrée, ça te simplifierait le planning et les présences." onChange={e => setForm(f => ({ ...f, message: e.target.value }))} />
            </label>
            <div className="ail-actions">
              <button type="button" className="izi-btn btn-sm izi-btn-primary" onClick={inviter} disabled={envoi || !form.nom.trim() || !form.email.trim()}>
                {envoi ? <Loader2 size={15} className="eq-spin" /> : <Send size={15} />} Envoyer l'invitation
              </button>
              <button type="button" className="izi-btn btn-sm izi-btn-ghost" onClick={() => setOuvert(false)}>Annuler</button>
            </div>
          </div>
        )}
        {lien && (
          <div className="ail-lien">
            <p>L'email est parti. Si tu préfères l'envoyer toi-même (message, SMS), voici le lien :</p>
            <div className="ail-lien-ligne">
              <input readOnly value={lien} onFocus={e => e.target.select()} data-testid="ailleurs-lien" />
              <button type="button" className="izi-btn btn-sm izi-btn-secondary" onClick={copier}>
                {copie ? <Check size={14} /> : <Copy size={14} />} {copie ? 'Copié' : 'Copier'}
              </button>
            </div>
          </div>
        )}
      </div>

      {indisponible && (
        <p className="ail-vide">Cette possibilité arrive très bientôt sur ton compte (mise à jour en cours).</p>
      )}
      {invitations.length > 0 && (
        <ul className="ail-invitations" data-testid="ailleurs-invitations">
          {invitations.map(i => (
            <li key={i.id}>
              <strong>{i.nom_structure}</strong> <span className="ail-inv-type">{TYPES_STRUCTURE[i.type_structure]?.label}</span>
              <span className={`ail-inv-statut st-${i.statut}`}>{statutLisible(i.statut)}</span>
              <span className="ail-inv-email">{i.email_structure}</span>
            </li>
          ))}
        </ul>
      )}

      <style jsx global>{`
        .ail-bloc { margin-top: 28px; padding: 18px; border-radius: 14px; background: #fff; border: 1px solid rgba(0,0,0,.07); }
        .ail-titre { display: flex; align-items: center; gap: 8px; font-family: var(--font-fraunces, Georgia, serif); font-size: 1.3rem; margin: 0 0 4px; }
        .ail-sous { margin: 0 0 14px; color: var(--text-soft, #7a6f6a); font-size: .9rem; line-height: 1.5; }
        .ail-liste { list-style: none; padding: 0; margin: 0 0 16px; display: grid; gap: 8px; }
        .ail-studio { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: .9rem; }
        .ail-studio span { color: var(--text-soft, #7a6f6a); font-size: .8rem; }
        .ail-vide { margin: 0 0 14px; color: var(--text-soft, #7a6f6a); font-size: .88rem; }
        .ail-pont { padding: 14px; border-radius: 12px; background: var(--brand-light, #faf2eb); border: 1px solid var(--brand-200, #e8c8a8); }
        .ail-pont-texte { margin: 0 0 10px; font-size: .9rem; line-height: 1.5; }
        .ail-form { display: grid; gap: 10px; margin-top: 10px; }
        .ail-types { display: flex; gap: 8px; flex-wrap: wrap; }
        .ail-type { display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; border-radius: 99px; border: 1px solid rgba(0,0,0,.13); background: #fff; cursor: pointer; font-size: .85rem; }
        .ail-type.on { border-color: var(--brand, #b87333); background: #fff7ef; font-weight: 600; }
        .ail-type input { display: none; }
        .ail-champ { display: flex; flex-direction: column; gap: 4px; }
        .ail-champ span { font-size: .78rem; color: var(--text-soft, #7a6f6a); }
        .ail-champ input, .ail-champ textarea { padding: 9px 11px; border-radius: 9px; border: 1px solid rgba(0,0,0,.13); font: inherit; font-size: .9rem; background: #fff; }
        .ail-actions { display: flex; gap: 8px; flex-wrap: wrap; }
        .ail-lien { margin-top: 12px; font-size: .85rem; }
        .ail-lien p { margin: 0 0 6px; }
        .ail-lien-ligne { display: flex; gap: 8px; }
        .ail-lien-ligne input { flex: 1; padding: 8px 10px; border-radius: 8px; border: 1px solid rgba(0,0,0,.15); font: inherit; font-size: .8rem; }
        .ail-invitations { list-style: none; padding: 0; margin: 14px 0 0; display: grid; gap: 6px; font-size: .85rem; }
        .ail-invitations li { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
        .ail-inv-type, .ail-inv-email { color: var(--text-soft, #7a6f6a); font-size: .8rem; }
        .ail-inv-statut { padding: 2px 8px; border-radius: 99px; font-size: .75rem; background: #f1efe9; }
        .ail-inv-statut.st-acceptee { background: #e7f3ea; color: #1f6b3a; }
      `}</style>
    </section>
  );
}

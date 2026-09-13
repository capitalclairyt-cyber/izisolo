'use client';

import { useState, useCallback } from 'react';
import { UserPlus, Trash2, Loader2, Mail, ShieldCheck, Check } from 'lucide-react';
import { useToast } from '@/components/ui/ToastProvider';
import AideContextuelle from '@/components/AideContextuelle';
import LienIntervenante from '@/components/equipe/LienIntervenante';
import Ailleurs from '@/components/equipe/Ailleurs';
import Remuneration from '@/components/equipe/Remuneration';
import { labelIntervenante } from '@/lib/intervenante';
import { FONCTIONS, CODES_FONCTION, labelFonction, presetPourFonction } from '@/lib/vie-asso';
import {
  PERMISSIONS, PRESETS, permissionsParDefaut,
  labelRole, labelStatut, resumeDroits, labelPortee,
} from '@/lib/studio-membre';

/**
 * L'écran Équipe. Volontairement court : inviter, ajuster, retirer.
 *
 * Le préréglage « Prof » est étroit par défaut (pointer, cours, voir les
 * élèves) : un droit qui manque se demande, un droit de trop ne se voit pas.
 * Chaque case dit ce qu'elle ouvre, et trois d'entre elles précisent qu'elles
 * sont tenues par la base — pour que personne ne croie qu'un bouton caché
 * suffirait.
 */
export default function EquipeClient({ membresInit, planOk, indisponible, studioNom, typeStructure = 'solo' }) {
  const estAsso = typeStructure === 'association';
  const { toast } = useToast();
  const [membres, setMembres] = useState(membresInit || []);
  const [ouvert, setOuvert] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [form, setForm] = useState({
    email: '', prenom: '', nom: '', role: 'prof', permissions: permissionsParDefaut('prof'),
    portee_pointage: 'tous', fonction: '',
  });
  const [edite, setEdite] = useState(null); // id du membre déplié

  // v113 : une fonction du bureau PROPOSE un rôle et une matrice ; la prof
  // ajuste ensuite case par case.
  const choisirFonction = (fonction) => {
    if (!fonction) { majForm({ fonction: '' }); return; }
    const p = presetPourFonction(fonction);
    majForm({ fonction, role: p.role, permissions: p.permissions });
  };

  const majForm = (patch) => setForm(f => ({ ...f, ...patch }));

  const choisirRole = (role) => majForm({ role, permissions: { ...PRESETS[role] } });

  const basculer = (cle) => majForm({
    permissions: { ...form.permissions, [cle]: !form.permissions[cle] },
  });

  const inviter = useCallback(async () => {
    if (!form.email.trim()) { toast.error('Il faut une adresse email.'); return; }
    setEnvoi(true);
    try {
      const res = await fetch('/api/equipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email.trim(),
          prenom: form.prenom.trim() || undefined,
          nom: (form.nom || '').trim() || undefined,
          role: form.role,
          permissions: form.permissions,
          portee_pointage: form.portee_pointage,
          fonction: form.fonction || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error || "L'invitation n'est pas partie."); return; }
      setMembres(prev => [...prev.filter(m => m.id !== data.membre.id), data.membre]);
      setForm({ email: '', prenom: '', role: 'prof', permissions: permissionsParDefaut('prof'), portee_pointage: 'tous', fonction: '' });
      setOuvert(false);
      toast.success(data.compteExistant
        ? `${data.membre.email} a déjà un compte : le studio apparaîtra à sa prochaine connexion.`
        : `Invitation envoyée à ${data.membre.email}.`);
    } catch {
      toast.error("L'invitation n'est pas partie, réessaie.");
    } finally {
      setEnvoi(false);
    }
  }, [form, toast]);

  const enregistrerDroits = useCallback(async (membre, permissions, role) => {
    try {
      const res = await fetch(`/api/equipe/${membre.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, permissions }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error || 'Modification impossible.'); return; }
      setMembres(prev => prev.map(m => (m.id === membre.id ? data.membre : m)));
      toast.success('Droits mis à jour.');
    } catch {
      toast.error('Modification impossible, réessaie.');
    }
  }, [toast]);

  const retirer = useCallback(async (membre) => {
    if (!confirm(`Retirer ${membre.email} de ${studioNom} ?\n\nElle perd l'accès immédiatement. Son historique reste, et tu peux la réinviter plus tard.`)) return;
    try {
      const res = await fetch(`/api/equipe/${membre.id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error || 'Retrait impossible.'); return; }
      setMembres(prev => prev.map(m => (m.id === membre.id ? { ...m, statut: 'revoque' } : m)));
      toast.success('Membre retiré.');
    } catch {
      toast.error('Retrait impossible, réessaie.');
    }
  }, [studioNom, toast]);

  const actifs = membres.filter(m => m.statut !== 'revoque');

  return (
    <div className="eq-page">
      <header className="eq-entete">
        <h1>Équipe <AideContextuelle ancre="equipe" titre="Tuto : travailler à plusieurs" /></h1>
        <p>Qui travaille dans {studioNom}, et ce que chacune peut y faire.</p>
      </header>

      {!planOk && (
        <div className="eq-alerte">
          <strong>Travailler à plusieurs fait partie des plans Association et Studio.</strong>
          <p>
            Un seul abonnement pour toute la structure, autant de profs que tu veux. Les personnes déjà
            invitées gardent leur place : elles retrouvent tout dès que l&apos;abonnement reprend.
          </p>
          <a href="/parametres/abonnement">Voir les plans</a>
        </div>
      )}

      {planOk && indisponible && (
        <div className="eq-alerte">
          <strong>L&apos;équipe arrive très bientôt.</strong>
          <p>Cette mise à jour n&apos;est pas encore appliquée sur ton studio.</p>
        </div>
      )}

      {planOk && !indisponible && (
        <>
          <div className="eq-barre">
            <span className="eq-compte">
              {actifs.length} personne{actifs.length > 1 ? 's' : ''}
            </span>
            <button type="button" className="izi-btn btn-sm izi-btn-primary" onClick={() => setOuvert(o => !o)}>
              <UserPlus size={16} /> Inviter une prof
            </button>
          </div>

          {ouvert && (
            <div className="eq-form">
              <div className="eq-champs">
                <label>
                  <span>Son email</span>
                  <input type="email" value={form.email} placeholder="claire@exemple.fr"
                         onChange={e => majForm({ email: e.target.value })} />
                </label>
                <label>
                  <span>Son prénom</span>
                  <input type="text" value={form.prenom} placeholder="Claire" maxLength={60}
                         onChange={e => majForm({ prenom: e.target.value })} />
                </label>
                <label>
                  <span>Son nom (facultatif)</span>
                  <input type="text" value={form.nom || ''} placeholder="Martin" maxLength={80}
                         onChange={e => majForm({ nom: e.target.value })} />
                </label>
              </div>
              <p className="eq-aide-lien">
                Pas de compte, pas de problème : une fois invitée, tu peux lui créer un <strong>lien permanent</strong> qui ouvre ses séances et leur pointage, sans mot de passe.
              </p>

              {estAsso && (
                <label className="eq-portee" data-testid="eq-fonction">
                  <span>Sa fonction dans l&apos;association</span>
                  <select value={form.fonction} onChange={e => choisirFonction(e.target.value)}>
                    <option value="">Aucune (prof ou bénévole sans fonction)</option>
                    {CODES_FONCTION.map(c => <option key={c} value={c}>{FONCTIONS[c].label}</option>)}
                  </select>
                  <em>{form.fonction ? FONCTIONS[form.fonction].aide : 'Une fonction propose des droits ; tu ajustes ensuite case par case. Ce n\'est qu\'une étiquette : les droits appliqués sont ceux cochés.'}</em>
                </label>
              )}

              <div className="eq-roles">
                <button type="button" className={`eq-role ${form.role === 'prof' ? 'actif' : ''}`}
                        onClick={() => choisirRole('prof')}>
                  <strong>Prof</strong>
                  <span>Elle donne des cours et les pointe. Ni argent, ni messagerie, ni réglages.</span>
                </button>
                <button type="button" className={`eq-role ${form.role === 'admin' ? 'actif' : ''}`}
                        onClick={() => choisirRole('admin')}>
                  <strong>Admin</strong>
                  <span>Elle gère le studio comme toi, équipe comprise.</span>
                </button>
              </div>

              {/* Portée du pointage — décision Colin : c'est un choix PAR
                  MEMBRE. Une séance sans intervenante désignée reste pointable
                  par tout le monde : on ne ferme jamais rétroactivement une
                  porte qui était ouverte. */}
              <label className="eq-portee">
                <span>Quelles séances peut-elle pointer ?</span>
                <select value={form.portee_pointage} onChange={e => majForm({ portee_pointage: e.target.value })}>
                  <option value="tous">{labelPortee('tous')}</option>
                  <option value="miens">{labelPortee('miens')}</option>
                </select>
                <em>Avec « seulement ses séances », elle pointe celles dont tu l&apos;as désignée intervenante, plus celles que personne n&apos;a prises en charge.</em>
              </label>

              <details className="eq-details">
                <summary>Ajuster les droits un par un</summary>
                <div className="eq-perms">
                  {PERMISSIONS.map(p => (
                    <label key={p.cle} className="eq-perm">
                      <input type="checkbox" checked={!!form.permissions[p.cle]} onChange={() => basculer(p.cle)} />
                      <span>
                        <strong>{p.label}</strong>
                        <em>{p.aide}</em>
                        {p.rls && <i className="eq-rls"><ShieldCheck size={11} /> tenu par la base, pas seulement par l&apos;écran</i>}
                      </span>
                    </label>
                  ))}
                </div>
              </details>

              <div className="eq-actions">
                <button type="button" className="izi-btn btn-sm izi-btn-primary" onClick={inviter} disabled={envoi}>
                  {envoi ? <Loader2 size={15} className="eq-spin" /> : <Mail size={15} />} Envoyer l&apos;invitation
                </button>
                <button type="button" className="izi-btn btn-sm izi-btn-ghost" onClick={() => setOuvert(false)}>
                  Annuler
                </button>
              </div>
            </div>
          )}

          <ul className="eq-liste">
            {membres.map(m => (
              <li key={m.id} className={`eq-ligne ${m.statut}`}>
                <div className="eq-ident">
                  <div className="eq-nom">
                    <strong>{labelIntervenante(m)}</strong>
                    {(m.prenom || m.nom) && <span className="eq-email">{m.email}</span>}
                    <span className={`eq-badge role-${m.role}`}>{labelRole(m.role)}</span>
                    {m.fonction && <span className="eq-badge fonction" data-testid="eq-badge-fonction">{labelFonction(m.fonction)}</span>}
                    <span className={`eq-badge statut-${m.statut}`}>{labelStatut(m.statut)}</span>
                    {m.statut === 'invite' && !m.liee && <span className="eq-attente">jamais venue</span>}
                  </div>
                  <div className="eq-droits">
                    {resumeDroits(m)}
                    {!m.proprietaire && m.portee_pointage === 'miens' && ' · pointe seulement ses séances'}
                  </div>
                </div>
                {!m.proprietaire && m.statut !== 'revoque' && (
                  <div className="eq-boutons">
                    <button type="button" className="izi-btn btn-sm izi-btn-ghost"
                            onClick={() => setEdite(edite === m.id ? null : m.id)}>
                      Droits
                    </button>
                    <button type="button" className="eq-retirer" onClick={() => retirer(m)}
                            aria-label={`Retirer ${m.email}`}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                )}

                {edite === m.id && (
                  <EditeurDroits membre={m} onEnregistrer={(perms, role) => {
                    enregistrerDroits(m, perms, role);
                    setEdite(null);
                  }} />
                )}
                {!m.proprietaire && m.statut !== 'revoque' && (
                  <LienIntervenante membre={m} onMaj={(maj) => setMembres(prev => prev.map(x => x.id === maj.id ? maj : x))} />
                )}
                {!m.proprietaire && m.statut !== 'revoque' && (
                  <Remuneration membre={m} onMaj={(rem) => setMembres(prev => prev.map(x => x.id === m.id ? { ...x, remuneration: rem } : x))} />
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      {/* Ailleurs : les structures où JE donne cours (lot 1 Assos & Studios).
          Un geste de la personne, hors plan : rendu quel que soit planOk. */}
      <Ailleurs />

      <style jsx global>{`
        .eq-page { max-width: 860px; }
        .eq-email { font-size: .78rem; color: var(--text-soft, #7a6f6a); font-weight: 400; }
        .eq-aide-lien { margin: 0 0 12px; font-size: .82rem; color: var(--text-soft, #7a6f6a); line-height: 1.5; }
        .eq-entete h1 { font-family: var(--font-fraunces, Georgia, serif); font-size: 1.8rem; margin: 0 0 4px; }
        .eq-entete p { margin: 0 0 20px; color: var(--text-soft, #7a6f6a); }

        .eq-alerte { padding: 16px; border-radius: 14px; background: #fffbeb; border: 1px solid #fde68a;
          color: #92400e; margin-bottom: 18px; }
        .eq-alerte p { margin: 6px 0 10px; font-size: .9rem; line-height: 1.55; }
        .eq-alerte a { color: inherit; font-weight: 600; }

        .eq-barre { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
        .eq-compte { font-size: .9rem; color: var(--text-soft, #7a6f6a); }

        .eq-form { background: #fff; border: 1px solid rgba(0,0,0,.07); border-radius: 14px; padding: 16px; margin-bottom: 18px; }
        .eq-champs { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 14px; }
        .eq-champs label { display: flex; flex-direction: column; gap: 4px; flex: 1 1 220px; }
        .eq-champs span { font-size: .78rem; color: var(--text-soft, #7a6f6a); }
        .eq-champs input { padding: 9px 11px; border-radius: 9px; border: 1px solid rgba(0,0,0,.13);
          font: inherit; font-size: .9rem; background: #fdfcfb; color: inherit; }

        .eq-roles { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 12px; }
        .eq-role { flex: 1 1 240px; text-align: left; padding: 12px 14px; border-radius: 12px; cursor: pointer;
          background: #fafaf9; border: 1px solid rgba(0,0,0,.09); font-family: inherit; color: inherit; }
        .eq-role.actif { background: #f0fdf4; border-color: #bbf7d0; }
        .eq-role strong { display: block; font-size: .95rem; margin-bottom: 3px; }
        .eq-role span { font-size: .8rem; color: var(--text-soft, #7a6f6a); line-height: 1.45; }

        .eq-portee { display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; }
        .eq-portee > span { font-size: .78rem; color: var(--text-soft, #7a6f6a); }
        .eq-portee select { padding: 9px 11px; border-radius: 9px; border: 1px solid rgba(0,0,0,.13);
          font: inherit; font-size: .88rem; background: #fff; color: inherit; max-width: 320px; }
        .eq-portee em { font-style: normal; font-size: .76rem; color: var(--text-soft, #7a6f6a); line-height: 1.45; }
        .eq-details { margin-bottom: 14px; }
        .eq-details summary { cursor: pointer; font-size: .87rem; color: var(--text-soft, #7a6f6a); padding: 6px 0; }
        .eq-perms { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 8px; margin-top: 8px; }
        .eq-perm { display: flex; gap: 8px; align-items: flex-start; padding: 9px 11px; border-radius: 10px;
          background: #fafaf9; border: 1px solid rgba(0,0,0,.06); cursor: pointer; }
        .eq-perm strong { display: block; font-size: .87rem; font-weight: 600; }
        .eq-perm em { display: block; font-style: normal; font-size: .76rem; color: var(--text-soft, #7a6f6a); }
        .eq-rls { display: inline-flex; align-items: center; gap: 4px; font-style: normal; font-size: .7rem;
          color: #047857; margin-top: 3px; }

        .eq-actions { display: flex; gap: 8px; flex-wrap: wrap; }
        .eq-spin { animation: eq-rot 1s linear infinite; }
        @keyframes eq-rot { to { transform: rotate(360deg); } }

        .eq-liste { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
        .eq-ligne { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px;
          padding: 12px 14px; border-radius: 12px; background: #fff; border: 1px solid rgba(0,0,0,.07); }
        .eq-ligne.revoque { opacity: .55; }
        .eq-nom { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
        .eq-nom strong { font-size: .95rem; }
        .eq-badge { font-size: .68rem; padding: 2px 8px; border-radius: 999px;
          background: #f5f5f4; border: 1px solid rgba(0,0,0,.08); color: #57534e; }
        .eq-badge.role-proprietaire { background: #fff7ed; border-color: #fed7aa; color: #c2410c; }
        .eq-badge.fonction { background: #eef2ff; border-color: #c7d2fe; color: #3730a3; }
        .eq-badge.statut-actif { background: #ecfdf5; border-color: #a7f3d0; color: #047857; }
        .eq-attente { font-size: .72rem; color: var(--text-soft, #7a6f6a); }
        .eq-droits { font-size: .8rem; color: var(--text-soft, #7a6f6a); margin-top: 3px; }
        .eq-boutons { display: flex; gap: 8px; align-items: center; }
        .eq-retirer { background: none; border: none; cursor: pointer; color: #b91c1c; padding: 6px; border-radius: 8px; }
      `}</style>
    </div>
  );
}

/** Le tiroir de droits d'un membre déjà là. Même matrice que l'invitation. */
function EditeurDroits({ membre, onEnregistrer }) {
  const [perms, setPerms] = useState({ ...(membre.permissions || {}) });
  const [role, setRole] = useState(membre.role === 'admin' ? 'admin' : 'prof');

  const basculer = (cle) => setPerms(p => ({ ...p, [cle]: !p[cle] }));

  return (
    <div className="eq-editeur">
      <div className="eq-roles">
        <button type="button" className={`eq-role ${role === 'prof' ? 'actif' : ''}`}
                onClick={() => { setRole('prof'); setPerms({ ...PRESETS.prof }); }}>
          <strong>Prof</strong><span>Cours et pointage.</span>
        </button>
        <button type="button" className={`eq-role ${role === 'admin' ? 'actif' : ''}`}
                onClick={() => { setRole('admin'); setPerms({ ...PRESETS.admin }); }}>
          <strong>Admin</strong><span>Tout, équipe comprise.</span>
        </button>
      </div>
      <div className="eq-perms">
        {PERMISSIONS.map(p => (
          <label key={p.cle} className="eq-perm">
            <input type="checkbox" checked={!!perms[p.cle]} onChange={() => basculer(p.cle)} />
            <span>
              <strong>{p.label}</strong>
              <em>{p.aide}</em>
              {p.rls && <i className="eq-rls"><ShieldCheck size={11} /> tenu par la base</i>}
            </span>
          </label>
        ))}
      </div>
      <button type="button" className="izi-btn btn-sm izi-btn-primary" onClick={() => onEnregistrer(perms, role)}>
        <Check size={15} /> Enregistrer
      </button>
      <style jsx global>{`
        .eq-editeur { flex-basis: 100%; margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(0,0,0,.07); }
      `}</style>
    </div>
  );
}

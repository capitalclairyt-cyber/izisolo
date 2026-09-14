/**
 * « Hors les murs » (v118) : ce qui ÉCRIT. Les règles sont dans
 * lib/hors-les-murs.js, le catalogue dans content/hors-les-murs.js.
 *
 * Tout passe par le client admin (service_role) : la table n'a aucune policy.
 * Chaque fonction rend { ok, ... } ou { ok:false, code, message, status } que
 * l'écran affiche : un échec muet ici, c'est Maude qui croit avoir validé un
 * texte qui ne l'est pas.
 */
import { sendEmail } from './email';
import { LIEUX } from '../content/hors-les-murs';
import { ACTIONS, MOTIFS_ECART, EMAIL_MAUDE, CC_EQUIPE, transition, validerEmailLieu, fusionner, idValide } from './hors-les-murs';

/** PostgREST dit PGRST205 pour une table absente de son cache (leçon v97). */
export function migrationManquante(error) {
  return !!error && (error.code === 'PGRST205' || error.code === '42P01' || /schema cache|does not exist/i.test(error.message || ''));
}
const refus = (code, message, status = 400) => ({ ok: false, code, message, status });
const SANS_MIGRATION = refus('MIGRATION_V118_REQUISE', "La mise à jour v118 n'est pas encore appliquée : le texte reste lisible, mais rien n'est enregistré.", 503);
const COLS = 'id, statut, objet, corps, commentaire, reponse, motif_ecart, envoye_at, historique, created_at, updated_at';

export function lieuParId(id) {
  return LIEUX.find((l) => l.id === id) || null;
}

/** Tous les suivis, par id. Sans la table : { migration: true }. */
export async function lireSuivis(admin) {
  const { data, error } = await admin.from('hlm_suivi').select(COLS).limit(1000);
  if (error) return migrationManquante(error) ? { migration: true, suivis: {} } : { migration: false, suivis: {}, erreur: error.message };
  const suivis = {};
  for (const s of data || []) suivis[s.id] = s;
  return { migration: false, suivis };
}

/** Le catalogue fusionné avec le suivi : ce que l'écran lit. */
export async function lireFiches(admin) {
  const { migration, suivis, erreur } = await lireSuivis(admin);
  return { migration, erreur: erreur || null, fiches: LIEUX.map((l) => fusionner(l, suivis[l.id])) };
}

/**
 * Un geste de Maude sur une piste. On relit la ligne, on vérifie que la
 * transition a un sens, on écrit, on relit ce qui a été écrit (jamais
 * « ok » sur zéro ligne), et on prévient Colin quand elle demande une modif.
 */
export async function appliquerAction(admin, id, body = {}) {
  if (!idValide(id)) return refus('INTROUVABLE', 'Piste introuvable', 404);
  const lieu = lieuParId(id);
  if (!lieu) return refus('INTROUVABLE', 'Piste introuvable', 404);
  const action = String(body.action || '');
  if (!(action in ACTIONS)) return refus('ACTION', 'Action inconnue');

  const { data: existant, error: eLecture } = await admin.from('hlm_suivi').select(COLS).eq('id', id).maybeSingle();
  if (eLecture) return migrationManquante(eLecture) ? SANS_MIGRATION : refus('LECTURE', eLecture.message, 500);
  const avant = fusionner(lieu, existant);
  const t = transition(avant.statut, action);
  if (!t.ok) return refus('TRANSITION', t.raison, 409);

  const maintenant = new Date().toISOString();
  const patch = { statut: t.statut, updated_at: maintenant };
  let trace = { quand: maintenant, action };

  if (action === 'enregistrer' || action === 'valider' || action === 'marquer_envoye') {
    // Un texte retouché part avec le geste ; un texte identique au catalogue n'est pas recopié.
    const objet = typeof body.objet === 'string' ? body.objet.trim() : avant.objet;
    const corps = typeof body.corps === 'string' ? body.corps.trim() : avant.corps;
    const v = validerEmailLieu({ objet, corps });
    if (!v.ok) return refus('TEXTE', `Ce texte ne peut pas partir tel quel : ${v.erreurs.join(' ; ')}`, 422);
    patch.objet = objet === lieu.email.objet ? null : objet;
    patch.corps = corps === lieu.email.corps ? null : corps;
    if (action === 'marquer_envoye') patch.envoye_at = maintenant;
  }
  if (action === 'demander_modif') {
    const commentaire = String(body.commentaire || '').trim().slice(0, 2000);
    if (commentaire.length < 5) return refus('COMMENTAIRE', 'Dis en une phrase ce que tu veux changer.');
    patch.commentaire = commentaire;
    trace = { ...trace, commentaire };
  }
  if (action === 'reponse' || action === 'en_cours') {
    const reponse = String(body.reponse || '').trim().slice(0, 2000);
    if (reponse) patch.reponse = reponse;
    trace = { ...trace, reponse: reponse || undefined };
  }
  if (action === 'ecarter') {
    if (!(body.motif in MOTIFS_ECART)) return refus('MOTIF', 'Choisis un motif.');
    patch.motif_ecart = body.motif;
    trace = { ...trace, motif: body.motif };
  }
  if (action === 'remettre') { patch.motif_ecart = null; patch.commentaire = null; }

  const historique = [...(avant.historique || []), trace].slice(-40);
  const ligne = { id, ...patch, historique };
  const { data: ecrit, error: eEcriture } = existant
    ? await admin.from('hlm_suivi').update(ligne).eq('id', id).select(COLS)
    : await admin.from('hlm_suivi').insert(ligne).select(COLS);
  if (eEcriture) return migrationManquante(eEcriture) ? SANS_MIGRATION : refus('ECRITURE', eEcriture.message, 500);
  if (!ecrit?.length) return refus('ECRITURE', 'Rien n’a été enregistré.', 500);

  let notification = null;
  if (action === 'demander_modif') {
    // Colin apprend la demande par email : un commentaire qui reste dans une table ne se lit pas.
    const r = await sendEmail({
      to: CC_EQUIPE,
      replyTo: EMAIL_MAUDE,
      categorie: 'transactionnel',
      subject: `Hors les murs : modif demandée sur « ${lieu.nom} »`,
      html: `<p>Maude demande une modif sur la piste <strong>${echapper(lieu.nom)}</strong> (${echapper(lieu.lieu)}) :</p>`
        + `<blockquote style="border-left:3px solid #b87333;margin:0;padding:6px 12px;color:#333">${echapper(patch.commentaire).replace(/\n/g, '<br>')}</blockquote>`
        + `<p>Le texte actuel est dans l’admin : /admin/hors-les-murs/${id}</p>`,
    });
    notification = r.ok ? 'envoyee' : (r.skipped || r.error || 'non envoyée');
  }
  return { ok: true, fiche: fusionner(lieu, ecrit[0]), notification };
}

const echapper = (t) => String(t || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

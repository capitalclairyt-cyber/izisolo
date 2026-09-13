// ============================================================================
// IziSolo — Ouvrir un lien permanent d'intervenante (v111). SERVEUR, en
// service_role : partagé par les deux routes /api/intervenante/[token]/*.
// Un fichier de route Next ne peut exporter que ses méthodes HTTP, d'où ce
// module à part.
// ============================================================================
import { createAdminClient } from './supabase-admin';
import { hashToken } from './lien-pointage';
import { verifierLienIntervenante } from './lien-intervenante';

const ABSENT = ['PGRST204', 'PGRST205', '42703', '42P01'];

/**
 * Charge et valide le lien par le sha256 du jeton. Retourne { erreur }
 * (une Response prête) ou { admin, membre, profile }.
 */
export async function ouvrirLienIntervenante(token) {
  const hash = hashToken(token);
  if (!hash) return { erreur: Response.json({ error: 'Lien invalide', code: 'INTROUVABLE' }, { status: 404 }) };

  const admin = createAdminClient();
  const { data: membre, error } = await admin
    .from('studio_membres')
    .select('*')
    .eq('lien_hash', hash)
    .maybeSingle();

  if (error) {
    const absente = ABSENT.includes(error.code);
    return {
      erreur: Response.json(
        {
          error: absente ? "Les liens d'intervenante ne sont pas encore actifs sur cette installation." : 'Lien indisponible',
          code: absente ? 'MIGRATION_V111_REQUISE' : 'INDISPONIBLE',
        },
        { status: absente ? 503 : 500 }
      ),
    };
  }

  const verdict = verifierLienIntervenante(membre, new Date());
  if (!verdict.ok) {
    // 404 partout : distinguer « révoqué » de « inexistant » renseignerait un
    // curieux. Le message, lui, reste honnête.
    return { erreur: Response.json({ error: verdict.message, code: verdict.code }, { status: 404 }) };
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('id, studio_nom, studio_slug, regles_metier')
    .eq('id', membre.profile_id)
    .maybeSingle();

  return { admin, membre, profile: profile || { id: membre.profile_id } };
}

/**
 * Une séance de CE studio, et qui regarde CE membre : la sienne, ou une
 * séance sans intervenante désignée (pointable par l'équipe, v103). Jamais
 * celle d'une autre intervenante. Pré-v103 (colonne absente), toute séance du
 * studio est « sans intervenante ».
 */
export async function chargerSeanceIntervenante(admin, membre, coursId) {
  let { data: cours, error } = await admin
    .from('cours')
    .select('*')
    .eq('id', coursId)
    .eq('profile_id', membre.profile_id)
    .maybeSingle();
  if (error || !cours) return null;
  const colonneConnue = Object.prototype.hasOwnProperty.call(cours, 'intervenant_id');
  if (colonneConnue && cours.intervenant_id && cours.intervenant_id !== membre.id) return null;
  if (cours.est_annule) return null;
  return cours;
}

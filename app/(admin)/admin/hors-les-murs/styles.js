// Styles partagés des deux écrans « Hors les murs » (thème sombre admin, même
// vocabulaire que /admin/prospection : une carte, un bandeau, un badge, un bouton).
export const TONS = {
  warning: { bg: '#3a2e14', fg: '#fbbf24' },
  info: { bg: '#12304a', fg: '#60a5fa' },
  success: { bg: '#13341f', fg: '#4ade80' },
  neutral: { bg: '#2a2a2a', fg: '#999' },
  danger: { bg: '#4a1414', fg: '#f87171' },
};
export const carte = { background: '#1c1c1c', border: '1px solid #2e2e2e', borderRadius: 12, padding: '16px 18px', marginBottom: 14 };
export const bandeau = { background: '#3a2e14', color: '#fbbf24', padding: '12px 16px', borderRadius: 10, marginBottom: 18, fontSize: '0.9rem' };
export const badge = { borderRadius: 999, padding: '2px 10px', fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap' };
export const bouton = { background: '#262626', border: '1px solid #3a3a3a', color: '#ddd', borderRadius: 8, padding: '8px 13px', fontSize: '0.84rem', cursor: 'pointer' };
export const boutonPlein = { ...bouton, background: '#b87333', border: '1px solid #b87333', color: '#fff', fontWeight: 600 };
export const boutonVert = { ...bouton, background: '#1f5a36', border: '1px solid #2f7a4a', color: '#d1fae5', fontWeight: 600 };
export const eteint = { opacity: 0.4, cursor: 'not-allowed' };
export const champ = { background: '#141414', border: '1px solid #3a3a3a', color: '#eee', borderRadius: 8, padding: '8px 10px', fontSize: '0.88rem', fontFamily: 'inherit' };
export const etiquette = { color: '#888', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 };
export const lien = { color: '#60a5fa', textDecoration: 'none' };
export const pastille = (ton) => ({ ...badge, background: TONS[ton]?.bg || TONS.neutral.bg, color: TONS[ton]?.fg || TONS.neutral.fg });
export const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Europe/Paris' }) : '');
export const fmtDateHeure = (iso) => (iso ? new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' }) : '');

export async function appeler(url, body, methode = 'PATCH') {
  const res = await fetch(url, { method: methode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Erreur ${res.status}`);
  return json;
}

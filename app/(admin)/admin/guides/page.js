import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import Link from 'next/link';
import { grouperGuides, EMOJI_GROUPE, dateMaj } from '@/lib/admin-guides';

export const metadata = { title: 'Guides démo' };
export const dynamic = 'force-dynamic';

// ─── /admin/guides — les playbooks de l'équipe (démo, mise en route, Q/R) ──
// Contenu en markdown versionné dans content/admin-guides/*.md (comme le
// blog) : Claude ou l'équipe les enrichit par commit, l'admin les lit ici.
// Depuis le 2026-09-15 la liste est RANGÉE par famille (frontmatter `groupe`
// + `ordre`, lib/admin-guides) : avant, treize guides se suivaient dans
// l'ordre des noms de fichiers, et onze légendes vivaient dans un seul.

const GUIDES_DIR = path.join(process.cwd(), 'content', 'admin-guides');

export default function AdminGuidesPage() {
  const guides = fs.existsSync(GUIDES_DIR)
    ? fs.readdirSync(GUIDES_DIR).filter(f => f.endsWith('.md')).map(f => {
        const { data } = matter(fs.readFileSync(path.join(GUIDES_DIR, f), 'utf-8'));
        return { slug: f.replace(/\.md$/, ''), titre: data.titre || f, description: data.description || '', maj: dateMaj(data.maj), groupe: data.groupe, ordre: data.ordre };
      })
    : [];
  const sections = grouperGuides(guides);

  return (
    <div>
      <h1 className="admin-title" style={{ marginBottom: 4 }}>📖 Guides</h1>
      <p style={{ maxWidth: 720, color: '#64748b', fontSize: '0.875rem', margin: '0 0 24px', lineHeight: 1.55 }}>
        Les playbooks de l&apos;équipe, toujours à jour dans le repo
        (<code>content/admin-guides/</code>). Les légendes à coller sont en tête,
        dans l&apos;ordre de publication ; chaque bloc y a son bouton Copier.
      </p>
      {sections.map(s => (
        <section key={s.groupe} data-groupe={s.groupe} style={{ marginBottom: 28 }}>
          <h2 style={{ color: '#cbd5e1', fontSize: '0.8125rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 10px' }}>
            {EMOJI_GROUPE[s.groupe]} {s.groupe}
          </h2>
          {s.guides.map(g => (
            <Link key={g.slug} href={`/admin/guides/${g.slug}`} style={{ textDecoration: 'none' }}>
              <div className="admin-card" style={{ marginBottom: 10, cursor: 'pointer' }}>
                <strong style={{ color: '#e2e8f0', fontSize: '1rem' }}>{g.titre}</strong>
                <p style={{ margin: '6px 0 0', color: '#94a3b8', fontSize: '0.875rem' }}>{g.description}</p>
                {g.maj && <p style={{ margin: '6px 0 0', color: '#475569', fontSize: '0.75rem' }}>Mis à jour le {g.maj}</p>}
              </div>
            </Link>
          ))}
        </section>
      ))}
    </div>
  );
}

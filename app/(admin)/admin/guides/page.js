import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import Link from 'next/link';

export const metadata = { title: 'Guides démo' };
export const dynamic = 'force-dynamic';

// ─── /admin/guides — les playbooks de l'équipe (démo, mise en route, Q/R) ──
// Contenu en markdown versionné dans content/admin-guides/*.md (comme le
// blog) : Claude ou l'équipe les enrichit par commit, l'admin les lit ici.

const GUIDES_DIR = path.join(process.cwd(), 'content', 'admin-guides');

export default function AdminGuidesPage() {
  const guides = fs.existsSync(GUIDES_DIR)
    ? fs.readdirSync(GUIDES_DIR).filter(f => f.endsWith('.md')).map(f => {
        const { data } = matter(fs.readFileSync(path.join(GUIDES_DIR, f), 'utf-8'));
        return { slug: f.replace(/\.md$/, ''), titre: data.titre || f, description: data.description || '', maj: data.maj || null };
      })
    : [];

  return (
    <div>
      <h1 className="admin-title" style={{ marginBottom: 4 }}>📖 Guides démo & installation</h1>
      <p style={{ maxWidth: 720, color: '#64748b', fontSize: '0.875rem', margin: '0 0 20px', lineHeight: 1.55 }}>
        Les playbooks de l&apos;équipe, toujours à jour dans le repo
        (<code>content/admin-guides/</code>). Une nouvelle question en démo ?
        Elle s&apos;ajoute au guide Q/R par un simple commit.
      </p>
      {guides.map(g => (
        <Link key={g.slug} href={`/admin/guides/${g.slug}`} style={{ textDecoration: 'none' }}>
          <div className="admin-card" style={{ marginBottom: 12, cursor: 'pointer' }}>
            <strong style={{ color: '#e2e8f0', fontSize: '1rem' }}>{g.titre}</strong>
            <p style={{ margin: '6px 0 0', color: '#94a3b8', fontSize: '0.875rem' }}>{g.description}</p>
            {g.maj && <p style={{ margin: '6px 0 0', color: '#475569', fontSize: '0.75rem' }}>Mis à jour le {String(g.maj).slice(0, 10)}</p>}
          </div>
        </Link>
      ))}
    </div>
  );
}

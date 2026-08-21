import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { marked } from 'marked';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

const GUIDES_DIR = path.join(process.cwd(), 'content', 'admin-guides');

export default async function AdminGuidePage({ params }) {
  const { slug } = await params;
  if (!/^[a-z0-9-]+$/.test(slug)) notFound();
  const file = path.join(GUIDES_DIR, `${slug}.md`);
  if (!fs.existsSync(file)) notFound();

  const { data, content } = matter(fs.readFileSync(file, 'utf-8'));
  const html = marked.parse(content);

  return (
    <div>
      <p style={{ margin: '0 0 14px' }}>
        <Link href="/admin/guides" style={{ color: '#60a5fa', fontSize: '0.8125rem', textDecoration: 'none' }}>← Tous les guides</Link>
      </p>
      <h1 className="admin-title" style={{ marginBottom: 4 }}>{data.titre || slug}</h1>
      {data.maj && <p style={{ color: '#475569', fontSize: '0.75rem', margin: '0 0 18px' }}>Mis à jour le {String(data.maj).slice(0, 10)} · source : content/admin-guides/{slug}.md</p>}
      <div className="admin-md" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

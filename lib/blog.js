/**
 * lib/blog.js — Helpers pour le blog IziSolo.
 *
 * Articles stockés en Markdown dans /content/blog/*.md avec frontmatter YAML.
 *
 * Frontmatter type :
 *
 *   ---
 *   title: "Combien gagne un prof de yoga indépendant·e en France en 2026 ?"
 *   description: "Étude détaillée des revenus, charges et marges réelles..."
 *   date: 2026-05-21
 *   updated: 2026-05-21
 *   author: "Colin (IziSolo)"
 *   tags: ["yoga", "tarification", "auto-entrepreneur"]
 *   image: "/blog/combien-gagne-prof-yoga.jpg"
 *   featured: true
 *   excerpt: "..."
 *   ---
 *
 *   # Le titre du H1 (peut différer du title meta)
 *   Le corps de l'article en markdown.
 */

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { marked } from 'marked';

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog');

// ─── Configure marked pour produire un HTML propre + sémantique ────────────
marked.setOptions({
  gfm: true,
  breaks: false,
  headerIds: true,
  mangle: false,
});

/** Liste tous les articles publiés, triés par date desc. */
export function getAllArticles() {
  if (!fs.existsSync(BLOG_DIR)) return [];
  const files = fs.readdirSync(BLOG_DIR).filter(f => f.endsWith('.md'));
  const articles = files.map(file => {
    const slug = file.replace(/\.md$/, '');
    const raw = fs.readFileSync(path.join(BLOG_DIR, file), 'utf-8');
    const { data, content } = matter(raw);
    return {
      slug,
      title: data.title || slug,
      description: data.description || '',
      excerpt: data.excerpt || extractExcerpt(content),
      date: data.date ? new Date(data.date).toISOString() : new Date().toISOString(),
      updated: data.updated ? new Date(data.updated).toISOString() : null,
      author: data.author || 'Colin (IziSolo)',
      tags: data.tags || [],
      image: data.image || null,
      featured: !!data.featured,
      readingTime: estimateReadingTime(content),
    };
  });
  // Tri par date desc
  articles.sort((a, b) => new Date(b.date) - new Date(a.date));
  return articles;
}

/** Récupère un article complet (frontmatter + HTML rendu) à partir du slug. */
export function getArticleBySlug(slug) {
  const file = path.join(BLOG_DIR, `${slug}.md`);
  if (!fs.existsSync(file)) return null;
  const raw = fs.readFileSync(file, 'utf-8');
  const { data, content } = matter(raw);
  const html = marked.parse(content);
  return {
    slug,
    title: data.title || slug,
    description: data.description || '',
    excerpt: data.excerpt || extractExcerpt(content),
    date: data.date ? new Date(data.date).toISOString() : new Date().toISOString(),
    updated: data.updated ? new Date(data.updated).toISOString() : null,
    author: data.author || 'Colin (IziSolo)',
    tags: data.tags || [],
    image: data.image || null,
    featured: !!data.featured,
    readingTime: estimateReadingTime(content),
    html,
    // FAQ structurée (optionnelle) — utilisée pour le Schema.org FAQPage
    faq: data.faq || null,
  };
}

/** Liste tous les slugs (pour generateStaticParams). */
export function getAllSlugs() {
  if (!fs.existsSync(BLOG_DIR)) return [];
  return fs
    .readdirSync(BLOG_DIR)
    .filter(f => f.endsWith('.md'))
    .map(f => f.replace(/\.md$/, ''));
}

// ─── Helpers privés ────────────────────────────────────────────────────────

function extractExcerpt(content, maxLen = 180) {
  // Strip markdown headers + simple text extraction
  const plain = content
    .replace(/^#+\s.*$/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .replace(/!\[.+?\]\(.+?\)/g, '')
    .replace(/`(.+?)`/g, '$1')
    .replace(/\n+/g, ' ')
    .trim();
  if (plain.length <= maxLen) return plain;
  return plain.slice(0, maxLen).trim() + '…';
}

function estimateReadingTime(content) {
  const words = content.split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 220)); // ~220 mots/min en français
  return minutes;
}

/** Format date FR pour l'affichage (ex: "21 mai 2026") */
export function formatDateFR(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

import { prisma } from "@/lib/prisma";

export function getArticles() {
  return prisma.article.findMany({
    orderBy: { createdAt: "desc" },
  });
}

export function getArticleById(id: string) {
  return prisma.article.findUnique({ where: { id } });
}

// Public article list: only published articles, newest first, and only the
// fields a list card needs. `content` is included so the card can fall back
// to the article's first paragraph when it has no `excerpt`.
export function getPublishedArticles() {
  return prisma.article.findMany({
    where: { status: "published" },
    orderBy: { publishedAt: "desc" },
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      content: true,
      coverImage: true,
      publishedAt: true,
    },
  });
}

// Card/preview text for an article: its `excerpt` if set, otherwise the
// plain-text content of its first paragraph — Tiptap always wraps text in a
// `<p>` even for a single line, so this covers articles authored without an
// explicit excerpt.
export function getArticlePreviewText(article: { excerpt: string | null; content: string }) {
  if (article.excerpt) return article.excerpt;

  const firstParagraph = article.content.match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1] ?? "";
  return firstParagraph
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Just the slugs, for generateStaticParams — avoids pulling every published
// article's full row (including `content`) just to build the static param list.
export function getPublishedArticleSlugs() {
  return prisma.article.findMany({
    where: { status: "published" },
    select: { slug: true },
  });
}

// Gated to `status: "published"` — a draft's slug must 404 publicly even if
// someone guesses or bookmarks the exact URL from before it was unpublished.
export function getPublishedArticleBySlug(slug: string) {
  return prisma.article.findFirst({ where: { slug, status: "published" } });
}

// "Other articles" sidebar on the article detail page — newest published
// articles excluding the one currently being read.
export function getOtherPublishedArticles(excludeSlug: string, take = 5) {
  return prisma.article.findMany({
    where: { status: "published", slug: { not: excludeSlug } },
    orderBy: { publishedAt: "desc" },
    take,
    select: {
      id: true,
      title: true,
      slug: true,
      coverImage: true,
      publishedAt: true,
    },
  });
}

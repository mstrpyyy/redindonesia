import { prisma } from "@/lib/prisma";

// Currently just the one /media/articles banner — one row, upserted by slug.
// Mirrors src/lib/podcast-page.ts's shape (ADR-070/072/076/081) so a future
// banner-only page can slot in the same way.
export const ARTICLES_PAGE_SLUGS = ["articles"] as const;

export type ArticlesPageSlug = (typeof ARTICLES_PAGE_SLUGS)[number];

export function isArticlesPageSlug(value: string): value is ArticlesPageSlug {
  return (ARTICLES_PAGE_SLUGS as readonly string[]).includes(value);
}

export interface IArticlesPage {
  slug: ArticlesPageSlug;
  bannerXlUrl: string | null;
  bannerXlVideoUrl: string | null;
  bannerMdUrl: string | null;
  bannerMdVideoUrl: string | null;
  bannerSmUrl: string | null;
  bannerSmVideoUrl: string | null;
  // One global switch (not per-size — ADR-091/092): each size's video also
  // plays on every smaller size with none of its own, until a smaller size
  // that does have one takes over.
  bannerVideoUseForSmaller: boolean;
}

// Never throws on a missing row — the admin form starts blank and the
// public page falls back to its static default before the first save.
export async function getArticlesPage(slug: ArticlesPageSlug): Promise<IArticlesPage> {
  const row = await prisma.articlesPage.findUnique({ where: { slug } });

  return {
    slug,
    bannerXlUrl: row?.bannerXlUrl ?? null,
    bannerXlVideoUrl: row?.bannerXlVideoUrl ?? null,
    bannerMdUrl: row?.bannerMdUrl ?? null,
    bannerMdVideoUrl: row?.bannerMdVideoUrl ?? null,
    bannerSmUrl: row?.bannerSmUrl ?? null,
    bannerSmVideoUrl: row?.bannerSmVideoUrl ?? null,
    bannerVideoUseForSmaller: row?.bannerVideoUseForSmaller ?? false,
  };
}

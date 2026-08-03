import { prisma } from "@/lib/prisma";

// Currently just the one /media/podcasts banner — one row, upserted by slug.
// Mirrors src/lib/contact-pages.ts/support-pages.ts's shape (ADR-070/072/075)
// so a future banner-only page can slot in the same way.
export const PODCAST_PAGE_SLUGS = ["podcasts"] as const;

export type PodcastPageSlug = (typeof PODCAST_PAGE_SLUGS)[number];

export function isPodcastPageSlug(value: string): value is PodcastPageSlug {
  return (PODCAST_PAGE_SLUGS as readonly string[]).includes(value);
}

export interface IPodcastPage {
  slug: PodcastPageSlug;
  bannerXlUrl: string | null;
  bannerMdUrl: string | null;
  bannerSmUrl: string | null;
}

// Never throws on a missing row — the admin form starts blank and the
// public page falls back to its static default before the first save.
export async function getPodcastPage(slug: PodcastPageSlug): Promise<IPodcastPage> {
  const row = await prisma.podcastPage.findUnique({ where: { slug } });

  return {
    slug,
    bannerXlUrl: row?.bannerXlUrl ?? null,
    bannerMdUrl: row?.bannerMdUrl ?? null,
    bannerSmUrl: row?.bannerSmUrl ?? null,
  };
}

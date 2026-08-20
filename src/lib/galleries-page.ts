import { prisma } from "@/lib/prisma";

// Currently just the one /media/galleries banner — one row, upserted by slug.
// Mirrors src/lib/articles-page.ts's shape (ADR-081) so a future banner-only
// page can slot in the same way.
export const GALLERIES_PAGE_SLUGS = ["galleries"] as const;

export type GalleriesPageSlug = (typeof GALLERIES_PAGE_SLUGS)[number];

export function isGalleriesPageSlug(value: string): value is GalleriesPageSlug {
  return (GALLERIES_PAGE_SLUGS as readonly string[]).includes(value);
}

export interface IGalleriesPage {
  slug: GalleriesPageSlug;
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
export async function getGalleriesPage(slug: GalleriesPageSlug): Promise<IGalleriesPage> {
  const row = await prisma.galleriesPage.findUnique({ where: { slug } });

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

import { prisma } from "@/lib/prisma";

// Currently just the one homepage hero banner — one row, upserted by slug.
// Mirrors src/lib/galleries-page.ts's shape (ADR-082) so a future
// banner-only page can slot in the same way.
export const HOME_PAGE_SLUGS = ["home"] as const;

export type HomePageSlug = (typeof HOME_PAGE_SLUGS)[number];

export function isHomePageSlug(value: string): value is HomePageSlug {
  return (HOME_PAGE_SLUGS as readonly string[]).includes(value);
}

export interface IHomePage {
  slug: HomePageSlug;
  bannerSmUrl: string | null;
  bannerMdUrl: string | null;
  bannerLgUrl: string | null;
  bannerXlUrl: string | null;
}

// Never throws on a missing row — the admin form starts blank before the
// first save ever happens.
export async function getHomePage(slug: HomePageSlug): Promise<IHomePage> {
  const row = await prisma.homePage.findUnique({ where: { slug } });

  return {
    slug,
    bannerSmUrl: row?.bannerSmUrl ?? null,
    bannerMdUrl: row?.bannerMdUrl ?? null,
    bannerLgUrl: row?.bannerLgUrl ?? null,
    bannerXlUrl: row?.bannerXlUrl ?? null,
  };
}

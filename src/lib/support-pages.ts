import { prisma } from "@/lib/prisma";

// Registration & Documentation, Warranty & Service, Career — one row each,
// upserted by slug from the admin form. Marcom & Promotion is deliberately
// not here: it keeps its own SocialAccount-driven content instead of a
// banner + rich text body.
export const SUPPORT_PAGE_SLUGS = [
  "registration-documentation",
  "warranty-service",
  "career",
] as const;

export type SupportPageSlug = (typeof SUPPORT_PAGE_SLUGS)[number];

export function isSupportPageSlug(value: string): value is SupportPageSlug {
  return (SUPPORT_PAGE_SLUGS as readonly string[]).includes(value);
}

export interface ISupportPage {
  slug: SupportPageSlug;
  bannerXlUrl: string | null;
  bannerMdUrl: string | null;
  bannerSmUrl: string | null;
  body: string | null;
}

// Never throws on a missing row — every slug renders (admin form starts
// blank, public page falls back to its static defaults) before the first
// save ever happens.
export async function getSupportPage(slug: SupportPageSlug): Promise<ISupportPage> {
  const row = await prisma.supportPage.findUnique({ where: { slug } });

  return {
    slug,
    bannerXlUrl: row?.bannerXlUrl ?? null,
    bannerMdUrl: row?.bannerMdUrl ?? null,
    bannerSmUrl: row?.bannerSmUrl ?? null,
    body: row?.body ?? null,
  };
}

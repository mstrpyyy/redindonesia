import { prisma } from "@/lib/prisma";

// Registration & Documentation, Warranty & Service, Career, and Marcom &
// Promotion — one row each, upserted by slug from the admin form. Marcom
// keeps its `SocialAccount`-driven highlight list alongside this (see
// ADR-080) rather than replacing it — the banner + rich text body render
// above that list on the public page.
export const SUPPORT_PAGE_SLUGS = [
  "registration-documentation",
  "warranty-service",
  "career",
  "marcom",
] as const;

export type SupportPageSlug = (typeof SUPPORT_PAGE_SLUGS)[number];

export function isSupportPageSlug(value: string): value is SupportPageSlug {
  return (SUPPORT_PAGE_SLUGS as readonly string[]).includes(value);
}

// The admin route slug and the public route slug are identical for every
// page except Marcom (`/admin/support/marcom` vs. the public
// `/support/marcom-promotion`, named before this model existed) — this maps
// a `SupportPageSlug` to its own public path segment.
export const SUPPORT_PAGE_PUBLIC_PATH: Record<SupportPageSlug, string> = {
  "registration-documentation": "registration-documentation",
  "warranty-service": "warranty-service",
  career: "career",
  marcom: "marcom-promotion",
};

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

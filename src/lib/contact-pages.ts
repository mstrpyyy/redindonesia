import { prisma } from "@/lib/prisma";

// Currently just the Contact dashboard's "Content" submenu — one row,
// upserted by slug. Mirrors src/lib/support-pages.ts's shape (ADR-070/
// ADR-072) so a future Contact submenu with its own banner + rich text page
// can slot in the same way.
export const CONTACT_PAGE_SLUGS = ["content"] as const;

export type ContactPageSlug = (typeof CONTACT_PAGE_SLUGS)[number];

export function isContactPageSlug(value: string): value is ContactPageSlug {
  return (CONTACT_PAGE_SLUGS as readonly string[]).includes(value);
}

export interface IContactPage {
  slug: ContactPageSlug;
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
  body: string | null;
}

// Never throws on a missing row — the admin form starts blank and the
// public page falls back to its static defaults before the first save.
export async function getContactPage(slug: ContactPageSlug): Promise<IContactPage> {
  const row = await prisma.contactPage.findUnique({ where: { slug } });

  return {
    slug,
    bannerXlUrl: row?.bannerXlUrl ?? null,
    bannerXlVideoUrl: row?.bannerXlVideoUrl ?? null,
    bannerMdUrl: row?.bannerMdUrl ?? null,
    bannerMdVideoUrl: row?.bannerMdVideoUrl ?? null,
    bannerSmUrl: row?.bannerSmUrl ?? null,
    bannerSmVideoUrl: row?.bannerSmVideoUrl ?? null,
    bannerVideoUseForSmaller: row?.bannerVideoUseForSmaller ?? false,
    body: row?.body ?? null,
  };
}

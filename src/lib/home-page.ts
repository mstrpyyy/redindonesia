import { prisma } from "@/lib/prisma";
import { resolveCascadingVideoUrls } from "@/lib/banner-video";

// Currently just the one homepage hero banner — one row, upserted by slug.
// Mirrors src/lib/galleries-page.ts's shape (ADR-082) so a future
// banner-only page can slot in the same way.
export const HOME_PAGE_SLUGS = ["home"] as const;

export type HomePageSlug = (typeof HOME_PAGE_SLUGS)[number];

export function isHomePageSlug(value: string): value is HomePageSlug {
  return (HOME_PAGE_SLUGS as readonly string[]).includes(value);
}

// The four sizes form one waterfall, largest to smallest — see ADR-091.
export const HOME_BANNER_SIZE_ORDER = ["Xl", "Lg", "Md", "Sm"] as const;
export type HomeBannerSizeKey = (typeof HOME_BANNER_SIZE_ORDER)[number];

export interface IHomePage {
  slug: HomePageSlug;
  bannerSmUrl: string | null;
  bannerSmVideoUrl: string | null;
  bannerMdUrl: string | null;
  bannerMdVideoUrl: string | null;
  bannerLgUrl: string | null;
  bannerLgVideoUrl: string | null;
  bannerXlUrl: string | null;
  bannerXlVideoUrl: string | null;
  // One global switch (not per-size — ADR-091): when true, each size's video
  // also plays on every smaller size that has none of its own, until a
  // smaller size with its own video takes over and continues the cascade
  // from itself.
  bannerVideoUseForSmaller: boolean;
}

// Never throws on a missing row — the admin form starts blank before the
// first save ever happens.
export async function getHomePage(slug: HomePageSlug): Promise<IHomePage> {
  const row = await prisma.homePage.findUnique({ where: { slug } });

  return {
    slug,
    bannerSmUrl: row?.bannerSmUrl ?? null,
    bannerSmVideoUrl: row?.bannerSmVideoUrl ?? null,
    bannerMdUrl: row?.bannerMdUrl ?? null,
    bannerMdVideoUrl: row?.bannerMdVideoUrl ?? null,
    bannerLgUrl: row?.bannerLgUrl ?? null,
    bannerLgVideoUrl: row?.bannerLgVideoUrl ?? null,
    bannerXlUrl: row?.bannerXlUrl ?? null,
    bannerXlVideoUrl: row?.bannerXlVideoUrl ?? null,
    bannerVideoUseForSmaller: row?.bannerVideoUseForSmaller ?? false,
  };
}

// The waterfall resolution itself (ADR-091), shared by the public hero
// (Hero.tsx) — kept here rather than duplicated, since it's pure data logic
// with no rendering concerns. Walks largest → smallest; when the global flag
// is off, every size just shows its own video (or none). When on, a size
// with no video inherits whatever the nearest larger size's own video is —
// carried down through as many sizes as have none of their own, until a
// smaller size with its own video takes over from there.
export function resolveHomeBannerVideoUrls(
  homePage: Pick<
    IHomePage,
    "bannerXlVideoUrl" | "bannerLgVideoUrl" | "bannerMdVideoUrl" | "bannerSmVideoUrl" | "bannerVideoUseForSmaller"
  >
): Record<HomeBannerSizeKey, string | null> {
  const ownVideo: Record<HomeBannerSizeKey, string | null> = {
    Xl: homePage.bannerXlVideoUrl,
    Lg: homePage.bannerLgVideoUrl,
    Md: homePage.bannerMdVideoUrl,
    Sm: homePage.bannerSmVideoUrl,
  };

  return resolveCascadingVideoUrls(HOME_BANNER_SIZE_ORDER, ownVideo, homePage.bannerVideoUseForSmaller);
}

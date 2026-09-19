import { prisma } from "@/lib/prisma";
import { resolveCascadingVideoUrls } from "@/lib/banner-video";
import type {
  IHomeAboutLinkButton,
  IHomeStatistic,
  IHomeFeature,
  IHomeCertification,
} from "@/interfaces/general";

// Currently just the one homepage hero banner — one row, upserted by slug.
// Mirrors src/lib/galleries-page.ts's shape (ADR-082) so a future
// banner-only page can slot in the same way.
export const HOME_PAGE_SLUGS = ["home"] as const;

export type HomePageSlug = (typeof HOME_PAGE_SLUGS)[number];

export function isHomePageSlug(value: string): value is HomePageSlug {
  return (HOME_PAGE_SLUGS as readonly string[]).includes(value);
}

// Re-exported for server consumers; the definition lives in a prisma-free
// module so client components can import it too (ADR-099).
export { HOMEPAGE_EMPTY_PLACEHOLDER } from "./home-page-constants";

// The `aboutLinkButtons` JSON column is trusted admin-authored data, but a
// hand-edited or partially-migrated row shouldn't crash the homepage — keep
// only well-formed entries.
function parseAboutLinkButtons(value: unknown): IHomeAboutLinkButton[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const { id, href, image } = entry as Record<string, unknown>;
    if (typeof id !== "string" || typeof href !== "string" || typeof image !== "string") return [];
    if (!href || !image) return [];
    return [{ id, href, image }];
  });
}

// Same defensive parse as `parseAboutLinkButtons` — a malformed `statistics`
// row degrades to an empty list rather than crashing the homepage.
function parseStatistics(value: unknown): IHomeStatistic[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const { id, value: statValue, name } = entry as Record<string, unknown>;
    if (typeof id !== "string" || typeof statValue !== "number" || typeof name !== "string") return [];
    if (!Number.isFinite(statValue) || statValue < 1 || !name) return [];
    return [{ id, value: statValue, name }];
  });
}

// The renderer falls back to a default icon for an unknown `icon` key, so no
// icon-name validation here — just keep entries with the right shape.
function parseFeatures(value: unknown): IHomeFeature[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const { id, icon, title, description } = entry as Record<string, unknown>;
    if (
      typeof id !== "string" ||
      typeof icon !== "string" ||
      typeof title !== "string" ||
      typeof description !== "string"
    ) {
      return [];
    }
    if (!title || !description) return [];
    return [{ id, icon, title, description }];
  });
}

function parseCertifications(value: unknown): IHomeCertification[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const { id, image } = entry as Record<string, unknown>;
    if (typeof id !== "string" || typeof image !== "string" || !image) return [];
    return [{ id, image }];
  });
}

// The four sizes form one waterfall, largest to smallest — see ADR-091.
export const HOME_BANNER_SIZE_ORDER = ["Xl", "Lg", "Md", "Sm"] as const;
export type HomeBannerSizeKey = (typeof HOME_BANNER_SIZE_ORDER)[number];

export interface IHomePage {
  slug: HomePageSlug;
  heroHeading: string | null;
  heroSubheading: string | null;
  aboutHeading: string | null;
  aboutBody: string | null;
  aboutLinkButtons: IHomeAboutLinkButton[];
  statistics: IHomeStatistic[];
  highlightVideoTitle: string | null;
  highlightVideoDescription: string | null;
  highlightVideoYoutubeUrl: string | null;
  highlightVideoThumbnailUrl: string | null;
  featureListTitle: string | null;
  features: IHomeFeature[];
  brandsTitle: string | null;
  certificationsTitle: string | null;
  certifications: IHomeCertification[];
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

// Never throws — a missing row (the admin form starts blank before the first
// save) or a failed query (DB hiccup in prod) both resolve to an all-empty
// `IHomePage`, and every consumer renders `HOMEPAGE_EMPTY_PLACEHOLDER` for
// the fields it needs (ADR-099). The homepage must not 500 over CMS content.
export async function getHomePage(slug: HomePageSlug): Promise<IHomePage> {
  let row: Awaited<ReturnType<typeof prisma.homePage.findUnique>> = null;
  try {
    row = await prisma.homePage.findUnique({ where: { slug } });
  } catch {
    row = null;
  }

  return {
    slug,
    heroHeading: row?.heroHeading ?? null,
    heroSubheading: row?.heroSubheading ?? null,
    aboutHeading: row?.aboutHeading ?? null,
    aboutBody: row?.aboutBody ?? null,
    aboutLinkButtons: parseAboutLinkButtons(row?.aboutLinkButtons),
    statistics: parseStatistics(row?.statistics),
    highlightVideoTitle: row?.highlightVideoTitle ?? null,
    highlightVideoDescription: row?.highlightVideoDescription ?? null,
    highlightVideoYoutubeUrl: row?.highlightVideoYoutubeUrl ?? null,
    highlightVideoThumbnailUrl: row?.highlightVideoThumbnailUrl ?? null,
    featureListTitle: row?.featureListTitle ?? null,
    features: parseFeatures(row?.features),
    brandsTitle: row?.brandsTitle ?? null,
    certificationsTitle: row?.certificationsTitle ?? null,
    certifications: parseCertifications(row?.certifications),
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

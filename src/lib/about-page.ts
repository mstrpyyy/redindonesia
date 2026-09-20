import { prisma } from "@/lib/prisma";
import type { IAboutImage, IAboutVideo, IAboutWorkCard } from "@/interfaces/general";

// The one /about ("Our Story") page — one row, upserted by slug (ADR-103).
// Mirrors src/lib/home-page.ts's shape (ADR-082/099).
export const ABOUT_PAGE_SLUGS = ["our-story"] as const;

export type AboutPageSlug = (typeof ABOUT_PAGE_SLUGS)[number];

export function isAboutPageSlug(value: string): value is AboutPageSlug {
  return (ABOUT_PAGE_SLUGS as readonly string[]).includes(value);
}

export interface IAboutPage {
  slug: AboutPageSlug;
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
  whoIconUrl: string | null;
  whoBody: string | null;
  whoImages: IAboutImage[];
  videos: IAboutVideo[];
  whatIconUrl: string | null;
  whatBody: string | null;
  workIconUrl: string | null;
  workBody: string | null;
  workCards: IAboutWorkCard[];
}

// The JSON columns are trusted admin-authored data, but a hand-edited or
// partially-migrated row shouldn't crash /about — keep only well-formed
// entries (same defensive parse as src/lib/home-page.ts).
function parseImages(value: unknown): IAboutImage[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const { id, image } = entry as Record<string, unknown>;
    if (typeof id !== "string" || typeof image !== "string" || !image) return [];
    return [{ id, image }];
  });
}

function parseVideos(value: unknown): IAboutVideo[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const { id, youtubeUrl, thumbnailUrl, heading, description } = entry as Record<string, unknown>;
    if (typeof id !== "string" || typeof youtubeUrl !== "string" || !youtubeUrl) return [];
    return [
      {
        id,
        youtubeUrl,
        thumbnailUrl: typeof thumbnailUrl === "string" ? thumbnailUrl : "",
        heading: typeof heading === "string" ? heading : "",
        description: typeof description === "string" ? description : "",
      },
    ];
  });
}

function parseWorkCards(value: unknown): IAboutWorkCard[] {
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

// Never throws — a missing row (the admin form starts blank before the first
// save) or a failed query both resolve to an all-empty `IAboutPage`, and the
// public page renders the "-" placeholder for the text it needs (ADR-099
// convention, applied to /about by ADR-103).
export async function getAboutPage(slug: AboutPageSlug): Promise<IAboutPage> {
  let row: Awaited<ReturnType<typeof prisma.aboutPage.findUnique>> = null;
  try {
    row = await prisma.aboutPage.findUnique({ where: { slug } });
  } catch {
    row = null;
  }

  return {
    slug,
    bannerXlUrl: row?.bannerXlUrl ?? null,
    bannerXlVideoUrl: row?.bannerXlVideoUrl ?? null,
    bannerMdUrl: row?.bannerMdUrl ?? null,
    bannerMdVideoUrl: row?.bannerMdVideoUrl ?? null,
    bannerSmUrl: row?.bannerSmUrl ?? null,
    bannerSmVideoUrl: row?.bannerSmVideoUrl ?? null,
    bannerVideoUseForSmaller: row?.bannerVideoUseForSmaller ?? false,
    whoIconUrl: row?.whoIconUrl ?? null,
    whoBody: row?.whoBody ?? null,
    whoImages: parseImages(row?.whoImages),
    videos: parseVideos(row?.videos),
    whatIconUrl: row?.whatIconUrl ?? null,
    whatBody: row?.whatBody ?? null,
    workIconUrl: row?.workIconUrl ?? null,
    workBody: row?.workBody ?? null,
    workCards: parseWorkCards(row?.workCards),
  };
}

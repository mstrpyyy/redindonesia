import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { IDigitalItem, IDigitalListFilters, IDigitalListResult, IDigitalMediaBlock, IPublicDigitalItem } from "@/interfaces/digital";
import { DIGITAL_LIST_PAGE_SIZE } from "@/app/(admin)/admin/digital/limits";
import { resolveCascadingVideoUrls } from "@/lib/banner-video";

// Same four-size waterfall/order as Category's/Product hero's own (ADR-093/
// ADR-095), reused here since `DigitalItem` has the identical banner shape
// (see ADR-110).
export const DIGITAL_BANNER_SIZE_ORDER = ["Xl", "Lg", "Md", "Sm"] as const;
export type DigitalBannerSizeKey = (typeof DIGITAL_BANNER_SIZE_ORDER)[number];

export function resolveDigitalBannerVideoUrls(
  item: Pick<IDigitalItem, "bannerXlVideoUrl" | "bannerLgVideoUrl" | "bannerMdVideoUrl" | "bannerSmVideoUrl" | "bannerVideoUseForSmaller">
): Record<DigitalBannerSizeKey, string | null> {
  const ownVideo: Record<DigitalBannerSizeKey, string | null> = {
    Xl: item.bannerXlVideoUrl,
    Lg: item.bannerLgVideoUrl,
    Md: item.bannerMdVideoUrl,
    Sm: item.bannerSmVideoUrl,
  };

  return resolveCascadingVideoUrls(DIGITAL_BANNER_SIZE_ORDER, ownVideo, item.bannerVideoUseForSmaller);
}

const listItemSelect = {
  id: true,
  name: true,
  slug: true,
  status: true,
  qrImageUrl: true,
  updatedAt: true,
} as const;

export async function getDigitalItems(filters: IDigitalListFilters = {}): Promise<IDigitalListResult> {
  const search = filters.search?.trim();
  const pageSize: number | "all" =
    filters.pageSize === "all" ? "all" : filters.pageSize && filters.pageSize > 0 ? filters.pageSize : DIGITAL_LIST_PAGE_SIZE;
  const page = pageSize === "all" ? 1 : filters.page && filters.page > 0 ? filters.page : 1;

  const where: Prisma.DigitalItemWhereInput = search ? { name: { contains: search, mode: "insensitive" } } : {};

  const [rows, total] = await Promise.all([
    prisma.digitalItem.findMany({
      where,
      orderBy: { order: "asc" },
      select: listItemSelect,
      ...(pageSize === "all" ? {} : { skip: (page - 1) * pageSize, take: pageSize }),
    }),
    prisma.digitalItem.count({ where }),
  ]);

  return {
    items: rows.map((row) => ({ ...row, status: row.status as "hidden" | "public" })),
    total,
  };
}

// The public `/digital` landing page's QR carousel — published items only,
// ordered the same way the admin list is (see ADR-109).
export async function getPublishedDigitalItems(): Promise<IPublicDigitalItem[]> {
  return prisma.digitalItem.findMany({
    where: { status: "public" },
    orderBy: { order: "asc" },
    select: { id: true, name: true, slug: true, qrImageUrl: true },
  });
}

export async function getDigitalItemById(id: string): Promise<IDigitalItem | null> {
  const row = await prisma.digitalItem.findUnique({ where: { id } });
  if (!row) return null;

  return {
    ...row,
    status: row.status as "hidden" | "public",
    media: row.media as unknown as IDigitalItem["media"],
  };
}

// The public `/digital/[slug]` detail page — a published item only, matched
// by slug (see ADR-110). Slug is already globally unique (`generateUniqueDigitalSlug`,
// digital-actions.ts), so `status: "public"` here just rejects a still-draft
// item's URL rather than disambiguating multiple matches.
export async function getPublishedDigitalItemBySlug(slug: string): Promise<IDigitalItem | null> {
  const row = await prisma.digitalItem.findFirst({ where: { slug, status: "public" } });
  if (!row) return null;

  return {
    ...row,
    status: row.status as "hidden" | "public",
    media: row.media as unknown as IDigitalItem["media"],
  };
}

// The `/digital/[slug]/videos/[blockId]` and `.../flipbook/[blockId]` pages
// (ADR-111) both need the same lookup: a published item by slug, then one of
// its own media blocks by id.
export async function getPublishedDigitalMediaBlock(
  slug: string,
  blockId: string
): Promise<{ item: IDigitalItem; block: IDigitalMediaBlock } | null> {
  const item = await getPublishedDigitalItemBySlug(slug);
  if (!item) return null;

  const block = item.media.find((candidate) => candidate.id === blockId);
  if (!block) return null;

  return { item, block };
}

import { prisma } from "@/lib/prisma";
import { IDeviceCardItem, IProduct, IProductListItem, IProductPickerOption } from "@/interfaces/general";
import { ICardBackgroundValue } from "@/lib/card-backgrounds";
import { IProductSegment } from "@/interfaces/segments";
import { getCategoryAncestry } from "@/lib/categories";

const listItemSelect = {
  id: true,
  type: true,
  name: true,
  slug: true,
  thumbnail: true,
  status: true,
  order: true,
  category: {
    select: {
      id: true,
      name: true,
      parent: {
        select: {
          id: true,
          name: true,
          parent: { select: { id: true, name: true } },
        },
      },
    },
  },
} as const;

export async function getProductItems(type: "device" | "product"): Promise<IProductListItem[]> {
  const rows = await prisma.product.findMany({
    where: { type },
    orderBy: { order: "asc" },
    select: listItemSelect,
  });

  return rows.map((row) => ({
    ...row,
    type: row.type as "device" | "product",
    status: row.status as "hidden" | "public",
  }));
}

// Public products directly assigned to one category node, shaped as
// catalogue cards for the public `/devices/[category]/[brand]` grid.
// `urlPrefix` is the current page's own path (e.g.
// "/devices/medical-aesthetic-devices/alma-laser") — each card links to
// `${urlPrefix}/${product.slug}`.
export async function getPublishedProductCards(
  categoryId: string,
  urlPrefix: string
): Promise<IDeviceCardItem[]> {
  const rows = await prisma.product.findMany({
    where: { categoryId, status: "public" },
    orderBy: { order: "asc" },
    select: {
      name: true,
      tagline: true,
      slug: true,
      thumbnail: true,
      cardBackground: true,
      tags: { select: { name: true } },
    },
  });

  return rows.map((row) => ({
    name: row.name,
    desc: row.tagline ?? "",
    url: `${urlPrefix}/${row.slug}`,
    imgUrl: row.thumbnail ?? "",
    background: row.cardBackground as ICardBackgroundValue | null,
    tags: row.tags.map((tag) => tag.name),
  }));
}

// Every published device/product, flattened across both `type`s, with each
// one's own resolved public URL — used by the homepage carousel's "custom"
// mode item search (see ADR-068) to pick a real catalogue item instead of
// typing its title/image/link by hand. Costs up to `MAX_CATEGORY_DEPTH`
// sequential ancestry queries per product (no caching) — acceptable for an
// admin-only picker at the current catalogue size, same trade-off already
// accepted by `getHomeCarousels`'s per-row category lookup.
export async function getPublishedProductPickerOptions(): Promise<IProductPickerOption[]> {
  const rows = await prisma.product.findMany({
    where: { status: "public" },
    orderBy: { name: "asc" },
    select: { id: true, type: true, name: true, thumbnail: true, slug: true, categoryId: true },
  });

  const resolved = await Promise.all(
    rows.map(async (row): Promise<IProductPickerOption | null> => {
      const ancestry = await getCategoryAncestry(row.categoryId);
      if (!ancestry) return null;

      const urlPrefix = `/${row.type === "device" ? "devices" : "products"}/${ancestry.slugPath.join("/")}`;
      return {
        id: row.id,
        type: row.type as "device" | "product",
        name: row.name,
        thumbnail: row.thumbnail,
        url: `${urlPrefix}/${row.slug}`,
      };
    })
  );

  return resolved.filter((option): option is IProductPickerOption => option !== null);
}

const tagSelect = { id: true, type: true, name: true } as const;

export async function getProductById(id: string): Promise<IProduct | null> {
  const row = await prisma.product.findUnique({ where: { id }, include: { tags: { select: tagSelect } } });
  if (!row) return null;

  return mapProductRow(row);
}

// Slug is already unique per `type` globally (see `generateUniqueProductSlug`
// in product-actions.ts — "products don't nest, unlike categories"), so
// `categoryId` here isn't disambiguating multiple matches; it rejects a stale
// URL for a product that's since been moved to a different category.
export async function getPublishedProductBySlug(categoryId: string, slug: string): Promise<IProduct | null> {
  const row = await prisma.product.findFirst({
    where: { categoryId, slug, status: "public" },
    include: { tags: { select: tagSelect } },
  });
  if (!row) return null;

  return mapProductRow(row);
}

function mapProductRow(row: {
  id: string;
  type: string;
  name: string;
  slug: string;
  tagline: string | null;
  thumbnail: string | null;
  cardBackground: string | null;
  status: string;
  order: number;
  categoryId: string;
  segments: unknown;
  tags: { id: string; type: string; name: string }[];
}): IProduct {
  return {
    id: row.id,
    type: row.type as "device" | "product",
    name: row.name,
    slug: row.slug,
    tagline: row.tagline,
    thumbnail: row.thumbnail,
    cardBackground: row.cardBackground as ICardBackgroundValue | null,
    status: row.status as "hidden" | "public",
    order: row.order,
    categoryId: row.categoryId,
    segments: row.segments as unknown as IProductSegment[],
    tags: row.tags.map((tag) => ({ ...tag, type: tag.type as "device" | "product" })),
  };
}

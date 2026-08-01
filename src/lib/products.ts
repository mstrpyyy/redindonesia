import { prisma } from "@/lib/prisma";
import { IDeviceCardItem, IProduct, IProductListItem } from "@/interfaces/general";
import { ICardBackgroundValue } from "@/lib/card-backgrounds";
import { IProductSegment } from "@/interfaces/segments";

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

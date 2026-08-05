import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  IDeviceCardItem,
  IProduct,
  IProductListFilters,
  IProductListItem,
  IProductListResult,
  IProductPickerOption,
  IPublicCatalogueFilters,
  IPublicCatalogueResult,
} from "@/interfaces/general";
import { ICardBackgroundValue } from "@/lib/card-backgrounds";
import { IProductSegment } from "@/interfaces/segments";
import { getCategoryAncestry } from "@/lib/categories";
import { PRODUCT_LIST_PAGE_SIZE } from "@/app/(admin)/admin/product-device/limits";
import { CATALOGUE_PAGE_SIZE } from "@/app/(user)/components/catalogue/limits";

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

export async function getProductItems(
  type: "device" | "product",
  filters: IProductListFilters = {}
): Promise<IProductListResult> {
  const search = filters.search?.trim();
  const pageSize: number | "all" =
    filters.pageSize === "all" ? "all" : filters.pageSize && filters.pageSize > 0 ? filters.pageSize : PRODUCT_LIST_PAGE_SIZE;
  const page = pageSize === "all" ? 1 : filters.page && filters.page > 0 ? filters.page : 1;

  const where: Prisma.ProductWhereInput = {
    type,
    ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
    // A category filter matches a product filed there either as its primary
    // (routing) category or as a secondary cross-listing (ADR-085).
    ...(filters.categoryIds?.length
      ? {
          OR: [
            { categoryId: { in: filters.categoryIds } },
            { secondaryCategories: { some: { id: { in: filters.categoryIds } } } },
          ],
        }
      : {}),
    ...(filters.tagIds?.length ? { tags: { some: { id: { in: filters.tagIds } } } } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { order: "asc" },
      select: listItemSelect,
      ...(pageSize === "all" ? {} : { skip: (page - 1) * pageSize, take: pageSize }),
    }),
    prisma.product.count({ where }),
  ]);

  return {
    items: rows.map((row) => ({
      ...row,
      type: row.type as "device" | "product",
      status: row.status as "hidden" | "public",
    })),
    total,
  };
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

// Search/category/tag filtered + offset-paginated public catalogue cards — unlike
// `getPublishedProductCards` above, results can span more than one category (see
// ADR-084), so each card resolves its own URL via `getCategoryAncestry` instead of
// sharing one caller-supplied `urlPrefix`. `take: limit + 1` detects `hasMore` without a
// second `count` query; a product whose category was deleted out from under it (no
// ancestry) is dropped rather than rendered with a broken link.
export async function getPublicCatalogueCards(
  type: "device" | "product",
  filters: IPublicCatalogueFilters = {}
): Promise<IPublicCatalogueResult> {
  const search = filters.search?.trim();
  const offset = filters.offset && filters.offset > 0 ? filters.offset : 0;
  const limit = filters.limit && filters.limit > 0 ? filters.limit : CATALOGUE_PAGE_SIZE;

  const where: Prisma.ProductWhereInput = {
    type,
    status: "public",
    ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
    // Same either-primary-or-secondary match as `getProductItems` above —
    // each card below still resolves its own canonical URL from the
    // product's own (primary) `categoryId`, so a secondary-category match
    // here never produces a broken link (ADR-085).
    ...(filters.categoryIds?.length
      ? {
          OR: [
            { categoryId: { in: filters.categoryIds } },
            { secondaryCategories: { some: { id: { in: filters.categoryIds } } } },
          ],
        }
      : {}),
    ...(filters.tagIds?.length ? { tags: { some: { id: { in: filters.tagIds } } } } : {}),
  };

  const rows = await prisma.product.findMany({
    where,
    orderBy: { order: "asc" },
    skip: offset,
    take: limit + 1,
    select: {
      name: true,
      tagline: true,
      slug: true,
      thumbnail: true,
      cardBackground: true,
      categoryId: true,
      tags: { select: { name: true } },
    },
  });

  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const urlBase = type === "device" ? "/devices" : "/products";

  const resolved = await Promise.all(
    pageRows.map(async (row): Promise<IDeviceCardItem | null> => {
      const ancestry = await getCategoryAncestry(row.categoryId);
      if (!ancestry) return null;

      return {
        name: row.name,
        desc: row.tagline ?? "",
        url: `${urlBase}/${ancestry.slugPath.join("/")}/${row.slug}`,
        imgUrl: row.thumbnail ?? "",
        background: row.cardBackground as ICardBackgroundValue | null,
        tags: row.tags.map((tag) => tag.name),
      };
    })
  );

  return {
    items: resolved.filter((item): item is IDeviceCardItem => item !== null),
    hasMore,
  };
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
  const row = await prisma.product.findUnique({
    where: { id },
    include: { tags: { select: tagSelect }, secondaryCategories: { select: { id: true } } },
  });
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
    include: { tags: { select: tagSelect }, secondaryCategories: { select: { id: true } } },
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
  showInMenu: boolean;
  order: number;
  categoryId: string;
  segments: unknown;
  tags: { id: string; type: string; name: string }[];
  secondaryCategories: { id: string }[];
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
    showInMenu: row.showInMenu,
    order: row.order,
    categoryId: row.categoryId,
    secondaryCategoryIds: row.secondaryCategories.map((category) => category.id),
    segments: row.segments as unknown as IProductSegment[],
    tags: row.tags.map((tag) => ({ ...tag, type: tag.type as "device" | "product" })),
  };
}

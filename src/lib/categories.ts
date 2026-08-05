import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { ICategory, INavbarMenu } from "@/interfaces/general";

// Builds the nested tree for one root ("device" | "product") from a flat,
// order-sorted row list — one query instead of a recursive per-level walk.
// `order` is scoped per sibling group (per parentId), so sorting the flat
// list by `order` before grouping still yields correctly ordered children.
export async function getCategoryTree(type: "device" | "product"): Promise<ICategory[]> {
  const rows = await prisma.category.findMany({
    where: { type },
    orderBy: { order: "asc" },
  });

  const nodesById = new Map<string, ICategory>(
    rows.map((row) => [
      row.id,
      {
        id: row.id,
        type: row.type as "device" | "product",
        name: row.name,
        slug: row.slug,
        depth: row.depth,
        order: row.order,
        parentId: row.parentId,
        isPage: row.isPage,
        bannerSmUrl: row.bannerSmUrl,
        bannerMdUrl: row.bannerMdUrl,
        bannerLgUrl: row.bannerLgUrl,
        bannerXlUrl: row.bannerXlUrl,
        title: row.title,
        description: row.description,
        body: row.body,
        youtubeUrl: row.youtubeUrl,
        youtubeThumbnailUrl: row.youtubeThumbnailUrl,
        youtubeCaption: row.youtubeCaption,
        youtubeDescription: row.youtubeDescription,
        heroTextColor: row.heroTextColor,
        children: [],
      },
    ])
  );

  const roots: ICategory[] = [];
  for (const node of nodesById.values()) {
    if (node.parentId) nodesById.get(node.parentId)?.children.push(node);
    else roots.push(node);
  }

  return roots;
}

// Walks a slug path down an already-built tree, one segment per depth level —
// e.g. ["medical-aesthetic-devices", "alma-laser"]. A segment that doesn't
// match among the current node's own children (not just anywhere in the
// tree) returns null, so a slug path that doesn't actually nest that way
// fails instead of resolving to the wrong node. Split out from
// `getCategoryBySlugPath` so a caller trying more than one slug path against
// the same tree (e.g. `resolveDevicesRoute`) fetches the tree once.
export function findCategoryInTree(tree: ICategory[], slugPath: string[]): ICategory | null {
  let nodes = tree;
  let match: ICategory | null = null;
  for (const slug of slugPath) {
    match = nodes.find((node) => node.slug === slug) ?? null;
    if (!match) return null;
    nodes = match.children;
  }

  return match;
}

// Resolves a category by walking a slug path down from a root ("device" |
// "product"). See `findCategoryInTree` for the actual walk.
export async function getCategoryBySlugPath(
  type: "device" | "product",
  slugPath: string[]
): Promise<ICategory | null> {
  const tree = await getCategoryTree(type);
  return findCategoryInTree(tree, slugPath);
}

// Walks a category's `parentId` chain up to its root (at most
// `MAX_CATEGORY_DEPTH` hops, one query per hop) collecting both its name
// breadcrumb and slug path. Used by `HomeCarousel` "category" mode
// (ADR-066) to derive its title/breadcrumb/"See More" URL live rather than
// storing values that would go stale if the category is renamed or moved.
// Returns null if the id doesn't resolve (category deleted).
export async function getCategoryAncestry(
  categoryId: string
): Promise<{ type: "device" | "product"; names: string[]; slugPath: string[] } | null> {
  const names: string[] = [];
  const slugPath: string[] = [];
  let current = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { type: true, name: true, slug: true, parentId: true },
  });
  if (!current) return null;

  const type = current.type as "device" | "product";
  while (current) {
    names.unshift(current.name);
    slugPath.unshift(current.slug);
    if (!current.parentId) break;
    current = await prisma.category.findUnique({
      where: { id: current.parentId },
      select: { type: true, name: true, slug: true, parentId: true },
    });
  }

  return { type, names, slugPath };
}

// Cached separately from `getCategoryTree` itself — the public navbar renders
// this on every page, unlike the admin pages' own uncached reads (low-traffic,
// no benefit to caching those). Tagged so a category mutation can invalidate
// it immediately via `updateTag` (`revalidateCategoryPages`, actions.ts) — see
// ADR-058, which corrects an earlier (mistaken) assumption that on-demand
// invalidation wasn't possible here. `revalidate: 3600` is only a fallback
// net in case some future write path forgets to call `updateTag`; it's not
// the primary invalidation mechanism.
export const getPublicDeviceCategoryTree = unstable_cache(
  () => getCategoryTree("device"),
  ["device-nav-categories"],
  { revalidate: 3600, tags: ["device-nav-categories"] }
);

// Same caching rationale as `getPublicDeviceCategoryTree` above — the
// Products side of the navbar now reads live data too (see ADR-042).
export const getPublicProductCategoryTree = unstable_cache(
  () => getCategoryTree("product"),
  ["product-nav-categories"],
  { revalidate: 3600, tags: ["product-nav-categories"] }
);

// Every category's public, menu-flagged products, grouped by `categoryId` —
// only fetched for nav purposes (ADR-086). Separate from `getCategoryTree`
// (used by routing and the admin tree too) so those paths don't pay for a
// products query they don't need.
async function getPublicNavProductsByCategory(
  type: "device" | "product"
): Promise<Map<string, { name: string; slug: string }[]>> {
  const products = await prisma.product.findMany({
    where: { type, status: "public", showInMenu: true },
    select: { name: true, slug: true, categoryId: true },
    orderBy: { order: "asc" },
  });

  const byCategory = new Map<string, { name: string; slug: string }[]>();
  for (const product of products) {
    const list = byCategory.get(product.categoryId) ?? [];
    list.push({ name: product.name, slug: product.slug });
    byCategory.set(product.categoryId, list);
  }
  return byCategory;
}

// `Category` → the navbar's `INavbarMenu` shape (name/slug/menu), for splicing
// live data into the static `deviceProductMenu` structure (see `buildNavMenus`
// in `src/lib/data.ts`). Every category is shown regardless of `isPage` or
// whether it (or anything beneath it) has content yet (ADR-043's "drop
// branches with no page anywhere in them" rule was removed — see ADR-086's
// follow-up). A leaf's `menu` is omitted entirely, not `[]` — the static
// data's own leaves do the same, and `LargeDropdown`/`SidebarDropdown` check
// `if (menu.menu)` truthiness, so an empty array would render an empty (but
// still open-able) dropdown instead of no dropdown at all.
//
// Each category's own `Product.showInMenu` products (see ADR-086) are
// appended after its sub-categories (if any) in that same `menu` array — a
// per-product opt-in rather than a category-wide switch, so an admin picks
// which products actually warrant a menu entry instead of all-or-nothing.
// Each becomes a leaf entry (`isPage: true`, since a public product always
// has a real page) at `/<...ancestorSlugs>/<product.slug>`, which
// `resolveDevicesRoute` already resolves without needing a category node of
// its own. Async because it needs one products query per call (see
// `getPublicNavProductsByCategory`) — `type` is threaded through the
// recursion for that query, not read off `categories` (an empty array at the
// top of a branch would otherwise lose it).
export async function mapCategoriesToNavMenu(
  categories: ICategory[],
  type: "device" | "product"
): Promise<INavbarMenu[]> {
  const productsByCategory = await getPublicNavProductsByCategory(type);
  return buildCategoryNavMenu(categories, productsByCategory);
}

function buildCategoryNavMenu(
  categories: ICategory[],
  productsByCategory: Map<string, { name: string; slug: string }[]>
): INavbarMenu[] {
  return categories.map((category) => {
    const subCategoryMenu =
      category.children.length > 0 ? buildCategoryNavMenu(category.children, productsByCategory) : [];
    const productMenu = (productsByCategory.get(category.id) ?? []).map((product) => ({
      name: product.name,
      slug: product.slug,
      isPage: true,
    }));
    const menu = [...subCategoryMenu, ...productMenu];

    return {
      name: category.name,
      slug: category.slug,
      isPage: category.isPage,
      menu: menu.length > 0 ? menu : undefined,
    };
  });
}

import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { ICategory, INavbarMenu } from "@/interfaces/general";
import { hasPageInBranch } from "@/lib/category-visibility";

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

// `Category` → the navbar's `INavbarMenu` shape (name/slug/menu), for splicing
// live data into the static `deviceProductMenu` structure (see `buildNavMenus`
// in `src/lib/data.ts`). Branches with no page anywhere in them are dropped
// entirely (ADR-043) — recursively, so this both hides a fully dead root and
// prunes dead leaves out of an otherwise-kept branch. A leaf's `menu` is
// omitted entirely, not `[]` — the static data's own leaves do the same, and
// `LargeDropdown`/`SidebarDropdown` check `if (menu.menu)` truthiness, so an
// empty array would render an empty (but still open-able) dropdown instead
// of no dropdown at all.
export function mapCategoriesToNavMenu(categories: ICategory[]): INavbarMenu[] {
  return categories.filter(hasPageInBranch).map((category) => ({
    name: category.name,
    slug: category.slug,
    isPage: category.isPage,
    menu: category.children.length > 0 ? mapCategoriesToNavMenu(category.children) : undefined,
  }));
}

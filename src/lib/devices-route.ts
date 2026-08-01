import { findCategoryInTree, getCategoryTree } from "@/lib/categories";
import { getPublishedProductBySlug } from "@/lib/products";
import { ICategory, IProduct } from "@/interfaces/general";

export type IResolvedDevicesRoute =
  | { kind: "category"; category: ICategory }
  | { kind: "product"; product: IProduct; category: ICategory };

// Resolves a full URL slug path against one root's category tree: the whole
// path as a category first, otherwise all-but-last as the category and the
// last segment as a public product's own slug under it. Takes `type` so
// the same resolver can serve a future `/products/...` catch-all.
//
// Category slugs are unique per parent, but product slugs are unique per
// `type` globally — two separate uniqueness domains — so a child category
// could in principle share a slug with a sibling product and permanently
// shadow it at that exact path. Rare, entirely admin-caused, and trivially
// fixed by renaming either slug; not worth a cross-model uniqueness check.
export async function resolveDevicesRoute(
  type: "device" | "product",
  slugPath: string[]
): Promise<IResolvedDevicesRoute | null> {
  const tree = await getCategoryTree(type);

  const category = findCategoryInTree(tree, slugPath);
  if (category) return { kind: "category", category };

  if (slugPath.length < 2) return null;

  const parentCategory = findCategoryInTree(tree, slugPath.slice(0, -1));
  if (!parentCategory) return null;

  const product = await getPublishedProductBySlug(parentCategory.id, slugPath[slugPath.length - 1]);
  if (!product) return null;

  return { kind: "product", product, category: parentCategory };
}

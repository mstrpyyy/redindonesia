import { ICategory } from "@/interfaces/general";

// True if this node, or anything anywhere beneath it, is a real page — see
// ADR-043. Pulled into its own module (no `prisma`/`next/cache` imports)
// so it can be shared as-is between the public nav's own filtering
// (`mapCategoriesToNavMenu`, src/lib/categories.ts — a server-only file) and
// the admin tree's "Hidden from navbar" indicator (category-tree.tsx, a
// Client Component) without either pulling in the other's server-only
// dependencies.
export function hasPageInBranch(category: ICategory): boolean {
  return category.isPage || category.children.some(hasPageInBranch);
}

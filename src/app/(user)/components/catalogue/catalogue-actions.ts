"use server";

import { getPublicCatalogueCards } from "@/lib/products";
import { IPublicCatalogueFilters, IPublicCatalogueResult } from "@/interfaces/general";

// Read-only — see ADR-084. `CatalogueProductGrid` calls this both when a
// filter changes (offset 0, replacing the grid) and when the infinite-scroll
// sentinel fires (offset = however many cards are already loaded, appending).
export async function loadCatalogueCards(
  type: "device" | "product",
  filters: IPublicCatalogueFilters
): Promise<IPublicCatalogueResult> {
  return getPublicCatalogueCards(type, filters);
}

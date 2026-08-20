"use server";

import { getSearchSuggestions as getSearchSuggestionsData } from "@/lib/search";
import { ISearchSuggestions } from "@/interfaces/general";

// Thin RPC entry point so SearchBar.tsx (a client component, used by both
// the navbar and the homepage hero) can call into `src/lib/search.ts`
// directly, same "use server" wrapper / plain-lib-below split as the admin
// CMS's actions.ts files.
export async function getSearchSuggestions(query: string): Promise<ISearchSuggestions> {
  return getSearchSuggestionsData(query);
}

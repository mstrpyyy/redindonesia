import { PRODUCT_LIST_PAGE_SIZE, PRODUCT_LIST_PAGE_SIZE_OPTIONS } from "./limits";

// Shared by both `products/items/page.tsx` and `devices/items/page.tsx` — the
// URL is the single source of truth for the list's search/filter/page/page-size
// state (see ADR-083), so both routes parse it the same way.
export function parseItemListSearchParams(params: {
  q?: string;
  categories?: string;
  tags?: string;
  page?: string;
  pageSize?: string;
}) {
  const search = params.q?.trim() ?? "";
  const categoryIds = params.categories?.split(",").filter(Boolean) ?? [];
  const tagIds = params.tags?.split(",").filter(Boolean) ?? [];

  const parsedPageSize = Number(params.pageSize);
  const pageSize: number | "all" =
    params.pageSize === "all"
      ? "all"
      : PRODUCT_LIST_PAGE_SIZE_OPTIONS.includes(parsedPageSize as (typeof PRODUCT_LIST_PAGE_SIZE_OPTIONS)[number])
        ? parsedPageSize
        : PRODUCT_LIST_PAGE_SIZE;

  const parsedPage = Number(params.page);
  // "all" has exactly one page — any `page` param is meaningless alongside it.
  const page = pageSize === "all" ? 1 : Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  return { search, categoryIds, tagIds, page, pageSize };
}

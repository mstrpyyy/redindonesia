"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IDeviceCardItem, ITag } from "@/interfaces/general";
import { DeviceCard } from "./DeviceCard";
import { CataloguePopoverFilter, ICatalogueFilterOption } from "./CataloguePopoverFilter";
import { CATALOGUE_PAGE_SIZE } from "./limits";
import { loadCatalogueCards } from "./catalogue-actions";

const SEARCH_DEBOUNCE_MS = 400;

// Live, filterable, infinite-scrolling replacement for a leaf category's
// static product grid — see ADR-084. Renders where `DeviceFilterList` used
// to render `productCards` in `CategoryPageView`; the "Browse Categories"
// sub-category grid still uses `DeviceFilterList` unchanged. Scoped to
// `defaultCategoryId` only — no category multiselect (removed per feedback,
// see TASKS.md), so `categoryIds` is always this one fixed category.
export function CatalogueProductGrid({
  type,
  initialItems,
  initialHasMore,
  defaultCategoryId,
  tags,
  heading,
  emptyMessage,
}: {
  type: "device" | "product";
  initialItems: IDeviceCardItem[];
  initialHasMore: boolean;
  defaultCategoryId: string;
  tags: ITag[];
  heading?: React.ReactNode;
  emptyMessage?: string;
}) {
  const tagOptions: ICatalogueFilterOption[] = tags.map((tag) => ({ id: tag.id, name: tag.name }));
  const categoryIds = [defaultCategoryId];

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [items, setItems] = useState(initialItems);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  function applyFilters(next: { search?: string; tagIds?: string[] }) {
    const nextSearch = next.search ?? search;
    const nextTagIds = next.tagIds ?? tagIds;
    setSearch(nextSearch);
    setTagIds(nextTagIds);
    setError(null);

    startTransition(async () => {
      try {
        const result = await loadCatalogueCards(type, {
          search: nextSearch,
          categoryIds,
          tagIds: nextTagIds,
          offset: 0,
          limit: CATALOGUE_PAGE_SIZE,
        });
        setItems(result.items);
        setHasMore(result.hasMore);
      } catch {
        setError("Failed to load these filters. Please try again.");
      }
    });
  }

  const handleSearchInput = (value: string) => {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => applyFilters({ search: value }), SEARCH_DEBOUNCE_MS);
  };

  const hasFilters = search.trim() !== "" || tagIds.length > 0;

  const handleClear = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSearchInput("");
    applyFilters({ search: "", tagIds: [] });
  };

  function loadMore() {
    if (isPending || !hasMore) return;
    startTransition(async () => {
      try {
        const result = await loadCatalogueCards(type, {
          search,
          categoryIds,
          tagIds,
          offset: items.length,
          limit: CATALOGUE_PAGE_SIZE,
        });
        setItems((current) => [...current, ...result.items]);
        setHasMore(result.hasMore);
      } catch {
        setError("Failed to load more items.");
      }
    });
  }

  // Re-subscribes after every load/filter change so the sentinel's fresh
  // `offset` (`items.length`) is what the next intersection actually loads —
  // an IntersectionObserver only fires on a state *change*, so this can't
  // double-fire mid-fetch even without an `isPending` dependency.
  useEffect(() => {
    if (!hasMore) return;
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "400px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, items.length, search, tagIds]);

  return (
    <section>
      <h2 className="h2-format my-14">
        {heading ?? (
          <>
            {type === "device" ? "Device" : "Product"} <span className="text-brand-red">Catalogue</span>
          </>
        )}
      </h2>

      <div className="flex flex-wrap items-center gap-5">
        <div className="relative min-w-56 flex-1">
          <label className="text-brand-red pointer-events-none absolute top-0 left-2 -translate-y-1/2 bg-secondary px-1 text-xl font-normal">
            Search
          </label>
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2" />
          <input
            value={searchInput}
            onChange={(event) => handleSearchInput(event.target.value)}
            placeholder="Search by name..."
            className="border-input focus-visible:border-brand-red focus-visible:ring-brand-red/50 h-auto w-full rounded-md border bg-transparent py-4 pt-6 pr-3 pl-10 text-lg font-medium outline-none focus-visible:ring-[3px]"
          />
        </div>
        <div className="w-full sm:w-56">
          <CataloguePopoverFilter
            label="Tag"
            options={tagOptions}
            selectedIds={tagIds}
            onChange={(ids) => applyFilters({ tagIds: ids })}
          />
        </div>
        {hasFilters && (
          <Button type="button" variant="ghost" className="h-14" onClick={handleClear}>
            <X className="size-4" /> Clear filters
          </Button>
        )}
      </div>

      {error && <p className="text-destructive mt-4 text-sm">{error}</p>}

      {items.length === 0 && !isPending ? (
        <p className="p-format my-14 text-center! text-neutral-400">{emptyMessage ?? "No products available yet."}</p>
      ) : (
        <div className="my-14 grid grid-cols-1 gap-10 lg:grid-cols-2">
          {items.map((item) => (
            <DeviceCard key={item.url} item={item} data-aos="fade-up" data-aos-duration="1000" />
          ))}
        </div>
      )}

      {hasMore && <div ref={sentinelRef} aria-hidden className="h-1" />}
      {isPending && <p className="text-muted-foreground py-4 text-center text-sm">Loading more...</p>}
    </section>
  );
}

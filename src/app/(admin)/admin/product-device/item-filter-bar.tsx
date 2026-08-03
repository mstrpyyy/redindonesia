"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ICategory, ITag } from "@/interfaces/general";
import { IMultiSelectOption, MultiSelectFilter } from "./multi-select-filter";

// Mirrors CategoryPicker's own `buildGroups`/`flattenDescendants` (same
// "root categories aren't directly assignable, only their descendants are"
// convention) but without the per-root header grouping — a flat, indented
// list is enough for a filter popover.
function flattenCategoryOptions(categories: ICategory[]): IMultiSelectOption[] {
  const flattenDescendants = (nodes: ICategory[], indent: number): IMultiSelectOption[] =>
    nodes.flatMap((node) => [{ id: node.id, name: node.name, indent }, ...flattenDescendants(node.children, indent + 1)]);

  return categories.flatMap((root) => flattenDescendants(root.children, 0));
}

const SEARCH_DEBOUNCE_MS = 400;

export function ItemFilterBar({
  categories,
  tags,
  search,
  categoryIds,
  tagIds,
  onSearchChange,
  onCategoryIdsChange,
  onTagIdsChange,
  onClear,
}: {
  categories: ICategory[];
  tags: ITag[];
  search: string;
  categoryIds: string[];
  tagIds: string[];
  onSearchChange: (value: string) => void;
  onCategoryIdsChange: (ids: string[]) => void;
  onTagIdsChange: (ids: string[]) => void;
  onClear: () => void;
}) {
  const categoryOptions = flattenCategoryOptions(categories);
  const tagOptions: IMultiSelectOption[] = tags.map((tag) => ({ id: tag.id, name: tag.name }));

  const [searchInput, setSearchInput] = useState(search);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keeps the input in sync when the URL changes some other way (e.g. "Clear
  // filters", or the browser back/forward button) rather than through typing.
  useEffect(() => setSearchInput(search), [search]);

  const handleSearchInput = (value: string) => {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onSearchChange(value), SEARCH_DEBOUNCE_MS);
  };

  const hasFilters = search.trim() !== "" || categoryIds.length > 0 || tagIds.length > 0;

  const handleClear = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSearchInput("");
    onClear();
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <Input
          value={searchInput}
          onChange={(event) => handleSearchInput(event.target.value)}
          placeholder="Search by name..."
          className="w-56 pl-8"
        />
      </div>
      <MultiSelectFilter label="Category" options={categoryOptions} selectedIds={categoryIds} onChange={onCategoryIdsChange} />
      <MultiSelectFilter label="Tag" options={tagOptions} selectedIds={tagIds} onChange={onTagIdsChange} />
      {hasFilters && (
        <Button type="button" variant="ghost" size="sm" onClick={handleClear}>
          <X className="size-4" /> Clear filters
        </Button>
      )}
    </div>
  );
}

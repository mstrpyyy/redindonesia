"use client";

import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface IMultiSelectOption {
  id: string;
  name: string;
  indent?: number; // for a flattened category tree — see CategoryPicker's own buildGroups
}

// Generic checkbox-popover multiselect used by both the category and tag list
// filters (item-filter-bar.tsx) — same toggle-list shape as TagPicker, minus
// its create/delete affordances, which don't apply to a read-only filter.
export function MultiSelectFilter({
  label,
  options,
  selectedIds,
  onChange,
  className,
}: {
  label: string;
  options: IMultiSelectOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  // Lets a non-filter consumer (e.g. a form field) size the trigger itself —
  // the default (content-width, no `className`) is unchanged for the two
  // filter-bar callers.
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selected = new Set(selectedIds);
  const query = search.trim().toLowerCase();
  const filtered = query ? options.filter((option) => option.name.toLowerCase().includes(query)) : options;

  const toggle = (id: string) => {
    onChange(selected.has(id) ? selectedIds.filter((existing) => existing !== id) : [...selectedIds, id]);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "border-input hover:border-foreground/50 flex h-9 items-center gap-1.5 rounded-md border bg-transparent px-3 text-sm shadow-xs transition-colors",
            className
          )}
        >
          {label}
          {selectedIds.length > 0 && (
            <Badge variant="secondary" className="h-5 min-w-5 justify-center px-1">
              {selectedIds.length}
            </Badge>
          )}
          <ChevronDown className="text-muted-foreground ml-auto size-4 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-0">
        <div className="flex flex-col">
          <div className="border-b p-2">
            <Input
              autoFocus
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={`Search ${label.toLowerCase()}...`}
            />
          </div>
          <div className="max-h-56 overflow-y-auto p-1">
            {filtered.length === 0 && (
              <p className="text-muted-foreground px-2 py-3 text-center text-xs">
                {options.length === 0 ? "None yet." : "No matches."}
              </p>
            )}
            {filtered.map((option) => {
              const checked = selected.has(option.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => toggle(option.id)}
                  style={{ paddingLeft: `${8 + (option.indent ?? 0) * 16}px` }}
                  className="hover:bg-accent flex w-full items-center gap-2 rounded-sm py-1.5 pr-2 text-left text-sm"
                >
                  <Check className={cn("size-4 shrink-0", checked ? "opacity-100" : "opacity-0")} />
                  {option.name}
                </button>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

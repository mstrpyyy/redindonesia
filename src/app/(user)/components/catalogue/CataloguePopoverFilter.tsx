"use client";

import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface ICatalogueFilterOption {
  id: string;
  name: string;
  indent?: number; // for a flattened category tree
}

// Same checkbox-popover multiselect as the admin CMS's `MultiSelectFilter`,
// restyled to match this page's own (previously unused) `CatalogueFilter`
// (Filter.tsx) — the floating label cut into the trigger's top border,
// `text-lg font-medium` — rather than reusing that admin component across
// the (admin)/(user) route-group boundary.
export function CataloguePopoverFilter({
  label,
  options,
  selectedIds,
  onChange,
}: {
  label: string;
  options: ICatalogueFilterOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selected = new Set(selectedIds);
  const query = search.trim().toLowerCase();
  const filtered = query ? options.filter((option) => option.name.toLowerCase().includes(query)) : options;

  const toggle = (id: string) => {
    onChange(selected.has(id) ? selectedIds.filter((existing) => existing !== id) : [...selectedIds, id]);
  };

  const summary =
    selectedIds.length === 0
      ? "All"
      : selectedIds.length === 1
        ? (options.find((option) => option.id === selectedIds[0])?.name ?? "1 selected")
        : `${selectedIds.length} selected`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="border-input relative w-full rounded-md border bg-transparent py-4 pt-6 pr-10 pl-3 text-left text-lg font-medium"
        >
          <span className="block truncate">{summary}</span>
          <label className="text-brand-red absolute top-0 left-2 -translate-y-1/2 bg-secondary px-1 text-xl font-normal">
            {label}
          </label>
          <ChevronDown className="text-muted-foreground absolute top-1/2 right-3 size-5 -translate-y-1/2" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-(--radix-popover-trigger-width) p-0">
        <div className="flex flex-col">
          <div className="border-b p-2">
            <Input
              autoFocus
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={`Search ${label.toLowerCase()}...`}
            />
          </div>
          <div className="max-h-64 overflow-y-auto p-1">
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
                  <Check className={cn("size-4 shrink-0", checked ? "text-brand-red opacity-100" : "opacity-0")} />
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

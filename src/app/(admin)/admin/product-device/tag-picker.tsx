"use client";

import { useRef, useState, useTransition } from "react";
import { Check, ChevronDown, Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { ITag } from "@/interfaces/general";
import { createTag } from "./tag-actions";
import { MAX_TAG_NAME_LENGTH } from "./limits";

interface ITagPickerProps {
  type: "device" | "product";
  // The searchable/creatable catalog — grows locally the moment a new tag is
  // created (via `onTagCreated`) so it's still there to pick again without a
  // page reload, even though this same tab unmounts when Identity isn't the
  // active tab (see product-form.tsx).
  options: ITag[];
  onTagCreated: (tag: ITag) => void;
  value: ITag[];
  onChange: (tags: ITag[]) => void;
  disabled?: boolean;
}

export function TagPicker({ type, options, onTagCreated, value, onChange, disabled }: ITagPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isCreating, startCreateTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedIds = new Set(value.map((tag) => tag.id));
  const query = search.trim().toLowerCase();
  const filtered = query ? options.filter((tag) => tag.name.toLowerCase().includes(query)) : options;
  const hasExactMatch = options.some((tag) => tag.name.toLowerCase() === query);

  const toggleTag = (tag: ITag) => {
    onChange(selectedIds.has(tag.id) ? value.filter((t) => t.id !== tag.id) : [...value, tag]);
  };

  const removeTag = (id: string) => {
    onChange(value.filter((tag) => tag.id !== id));
  };

  const handleCreate = () => {
    const name = search.trim();
    if (!name || isCreating) return;
    setError(null);

    startCreateTransition(async () => {
      const result = await createTag(type, name);
      if (!result.success) {
        setError(result.error.message);
        return;
      }
      // A case-insensitive match to an existing tag comes back as that same
      // tag (see createTag) rather than a new row — only add it to the
      // options pool here if it's genuinely new to this session.
      if (!options.some((tag) => tag.id === result.data.id)) onTagCreated(result.data);
      if (!selectedIds.has(result.data.id)) onChange([...value, result.data]);
      setSearch("");
      inputRef.current?.focus();
    });
  };

  return (
    <div className="flex flex-col gap-1.5">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className="border-input hover:border-foreground/50 flex min-h-9 w-full flex-wrap items-center gap-1.5 rounded-md border bg-transparent px-3 py-1.5 text-left shadow-xs transition-colors disabled:opacity-50"
          >
            {value.length === 0 ? (
              <span className="text-muted-foreground text-sm">Select or add tags...</span>
            ) : (
              value.map((tag) => (
                <Badge key={tag.id} variant="secondary" className="gap-1">
                  {tag.name}
                  <span
                    role="button"
                    tabIndex={-1}
                    aria-label={`Remove ${tag.name}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      removeTag(tag.id);
                    }}
                    className="hover:text-destructive"
                  >
                    <X className="size-3" />
                  </span>
                </Badge>
              ))
            )}
            <ChevronDown className="text-muted-foreground ml-auto size-4 shrink-0" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-(--radix-popover-trigger-width) p-0">
          <div className="flex flex-col">
            <div className="border-b p-2">
              <Input
                ref={inputRef}
                autoFocus
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search or add a tag..."
                maxLength={MAX_TAG_NAME_LENGTH}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && search.trim() && !hasExactMatch) {
                    event.preventDefault();
                    handleCreate();
                  }
                }}
              />
            </div>
            {/* Scrollable — the whole point of a searchable list over a
                static grid of swatches (e.g. the card background picker) is
                that this pool can grow past what fits without scrolling. */}
            <div className="max-h-56 overflow-y-auto p-1">
              {filtered.length === 0 && !search.trim() && (
                <p className="text-muted-foreground px-2 py-3 text-center text-xs">No tags yet.</p>
              )}
              {filtered.length === 0 && search.trim() && (
                <p className="text-muted-foreground px-2 py-3 text-center text-xs">No matching tags.</p>
              )}
              {filtered.map((tag) => {
                const checked = selectedIds.has(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className="hover:bg-accent flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm"
                  >
                    <Check className={cn("size-4 shrink-0", checked ? "opacity-100" : "opacity-0")} />
                    {tag.name}
                  </button>
                );
              })}
              {search.trim() && !hasExactMatch && (
                <button
                  type="button"
                  disabled={isCreating}
                  onClick={handleCreate}
                  className="hover:bg-accent flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm font-medium disabled:opacity-50"
                >
                  <Plus className="size-4 shrink-0" />
                  {isCreating ? "Adding..." : `Add "${search.trim()}"`}
                </button>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}

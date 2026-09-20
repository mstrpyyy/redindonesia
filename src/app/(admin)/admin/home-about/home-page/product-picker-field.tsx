"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Folder } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ICategoryPickerOption, IProductPickerOption } from "@/interfaces/general";
import { MAX_CAROUSEL_ITEM_TITLE_LENGTH, MIN_ITEM_PICKER_QUERY_LENGTH } from "./limits";

// A search-as-you-type dropdown over every published device/product,
// attached directly to an item's title field (see ADR-068). Picking a
// result fills title/image/link from that catalogue item; typing without
// picking one still works as a plain custom title — this only offers
// suggestions, it never requires a match (a custom item may link anywhere).
//
// Rendered as a plain absolutely-positioned panel rather than a Radix
// Popover: this field always lives inside the Add/Edit Carousel Dialog, and
// a Popover's Portal-rendered content sits outside the Dialog's own DOM
// subtree — which fights with the Dialog's focus trap and closed the
// dropdown before a click on a result could register. A plain in-tree panel
// sidesteps that conflict entirely.
export function ProductPickerField({
  value,
  options,
  categoryOptions,
  onChange,
  onPick,
  onPickCategory,
  disabled,
}: {
  value: string;
  options: IProductPickerOption[];
  categoryOptions: ICategoryPickerOption[];
  onChange: (title: string) => void;
  onPick: (option: IProductPickerOption) => void;
  onPickCategory: (option: ICategoryPickerOption) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const showDropdown = open && !disabled;

  useEffect(() => {
    if (!showDropdown) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [showDropdown]);

  const query = value.trim().toLowerCase();
  const hasQuery = query.length >= MIN_ITEM_PICKER_QUERY_LENGTH;

  const filteredOptions = useMemo(
    () => (hasQuery ? options.filter((option) => option.name.toLowerCase().includes(query)) : []),
    [options, query, hasQuery]
  );
  const filteredCategories = useMemo(
    () => (hasQuery ? categoryOptions.filter((option) => option.name.toLowerCase().includes(query)) : []),
    [categoryOptions, query, hasQuery]
  );

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
        }}
        maxLength={MAX_CAROUSEL_ITEM_TITLE_LENGTH}
        placeholder="Search devices/products/categories, or type a custom title..."
        disabled={disabled}
        className="w-full"
      />
      {showDropdown && (
        <div className="bg-popover text-popover-foreground absolute top-full left-0 z-50 mt-1 w-full rounded-md border p-1 shadow-md">
          <div className="max-h-56 overflow-y-auto">
            {!hasQuery && (
              <p className="text-muted-foreground px-2 py-3 text-center text-xs">
                Type at least {MIN_ITEM_PICKER_QUERY_LENGTH} characters to search the catalogue.
              </p>
            )}
            {hasQuery && filteredOptions.length === 0 && filteredCategories.length === 0 && (
              <p className="text-muted-foreground px-2 py-3 text-center text-xs">
                No catalogue matches — keep typing for a custom title.
              </p>
            )}
            {filteredOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  onPick(option);
                  setOpen(false);
                }}
                className="hover:bg-accent flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm"
              >
                <div className="bg-muted relative size-8 shrink-0 overflow-hidden rounded-sm">
                  {option.thumbnail && (
                    <Image src={option.thumbnail} alt="" fill sizes="32px" className="object-contain" />
                  )}
                </div>
                <span className="flex-1 truncate">{option.name}</span>
                <Badge variant="outline" className="shrink-0 text-[10px] capitalize">
                  {option.type}
                </Badge>
              </button>
            ))}
            {filteredCategories.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  onPickCategory(option);
                  setOpen(false);
                }}
                className="hover:bg-accent flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm"
              >
                <div className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-sm">
                  <Folder className="text-muted-foreground size-4" />
                </div>
                <span className="flex-1 truncate">{option.name}</span>
                <Badge variant="outline" className="shrink-0 text-[10px]">
                  category
                </Badge>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

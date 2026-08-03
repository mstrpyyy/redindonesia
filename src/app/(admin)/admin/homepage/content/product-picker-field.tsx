"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { IProductPickerOption } from "@/interfaces/general";
import { MAX_CAROUSEL_ITEM_TITLE_LENGTH } from "./limits";

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
  onChange,
  onPick,
  disabled,
}: {
  value: string;
  options: IProductPickerOption[];
  onChange: (title: string) => void;
  onPick: (option: IProductPickerOption) => void;
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
  const filtered = useMemo(
    () => (query ? options.filter((option) => option.name.toLowerCase().includes(query)) : options),
    [options, query]
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
        placeholder="Search devices/products, or type a custom title..."
        disabled={disabled}
        className="w-full"
      />
      {showDropdown && (
        <div className="bg-popover text-popover-foreground absolute top-full left-0 z-50 mt-1 w-full rounded-md border p-1 shadow-md">
          <div className="max-h-56 overflow-y-auto">
            {options.length === 0 && (
              <p className="text-muted-foreground px-2 py-3 text-center text-xs">
                No published devices/products yet.
              </p>
            )}
            {options.length > 0 && filtered.length === 0 && (
              <p className="text-muted-foreground px-2 py-3 text-center text-xs">
                No catalogue matches — keep typing for a custom title.
              </p>
            )}
            {filtered.map((option) => (
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
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { HERO_TEXT_COLORS, getHeroTextColor } from "@/lib/hero-text-colors";

// Swatch-only popover picker for a hero's title/description text color
// (ADR-045) — same popover-and-grid shape as the segment builder's
// background-color picker and the product form's card-background picker.
// Shared by the Category page editor (category-tree.tsx) and the Hero
// segment field (segments-builder.tsx, ADR-047) — one widget, one place the
// 12-color set is rendered from.
export function HeroTextColorPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const current = getHeroTextColor(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Hero text color: ${current.label}`}
          className="border-input hover:border-foreground/50 flex w-fit items-center gap-2 rounded-md border bg-transparent p-2 shadow-xs transition-colors"
        >
          <span className={cn("size-6 rounded-sm border", current.swatchClassName)} />
          <span className="text-sm">{current.label}</span>
          <ChevronDown className="size-4 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-2">
        <div className="grid grid-cols-6 gap-2">
          {HERO_TEXT_COLORS.map((option) => (
            <button
              key={option.value}
              type="button"
              title={option.label}
              aria-label={option.label}
              aria-pressed={option.value === current.value}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={cn(
                "size-8 rounded-sm border transition-shadow",
                option.swatchClassName,
                option.value === current.value && "ring-foreground ring-2 ring-offset-1"
              )}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

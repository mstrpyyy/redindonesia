"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface IColorPickerButtonProps {
  label: string;
  icon: React.ReactNode;
  indicatorColor?: string;
  colors: string[];
  activeColor?: string;
  onSelect: (color: string) => void;
  onClear: () => void;
}

// A Google Docs/Word-style color picker: a grid of common presets, a custom
// color input for anything else, and a "None" action to remove the color.
// Shared by the toolbar's text color and highlight color controls.
export function ColorPickerButton({
  label,
  icon,
  indicatorColor,
  colors,
  activeColor,
  onSelect,
  onClear,
}: IColorPickerButtonProps) {
  const [open, setOpen] = useState(false);
  const [customColor, setCustomColor] = useState(activeColor ?? "#000000");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="icon-sm" aria-label={label} className="relative">
          {icon}
          <span
            aria-hidden="true"
            className="absolute inset-x-1.5 bottom-1 h-0.5 rounded-full"
            style={{ backgroundColor: indicatorColor || "transparent" }}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-3">
        <div className="grid grid-cols-4 gap-2">
          {colors.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => {
                onSelect(color);
                setOpen(false);
              }}
              aria-label={color}
              className="border-input relative flex size-9 items-center justify-center rounded-md border"
              style={{ backgroundColor: color }}
            >
              {activeColor?.toLowerCase() === color.toLowerCase() && (
                <Check className="size-4 text-white mix-blend-difference" />
              )}
            </button>
          ))}
        </div>

        <div className="mt-3 flex items-center gap-2 border-t pt-3">
          <label className="border-input relative flex size-9 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-md border">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{ backgroundColor: customColor }}
            />
            <input
              type="color"
              value={customColor}
              onChange={(event) => {
                const next = event.target.value;
                setCustomColor(next);
                onSelect(next);
                setOpen(false);
              }}
              className="absolute inset-0 size-full cursor-pointer opacity-0"
            />
          </label>
          <span className="text-muted-foreground text-xs">Custom</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="ml-auto"
            onClick={() => {
              onClear();
              setOpen(false);
            }}
          >
            None
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

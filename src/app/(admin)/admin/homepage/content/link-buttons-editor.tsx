"use client";

import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { UploadField } from "@/components/upload-field";
import type { IHomeAboutLinkButton } from "@/interfaces/general";
import { uploadHomePageLinkButtonImage } from "./actions";
import { MAX_HOME_ABOUT_LINK_BUTTONS, MIN_HOME_ABOUT_LINK_BUTTONS } from "./limits";

// The image-as-button links on the homepage About section (the "who / what /
// work" tiles). One card per button, stacked horizontally, plus an "add" card
// while there's room for more (1 to 3).
export function LinkButtonsEditor({
  value,
  onChange,
  disabled,
}: {
  value: IHomeAboutLinkButton[];
  onChange: (next: IHomeAboutLinkButton[]) => void;
  disabled?: boolean;
}) {
  const atMax = value.length >= MAX_HOME_ABOUT_LINK_BUTTONS;
  const atMin = value.length <= MIN_HOME_ABOUT_LINK_BUTTONS;

  const update = (index: number, patch: Partial<IHomeAboutLinkButton>) =>
    onChange(value.map((button, i) => (i === index ? { ...button, ...patch } : button)));

  const remove = (index: number) => onChange(value.filter((_, i) => i !== index));

  const add = () =>
    onChange([...value, { id: crypto.randomUUID(), href: "", image: "" }]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-base font-semibold text-brand-red">Link Buttons</span>
        <span className="text-muted-foreground text-xs">
          {value.length} / {MAX_HOME_ABOUT_LINK_BUTTONS} (min {MIN_HOME_ABOUT_LINK_BUTTONS})
        </span>
      </div>

      <div className="flex flex-wrap items-stretch gap-3">
        {value.map((button, index) => (
          <div
            key={button.id}
            className="bg-background relative flex w-44 flex-col gap-2 rounded-md border p-3"
          >
            <button
              type="button"
              aria-label="Remove link button"
              onClick={() => remove(index)}
              disabled={disabled || atMin}
              className="bg-background text-destructive hover:bg-destructive/10 absolute -top-2 -right-2 z-10 rounded-full border p-1 disabled:pointer-events-none disabled:opacity-40"
            >
              <Trash2 className="size-3.5" />
            </button>

            <div>
              <span className="text-muted-foreground mb-1 block text-xs font-medium">Image</span>
              <UploadField
                kind="carouselImage"
                aspect="square"
                uploadAction={uploadHomePageLinkButtonImage}
                boxSizeClassName="w-full"
                value={button.image}
                onChange={(next) => update(index, { image: (next as string) ?? "" })}
                disabled={disabled}
              />
            </div>
            <div>
              <span className="text-muted-foreground mb-1 block text-xs font-medium">Link</span>
              <Input
                value={button.href}
                onChange={(event) => update(index, { href: event.target.value })}
                placeholder="/about#about-who"
                disabled={disabled}
              />
            </div>
          </div>
        ))}

        {!atMax && (
          <button
            type="button"
            onClick={add}
            disabled={disabled}
            className="text-muted-foreground hover:border-foreground/50 hover:text-foreground flex w-44 flex-col items-center justify-center gap-2 rounded-md border border-dashed transition-colors disabled:pointer-events-none disabled:opacity-50"
          >
            <Plus className="size-6" />
            <span className="text-sm font-medium">Add button</span>
          </button>
        )}
      </div>
    </div>
  );
}

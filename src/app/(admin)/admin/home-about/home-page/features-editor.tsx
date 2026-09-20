"use client";

import { useState } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { IHomeFeature } from "@/interfaces/general";
import { FEATURE_ICON_NAMES, FEATURE_ICONS, featureIconLabel } from "@/lib/feature-icons";
import {
  MAX_HOME_FEATURES,
  MAX_HOME_FEATURE_DESCRIPTION_LENGTH,
  MAX_HOME_FEATURE_TITLE_LENGTH,
  MIN_HOME_FEATURES,
} from "./limits";

// A swatch-style icon picker (3-wide grid of the curated set). The trigger
// shows just the chosen icon, or the word "Icon" while empty.
export function IconPickerField({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (icon: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const Selected = value ? FEATURE_ICONS[value] : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={disabled}
          aria-label={Selected ? `Icon: ${featureIconLabel(value)}` : "Pick an icon"}
          className="size-9 shrink-0"
        >
          {Selected ? (
            <Selected className="size-4 text-brand-red" />
          ) : (
            <span className="text-muted-foreground text-xs">Icon</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-2">
        {/* ~3 rows tall (size-11 button + gap-1), the rest scrolls. */}
        <div className="grid max-h-38 grid-cols-3 gap-1 overflow-y-auto pr-1">
          {FEATURE_ICON_NAMES.map((name) => {
            const Icon = FEATURE_ICONS[name];
            const active = name === value;
            return (
              <button
                key={name}
                type="button"
                title={featureIconLabel(name)}
                aria-label={featureIconLabel(name)}
                onClick={() => {
                  onChange(name);
                  setOpen(false);
                }}
                className={cn(
                  "hover:bg-accent relative flex size-11 items-center justify-center rounded-md border transition-colors",
                  active && "border-brand-red bg-brand-red/10"
                )}
              >
                <Icon className="size-5 text-brand-red" />
                {active && (
                  <Check className="text-brand-red absolute top-0.5 right-0.5 size-3" />
                )}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// The Feature List / "Why Choose Us" items — a vertical list of cards, each
// an icon picker + title on one row and a description textarea below.
export function FeaturesEditor({
  value,
  onChange,
  disabled,
}: {
  value: IHomeFeature[];
  onChange: (next: IHomeFeature[]) => void;
  disabled?: boolean;
}) {
  const atMax = value.length >= MAX_HOME_FEATURES;
  const atMin = value.length <= MIN_HOME_FEATURES;

  const update = (index: number, patch: Partial<IHomeFeature>) =>
    onChange(value.map((feature, i) => (i === index ? { ...feature, ...patch } : feature)));

  const remove = (index: number) => onChange(value.filter((_, i) => i !== index));

  const add = () =>
    onChange([...value, { id: crypto.randomUUID(), icon: "", title: "", description: "" }]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-base font-semibold text-brand-red">Features</span>
        <span className="text-muted-foreground text-xs">
          {value.length} / {MAX_HOME_FEATURES} (min {MIN_HOME_FEATURES})
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {value.map((feature, index) => (
          <div key={feature.id} className="bg-background flex flex-col gap-2 rounded-md border p-3">
            <div className="flex items-start gap-2">
              <IconPickerField
                value={feature.icon}
                onChange={(icon) => update(index, { icon })}
                disabled={disabled}
              />

              <Input
                value={feature.title}
                onChange={(event) => update(index, { title: event.target.value })}
                maxLength={MAX_HOME_FEATURE_TITLE_LENGTH}
                placeholder="TRUSTED & EXPERIENCED TEAM"
                disabled={disabled}
              />

              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Remove feature"
                onClick={() => remove(index)}
                disabled={disabled || atMin}
                className="text-destructive hover:text-destructive shrink-0"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>

            <Textarea
              value={feature.description}
              onChange={(event) => update(index, { description: event.target.value })}
              maxLength={MAX_HOME_FEATURE_DESCRIPTION_LENGTH}
              rows={2}
              placeholder="With over two decades of industry leadership..."
              disabled={disabled}
            />
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
        disabled={disabled || atMax}
        onClick={add}
      >
        Add feature <Plus className="size-4" />
      </Button>
    </div>
  );
}

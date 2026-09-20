"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { IAboutWorkCard } from "@/interfaces/general";
import { IconPickerField } from "../home-page/features-editor";
import {
  MAX_ABOUT_WORK_CARDS,
  MAX_ABOUT_WORK_CARD_DESCRIPTION_LENGTH,
  MAX_ABOUT_WORK_CARD_TITLE_LENGTH,
  MIN_ABOUT_WORK_CARDS,
} from "./limits";

// The "Work" section's cards — a vertical list, each an icon picker + title
// on one row and a description textarea below (same shape as the homepage
// Feature List editor).
export function AboutCardsEditor({
  value,
  onChange,
  disabled,
}: {
  value: IAboutWorkCard[];
  onChange: (next: IAboutWorkCard[]) => void;
  disabled?: boolean;
}) {
  const atMax = value.length >= MAX_ABOUT_WORK_CARDS;
  const atMin = value.length <= MIN_ABOUT_WORK_CARDS;

  const update = (index: number, patch: Partial<IAboutWorkCard>) =>
    onChange(value.map((card, i) => (i === index ? { ...card, ...patch } : card)));

  const remove = (index: number) => onChange(value.filter((_, i) => i !== index));

  const add = () =>
    onChange([...value, { id: crypto.randomUUID(), icon: "", title: "", description: "" }]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-base font-semibold text-brand-red">Cards</span>
        <span className="text-muted-foreground text-xs">
          {value.length} / {MAX_ABOUT_WORK_CARDS} (min {MIN_ABOUT_WORK_CARDS})
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {value.map((card, index) => (
          <div key={card.id} className="bg-background flex flex-col gap-2 rounded-md border p-3">
            <div className="flex items-start gap-2">
              <IconPickerField
                value={card.icon}
                onChange={(icon) => update(index, { icon })}
                disabled={disabled}
              />

              <Input
                value={card.title}
                onChange={(event) => update(index, { title: event.target.value })}
                maxLength={MAX_ABOUT_WORK_CARD_TITLE_LENGTH}
                placeholder="PROFESSIONAL TRAINING TEAM"
                disabled={disabled}
              />

              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Remove card"
                onClick={() => remove(index)}
                disabled={disabled || atMin}
                className="text-destructive hover:text-destructive shrink-0"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>

            <Textarea
              value={card.description}
              onChange={(event) => update(index, { description: event.target.value })}
              maxLength={MAX_ABOUT_WORK_CARD_DESCRIPTION_LENGTH}
              rows={2}
              placeholder="We provide comprehensive clinical training and courses..."
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
        Add card <Plus className="size-4" />
      </Button>
    </div>
  );
}

"use client";

import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { IHomeStatistic } from "@/interfaces/general";
import {
  MAX_HOME_STATISTICS,
  MAX_HOME_STATISTIC_NAME_LENGTH,
  MAX_HOME_STATISTIC_VALUE,
  MIN_HOME_STATISTICS,
} from "./limits";

// Keep only digits and clamp to the max — 0 stands for "empty" (the field
// shows blank), which the server rejects as below the minimum of 1.
function parseValue(raw: string): number {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return 0;
  return Math.min(Number(digits), MAX_HOME_STATISTIC_VALUE);
}

// The homepage's animated stat counters — a number + a short label. Same card
// layout as the About section's link buttons (1 to 4 cards, an "add" card
// while there's room, a trash badge on each).
export function StatisticsEditor({
  value,
  onChange,
  disabled,
}: {
  value: IHomeStatistic[];
  onChange: (next: IHomeStatistic[]) => void;
  disabled?: boolean;
}) {
  const atMax = value.length >= MAX_HOME_STATISTICS;
  const atMin = value.length <= MIN_HOME_STATISTICS;

  const update = (index: number, patch: Partial<IHomeStatistic>) =>
    onChange(value.map((stat, i) => (i === index ? { ...stat, ...patch } : stat)));

  const remove = (index: number) => onChange(value.filter((_, i) => i !== index));

  const add = () =>
    onChange([...value, { id: crypto.randomUUID(), value: 0, name: "" }]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-base font-semibold text-brand-red">Statistics</span>
        <span className="text-muted-foreground text-xs">
          {value.length} / {MAX_HOME_STATISTICS} (min {MIN_HOME_STATISTICS})
        </span>
      </div>

      <div className="flex flex-wrap items-stretch gap-3">
        {value.map((stat, index) => (
          <div
            key={stat.id}
            className="bg-background relative flex w-44 flex-col gap-2 rounded-md border p-3"
          >
            <button
              type="button"
              aria-label="Remove statistic"
              onClick={() => remove(index)}
              disabled={disabled || atMin}
              className="bg-background text-destructive hover:bg-destructive/10 absolute -top-2 -right-2 z-10 rounded-full border p-1 disabled:pointer-events-none disabled:opacity-40"
            >
              <Trash2 className="size-3.5" />
            </button>

            <div>
              <span className="text-muted-foreground mb-1 block text-xs font-medium">Number</span>
              <Input
                inputMode="numeric"
                value={stat.value === 0 ? "" : String(stat.value)}
                onChange={(event) => update(index, { value: parseValue(event.target.value) })}
                placeholder="21"
                disabled={disabled}
              />
            </div>
            <div>
              <span className="text-muted-foreground mb-1 block text-xs font-medium">Name</span>
              <Input
                value={stat.name}
                onChange={(event) => update(index, { name: event.target.value })}
                maxLength={MAX_HOME_STATISTIC_NAME_LENGTH}
                placeholder="Years"
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
            <span className="text-sm font-medium">Add statistic</span>
          </button>
        )}
      </div>
    </div>
  );
}

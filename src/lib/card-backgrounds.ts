// The background tints an admin can pick for a catalogue card. Shared by the
// public card and the admin picker so both agree on what "purple" means.
//
// Every Tailwind class here is written out in full and never composed from
// fragments — the scanner only sees complete class names in source, so a
// `from-${color}/20` would compile to nothing. That's why this list is
// spelled out one entry at a time instead of generated from the colour names.
//
// Colours are Tailwind's default 500 shades (plus the brand peach), which is
// the common swatch set. Values are stable keys stored in
// `Product.cardBackground` — rename one and existing rows fall back to the
// default, so add rather than rename.

export const CARD_BACKGROUND_VALUES = [
  "peach",
  "red",
  "orange",
  "amber",
  "yellow",
  "lime",
  "green",
  "emerald",
  "teal",
  "cyan",
  "sky",
  "blue",
  "indigo",
  "violet",
  "purple",
  "fuchsia",
  "pink",
  "rose",
  "slate",
  "gray",
  "stone",
] as const;

export type ICardBackgroundValue = (typeof CARD_BACKGROUND_VALUES)[number];

export interface ICardBackgroundOption {
  value: ICardBackgroundValue;
  /** Names the swatch for screen readers and the hover tooltip — the picker is swatches only. */
  label: string;
  /** Applied to the card, and to the picker's swatch so it shows the real gradient. */
  className: string;
}

export const DEFAULT_CARD_BACKGROUND: ICardBackgroundValue = "peach";

export const CARD_BACKGROUNDS: ICardBackgroundOption[] = [
  { value: "peach", label: "Peach", className: "bg-linear-to-br from-brand-peach/20 to-white" },
  { value: "red", label: "Red", className: "bg-linear-to-br from-red-500/20 to-white" },
  { value: "orange", label: "Orange", className: "bg-linear-to-br from-orange-500/20 to-white" },
  { value: "amber", label: "Amber", className: "bg-linear-to-br from-amber-500/20 to-white" },
  { value: "yellow", label: "Yellow", className: "bg-linear-to-br from-yellow-500/20 to-white" },
  { value: "lime", label: "Lime", className: "bg-linear-to-br from-lime-500/20 to-white" },
  { value: "green", label: "Green", className: "bg-linear-to-br from-green-500/20 to-white" },
  { value: "emerald", label: "Emerald", className: "bg-linear-to-br from-emerald-500/20 to-white" },
  { value: "teal", label: "Teal", className: "bg-linear-to-br from-teal-500/20 to-white" },
  { value: "cyan", label: "Cyan", className: "bg-linear-to-br from-cyan-500/20 to-white" },
  { value: "sky", label: "Sky", className: "bg-linear-to-br from-sky-500/20 to-white" },
  { value: "blue", label: "Blue", className: "bg-linear-to-br from-blue-500/20 to-white" },
  { value: "indigo", label: "Indigo", className: "bg-linear-to-br from-indigo-500/20 to-white" },
  { value: "violet", label: "Violet", className: "bg-linear-to-br from-violet-500/20 to-white" },
  { value: "purple", label: "Purple", className: "bg-linear-to-br from-purple-500/20 to-white" },
  { value: "fuchsia", label: "Fuchsia", className: "bg-linear-to-br from-fuchsia-500/20 to-white" },
  { value: "pink", label: "Pink", className: "bg-linear-to-br from-pink-500/20 to-white" },
  { value: "rose", label: "Rose", className: "bg-linear-to-br from-rose-500/20 to-white" },
  { value: "slate", label: "Slate", className: "bg-linear-to-br from-slate-500/20 to-white" },
  { value: "gray", label: "Gray", className: "bg-linear-to-br from-gray-500/20 to-white" },
  { value: "stone", label: "Stone", className: "bg-linear-to-br from-stone-500/20 to-white" },
];

export function getCardBackground(value: string | null | undefined): ICardBackgroundOption {
  return (
    CARD_BACKGROUNDS.find((option) => option.value === value) ??
    // An unknown or missing value falls back to the original peach rather than
    // rendering an unstyled card — old rows predate the column.
    CARD_BACKGROUNDS.find((option) => option.value === DEFAULT_CARD_BACKGROUND)!
  );
}

// Text color choices for a Category page's hero title/description (ADR-045).
// Shared by the public hero and the admin picker so both agree on what
// "peach" means. Four brand colors (black/white/red/peach) plus the same
// common swatch set the rich text editor's text-color picker offers
// (rich-text-editor.tsx's TEXT_COLORS) — generic grays/orange/amber/green/
// blue/purple, minus the black/white/red already covered above.
//
// Every Tailwind class here is written out in full and never composed from
// fragments — the scanner only sees complete class names in source.

export const HERO_TEXT_COLOR_VALUES = [
  "black",
  "white",
  "red",
  "peach",
  "dark-gray",
  "gray",
  "light-gray",
  "orange",
  "amber",
  "green",
  "blue",
  "purple",
] as const;

export type IHeroTextColorValue = (typeof HERO_TEXT_COLOR_VALUES)[number];

export interface IHeroTextColorOption {
  value: IHeroTextColorValue;
  label: string;
  /** Applied to the hero's actual title/description text. */
  className: string;
  /** Applied to the admin picker's own swatch — a `bg-*` twin of `className`, spelled out in full (not derived from it) so Tailwind's scanner sees it. */
  swatchClassName: string;
  /**
   * Black or white — whichever family this color itself belongs to (see the
   * comment above `HERO_TEXT_COLORS`), used for secondary hero text (e.g.
   * "Download Documents") that should stay legible near the title without
   * having to match its exact accent color. See ADR-048.
   */
  contrastClassName: string;
}

// Matches `Hero.tsx`'s own previous hardcoded default — an unset/unknown
// value renders exactly as it always did before this was admin-editable.
export const DEFAULT_HERO_TEXT_COLOR: IHeroTextColorValue = "peach";

// `contrastClassName` per color, below: whether the title color itself reads
// as visually "light" or "dark" (standard YIQ luma, threshold 128/255) — a
// light title color implies the backdrop it was picked for skews dark (so
// secondary text stays white, same family as a light title would need); a
// dark title color implies a light-skewing backdrop (so secondary text goes
// black). See ADR-048.
export const HERO_TEXT_COLORS: IHeroTextColorOption[] = [
  { value: "black", label: "Black", className: "text-black", swatchClassName: "bg-black", contrastClassName: "text-black" },
  { value: "white", label: "White", className: "text-white", swatchClassName: "bg-white", contrastClassName: "text-white" },
  // The brand's own red/peach (globals.css --color-brand-red/--color-brand-peach),
  // not a generic Tailwind shade — same distinction segment-colors.ts draws.
  { value: "red", label: "Red", className: "text-brand-red", swatchClassName: "bg-brand-red", contrastClassName: "text-black" },
  { value: "peach", label: "Peach", className: "text-brand-peach", swatchClassName: "bg-brand-peach", contrastClassName: "text-white" },
  { value: "dark-gray", label: "Dark Gray", className: "text-neutral-700", swatchClassName: "bg-neutral-700", contrastClassName: "text-black" },
  { value: "gray", label: "Gray", className: "text-neutral-500", swatchClassName: "bg-neutral-500", contrastClassName: "text-black" },
  { value: "light-gray", label: "Light Gray", className: "text-neutral-300", swatchClassName: "bg-neutral-300", contrastClassName: "text-white" },
  { value: "orange", label: "Orange", className: "text-orange-600", swatchClassName: "bg-orange-600", contrastClassName: "text-black" },
  { value: "amber", label: "Amber", className: "text-amber-500", swatchClassName: "bg-amber-500", contrastClassName: "text-white" },
  { value: "green", label: "Green", className: "text-green-600", swatchClassName: "bg-green-600", contrastClassName: "text-black" },
  { value: "blue", label: "Blue", className: "text-blue-600", swatchClassName: "bg-blue-600", contrastClassName: "text-black" },
  { value: "purple", label: "Purple", className: "text-violet-600", swatchClassName: "bg-violet-600", contrastClassName: "text-black" },
];

export function getHeroTextColor(value: string | null | undefined): IHeroTextColorOption {
  return (
    HERO_TEXT_COLORS.find((option) => option.value === value) ??
    // An unknown or missing value (every row before this column existed)
    // falls back to peach, matching the hardcoded look it replaces.
    HERO_TEXT_COLORS.find((option) => option.value === DEFAULT_HERO_TEXT_COLOR)!
  );
}

// Background color choices for segments that render as a full-bleed section
// (currently just the List segment). Shared by the public catalogue
// components and the admin editor so both agree on what a stored value means.
// A black-to-white gradation plus the two brand reds — not a general palette.
//
// Every Tailwind class here is written out in full and never composed from
// fragments — the scanner only sees complete class names in source.

export const SEGMENT_BACKGROUND_COLOR_VALUES = [
  "black",
  "dark-gray",
  "gray",
  "light-gray",
  "white",
  "peach",
  "red",
  "dark-red",
] as const;

export type ISegmentBackgroundColorValue = (typeof SEGMENT_BACKGROUND_COLOR_VALUES)[number];

export interface ISegmentBackgroundColorOption {
  value: ISegmentBackgroundColorValue;
  label: string;
  /** Applied to the section, and to the swatch so it shows the real color. */
  bgClassName: string;
  /** Paired with bgClassName so the section's text stays readable against it. */
  textClassName: string;
}

export const DEFAULT_SEGMENT_BACKGROUND_COLOR: ISegmentBackgroundColorValue = "black";

export const SEGMENT_BACKGROUND_COLORS: ISegmentBackgroundColorOption[] = [
  // Spaced out across the neutral scale (700/500/300) rather than clustered
  // near the ends (800/100) — otherwise Dark Gray reads as near-black and
  // Light Gray as near-white at swatch size.
  { value: "black", label: "Black", bgClassName: "bg-black", textClassName: "text-white" },
  { value: "dark-gray", label: "Dark Gray", bgClassName: "bg-neutral-700", textClassName: "text-white" },
  { value: "gray", label: "Gray", bgClassName: "bg-neutral-500", textClassName: "text-white" },
  { value: "light-gray", label: "Light Gray", bgClassName: "bg-neutral-300", textClassName: "text-black" },
  { value: "white", label: "White", bgClassName: "bg-white", textClassName: "text-black" },
  // The brand peach at 30% opacity — the Accordion segment's own hardcoded
  // look before this picker existed (ADR-054), kept as its default so
  // existing Accordions render unchanged.
  { value: "peach", label: "Peach", bgClassName: "bg-brand-peach/30", textClassName: "text-black" },
  // "Red" is the brand's own red (globals.css --color-brand-red, #E72129);
  // "Dark Red" is a genuinely darker shade, not a brand token — Tailwind's
  // built-in red-900 rather than a one-off hex value.
  { value: "red", label: "Red", bgClassName: "bg-brand-red", textClassName: "text-white" },
  { value: "dark-red", label: "Dark Red", bgClassName: "bg-red-900", textClassName: "text-white" },
];

export function getSegmentBackgroundColor(value: string | null | undefined): ISegmentBackgroundColorOption {
  return (
    SEGMENT_BACKGROUND_COLORS.find((option) => option.value === value) ??
    // An unknown or missing value falls back to black rather than an
    // unstyled section — old rows predate this field.
    SEGMENT_BACKGROUND_COLORS.find((option) => option.value === DEFAULT_SEGMENT_BACKGROUND_COLOR)!
  );
}

// Shared toolbar option lists for the rich text editors (`RichTextEditor` and
// `MiniRichTextEditor`) so the two never drift apart.

// Common presets, Google Docs/Word style — not an exhaustive palette, just
// recognizable defaults; anything else is reachable via the custom picker.
export const TEXT_COLORS = [
  "#000000",
  "#434343",
  "#666666",
  "#999999",
  "#B7B7B7",
  "#FFFFFF",
  "#E03131",
  "#F76707",
  "#F59F00",
  "#2F9E44",
  "#1971C2",
  "#5F3DC4",
];

// "default" is a sentinel for "no fontSize mark" (Radix Select can't use an
// empty string as an item value) — mapped back to `unsetFontSize()` at the
// call site. Values are `em`, not `px` — this mark can land on text in any of
// the site's type scales (the compact article default, or the much larger
// `tiptap-content-category`/`tiptap-content-product`/`h2-format` scales), so a
// fixed px size that reads as "small" in one context can dwarf or vanish
// against another. `em` keeps each step proportional to whatever font-size
// it's nested in.
export const FONT_SIZES = [
  { label: "Small", value: "0.75em" },
  { label: "Normal", value: "default" },
  { label: "Medium", value: "1.125em" },
  { label: "Large", value: "1.5em" },
  { label: "X-Large", value: "2em" },
  { label: "XX-Large", value: "3em" },
];

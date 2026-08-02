import { DEFAULT_SEGMENT_BACKGROUND_COLOR } from "@/lib/segment-colors";
import { DEFAULT_HERO_TEXT_COLOR } from "@/lib/hero-text-colors";
import { MAX_CAROUSEL_IMAGE_LABEL, MAX_SEGMENT_IMAGE_LABEL } from "./limits";

export type IFieldType =
  | "text"
  | "textarea"
  | "number"
  | "url"
  | "select"
  | "list"
  | "image"
  | "icon"
  | "carouselImage"
  | "file"
  | "colorSwatch"
  | "richText"
  | "heroTextColor";

export interface IFieldDef {
  key: string;
  label: string;
  type: IFieldType;
  required?: boolean;
  maxLength?: number; // only for type: "text" | "textarea"
  placeholder?: string; // only for type: "text" | "textarea" | "url"
  options?: { value: string; label: string }[];
  // Value a brand-new segment starts with, instead of "" — for a required
  // select where one option is the obvious default.
  defaultValue?: string;
  // Only for type: "image" | "carouselImage". "square" crops the upload box
  // to 1:1 instead of the default 16:9 — e.g. Before & After's before/after
  // images, which read better at a consistent size than a wide box.
  imageAspect?: "video" | "square";
  // Small muted caption rendered under the input — e.g. an upload field's
  // size/type limits, the kind of thing a placeholder can't say on its own.
  helpText?: string;
  itemFields?: IFieldDef[]; // only for type: "list"
  itemLabel?: string; // e.g. "Document" -> "Add document"
  // "table" renders one row per item (icon + name inline, no card border) —
  // only for type: "list". Omit for the bordered-card layout every other
  // list field uses.
  itemsLayout?: "card" | "table";
  // Only meaningful for the "card" layout (itemsLayout omitted or "card").
  // "grid" splits an item's fields into two columns — text fields stacked on
  // the left, image-type fields stacked on the right (e.g. Carousel). "row"
  // gives every field its own column, side by side, none of them stacked
  // (e.g. Before & After's before image / after image / caption). Omit (or
  // "stack") for the existing single-column stack.
  itemFieldLayout?: "stack" | "grid" | "row";
  // How many empty rows a brand-new segment starts with — only for type:
  // "list". Omit (or 0) to start empty, same as before.
  minItems?: number;
}

export interface ISegmentTypeDef {
  type: string;
  label: string;
  fields: IFieldDef[];
}

// Mirrors the exact prop shapes of the catalogue components under
// src/app/(user)/components/catalogue/ (Hero, Highlight, GridFeature,
// Dropdown, BeforeAfter, Document) and Viewer360/Carousels — see ADR-020.
// Most "image"/"file" fields are still plain URL inputs (paste a path
// already uploaded elsewhere, or an external URL); a handful of fields that
// are always a real upload in practice (hero background, hero/document
// downloadable files, certification logo+file) use real upload widgets —
// see ADR-021.
export const SEGMENT_TYPES: ISegmentTypeDef[] = [
  {
    type: "hero",
    label: "Hero",
    fields: [
      {
        key: "title",
        label: "Title",
        type: "text",
        required: true,
        maxLength: 100,
        placeholder: "e.g. Alma Harmony",
      },
      {
        key: "description",
        label: "Description",
        type: "textarea",
        required: true,
        maxLength: 150,
        placeholder: "e.g. Integrated Technologies. Unlimited Diversity",
      },
      { key: "imgUrl", label: "Background image", type: "image", required: true },
      // Same 12-color set and picker as the Category page's own hero text
      // color (ADR-045), extended to the product/device hero here (ADR-047).
      // Not required — an unset value falls back to peach via
      // `getHeroTextColor`, same as Category's.
      {
        key: "textColor",
        label: "Text Color",
        type: "heroTextColor",
        defaultValue: DEFAULT_HERO_TEXT_COLOR,
      },
      // `heroDocs` and `certifications` are still stored on the hero record
      // (the public Hero renders them) but are deliberately absent here —
      // they're edited on the Product Files tab, not through this generic
      // field engine, so `withHeroSegment` seeds them instead of
      // `createEmptySegmentData`. See ADR-026.
    ],
  },
  {
    type: "highlight",
    label: "Text & Image",
    fields: [
      {
        key: "header",
        label: "Header",
        type: "text",
        required: true,
        maxLength: 50,
        placeholder: "e.g. Advanced Technology",
      },
      {
        key: "text",
        label: "Text",
        type: "textarea",
        required: true,
        maxLength: 450,
        placeholder: "Describe this feature in detail.",
      },
      { key: "image", label: "Image", type: "image", required: true },
      // Rendered next to the image field rather than on its own row — see
      // the highlight special-case in segments-builder.tsx's field loop.
      {
        key: "imagePlacement",
        label: "Placement",
        type: "select",
        required: true,
        defaultValue: "left",
        options: [
          { value: "left", label: "Left" },
          { value: "right", label: "Right" },
        ],
      },
      // Also rendered next to the image field, not on its own row.
      {
        key: "imageFit",
        label: "Image Fit",
        type: "select",
        required: true,
        defaultValue: "fill",
        options: [
          { value: "fill", label: "Fill (crop to fit)" },
          { value: "fit", label: "Fit (show full image)" },
        ],
      },
    ],
  },
  {
    type: "treatments",
    label: "List",
    fields: [
      { key: "header", label: "Header", type: "text", required: true, placeholder: "e.g. Our Services" },
      {
        key: "columns",
        label: "Columns",
        type: "select",
        required: true,
        defaultValue: "1",
        options: [
          { value: "1", label: "1 Column" },
          { value: "2", label: "2 Columns" },
        ],
      },
      {
        key: "backgroundColor",
        label: "Background Color",
        type: "colorSwatch",
        required: true,
        defaultValue: DEFAULT_SEGMENT_BACKGROUND_COLOR,
      },
      {
        key: "items",
        label: "List Items",
        type: "list",
        itemLabel: "item",
        itemsLayout: "table",
        minItems: 1,
        itemFields: [
          { key: "svgUrl", label: "Icon", type: "icon" },
          { key: "name", label: "Name", type: "textarea", required: true, placeholder: "e.g. Feature name" },
        ],
      },
    ],
  },
  {
    type: "viewer360",
    label: "360° Viewer",
    fields: [
      {
        key: "header",
        label: "Header",
        type: "text",
        maxLength: 50,
        placeholder: "e.g. 360° View",
      },
      // These three are set together by uploading a frame sequence (the
      // viewer360 special-case in segments-builder.tsx's field loop renders
      // one combined uploader here, not three individual inputs) rather than
      // typed — see ADR-029 and viewer360-upload-actions.ts.
      { key: "imgUrlTemplate", label: "Frames", type: "url", required: true },
      { key: "totalFrames", label: "Total frames", type: "number", required: true },
      { key: "extension", label: "File extension", type: "text", required: true },
      // `width`/`height` are not admin-editable fields — the upload reads
      // them from the actual frame images and stores them directly on the
      // segment (same as `heroDocs`/`certifications` on the hero, ADR-026),
      // so Viewer360 sizes its canvas to match instead of stretching frames
      // into a hardcoded default.
    ],
  },
  {
    type: "techSpecs",
    label: "Accordion",
    fields: [
      {
        key: "header",
        label: "Header",
        type: "text",
        required: true,
        maxLength: 50,
        placeholder: "e.g. Technical Specifications",
      },
      {
        key: "backgroundColor",
        label: "Background Color",
        type: "colorSwatch",
        required: true,
        // Distinct from DEFAULT_SEGMENT_BACKGROUND_COLOR (black, used by the
        // List segment) — Accordion always rendered peach before this field
        // existed, so it defaults to peach instead to keep existing/new
        // Accordions unchanged. See ADR-054.
        defaultValue: "peach",
      },
      {
        key: "items",
        label: "Items",
        type: "list",
        itemLabel: "item",
        // Same one-row-per-item look as the List segment (ADR-029's
        // neighbor), just without a Columns field — Accordion has no
        // multi-column layout to choose. The description textarea gets its
        // own line below icon+title rather than squeezing into the row —
        // see the "table" branch in segments-builder.tsx's ListField.
        itemsLayout: "table",
        minItems: 1,
        itemFields: [
          { key: "icon", label: "Icon", type: "icon", required: true },
          {
            key: "title",
            label: "Title",
            type: "text",
            required: true,
            maxLength: 50,
            placeholder: "e.g. Feature name",
          },
          {
            key: "body",
            label: "Description",
            type: "textarea",
            required: true,
            maxLength: 350,
            placeholder: "Describe this item.",
          },
        ],
      },
    ],
  },
  {
    type: "applicators",
    label: "Carousel",
    fields: [
      {
        key: "header",
        label: "Header",
        type: "text",
        required: true,
        maxLength: 50,
        placeholder: "e.g. Applicators",
      },
      {
        key: "items",
        label: "Items",
        type: "list",
        itemLabel: "item",
        itemFieldLayout: "grid",
        // Same "always at least one row, and that row can't be removed"
        // behavior as List/Accordion — see the minItems-driven Remove-button
        // disable in segments-builder.tsx's ListField (both layout branches).
        minItems: 1,
        itemFields: [
          {
            key: "title",
            label: "Title",
            type: "text",
            required: true,
            maxLength: 20,
            placeholder: "e.g. Feature name",
          },
          {
            key: "subTitle",
            label: "Subtitle",
            type: "text",
            maxLength: 50,
            placeholder: "Optional subtitle",
          },
          {
            key: "imageUrl",
            label: "Image",
            type: "carouselImage",
            helpText: `Up to ${MAX_CAROUSEL_IMAGE_LABEL}. JPEG, PNG, or WEBP.`,
          },
          {
            key: "text",
            label: "Description",
            type: "textarea",
            maxLength: 250,
            placeholder: "Optional description.",
          },
        ],
      },
    ],
  },
  {
    type: "beforeAfter",
    label: "Before & After",
    fields: [
      {
        key: "header",
        label: "Header",
        type: "text",
        required: true,
        placeholder: "e.g. See The Difference",
      },
      {
        key: "items",
        label: "Items",
        type: "list",
        itemLabel: "item",
        itemFieldLayout: "row",
        minItems: 1,
        itemFields: [
          {
            key: "beforeImageUrl",
            label: "Before image",
            type: "carouselImage",
            required: true,
            imageAspect: "square",
            helpText: `Up to ${MAX_CAROUSEL_IMAGE_LABEL}. JPEG, PNG, or WEBP.`,
          },
          {
            key: "afterImageUrl",
            label: "After image",
            type: "carouselImage",
            required: true,
            imageAspect: "square",
            helpText: `Up to ${MAX_CAROUSEL_IMAGE_LABEL}. JPEG, PNG, or WEBP.`,
          },
          // No dedicated alt-text fields — `beforeAlt`/`afterAlt` are derived
          // server-side from this caption, same precedent as the hero's
          // `imgAlt` (ADR-021/ADR-030).
          { key: "title", label: "Caption", type: "text", maxLength: 50, placeholder: "e.g. 30 Days Later" },
        ],
      },
    ],
  },
  {
    type: "document",
    label: "Document Highlight",
    fields: [
      // Picks one entry from the product's own Downloadable Documents list
      // OR its Certifications list (both Product Files tab) instead of its
      // own file+thumbnail — see the document/referenceId special case in
      // segments-builder.tsx and ADR-051, extended to certifications by
      // ADR-059. `referenceKind` (which list `referenceId` belongs to) is
      // set alongside it by that same special case — not its own field def,
      // same precedent as the hero's `imgAlt` (never in `fields[]`, always
      // derived/paired elsewhere). Comes first: picking an entry auto-fills
      // Header below (ADR-056), so choosing it first is the natural order.
      // The declared type has no bearing on rendering (fully intercepted
      // there); it only feeds the generic required-field check.
      { key: "referenceId", label: "Document or Certification", type: "select", required: true },
      { key: "header", label: "Header", type: "text", required: true, placeholder: "e.g. Product Brochure" },
      { key: "subheader", label: "Subheader", type: "text", placeholder: "Optional subheader" },
      // No dedicated alt-text field — `alt` is derived server-side from
      // `heading`, same precedent as the hero's `imgAlt` (ADR-021) and
      // Before & After's `beforeAlt`/`afterAlt` (ADR-030). See ADR-032.
    ],
  },
  {
    type: "richText",
    label: "Rich Text",
    fields: [
      {
        key: "body",
        label: "Body",
        type: "richText",
        required: true,
        placeholder: "Write the section content...",
      },
    ],
  },
  {
    // Mirrors the Category page's own YouTube video fields/upload — see
    // ADR-052. Fully data-driven, no special-case render needed: the
    // generic field engine already handles every field type used here.
    type: "video",
    label: "Video",
    fields: [
      {
        key: "url",
        label: "YouTube URL",
        type: "url",
        required: true,
        placeholder: "https://www.youtube.com/watch?v=...",
      },
      {
        key: "thumbnailUrl",
        label: "Custom thumbnail",
        type: "image",
        helpText: `Poster with a play button; defaults to YouTube's own thumbnail if empty. Up to ${MAX_SEGMENT_IMAGE_LABEL}. JPEG, PNG, WEBP, or GIF.`,
      },
      { key: "caption", label: "Caption", type: "text", maxLength: 50, placeholder: "e.g. See It In Action" },
      {
        key: "description",
        label: "Description",
        type: "textarea",
        maxLength: 250,
        placeholder: "Optional description.",
      },
    ],
  },
];

// Every product's page always opens with a hero — it's not one of the
// optional, admin-picked sections, so it's excluded from the "Add a segment"
// menu and instead auto-created/pinned to the top of the segments list (see
// SegmentsBuilder).
export const ADDABLE_SEGMENT_TYPES = SEGMENT_TYPES.filter((def) => def.type !== "hero");

export function getSegmentTypeDef(type: string): ISegmentTypeDef | undefined {
  return SEGMENT_TYPES.find((def) => def.type === type);
}

export function createEmptySegmentData(def: ISegmentTypeDef): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const field of def.fields) {
    if (field.type === "list") {
      const seedCount = field.minItems ?? 0;
      data[field.key] = Array.from({ length: seedCount }, () => createEmptyListItem(field.itemFields ?? []));
    } else if (field.type === "number") data[field.key] = undefined;
    else data[field.key] = field.defaultValue ?? "";
  }
  return data;
}

// Mirrors the required-field walk the server does in `validateSegments`
// (product-actions.ts) so the editor can mark the Page Segments tab "filled"
// by exactly the rule a save would be judged by. List fields have no
// "required" concept of their own, same as server-side.
export function isSegmentComplete(segment: Record<string, unknown>): boolean {
  const def = getSegmentTypeDef(String(segment.type));
  if (!def) return false;
  return def.fields.every((field) => {
    if (!field.required || field.type === "list") return true;
    const value = segment[field.key];
    return value !== undefined && value !== null && value !== "";
  });
}

export function createEmptyListItem(fields: IFieldDef[]): Record<string, unknown> {
  const item: Record<string, unknown> = {};
  for (const field of fields) {
    item[field.key] = field.type === "number" ? undefined : "";
  }
  return item;
}

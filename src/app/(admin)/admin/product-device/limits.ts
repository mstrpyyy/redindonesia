export const MAX_CATEGORY_DEPTH = 3;
export const MAX_CATEGORY_NAME_LENGTH = 150;

// A category node that opts into being a real page (see ADR-033) — its own
// title/description/banner, separate from the tree's compact `name`.
export const MAX_CATEGORY_TITLE_LENGTH = 30;
export const MAX_CATEGORY_DESCRIPTION_LENGTH = 200;
export const MAX_CATEGORY_BANNER_SIZE = 2 * 1000 * 1024;
export const MAX_CATEGORY_BANNER_LABEL = "2MB";

// The YouTube embed's optional caption/description — same length budget as
// the page's own title/description, since they render at the same h3/p scale.
export const MAX_CATEGORY_YOUTUBE_CAPTION_LENGTH = MAX_CATEGORY_TITLE_LENGTH;
export const MAX_CATEGORY_YOUTUBE_DESCRIPTION_LENGTH = MAX_CATEGORY_DESCRIPTION_LENGTH;

export const MAX_PRODUCT_NAME_LENGTH = 150;
export const MAX_PRODUCT_TAGLINE_LENGTH = 100;
export const PRODUCT_LIST_PAGE_SIZE = 20;
export const PRODUCT_LIST_PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
export const MAX_HERO_DOC_TITLE_LENGTH = 25;
export const MAX_TAG_NAME_LENGTH = 40;

export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

// Icon fields (currently just the List segment's per-item icon) additionally
// accept SVG — raster photo fields (thumbnail, hero background, highlight
// image) do not, so this stays its own list rather than widening
// ACCEPTED_IMAGE_TYPES for everyone.
export const ACCEPTED_ICON_TYPES = [...ACCEPTED_IMAGE_TYPES, "image/svg+xml"];
export const MAX_THUMBNAIL_SIZE = 2 * 1000 * 1024;
export const MAX_THUMBNAIL_LABEL = "2MB";

// Segment "image"/"file" upload fields (hero background, certification
// logo/certificate, hero/document downloadable files) — see ADR-021.
export const MAX_SEGMENT_IMAGE_SIZE = 3 * 1000 * 1024;
export const MAX_SEGMENT_IMAGE_LABEL = "3MB";
export const MAX_SEGMENT_FILE_SIZE = 5 * 1000 * 1024;
export const MAX_SEGMENT_FILE_LABEL = "5MB";
export const ACCEPTED_SEGMENT_FILE_TYPES = [...ACCEPTED_IMAGE_TYPES, "application/pdf"];

// Carousel item images specifically — smaller than the general
// MAX_SEGMENT_IMAGE_SIZE (hero background, highlight image) since a carousel
// can hold many of these in one segment, and no GIF (a carousel item is a
// static photo, not an animation).
export const MAX_CAROUSEL_IMAGE_SIZE = 1 * 1000 * 1024;
export const MAX_CAROUSEL_IMAGE_LABEL = "1MB";
export const ACCEPTED_CAROUSEL_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

// 360 viewer frame sequence — uploaded together in one batch (see
// viewer360-upload-actions.ts).
export const MAX_VIEWER360_FRAMES = 100;
export const MAX_VIEWER360_FRAME_SIZE = 500 * 1024;
export const MAX_VIEWER360_FRAME_LABEL = "500KB";

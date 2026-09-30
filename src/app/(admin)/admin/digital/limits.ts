export const MAX_DIGITAL_NAME_LENGTH = 150;
export const DIGITAL_LIST_PAGE_SIZE = 20;
export const DIGITAL_LIST_PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

// QR code image (suggested 4:3 vertical / 3:4, auto-centered in the box) —
// same accepted types/size budget as the category/thumbnail image fields.
export const ACCEPTED_DIGITAL_QR_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_DIGITAL_QR_IMAGE_SIZE = 2 * 1000 * 1024;
export const MAX_DIGITAL_QR_IMAGE_LABEL = "2MB";

// Background banner images/videos — same 4-size budget as Category's own
// (product-device/limits.ts), reused for consistency since this is the exact
// same responsive banner shape (ADR-089/091/093).
export const ACCEPTED_DIGITAL_BANNER_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_DIGITAL_BANNER_SIZE = 2 * 1000 * 1024;
export const MAX_DIGITAL_BANNER_LABEL = "2MB";
export const ACCEPTED_DIGITAL_BANNER_VIDEO_TYPES = ["video/mp4"];
export const MAX_DIGITAL_BANNER_VIDEO_SIZE = 10 * 1024 * 1024;
export const MAX_DIGITAL_BANNER_VIDEO_LABEL = "10MB";

// Every media block (youtube/flipbook/document) is one landing-page button —
// its required `label` is the button's visible text, capped the same across
// all three block types (ADR-107/ADR-108).
export const MAX_DIGITAL_MEDIA_LABEL_LENGTH = 100;

// A youtube block's individual videos — shown on that block's own video page,
// not as landing-page buttons themselves (ADR-108). Only `url` is required;
// `title`/`description` are optional captions shown on the video page.
export const MAX_DIGITAL_YOUTUBE_TITLE_LENGTH = 100;
export const MAX_DIGITAL_YOUTUBE_DESCRIPTION_LENGTH = 300;

// The optional uploaded image that stands in for a button's generic icon
// (ADR-107) — small and square, so a modest budget is enough.
export const ACCEPTED_DIGITAL_MEDIA_LABEL_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_DIGITAL_MEDIA_LABEL_IMAGE_SIZE = 1 * 1000 * 1024;
export const MAX_DIGITAL_MEDIA_LABEL_IMAGE_LABEL = "1MB";

// Flipbook PDF block — PDF only (the flipbook viewer renders pages itself,
// see ADR-105), exactly one file per block (ADR-107).
export const ACCEPTED_DIGITAL_FLIPBOOK_TYPES = ["application/pdf"];
export const MAX_DIGITAL_FLIPBOOK_SIZE = 10 * 1000 * 1024;
export const MAX_DIGITAL_FLIPBOOK_LABEL = "10MB";

// Document block — opened with default browser behavior, so only the exact
// types the spec calls for (no GIF, unlike the product segment file schema).
// Exactly one file per block (ADR-107).
export const ACCEPTED_DIGITAL_DOCUMENT_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/webp"];
export const MAX_DIGITAL_DOCUMENT_SIZE = 5 * 1000 * 1024;
export const MAX_DIGITAL_DOCUMENT_LABEL = "5MB";

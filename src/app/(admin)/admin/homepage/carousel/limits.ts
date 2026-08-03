export const MAX_CAROUSEL_TITLE_LENGTH = 100;
export const MAX_CAROUSEL_ITEM_TITLE_LENGTH = 100;
export const MAX_CAROUSEL_SEE_MORE_URL_LENGTH = 300;
export const MAX_CAROUSEL_ITEMS = 30;

// Same rationale/limits as the product-device segments builder's own
// carousel item images (src/app/(admin)/admin/product-device/limits.ts) —
// smaller than a general image field since a carousel can hold many, no GIF
// since these are static photos.
export const ACCEPTED_CAROUSEL_ITEM_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_CAROUSEL_ITEM_IMAGE_SIZE = 1 * 1000 * 1024;
export const MAX_CAROUSEL_ITEM_IMAGE_LABEL = "1MB";

// The carousel's own title image (e.g. a brand logo, "titleDisplayMode:
// image") — a single image per carousel rather than many per item, so a
// slightly larger cap than MAX_CAROUSEL_ITEM_IMAGE_SIZE is fine.
export const MAX_CAROUSEL_TITLE_IMAGE_SIZE = 2 * 1000 * 1024;
export const MAX_CAROUSEL_TITLE_IMAGE_LABEL = "2MB";

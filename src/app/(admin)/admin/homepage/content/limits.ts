export const MAX_CAROUSEL_TITLE_LENGTH = 100;
export const MAX_CAROUSEL_ITEM_TITLE_LENGTH = 100;
export const MAX_CAROUSEL_SEE_MORE_URL_LENGTH = 300;
export const MAX_CAROUSEL_ITEMS = 30;

// The item picker's catalogue/category suggestions stay hidden below this —
// searching the full catalogue on every keystroke (or on focus, with an
// empty query) is noisy once there are many products/devices/categories.
export const MIN_ITEM_PICKER_QUERY_LENGTH = 3;

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

// Homepage hero banner (HomePage model, ADR-082) — same size/type budget as
// the Category page banner (see product-device/limits.ts), since it's the
// same four-size banner set.
export const MAX_HOME_BANNER_SIZE = 2 * 1000 * 1024;
export const MAX_HOME_BANNER_LABEL = "2MB";
export const ACCEPTED_HOME_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

// Homepage hero banner video (ADR-089) — an optional mp4 per banner size,
// always paired with that size's still image as a required poster/fallback.
export const MAX_HOME_BANNER_VIDEO_SIZE = 10 * 1000 * 1024;
export const MAX_HOME_BANNER_VIDEO_LABEL = "10MB";
export const ACCEPTED_HOME_VIDEO_TYPES = ["video/mp4"];

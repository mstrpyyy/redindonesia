export const MAX_CAROUSEL_TITLE_LENGTH = 100;
export const MAX_CAROUSEL_ITEM_TITLE_LENGTH = 100;
export const MAX_CAROUSEL_SEE_MORE_URL_LENGTH = 300;
export const MIN_CAROUSEL_ITEMS = 4;
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

// Homepage hero heading + subheading (ADR-096) — optional plain-text lines
// shown on the public hero; both fall back to the hero's hardcoded copy when
// left blank.
export const MAX_HOME_HERO_HEADING_LENGTH = 120;
export const MAX_HOME_HERO_SUBHEADING_LENGTH = 200;

// About section heading + body (ADR-097) — rich text HTML strings, so the
// caps are on the raw HTML (markup included), not visible characters. The
// heading is a short two-line title; the body is a paragraph or two.
export const MAX_HOME_ABOUT_HEADING_LENGTH = 2000;
export const MAX_HOME_ABOUT_BODY_LENGTH = 6000;

// About section link buttons (ADR-097) — a short list of image-as-button
// links (the "who / what / work" tiles on the public About section). Each
// entry is an uploaded image + a destination URL.
export const MIN_HOME_ABOUT_LINK_BUTTONS = 1;
export const MAX_HOME_ABOUT_LINK_BUTTONS = 3;
export const MAX_HOME_ABOUT_LINK_BUTTON_HREF_LENGTH = 300;
export const ACCEPTED_HOME_ABOUT_LINK_BUTTON_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];
export const MAX_HOME_ABOUT_LINK_BUTTON_IMAGE_SIZE = 1 * 1000 * 1024;
export const MAX_HOME_ABOUT_LINK_BUTTON_IMAGE_LABEL = "1MB";

// Feature List / "Why Choose Us" section (ADR-101). Title is section-title
// rich text HTML (accent spans); each feature is an icon key + title + a
// plain-text description. 2 to 8 features.
export const MAX_HOME_FEATURE_LIST_TITLE_LENGTH = 2000;
export const MIN_HOME_FEATURES = 2;
export const MAX_HOME_FEATURES = 8;
export const MAX_HOME_FEATURE_TITLE_LENGTH = 60;
export const MIN_HOME_FEATURE_DESCRIPTION_LENGTH = 2;
export const MAX_HOME_FEATURE_DESCRIPTION_LENGTH = 400;

// Brands section — heading only for now. Section-title rich text HTML.
export const MAX_HOME_BRANDS_TITLE_LENGTH = 2000;

// Certifications section — a section-title heading + up to 8 logo images
// (PNG/JPG only, no WEBP, 2MB each). Image only, no alt/name field.
export const MAX_HOME_CERTIFICATIONS_TITLE_LENGTH = 2000;
export const MIN_HOME_CERTIFICATIONS = 1;
export const MAX_HOME_CERTIFICATIONS = 8;
export const ACCEPTED_HOME_CERTIFICATION_IMAGE_TYPES = ["image/jpeg", "image/png"];
export const MAX_HOME_CERTIFICATION_IMAGE_SIZE = 2 * 1000 * 1024;
export const MAX_HOME_CERTIFICATION_IMAGE_LABEL = "2MB";

// Highlight Video section (ADR-100). Title is section-title rich text HTML
// (accent spans), so the cap is on the raw HTML. Description is plain text.
export const MAX_HOME_HIGHLIGHT_VIDEO_TITLE_LENGTH = 2000;
export const MIN_HOME_HIGHLIGHT_VIDEO_DESCRIPTION_LENGTH = 2;
export const MAX_HOME_HIGHLIGHT_VIDEO_DESCRIPTION_LENGTH = 600;
export const ACCEPTED_HOME_HIGHLIGHT_VIDEO_THUMBNAIL_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_HOME_HIGHLIGHT_VIDEO_THUMBNAIL_SIZE = 2 * 1000 * 1024;
export const MAX_HOME_HIGHLIGHT_VIDEO_THUMBNAIL_LABEL = "2MB";

// Homepage statistics counters (ADR-098) — a short list of animated
// number + label pairs. Value is a positive integer up to 999 billion.
export const MIN_HOME_STATISTICS = 1;
export const MAX_HOME_STATISTICS = 4;
export const MIN_HOME_STATISTIC_VALUE = 1;
export const MAX_HOME_STATISTIC_VALUE = 999_000_000_000;
export const MIN_HOME_STATISTIC_NAME_LENGTH = 2;
export const MAX_HOME_STATISTIC_NAME_LENGTH = 15;

// Homepage hero banner (HomePage model, ADR-082) — same size/type budget as
// the Category page banner (see product-device/limits.ts), since it's the
// same four-size banner set.
export const MAX_HOME_BANNER_SIZE = 2 * 1000 * 1024;
export const MAX_HOME_BANNER_LABEL = "2MB";
export const ACCEPTED_HOME_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

// Homepage hero banner video (ADR-089) — an optional mp4 per banner size,
// always paired with that size's still image as a required poster/fallback.
export const MAX_HOME_BANNER_VIDEO_SIZE = 10 * 1024 * 1024;
export const MAX_HOME_BANNER_VIDEO_LABEL = "10MB";
export const ACCEPTED_HOME_VIDEO_TYPES = ["video/mp4"];

// Banner — same size/type budget as every other static-page banner (see
// ../../media/galleries/limits.ts): a full-width hero image, optional mp4.
export const MAX_ABOUT_BANNER_SIZE = 2 * 1000 * 1024;
export const MAX_ABOUT_BANNER_LABEL = "2MB";
export const ACCEPTED_ABOUT_BANNER_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const MAX_ABOUT_BANNER_VIDEO_SIZE = 10 * 1024 * 1024;
export const MAX_ABOUT_BANNER_VIDEO_LABEL = "10MB";
export const ACCEPTED_ABOUT_BANNER_VIDEO_TYPES = ["video/mp4"];

// The illustration above each of the Who / What / Work sections.
export const MAX_ABOUT_ICON_SIZE = 1 * 1000 * 1024;
export const MAX_ABOUT_ICON_LABEL = "1MB";
export const ACCEPTED_ABOUT_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

// Rich text bodies (Who / What / Work) — generous, they're multi-paragraph.
export const MAX_ABOUT_BODY_LENGTH = 6000;

// Who's photo grid — laid out for six squares.
export const MAX_ABOUT_WHO_IMAGES = 6;
export const MAX_ABOUT_WHO_IMAGE_SIZE = 1 * 1000 * 1024;
export const MAX_ABOUT_WHO_IMAGE_LABEL = "1MB";

// Videos — each is a YouTube link with an optional heading/description/poster.
export const MAX_ABOUT_VIDEOS = 5;
export const MAX_ABOUT_VIDEO_HEADING_LENGTH = 120;
export const MAX_ABOUT_VIDEO_DESCRIPTION_LENGTH = 400;
export const MAX_ABOUT_VIDEO_THUMBNAIL_SIZE = 1 * 1000 * 1024;
export const MAX_ABOUT_VIDEO_THUMBNAIL_LABEL = "1MB";

// Work cards.
export const MIN_ABOUT_WORK_CARDS = 1;
export const MAX_ABOUT_WORK_CARDS = 6;
export const MAX_ABOUT_WORK_CARD_TITLE_LENGTH = 60;
export const MIN_ABOUT_WORK_CARD_DESCRIPTION_LENGTH = 2;
export const MAX_ABOUT_WORK_CARD_DESCRIPTION_LENGTH = 400;

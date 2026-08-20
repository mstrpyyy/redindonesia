// Same size/type budget as the Contact/Support banner (see
// contact/limits.ts) — the same kind of full-width hero image.
export const MAX_PODCAST_BANNER_SIZE = 2 * 1000 * 1024;
export const MAX_PODCAST_BANNER_LABEL = "2MB";

// A per-episode thumbnail — same size/type budget as the banner, just a
// separate constant since it's a conceptually different field.
export const MAX_PODCAST_THUMBNAIL_SIZE = 2 * 1000 * 1024;
export const MAX_PODCAST_THUMBNAIL_LABEL = "2MB";

export const ACCEPTED_PODCAST_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

// Optional mp4 per banner size — same budget as the homepage hero banner's
// video (see homepage/content/limits.ts, ADR-089/092).
export const MAX_PODCAST_BANNER_VIDEO_SIZE = 10 * 1000 * 1024;
export const MAX_PODCAST_BANNER_VIDEO_LABEL = "10MB";
export const ACCEPTED_PODCAST_VIDEO_TYPES = ["video/mp4"];

export const MAX_PODCAST_TITLE_LENGTH = 50;
export const MAX_PODCAST_DESCRIPTION_LENGTH = 200;

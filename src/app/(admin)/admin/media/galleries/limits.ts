// Same size/type budget as the Articles/Podcast/Contact/Support banner (see
// ../articles/limits.ts) — the same kind of full-width hero image.
export const MAX_GALLERIES_BANNER_SIZE = 2 * 1000 * 1024;
export const MAX_GALLERIES_BANNER_LABEL = "2MB";

export const ACCEPTED_GALLERIES_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

// Optional mp4 per banner size — same budget as the homepage hero banner's
// video (see homepage/content/limits.ts, ADR-089/092).
export const MAX_GALLERIES_BANNER_VIDEO_SIZE = 10 * 1024 * 1024;
export const MAX_GALLERIES_BANNER_VIDEO_LABEL = "10MB";
export const ACCEPTED_GALLERIES_VIDEO_TYPES = ["video/mp4"];

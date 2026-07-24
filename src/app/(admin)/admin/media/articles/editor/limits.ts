// Server Actions accept request bodies up to 100MB app-wide (raised in
// next.config.ts for multi-image gallery submissions, see ADR-011) — well
// above what a single thumbnail needs, so this cap exists for upload UX, not
// to dodge the body limit.
export const MAX_THUMBNAIL_SIZE = 2 * 1000 * 1024;
export const MAX_THUMBNAIL_LABEL = "2MB";

export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

export const MAX_TITLE_LENGTH = 200;
export const MAX_EXCERPT_LENGTH = 500;

// Images inserted inline into the article body via the rich text editor's
// toolbar — uploaded immediately on insert (the editor needs a real URL to put
// in the doc), unlike the thumbnail which only uploads on form submit.
export const MAX_CONTENT_IMAGE_SIZE = 3 * 1000 * 1024;
export const MAX_CONTENT_IMAGE_LABEL = "3MB";

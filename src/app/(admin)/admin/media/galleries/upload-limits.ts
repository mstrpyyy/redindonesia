// Server Actions reject request bodies over the `serverActions.bodySizeLimit`
// configured in next.config.ts (100MB — see ADR-011, raised specifically for
// multi-image gallery submissions; the VPS Nginx `client_max_body_size` must
// match, see ARCHITECTURE.md). Per-image and count caps keep a full submission
// safely under that ceiling with headroom for multipart overhead.
export const MAX_GALLERY_IMG_SIZE = 2 * 1000 * 1024;
export const MAX_GALLERY_IMG_LABEL = "2MB";

export const MAX_GALLERY_IMAGES = 50;

export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

// Placeholder written into `imageOrder` at each position a new upload occupies —
// the client interleaves kept existing images and new files in one drag-reorderable
// grid, so the final order can't be reconstructed from "existing" + "new" alone.
export const NEW_IMAGE_TOKEN = "__new__";

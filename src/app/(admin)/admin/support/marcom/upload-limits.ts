// Server Actions reject request bodies over 1MB (Next.js default, deliberately
// not raised). The file cap stays below that with headroom for multipart
// overhead and the other form fields, so anything passing client validation
// cannot trip the body limit.
export const MAX_PROFILE_IMG_SIZE = 1000 * 1024;
export const MAX_PROFILE_IMG_LABEL = "1MB";

export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

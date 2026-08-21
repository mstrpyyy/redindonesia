"use server";

import { saveUpload } from "@/lib/uploads";
import { z } from "zod";
import {
  ACCEPTED_CAROUSEL_IMAGE_TYPES,
  ACCEPTED_ICON_TYPES,
  ACCEPTED_IMAGE_TYPES,
  ACCEPTED_SEGMENT_FILE_TYPES,
  ACCEPTED_SEGMENT_VIDEO_TYPES,
  MAX_CAROUSEL_IMAGE_LABEL,
  MAX_CAROUSEL_IMAGE_SIZE,
  MAX_SEGMENT_BANNER_VIDEO_LABEL,
  MAX_SEGMENT_BANNER_VIDEO_SIZE,
  MAX_SEGMENT_FILE_LABEL,
  MAX_SEGMENT_FILE_SIZE,
  MAX_SEGMENT_IMAGE_LABEL,
  MAX_SEGMENT_IMAGE_SIZE,
} from "./limits";

const SEGMENT_UPLOAD_FEATURE = "products-content";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

const segmentImageSchema = z
  .instanceof(File)
  .refine((file) => file.size <= MAX_SEGMENT_IMAGE_SIZE, `Image must be smaller than ${MAX_SEGMENT_IMAGE_LABEL}`)
  .refine((file) => ACCEPTED_IMAGE_TYPES.includes(file.type), "Image must be a JPEG, PNG, WEBP, or GIF");

const segmentIconSchema = z
  .instanceof(File)
  .refine((file) => file.size <= MAX_SEGMENT_IMAGE_SIZE, `Icon must be smaller than ${MAX_SEGMENT_IMAGE_LABEL}`)
  .refine((file) => ACCEPTED_ICON_TYPES.includes(file.type), "Icon must be a JPEG, PNG, WEBP, GIF, or SVG");

const segmentCarouselImageSchema = z
  .instanceof(File)
  .refine(
    (file) => file.size <= MAX_CAROUSEL_IMAGE_SIZE,
    `Image must be smaller than ${MAX_CAROUSEL_IMAGE_LABEL}`
  )
  .refine((file) => ACCEPTED_CAROUSEL_IMAGE_TYPES.includes(file.type), "Image must be a JPEG, PNG, or WEBP");

const segmentFileSchema = z
  .instanceof(File)
  .refine((file) => file.size <= MAX_SEGMENT_FILE_SIZE, `File must be smaller than ${MAX_SEGMENT_FILE_LABEL}`)
  .refine((file) => ACCEPTED_SEGMENT_FILE_TYPES.includes(file.type), "File must be a JPEG, PNG, WEBP, GIF, or PDF");

// The hero segment's banner video (ADR-095) — same MP4-only, 10MB budget as
// the Category/HomePage banner video.
const segmentVideoSchema = z
  .instanceof(File)
  .refine((file) => file.size <= MAX_SEGMENT_BANNER_VIDEO_SIZE, `Video must be smaller than ${MAX_SEGMENT_BANNER_VIDEO_LABEL}`)
  .refine((file) => ACCEPTED_SEGMENT_VIDEO_TYPES.includes(file.type), "Video must be an MP4");

// Uploaded immediately on file select (same pattern as the article editor's
// inline content images, ADR-015) rather than deferred to form submit — the
// segments payload is otherwise a plain JSON blob, so by the time the form
// submits every "image"/"file" field is already just a URL string. Like
// ADR-015, there's no delete-on-remove cleanup: an admin removing a segment
// or replacing an uploaded file leaves the old file orphaned on disk rather
// than tracking references across an arbitrarily-edited JSON tree.
export async function uploadSegmentAsset(
  formData: FormData
): Promise<ActionResult<{ url: string }>> {
  const kindParam = formData.get("kind");
  const kind =
    kindParam === "file"
      ? "file"
      : kindParam === "icon"
        ? "icon"
        : kindParam === "carouselImage"
          ? "carouselImage"
          : kindParam === "video"
            ? "video"
            : "image";
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "No file provided." } };
  }

  const schema =
    kind === "file"
      ? segmentFileSchema
      : kind === "icon"
        ? segmentIconSchema
        : kind === "carouselImage"
          ? segmentCarouselImageSchema
          : kind === "video"
            ? segmentVideoSchema
            : segmentImageSchema;
  const parsed = schema.safeParse(file);
  if (!parsed.success) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid file" },
    };
  }

  try {
    const url = await saveUpload(parsed.data, SEGMENT_UPLOAD_FEATURE);
    return { success: true, data: { url } };
  } catch {
    return { success: false, error: { code: "UPLOAD_ERROR", message: "Failed to upload the file." } };
  }
}

// Called directly from a Rich Text segment's toolbar the moment an inline
// image is picked — same pattern as the article editor's `uploadContentImage`
// and the category body's `uploadCategoryContentImage`, just landing in the
// same `products-content` feature dir every other segment asset already uses.
export async function uploadSegmentContentImage(
  formData: FormData
): Promise<ActionResult<{ url: string }>> {
  const parsed = segmentImageSchema.safeParse(formData.get("image"));
  if (!parsed.success) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid image" },
    };
  }

  try {
    const url = await saveUpload(parsed.data, SEGMENT_UPLOAD_FEATURE);
    return { success: true, data: { url } };
  } catch {
    return { success: false, error: { code: "UPLOAD_ERROR", message: "Failed to upload the image." } };
  }
}

"use server";

import { saveUpload } from "@/lib/uploads";
import { z } from "zod";
import {
  ACCEPTED_CAROUSEL_ITEM_IMAGE_TYPES,
  MAX_CAROUSEL_ITEM_IMAGE_LABEL,
  MAX_CAROUSEL_ITEM_IMAGE_SIZE,
  MAX_CAROUSEL_TITLE_IMAGE_LABEL,
  MAX_CAROUSEL_TITLE_IMAGE_SIZE,
} from "./limits";

const HOME_CAROUSEL_ITEM_UPLOAD_FEATURE = "home-carousel-items";
const HOME_CAROUSEL_TITLE_UPLOAD_FEATURE = "home-carousel-titles";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

const carouselItemImageSchema = z
  .instanceof(File)
  .refine(
    (file) => file.size > 0 && file.size <= MAX_CAROUSEL_ITEM_IMAGE_SIZE,
    `Image must be smaller than ${MAX_CAROUSEL_ITEM_IMAGE_LABEL}`
  )
  .refine(
    (file) => ACCEPTED_CAROUSEL_ITEM_IMAGE_TYPES.includes(file.type),
    "Image must be a JPEG, PNG, or WEBP"
  );

// Uploaded immediately on file select, same pattern as every other
// admin-authored image field in this project (ADR-015/ADR-021) — by the
// time the carousel form submits, each custom item's `img` is already just
// a URL string inside the `items` JSON array.
export async function uploadHomeCarouselItemImage(
  formData: FormData
): Promise<ActionResult<{ url: string }>> {
  const parsed = carouselItemImageSchema.safeParse(formData.get("file"));
  if (!parsed.success) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid image" },
    };
  }

  try {
    const url = await saveUpload(parsed.data, HOME_CAROUSEL_ITEM_UPLOAD_FEATURE);
    return { success: true, data: { url } };
  } catch {
    return { success: false, error: { code: "UPLOAD_ERROR", message: "Failed to upload the image." } };
  }
}

const carouselTitleImageSchema = z
  .instanceof(File)
  .refine(
    (file) => file.size > 0 && file.size <= MAX_CAROUSEL_TITLE_IMAGE_SIZE,
    `Image must be smaller than ${MAX_CAROUSEL_TITLE_IMAGE_LABEL}`
  )
  .refine(
    (file) => ACCEPTED_CAROUSEL_ITEM_IMAGE_TYPES.includes(file.type),
    "Image must be a JPEG, PNG, or WEBP"
  );

// Used when `titleDisplayMode` is "image" — replaces the visible heading
// with this image while the text title (still required) stays as a
// screen-reader-only heading (see the HomeCarousel model comment).
export async function uploadHomeCarouselTitleImage(
  formData: FormData
): Promise<ActionResult<{ url: string }>> {
  const parsed = carouselTitleImageSchema.safeParse(formData.get("file"));
  if (!parsed.success) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid image" },
    };
  }

  try {
    const url = await saveUpload(parsed.data, HOME_CAROUSEL_TITLE_UPLOAD_FEATURE);
    return { success: true, data: { url } };
  } catch {
    return { success: false, error: { code: "UPLOAD_ERROR", message: "Failed to upload the image." } };
  }
}

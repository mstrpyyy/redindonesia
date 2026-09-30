"use server";

import { saveUpload } from "@/lib/uploads";
import { z } from "zod";
import {
  ACCEPTED_DIGITAL_BANNER_IMAGE_TYPES,
  ACCEPTED_DIGITAL_BANNER_VIDEO_TYPES,
  ACCEPTED_DIGITAL_DOCUMENT_TYPES,
  ACCEPTED_DIGITAL_FLIPBOOK_TYPES,
  ACCEPTED_DIGITAL_MEDIA_LABEL_IMAGE_TYPES,
  ACCEPTED_DIGITAL_QR_IMAGE_TYPES,
  MAX_DIGITAL_BANNER_LABEL,
  MAX_DIGITAL_BANNER_SIZE,
  MAX_DIGITAL_BANNER_VIDEO_LABEL,
  MAX_DIGITAL_BANNER_VIDEO_SIZE,
  MAX_DIGITAL_DOCUMENT_LABEL,
  MAX_DIGITAL_DOCUMENT_SIZE,
  MAX_DIGITAL_FLIPBOOK_LABEL,
  MAX_DIGITAL_FLIPBOOK_SIZE,
  MAX_DIGITAL_MEDIA_LABEL_IMAGE_LABEL,
  MAX_DIGITAL_MEDIA_LABEL_IMAGE_SIZE,
  MAX_DIGITAL_QR_IMAGE_LABEL,
  MAX_DIGITAL_QR_IMAGE_SIZE,
} from "./limits";

// QR/banner assets land in "digital"; media-block files (flipbook/document)
// land in "digital-content" — same two-feature-folder split as
// product-device's "products" vs "products-content".
const DIGITAL_UPLOAD_FEATURE = "digital";
const DIGITAL_CONTENT_UPLOAD_FEATURE = "digital-content";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

const qrImageSchema = z
  .instanceof(File)
  .refine((file) => file.size <= MAX_DIGITAL_QR_IMAGE_SIZE, `Image must be smaller than ${MAX_DIGITAL_QR_IMAGE_LABEL}`)
  .refine((file) => ACCEPTED_DIGITAL_QR_IMAGE_TYPES.includes(file.type), "Image must be a JPEG, PNG, or WEBP");

const bannerImageSchema = z
  .instanceof(File)
  .refine((file) => file.size <= MAX_DIGITAL_BANNER_SIZE, `Image must be smaller than ${MAX_DIGITAL_BANNER_LABEL}`)
  .refine((file) => ACCEPTED_DIGITAL_BANNER_IMAGE_TYPES.includes(file.type), "Image must be a JPEG, PNG, or WEBP");

const bannerVideoSchema = z
  .instanceof(File)
  .refine((file) => file.size <= MAX_DIGITAL_BANNER_VIDEO_SIZE, `Video must be smaller than ${MAX_DIGITAL_BANNER_VIDEO_LABEL}`)
  .refine((file) => ACCEPTED_DIGITAL_BANNER_VIDEO_TYPES.includes(file.type), "Video must be an MP4");

const flipbookFileSchema = z
  .instanceof(File)
  .refine((file) => file.size <= MAX_DIGITAL_FLIPBOOK_SIZE, `File must be smaller than ${MAX_DIGITAL_FLIPBOOK_LABEL}`)
  .refine((file) => ACCEPTED_DIGITAL_FLIPBOOK_TYPES.includes(file.type), "File must be a PDF");

const documentFileSchema = z
  .instanceof(File)
  .refine((file) => file.size <= MAX_DIGITAL_DOCUMENT_SIZE, `File must be smaller than ${MAX_DIGITAL_DOCUMENT_LABEL}`)
  .refine((file) => ACCEPTED_DIGITAL_DOCUMENT_TYPES.includes(file.type), "File must be a PDF, PNG, JPEG, or WEBP");

const mediaLabelImageSchema = z
  .instanceof(File)
  .refine((file) => file.size <= MAX_DIGITAL_MEDIA_LABEL_IMAGE_SIZE, `Image must be smaller than ${MAX_DIGITAL_MEDIA_LABEL_IMAGE_LABEL}`)
  .refine((file) => ACCEPTED_DIGITAL_MEDIA_LABEL_IMAGE_TYPES.includes(file.type), "Image must be a JPEG, PNG, or WEBP");

async function upload(schema: z.ZodType<File>, file: unknown, feature: string): Promise<ActionResult<{ url: string }>> {
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "No file provided." } };
  }

  const parsed = schema.safeParse(file);
  if (!parsed.success) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid file" },
    };
  }

  try {
    const url = await saveUpload(parsed.data, feature);
    return { success: true, data: { url } };
  } catch {
    return { success: false, error: { code: "UPLOAD_ERROR", message: "Failed to upload the file." } };
  }
}

export async function uploadDigitalQrImage(formData: FormData): Promise<ActionResult<{ url: string }>> {
  return upload(qrImageSchema, formData.get("file"), DIGITAL_UPLOAD_FEATURE);
}

export async function uploadDigitalBannerImage(formData: FormData): Promise<ActionResult<{ url: string }>> {
  return upload(bannerImageSchema, formData.get("file"), DIGITAL_UPLOAD_FEATURE);
}

export async function uploadDigitalBannerVideo(formData: FormData): Promise<ActionResult<{ url: string }>> {
  return upload(bannerVideoSchema, formData.get("file"), DIGITAL_UPLOAD_FEATURE);
}

export async function uploadDigitalFlipbookFile(formData: FormData): Promise<ActionResult<{ url: string }>> {
  return upload(flipbookFileSchema, formData.get("file"), DIGITAL_CONTENT_UPLOAD_FEATURE);
}

export async function uploadDigitalDocumentFile(formData: FormData): Promise<ActionResult<{ url: string }>> {
  return upload(documentFileSchema, formData.get("file"), DIGITAL_CONTENT_UPLOAD_FEATURE);
}

// The optional visual label shown on a media button instead of a generic
// icon (ADR-107) — used by both the youtube video rows and the
// flipbook/document blocks, so it lands in the shared "digital-content"
// folder alongside the other media-block files.
export async function uploadDigitalMediaLabelImage(formData: FormData): Promise<ActionResult<{ url: string }>> {
  return upload(mediaLabelImageSchema, formData.get("file"), DIGITAL_CONTENT_UPLOAD_FEATURE);
}

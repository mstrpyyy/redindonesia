"use server";

import { saveUpload } from "@/lib/uploads";
import { z } from "zod";
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_VIEWER360_FRAMES,
  MAX_VIEWER360_FRAME_LABEL,
  MAX_VIEWER360_FRAME_SIZE,
} from "./limits";

const VIEWER360_UPLOAD_FEATURE = "products-content";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

const frameSchema = z
  .instanceof(File)
  .refine((file) => file.size <= MAX_VIEWER360_FRAME_SIZE, `Each frame must be smaller than ${MAX_VIEWER360_FRAME_LABEL}`)
  .refine((file) => ACCEPTED_IMAGE_TYPES.includes(file.type), "Frames must be a JPEG, PNG, WEBP, or GIF");

// The public Viewer360 builds every frame's URL at render time as
// `${imgUrlTemplate}${frameNumber}${extension}` — one shared extension, not
// one per file — so every frame in a batch must decode to the same one.
const EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

function getFrameFiles(formData: FormData): File[] {
  return formData.getAll("frames").filter((entry): entry is File => entry instanceof File && entry.size > 0);
}

// Uploaded together, one action call for the whole sequence (same shape as
// the Gallery bulk upload) rather than one round-trip per frame. Frames are
// ordered by filename (numeric-aware), not by FileList/selection order, which
// isn't guaranteed to match what the admin intended — then saved under one
// random batch id shared by the whole sequence (`<batchId>_<n><ext>`) so the
// saved names are already in the exact numbered shape the viewer expects.
// Like every other segment asset upload, there's no delete-on-replace
// cleanup — re-uploading a sequence orphans the previous batch's files.
export async function uploadViewer360Frames(
  formData: FormData
): Promise<ActionResult<{ imgUrlTemplate: string; extension: string; totalFrames: number }>> {
  const files = getFrameFiles(formData);

  if (files.length === 0) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "No frames provided." } };
  }
  if (files.length > MAX_VIEWER360_FRAMES) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: `Up to ${MAX_VIEWER360_FRAMES} frames are allowed.` },
    };
  }

  for (const file of files) {
    const parsed = frameSchema.safeParse(file);
    if (!parsed.success) {
      return {
        success: false,
        error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid frame" },
      };
    }
  }

  const extensions = new Set(files.map((file) => EXTENSION_BY_MIME_TYPE[file.type]));
  if (extensions.size > 1) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: "All frames must be the same file type." },
    };
  }
  const extension = [...extensions][0];

  const ordered = [...files].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  const batchId = crypto.randomUUID();

  try {
    await Promise.all(
      ordered.map((file, index) => saveUpload(file, VIEWER360_UPLOAD_FEATURE, `${batchId}_${index + 1}${extension}`))
    );
  } catch {
    return { success: false, error: { code: "UPLOAD_ERROR", message: "Failed to upload the frames." } };
  }

  return {
    success: true,
    data: {
      imgUrlTemplate: `/uploads/${VIEWER360_UPLOAD_FEATURE}/${batchId}_`,
      extension,
      totalFrames: ordered.length,
    },
  };
}

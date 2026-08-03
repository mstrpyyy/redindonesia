"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { saveUpload } from "@/lib/uploads";
import { isSupportPageSlug, type SupportPageSlug } from "@/lib/support-pages";
import {
  ACCEPTED_SUPPORT_IMAGE_TYPES,
  MAX_SUPPORT_BANNER_LABEL,
  MAX_SUPPORT_BANNER_SIZE,
} from "./limits";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

// Separate feature dirs, same reasoning as the category banner vs. content
// image split (product-device/actions.ts): the banner is a whole-field
// replace, inline body images accumulate independently as the rich text
// is edited.
const SUPPORT_BANNER_UPLOAD_FEATURE = "support-pages";
const SUPPORT_CONTENT_IMAGE_UPLOAD_FEATURE = "support-pages-content";

const supportImageSchema = z
  .instanceof(File)
  .refine((file) => file.size > 0, "Image is required")
  .refine((file) => file.size <= MAX_SUPPORT_BANNER_SIZE, `Image must be smaller than ${MAX_SUPPORT_BANNER_LABEL}`)
  .refine((file) => ACCEPTED_SUPPORT_IMAGE_TYPES.includes(file.type), "Image must be a JPEG, PNG, WEBP, or GIF");

export async function uploadSupportPageBanner(formData: FormData): Promise<ActionResult<{ url: string }>> {
  const parsed = supportImageSchema.safeParse(formData.get("file"));
  if (!parsed.success) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid image" },
    };
  }

  try {
    const url = await saveUpload(parsed.data, SUPPORT_BANNER_UPLOAD_FEATURE);
    return { success: true, data: { url } };
  } catch {
    return { success: false, error: { code: "UPLOAD_ERROR", message: "Failed to upload the banner image." } };
  }
}

// Called directly from the body's rich text toolbar the moment an image is
// picked, same pattern as the article/category editors.
export async function uploadSupportPageContentImage(formData: FormData): Promise<ActionResult<{ url: string }>> {
  const parsed = supportImageSchema.safeParse(formData.get("image"));
  if (!parsed.success) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid image" },
    };
  }

  try {
    const url = await saveUpload(parsed.data, SUPPORT_CONTENT_IMAGE_UPLOAD_FEATURE);
    return { success: true, data: { url } };
  } catch {
    return { success: false, error: { code: "UPLOAD_ERROR", message: "Failed to upload the image." } };
  }
}

const saveSupportPageSchema = z.object({
  bannerXlUrl: z.string().trim().min(1, "The 2560x1107 banner is required."),
  bannerMdUrl: z.string().trim().optional(),
  bannerSmUrl: z.string().trim().optional(),
  body: z.string().optional(),
});

function revalidateSupportPagePaths(slug: SupportPageSlug) {
  revalidatePath(`/admin/support/${slug}`);
  revalidatePath(`/support/${slug}`);
}

export async function saveSupportPage(
  slug: string,
  formData: FormData
): Promise<ActionResult<{ slug: SupportPageSlug }>> {
  if (!isSupportPageSlug(slug)) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Unknown support page." } };
  }

  const parsed = saveSupportPageSchema.safeParse({
    bannerXlUrl: formData.get("bannerXlUrl"),
    bannerMdUrl: formData.get("bannerMdUrl") ?? undefined,
    bannerSmUrl: formData.get("bannerSmUrl") ?? undefined,
    body: formData.get("body") ?? undefined,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid input" },
    };
  }

  const { bannerXlUrl, bannerMdUrl, bannerSmUrl, body } = parsed.data;

  try {
    await prisma.supportPage.upsert({
      where: { slug },
      create: {
        slug,
        bannerXlUrl,
        bannerMdUrl: bannerMdUrl || null,
        bannerSmUrl: bannerSmUrl || null,
        body: body || null,
      },
      update: {
        bannerXlUrl,
        bannerMdUrl: bannerMdUrl || null,
        bannerSmUrl: bannerSmUrl || null,
        body: body || null,
      },
    });

    revalidateSupportPagePaths(slug);
    return { success: true, data: { slug } };
  } catch {
    return { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to save the page." } };
  }
}

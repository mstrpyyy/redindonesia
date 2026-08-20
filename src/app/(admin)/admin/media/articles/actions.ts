"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { saveUpload } from "@/lib/uploads";
import { findMissingBannerVideoFallback, PAGE_BANNER_SIZE_LABELS } from "@/lib/banner-video";
import { isArticlesPageSlug, type ArticlesPageSlug } from "@/lib/articles-page";
import {
  ACCEPTED_ARTICLES_IMAGE_TYPES,
  ACCEPTED_ARTICLES_VIDEO_TYPES,
  MAX_ARTICLES_BANNER_LABEL,
  MAX_ARTICLES_BANNER_SIZE,
  MAX_ARTICLES_BANNER_VIDEO_LABEL,
  MAX_ARTICLES_BANNER_VIDEO_SIZE,
} from "./limits";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

const ARTICLES_BANNER_UPLOAD_FEATURE = "articles-page";

function revalidateArticlesPages() {
  revalidatePath("/admin/media/articles");
  revalidatePath("/media/articles");
}

const articlesImageSchema = z
  .instanceof(File)
  .refine((file) => file.size > 0, "Image is required")
  .refine((file) => file.size <= MAX_ARTICLES_BANNER_SIZE, `Image must be smaller than ${MAX_ARTICLES_BANNER_LABEL}`)
  .refine((file) => ACCEPTED_ARTICLES_IMAGE_TYPES.includes(file.type), "Image must be a JPEG, PNG, WEBP, or GIF");

export async function uploadArticlesPageBanner(formData: FormData): Promise<ActionResult<{ url: string }>> {
  const parsed = articlesImageSchema.safeParse(formData.get("file"));
  if (!parsed.success) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid image" },
    };
  }

  try {
    const url = await saveUpload(parsed.data, ARTICLES_BANNER_UPLOAD_FEATURE);
    return { success: true, data: { url } };
  } catch {
    return { success: false, error: { code: "UPLOAD_ERROR", message: "Failed to upload the banner image." } };
  }
}

const articlesVideoSchema = z
  .instanceof(File)
  .refine((file) => file.size > 0, "Video is required")
  .refine((file) => file.size <= MAX_ARTICLES_BANNER_VIDEO_SIZE, `Video must be smaller than ${MAX_ARTICLES_BANNER_VIDEO_LABEL}`)
  .refine((file) => ACCEPTED_ARTICLES_VIDEO_TYPES.includes(file.type), "Video must be an MP4");

export async function uploadArticlesPageBannerVideo(formData: FormData): Promise<ActionResult<{ url: string }>> {
  const parsed = articlesVideoSchema.safeParse(formData.get("file"));
  if (!parsed.success) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid video" },
    };
  }

  try {
    const url = await saveUpload(parsed.data, ARTICLES_BANNER_UPLOAD_FEATURE);
    return { success: true, data: { url } };
  } catch {
    return { success: false, error: { code: "UPLOAD_ERROR", message: "Failed to upload the banner video." } };
  }
}

// Same "true"/"false" string convention as HomeCarousel's `showSeeMore` and
// the homepage banner's own cascade flag (homepage/content/actions.ts).
const booleanFlagSchema = z
  .preprocess((value) => value ?? "false", z.enum(["true", "false"]))
  .transform((value) => value === "true");

const saveArticlesPageSchema = z.object({
  bannerXlUrl: z.string().trim().min(1, "The 1920x830 banner is required."),
  bannerXlVideoUrl: z.string().trim().optional(),
  bannerMdUrl: z.string().trim().optional(),
  bannerMdVideoUrl: z.string().trim().optional(),
  bannerSmUrl: z.string().trim().optional(),
  bannerSmVideoUrl: z.string().trim().optional(),
  bannerVideoUseForSmaller: booleanFlagSchema,
});

export async function saveArticlesPage(
  slug: string,
  formData: FormData
): Promise<ActionResult<{ slug: ArticlesPageSlug }>> {
  if (!isArticlesPageSlug(slug)) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Unknown articles page." } };
  }

  const parsed = saveArticlesPageSchema.safeParse({
    bannerXlUrl: formData.get("bannerXlUrl"),
    bannerXlVideoUrl: formData.get("bannerXlVideoUrl") ?? undefined,
    bannerMdUrl: formData.get("bannerMdUrl") ?? undefined,
    bannerMdVideoUrl: formData.get("bannerMdVideoUrl") ?? undefined,
    bannerSmUrl: formData.get("bannerSmUrl") ?? undefined,
    bannerSmVideoUrl: formData.get("bannerSmVideoUrl") ?? undefined,
    bannerVideoUseForSmaller: formData.get("bannerVideoUseForSmaller"),
  });

  if (!parsed.success) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid input" },
    };
  }

  const {
    bannerXlUrl,
    bannerXlVideoUrl,
    bannerMdUrl,
    bannerMdVideoUrl,
    bannerSmUrl,
    bannerSmVideoUrl,
    bannerVideoUseForSmaller,
  } = parsed.data;

  const fallbackError = findMissingBannerVideoFallback([
    { label: PAGE_BANNER_SIZE_LABELS.Xl, imageUrl: bannerXlUrl, videoUrl: bannerXlVideoUrl ?? "" },
    { label: PAGE_BANNER_SIZE_LABELS.Md, imageUrl: bannerMdUrl ?? "", videoUrl: bannerMdVideoUrl ?? "" },
    { label: PAGE_BANNER_SIZE_LABELS.Sm, imageUrl: bannerSmUrl ?? "", videoUrl: bannerSmVideoUrl ?? "" },
  ]);
  if (fallbackError) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: fallbackError } };
  }

  // The flag is only meaningful once at least one size has a video — force it
  // back off server-side so a stale "true" can't linger with nothing to
  // cascade.
  const videoUseForSmaller =
    Boolean(bannerXlVideoUrl || bannerMdVideoUrl || bannerSmVideoUrl) && bannerVideoUseForSmaller;

  try {
    await prisma.articlesPage.upsert({
      where: { slug },
      create: {
        slug,
        bannerXlUrl,
        bannerXlVideoUrl: bannerXlVideoUrl || null,
        bannerMdUrl: bannerMdUrl || null,
        bannerMdVideoUrl: bannerMdVideoUrl || null,
        bannerSmUrl: bannerSmUrl || null,
        bannerSmVideoUrl: bannerSmVideoUrl || null,
        bannerVideoUseForSmaller: videoUseForSmaller,
      },
      update: {
        bannerXlUrl,
        bannerXlVideoUrl: bannerXlVideoUrl || null,
        bannerMdUrl: bannerMdUrl || null,
        bannerMdVideoUrl: bannerMdVideoUrl || null,
        bannerSmUrl: bannerSmUrl || null,
        bannerSmVideoUrl: bannerSmVideoUrl || null,
        bannerVideoUseForSmaller: videoUseForSmaller,
      },
    });

    revalidateArticlesPages();
    return { success: true, data: { slug } };
  } catch {
    return { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to save the page." } };
  }
}

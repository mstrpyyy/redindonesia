"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { saveUpload } from "@/lib/uploads";
import { isArticlesPageSlug, type ArticlesPageSlug } from "@/lib/articles-page";
import {
  ACCEPTED_ARTICLES_IMAGE_TYPES,
  MAX_ARTICLES_BANNER_LABEL,
  MAX_ARTICLES_BANNER_SIZE,
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

const saveArticlesPageSchema = z.object({
  bannerXlUrl: z.string().trim().min(1, "The 2560x1107 banner is required."),
  bannerMdUrl: z.string().trim().optional(),
  bannerSmUrl: z.string().trim().optional(),
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
    bannerMdUrl: formData.get("bannerMdUrl") ?? undefined,
    bannerSmUrl: formData.get("bannerSmUrl") ?? undefined,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid input" },
    };
  }

  const { bannerXlUrl, bannerMdUrl, bannerSmUrl } = parsed.data;

  try {
    await prisma.articlesPage.upsert({
      where: { slug },
      create: { slug, bannerXlUrl, bannerMdUrl: bannerMdUrl || null, bannerSmUrl: bannerSmUrl || null },
      update: { bannerXlUrl, bannerMdUrl: bannerMdUrl || null, bannerSmUrl: bannerSmUrl || null },
    });

    revalidateArticlesPages();
    return { success: true, data: { slug } };
  } catch {
    return { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to save the page." } };
  }
}

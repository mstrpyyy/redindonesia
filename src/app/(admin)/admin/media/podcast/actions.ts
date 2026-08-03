"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { deleteUpload, saveUpload } from "@/lib/uploads";
import { isPodcastPageSlug, type PodcastPageSlug } from "@/lib/podcast-page";
import {
  ACCEPTED_PODCAST_IMAGE_TYPES,
  MAX_PODCAST_BANNER_LABEL,
  MAX_PODCAST_BANNER_SIZE,
  MAX_PODCAST_DESCRIPTION_LENGTH,
  MAX_PODCAST_THUMBNAIL_LABEL,
  MAX_PODCAST_THUMBNAIL_SIZE,
  MAX_PODCAST_TITLE_LENGTH,
} from "./limits";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

const PODCAST_BANNER_UPLOAD_FEATURE = "podcasts";
// Separate from the banner dir — a thumbnail is a per-episode asset with its
// own lifecycle (deleted with its podcast, see deletePodcast), not the page
// chrome the banner is.
const PODCAST_THUMBNAIL_UPLOAD_FEATURE = "podcasts-thumbnails";

function revalidatePodcastPages() {
  revalidatePath("/admin/media/podcast");
  revalidatePath("/media/podcasts");
}

const podcastImageSchema = z
  .instanceof(File)
  .refine((file) => file.size > 0, "Image is required")
  .refine((file) => file.size <= MAX_PODCAST_BANNER_SIZE, `Image must be smaller than ${MAX_PODCAST_BANNER_LABEL}`)
  .refine((file) => ACCEPTED_PODCAST_IMAGE_TYPES.includes(file.type), "Image must be a JPEG, PNG, WEBP, or GIF");

export async function uploadPodcastPageBanner(formData: FormData): Promise<ActionResult<{ url: string }>> {
  const parsed = podcastImageSchema.safeParse(formData.get("file"));
  if (!parsed.success) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid image" },
    };
  }

  try {
    const url = await saveUpload(parsed.data, PODCAST_BANNER_UPLOAD_FEATURE);
    return { success: true, data: { url } };
  } catch {
    return { success: false, error: { code: "UPLOAD_ERROR", message: "Failed to upload the banner image." } };
  }
}

const savePodcastPageSchema = z.object({
  bannerXlUrl: z.string().trim().min(1, "The 2560x1107 banner is required."),
  bannerMdUrl: z.string().trim().optional(),
  bannerSmUrl: z.string().trim().optional(),
});

export async function savePodcastPage(
  slug: string,
  formData: FormData
): Promise<ActionResult<{ slug: PodcastPageSlug }>> {
  if (!isPodcastPageSlug(slug)) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Unknown podcast page." } };
  }

  const parsed = savePodcastPageSchema.safeParse({
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
    await prisma.podcastPage.upsert({
      where: { slug },
      create: { slug, bannerXlUrl, bannerMdUrl: bannerMdUrl || null, bannerSmUrl: bannerSmUrl || null },
      update: { bannerXlUrl, bannerMdUrl: bannerMdUrl || null, bannerSmUrl: bannerSmUrl || null },
    });

    revalidatePodcastPages();
    return { success: true, data: { slug } };
  } catch {
    return { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to save the page." } };
  }
}

const thumbnailImageSchema = z
  .instanceof(File)
  .refine((file) => file.size > 0, "Image is required")
  .refine((file) => file.size <= MAX_PODCAST_THUMBNAIL_SIZE, `Image must be smaller than ${MAX_PODCAST_THUMBNAIL_LABEL}`)
  .refine((file) => ACCEPTED_PODCAST_IMAGE_TYPES.includes(file.type), "Image must be a JPEG, PNG, WEBP, or GIF");

export async function uploadPodcastThumbnail(formData: FormData): Promise<ActionResult<{ url: string }>> {
  const parsed = thumbnailImageSchema.safeParse(formData.get("file"));
  if (!parsed.success) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid image" },
    };
  }

  try {
    const url = await saveUpload(parsed.data, PODCAST_THUMBNAIL_UPLOAD_FEATURE);
    return { success: true, data: { url } };
  } catch {
    return { success: false, error: { code: "UPLOAD_ERROR", message: "Failed to upload the thumbnail." } };
  }
}

const podcastFieldsSchema = z.object({
  youtubeUrl: z.string().trim().min(1, "YouTube link is required").url("Enter a valid URL"),
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(MAX_PODCAST_TITLE_LENGTH, `Title must be ${MAX_PODCAST_TITLE_LENGTH} characters or fewer.`),
  description: z
    .string()
    .trim()
    .max(MAX_PODCAST_DESCRIPTION_LENGTH, `Description must be ${MAX_PODCAST_DESCRIPTION_LENGTH} characters or fewer.`)
    .optional(),
  thumbnailUrl: z.string().trim().optional(),
});

export async function createPodcast(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const parsed = podcastFieldsSchema.safeParse({
    youtubeUrl: formData.get("youtubeUrl"),
    title: formData.get("title"),
    description: formData.get("description") ?? undefined,
    thumbnailUrl: formData.get("thumbnailUrl") ?? undefined,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid input" },
    };
  }

  try {
    // Newest podcast takes the first slot; shift everything else down —
    // same convention as createGallery.
    const [, podcast] = await prisma.$transaction([
      prisma.podcast.updateMany({ data: { order: { increment: 1 } } }),
      prisma.podcast.create({
        data: {
          youtubeUrl: parsed.data.youtubeUrl,
          title: parsed.data.title,
          description: parsed.data.description || null,
          thumbnailUrl: parsed.data.thumbnailUrl || null,
          order: 0,
        },
      }),
    ]);

    revalidatePodcastPages();
    return { success: true, data: { id: podcast.id } };
  } catch {
    return { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to create podcast." } };
  }
}

export async function updatePodcast(id: string, formData: FormData): Promise<ActionResult<{ id: string }>> {
  if (!id) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Missing podcast id." } };
  }

  const parsed = podcastFieldsSchema.safeParse({
    youtubeUrl: formData.get("youtubeUrl"),
    title: formData.get("title"),
    description: formData.get("description") ?? undefined,
    thumbnailUrl: formData.get("thumbnailUrl") ?? undefined,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid input" },
    };
  }

  try {
    await prisma.podcast.update({
      where: { id },
      data: {
        youtubeUrl: parsed.data.youtubeUrl,
        title: parsed.data.title,
        description: parsed.data.description || null,
        thumbnailUrl: parsed.data.thumbnailUrl || null,
      },
    });

    revalidatePodcastPages();
    return { success: true, data: { id } };
  } catch {
    return { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to update podcast." } };
  }
}

export async function deletePodcast(id: string): Promise<ActionResult<null>> {
  if (!id) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Missing podcast id." } };
  }

  try {
    const podcast = await prisma.podcast.delete({ where: { id } });
    if (podcast.thumbnailUrl) await deleteUpload(podcast.thumbnailUrl, PODCAST_THUMBNAIL_UPLOAD_FEATURE);

    revalidatePodcastPages();
    return { success: true, data: null };
  } catch {
    return { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to delete podcast." } };
  }
}

const reorderSchema = z.array(z.string().min(1)).min(1);

export async function reorderPodcasts(ids: string[]): Promise<ActionResult<null>> {
  const parsed = reorderSchema.safeParse(ids);
  if (!parsed.success) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid order payload." } };
  }

  try {
    await prisma.$transaction(
      parsed.data.map((id, index) => prisma.podcast.update({ where: { id }, data: { order: index } }))
    );

    revalidatePodcastPages();
    return { success: true, data: null };
  } catch {
    return { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to save the new order." } };
  }
}

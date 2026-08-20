"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { saveUpload } from "@/lib/uploads";
import { findMissingBannerVideoFallback, PAGE_BANNER_SIZE_LABELS } from "@/lib/banner-video";
import { isContactPageSlug, type ContactPageSlug } from "@/lib/contact-pages";
import {
  ACCEPTED_CONTACT_IMAGE_TYPES,
  ACCEPTED_CONTACT_VIDEO_TYPES,
  MAX_CONTACT_BANNER_LABEL,
  MAX_CONTACT_BANNER_SIZE,
  MAX_CONTACT_BANNER_VIDEO_LABEL,
  MAX_CONTACT_BANNER_VIDEO_SIZE,
} from "./limits";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

// Separate feature dirs, same reasoning as support/actions.ts: the banner is
// a whole-field replace, inline body images accumulate independently as the
// rich text is edited.
const CONTACT_BANNER_UPLOAD_FEATURE = "contact-pages";
const CONTACT_CONTENT_IMAGE_UPLOAD_FEATURE = "contact-pages-content";

const contactImageSchema = z
  .instanceof(File)
  .refine((file) => file.size > 0, "Image is required")
  .refine((file) => file.size <= MAX_CONTACT_BANNER_SIZE, `Image must be smaller than ${MAX_CONTACT_BANNER_LABEL}`)
  .refine((file) => ACCEPTED_CONTACT_IMAGE_TYPES.includes(file.type), "Image must be a JPEG, PNG, WEBP, or GIF");

export async function uploadContactPageBanner(formData: FormData): Promise<ActionResult<{ url: string }>> {
  const parsed = contactImageSchema.safeParse(formData.get("file"));
  if (!parsed.success) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid image" },
    };
  }

  try {
    const url = await saveUpload(parsed.data, CONTACT_BANNER_UPLOAD_FEATURE);
    return { success: true, data: { url } };
  } catch {
    return { success: false, error: { code: "UPLOAD_ERROR", message: "Failed to upload the banner image." } };
  }
}

const contactVideoSchema = z
  .instanceof(File)
  .refine((file) => file.size > 0, "Video is required")
  .refine((file) => file.size <= MAX_CONTACT_BANNER_VIDEO_SIZE, `Video must be smaller than ${MAX_CONTACT_BANNER_VIDEO_LABEL}`)
  .refine((file) => ACCEPTED_CONTACT_VIDEO_TYPES.includes(file.type), "Video must be an MP4");

export async function uploadContactPageBannerVideo(formData: FormData): Promise<ActionResult<{ url: string }>> {
  const parsed = contactVideoSchema.safeParse(formData.get("file"));
  if (!parsed.success) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid video" },
    };
  }

  try {
    const url = await saveUpload(parsed.data, CONTACT_BANNER_UPLOAD_FEATURE);
    return { success: true, data: { url } };
  } catch {
    return { success: false, error: { code: "UPLOAD_ERROR", message: "Failed to upload the banner video." } };
  }
}

// Called directly from the body's rich text toolbar the moment an image is
// picked, same pattern as the support/article/category editors.
export async function uploadContactPageContentImage(formData: FormData): Promise<ActionResult<{ url: string }>> {
  const parsed = contactImageSchema.safeParse(formData.get("image"));
  if (!parsed.success) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid image" },
    };
  }

  try {
    const url = await saveUpload(parsed.data, CONTACT_CONTENT_IMAGE_UPLOAD_FEATURE);
    return { success: true, data: { url } };
  } catch {
    return { success: false, error: { code: "UPLOAD_ERROR", message: "Failed to upload the image." } };
  }
}

// Same "true"/"false" string convention as HomeCarousel's `showSeeMore` and
// the homepage banner's own cascade flag (homepage/content/actions.ts).
const booleanFlagSchema = z
  .preprocess((value) => value ?? "false", z.enum(["true", "false"]))
  .transform((value) => value === "true");

const saveContactPageSchema = z.object({
  bannerXlUrl: z.string().trim().min(1, "The 1920x830 banner is required."),
  bannerXlVideoUrl: z.string().trim().optional(),
  bannerMdUrl: z.string().trim().optional(),
  bannerMdVideoUrl: z.string().trim().optional(),
  bannerSmUrl: z.string().trim().optional(),
  bannerSmVideoUrl: z.string().trim().optional(),
  bannerVideoUseForSmaller: booleanFlagSchema,
  body: z.string().optional(),
});

function revalidateContactPagePaths(slug: ContactPageSlug) {
  revalidatePath(`/admin/contact/${slug}`);
  revalidatePath("/contact");
}

export async function saveContactPage(
  slug: string,
  formData: FormData
): Promise<ActionResult<{ slug: ContactPageSlug }>> {
  if (!isContactPageSlug(slug)) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Unknown contact page." } };
  }

  const parsed = saveContactPageSchema.safeParse({
    bannerXlUrl: formData.get("bannerXlUrl"),
    bannerXlVideoUrl: formData.get("bannerXlVideoUrl") ?? undefined,
    bannerMdUrl: formData.get("bannerMdUrl") ?? undefined,
    bannerMdVideoUrl: formData.get("bannerMdVideoUrl") ?? undefined,
    bannerSmUrl: formData.get("bannerSmUrl") ?? undefined,
    bannerSmVideoUrl: formData.get("bannerSmVideoUrl") ?? undefined,
    bannerVideoUseForSmaller: formData.get("bannerVideoUseForSmaller"),
    body: formData.get("body") ?? undefined,
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
    body,
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
    await prisma.contactPage.upsert({
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
        body: body || null,
      },
      update: {
        bannerXlUrl,
        bannerXlVideoUrl: bannerXlVideoUrl || null,
        bannerMdUrl: bannerMdUrl || null,
        bannerMdVideoUrl: bannerMdVideoUrl || null,
        bannerSmUrl: bannerSmUrl || null,
        bannerSmVideoUrl: bannerSmVideoUrl || null,
        bannerVideoUseForSmaller: videoUseForSmaller,
        body: body || null,
      },
    });

    revalidateContactPagePaths(slug);
    return { success: true, data: { slug } };
  } catch {
    return { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to save the page." } };
  }
}

// Fired client-side the moment a Form Response row is opened
// (form-response-view.tsx) — no user-facing error surface needed, the
// unread dot just doesn't clear if this silently fails.
export async function markContactSubmissionAsRead(id: string): Promise<ActionResult<null>> {
  if (!id) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Missing submission id." } };
  }

  try {
    await prisma.contactSubmission.update({ where: { id }, data: { isRead: true } });
    revalidatePath("/admin/contact/form-response");
    return { success: true, data: null };
  } catch {
    return { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to mark the message as read." } };
  }
}

// Fired from the detail pane's "Mark as unread" button — same silent-fail
// reasoning as markContactSubmissionAsRead, just the reverse flip.
export async function markContactSubmissionAsUnread(id: string): Promise<ActionResult<null>> {
  if (!id) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Missing submission id." } };
  }

  try {
    await prisma.contactSubmission.update({ where: { id }, data: { isRead: false } });
    revalidatePath("/admin/contact/form-response");
    return { success: true, data: null };
  } catch {
    return { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to mark the message as unread." } };
  }
}

export async function deleteContactSubmission(id: string): Promise<ActionResult<null>> {
  if (!id) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Missing submission id." } };
  }

  try {
    await prisma.contactSubmission.delete({ where: { id } });
    revalidatePath("/admin/contact/form-response");
    return { success: true, data: null };
  } catch {
    return { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to delete the message." } };
  }
}

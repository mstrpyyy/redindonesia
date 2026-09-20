"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { saveUpload } from "@/lib/uploads";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  ACCEPTED_ABOUT_BANNER_IMAGE_TYPES,
  ACCEPTED_ABOUT_BANNER_VIDEO_TYPES,
  ACCEPTED_ABOUT_IMAGE_TYPES,
  MAX_ABOUT_BANNER_LABEL,
  MAX_ABOUT_BANNER_SIZE,
  MAX_ABOUT_BANNER_VIDEO_LABEL,
  MAX_ABOUT_BANNER_VIDEO_SIZE,
  MAX_ABOUT_BODY_LENGTH,
  MAX_ABOUT_ICON_LABEL,
  MAX_ABOUT_ICON_SIZE,
  MAX_ABOUT_VIDEOS,
  MAX_ABOUT_VIDEO_DESCRIPTION_LENGTH,
  MAX_ABOUT_VIDEO_HEADING_LENGTH,
  MAX_ABOUT_VIDEO_THUMBNAIL_LABEL,
  MAX_ABOUT_VIDEO_THUMBNAIL_SIZE,
  MAX_ABOUT_WHO_IMAGES,
  MAX_ABOUT_WHO_IMAGE_LABEL,
  MAX_ABOUT_WHO_IMAGE_SIZE,
  MAX_ABOUT_WORK_CARDS,
  MAX_ABOUT_WORK_CARD_DESCRIPTION_LENGTH,
  MAX_ABOUT_WORK_CARD_TITLE_LENGTH,
  MIN_ABOUT_WORK_CARDS,
  MIN_ABOUT_WORK_CARD_DESCRIPTION_LENGTH,
} from "./limits";
import { findMissingBannerVideoFallback, PAGE_BANNER_SIZE_LABELS } from "@/lib/banner-video";
import { isAboutPageSlug, type AboutPageSlug } from "@/lib/about-page";
import { FEATURE_ICON_NAMES } from "@/lib/feature-icons";
import { getYoutubeVideoId, hasRichTextContent } from "@/lib/utils";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

const ABOUT_UPLOAD_FEATURE = "about-page";

function revalidateAboutPages() {
  revalidatePath("/admin/home-about/our-story");
  revalidatePath("/about");
}

// --- Uploads --------------------------------------------------------------

interface IImageUploadRules {
  maxSize: number;
  maxLabel: string;
  types: string[];
  typesMessage: string;
  failureMessage: string;
}

async function uploadImage(
  formData: FormData,
  rules: IImageUploadRules
): Promise<ActionResult<{ url: string }>> {
  const schema = z
    .instanceof(File)
    .refine((file) => file.size > 0, "Image is required")
    .refine((file) => file.size <= rules.maxSize, `Image must be smaller than ${rules.maxLabel}`)
    .refine((file) => rules.types.includes(file.type), rules.typesMessage);

  const parsed = schema.safeParse(formData.get("file"));
  if (!parsed.success) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid image" },
    };
  }

  try {
    const url = await saveUpload(parsed.data, ABOUT_UPLOAD_FEATURE);
    return { success: true, data: { url } };
  } catch {
    return { success: false, error: { code: "UPLOAD_ERROR", message: rules.failureMessage } };
  }
}

export async function uploadAboutPageBanner(formData: FormData): Promise<ActionResult<{ url: string }>> {
  return uploadImage(formData, {
    maxSize: MAX_ABOUT_BANNER_SIZE,
    maxLabel: MAX_ABOUT_BANNER_LABEL,
    types: ACCEPTED_ABOUT_BANNER_IMAGE_TYPES,
    typesMessage: "Image must be a JPEG, PNG, WEBP, or GIF",
    failureMessage: "Failed to upload the banner image.",
  });
}

export async function uploadAboutPageBannerVideo(formData: FormData): Promise<ActionResult<{ url: string }>> {
  const schema = z
    .instanceof(File)
    .refine((file) => file.size > 0, "Video is required")
    .refine(
      (file) => file.size <= MAX_ABOUT_BANNER_VIDEO_SIZE,
      `Video must be smaller than ${MAX_ABOUT_BANNER_VIDEO_LABEL}`
    )
    .refine((file) => ACCEPTED_ABOUT_BANNER_VIDEO_TYPES.includes(file.type), "Video must be an MP4");

  const parsed = schema.safeParse(formData.get("file"));
  if (!parsed.success) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid video" },
    };
  }

  try {
    const url = await saveUpload(parsed.data, ABOUT_UPLOAD_FEATURE);
    return { success: true, data: { url } };
  } catch {
    return { success: false, error: { code: "UPLOAD_ERROR", message: "Failed to upload the banner video." } };
  }
}

export async function uploadAboutPageIcon(formData: FormData): Promise<ActionResult<{ url: string }>> {
  return uploadImage(formData, {
    maxSize: MAX_ABOUT_ICON_SIZE,
    maxLabel: MAX_ABOUT_ICON_LABEL,
    types: ACCEPTED_ABOUT_IMAGE_TYPES,
    typesMessage: "Image must be a JPEG, PNG, or WEBP",
    failureMessage: "Failed to upload the icon.",
  });
}

export async function uploadAboutPageWhoImage(formData: FormData): Promise<ActionResult<{ url: string }>> {
  return uploadImage(formData, {
    maxSize: MAX_ABOUT_WHO_IMAGE_SIZE,
    maxLabel: MAX_ABOUT_WHO_IMAGE_LABEL,
    types: ACCEPTED_ABOUT_IMAGE_TYPES,
    typesMessage: "Image must be a JPEG, PNG, or WEBP",
    failureMessage: "Failed to upload the image.",
  });
}

export async function uploadAboutPageVideoThumbnail(formData: FormData): Promise<ActionResult<{ url: string }>> {
  return uploadImage(formData, {
    maxSize: MAX_ABOUT_VIDEO_THUMBNAIL_SIZE,
    maxLabel: MAX_ABOUT_VIDEO_THUMBNAIL_LABEL,
    types: ACCEPTED_ABOUT_IMAGE_TYPES,
    typesMessage: "Image must be a JPEG, PNG, or WEBP",
    failureMessage: "Failed to upload the thumbnail.",
  });
}

// --- Save (one section at a time, ADR-102/103) -----------------------------

export type AboutPageSection = "banner" | "who" | "videos" | "what" | "work";

const ABOUT_PAGE_SECTIONS: readonly string[] = [
  "banner",
  "who",
  "videos",
  "what",
  "work",
] satisfies AboutPageSection[];

// Only the columns a section owns — merged into the row on save, so saving
// one section never touches another's data. Assignable to both the upsert's
// `create` (with `slug`) and `update`.
type IAboutPageSectionData = Partial<
  Omit<Prisma.AboutPageUncheckedCreateInput, "id" | "slug" | "createdAt" | "updatedAt">
>;

type SectionParseResult =
  | { success: true; data: IAboutPageSectionData }
  | { success: false; message: string };

function invalid(message: string): SectionParseResult {
  return { success: false, message };
}

function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Invalid input";
}

// Same "true"/"false" string convention as the other banner forms.
const booleanFlagSchema = z
  .preprocess((value) => value ?? "false", z.enum(["true", "false"]))
  .transform((value) => value === "true");

// List fields arrive as a JSON string (FormData can't carry an array).
function parseJsonList(value: unknown): unknown {
  if (typeof value !== "string" || value.length === 0) return [];
  try {
    return JSON.parse(value);
  } catch {
    return "__invalid__";
  }
}

const bannerSchema = z.object({
  bannerXlUrl: z.string().trim().min(1, "The 1920x830 banner is required."),
  bannerXlVideoUrl: z.string().trim().optional(),
  bannerMdUrl: z.string().trim().optional(),
  bannerMdVideoUrl: z.string().trim().optional(),
  bannerSmUrl: z.string().trim().optional(),
  bannerSmVideoUrl: z.string().trim().optional(),
  bannerVideoUseForSmaller: booleanFlagSchema,
});

function parseBannerSection(formData: FormData): SectionParseResult {
  const parsed = bannerSchema.safeParse({
    bannerXlUrl: formData.get("bannerXlUrl"),
    bannerXlVideoUrl: formData.get("bannerXlVideoUrl") ?? undefined,
    bannerMdUrl: formData.get("bannerMdUrl") ?? undefined,
    bannerMdVideoUrl: formData.get("bannerMdVideoUrl") ?? undefined,
    bannerSmUrl: formData.get("bannerSmUrl") ?? undefined,
    bannerSmVideoUrl: formData.get("bannerSmVideoUrl") ?? undefined,
    bannerVideoUseForSmaller: formData.get("bannerVideoUseForSmaller"),
  });
  if (!parsed.success) return invalid(firstIssue(parsed.error));

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
  if (fallbackError) return invalid(fallbackError);

  // The flag is only meaningful once at least one size has a video — force it
  // back off server-side so a stale "true" can't linger with nothing to
  // cascade.
  const videoUseForSmaller =
    Boolean(bannerXlVideoUrl || bannerMdVideoUrl || bannerSmVideoUrl) && bannerVideoUseForSmaller;

  return {
    success: true,
    data: {
      bannerXlUrl,
      bannerXlVideoUrl: bannerXlVideoUrl || null,
      bannerMdUrl: bannerMdUrl || null,
      bannerMdVideoUrl: bannerMdVideoUrl || null,
      bannerSmUrl: bannerSmUrl || null,
      bannerSmVideoUrl: bannerSmVideoUrl || null,
      bannerVideoUseForSmaller: videoUseForSmaller,
    },
  };
}

const bodySchema = z.string().trim().max(MAX_ABOUT_BODY_LENGTH, "The text is too long");
const iconUrlSchema = z.string().trim().optional();

const whoSchema = z.object({
  whoIconUrl: iconUrlSchema,
  whoBody: bodySchema.optional(),
  whoImages: z.preprocess(
    parseJsonList,
    z
      .array(z.object({ id: z.string().min(1), image: z.string().trim().min(1, "Every photo needs an image") }))
      .max(MAX_ABOUT_WHO_IMAGES, `At most ${MAX_ABOUT_WHO_IMAGES} photos`)
  ),
});

function parseWhoSection(formData: FormData): SectionParseResult {
  const parsed = whoSchema.safeParse({
    whoIconUrl: formData.get("whoIconUrl") ?? undefined,
    whoBody: formData.get("whoBody") ?? undefined,
    whoImages: formData.get("whoImages") ?? undefined,
  });
  if (!parsed.success) return invalid(firstIssue(parsed.error));

  const { whoIconUrl, whoBody, whoImages } = parsed.data;
  if (!hasRichTextContent(whoBody)) return invalid("Add the Who section text");

  return {
    success: true,
    data: {
      whoIconUrl: whoIconUrl || null,
      whoBody: whoBody as string,
      whoImages: whoImages.map((image) => ({ id: image.id, image: image.image })),
    },
  };
}

const videosSchema = z.object({
  videos: z.preprocess(
    parseJsonList,
    z
      .array(
        z.object({
          id: z.string().min(1),
          youtubeUrl: z.string().trim().min(1, "Every video needs a YouTube link"),
          thumbnailUrl: z.string().trim(),
          heading: z
            .string()
            .trim()
            .max(MAX_ABOUT_VIDEO_HEADING_LENGTH, `A video heading must be ${MAX_ABOUT_VIDEO_HEADING_LENGTH} characters or fewer`),
          description: z
            .string()
            .trim()
            .max(
              MAX_ABOUT_VIDEO_DESCRIPTION_LENGTH,
              `A video description must be ${MAX_ABOUT_VIDEO_DESCRIPTION_LENGTH} characters or fewer`
            ),
        })
      )
      .max(MAX_ABOUT_VIDEOS, `At most ${MAX_ABOUT_VIDEOS} videos`)
  ),
});

function parseVideosSection(formData: FormData): SectionParseResult {
  const parsed = videosSchema.safeParse({ videos: formData.get("videos") ?? undefined });
  if (!parsed.success) return invalid(firstIssue(parsed.error));

  const { videos } = parsed.data;
  if (videos.some((video) => !getYoutubeVideoId(video.youtubeUrl))) {
    return invalid("That doesn't look like a valid YouTube link");
  }

  return {
    success: true,
    data: {
      videos: videos.map((video) => ({
        id: video.id,
        youtubeUrl: video.youtubeUrl,
        thumbnailUrl: video.thumbnailUrl,
        heading: video.heading,
        description: video.description,
      })),
    },
  };
}

const whatSchema = z.object({
  whatIconUrl: iconUrlSchema,
  whatBody: bodySchema.optional(),
});

function parseWhatSection(formData: FormData): SectionParseResult {
  const parsed = whatSchema.safeParse({
    whatIconUrl: formData.get("whatIconUrl") ?? undefined,
    whatBody: formData.get("whatBody") ?? undefined,
  });
  if (!parsed.success) return invalid(firstIssue(parsed.error));

  const { whatIconUrl, whatBody } = parsed.data;
  if (!hasRichTextContent(whatBody)) return invalid("Add the What section text");

  return { success: true, data: { whatIconUrl: whatIconUrl || null, whatBody: whatBody as string } };
}

const workSchema = z.object({
  workIconUrl: iconUrlSchema,
  workBody: bodySchema.optional(),
  workCards: z.preprocess(
    parseJsonList,
    z
      .array(
        z.object({
          id: z.string().min(1),
          icon: z.string().refine((name) => FEATURE_ICON_NAMES.includes(name), "Pick an icon"),
          title: z
            .string()
            .trim()
            .min(1, "Every card needs a title")
            .max(MAX_ABOUT_WORK_CARD_TITLE_LENGTH, `A card title must be ${MAX_ABOUT_WORK_CARD_TITLE_LENGTH} characters or fewer`),
          description: z
            .string()
            .trim()
            .min(
              MIN_ABOUT_WORK_CARD_DESCRIPTION_LENGTH,
              `Every card description needs at least ${MIN_ABOUT_WORK_CARD_DESCRIPTION_LENGTH} characters`
            )
            .max(
              MAX_ABOUT_WORK_CARD_DESCRIPTION_LENGTH,
              `A card description must be ${MAX_ABOUT_WORK_CARD_DESCRIPTION_LENGTH} characters or fewer`
            ),
        })
      )
      .min(MIN_ABOUT_WORK_CARDS, `Add at least ${MIN_ABOUT_WORK_CARDS} card`)
      .max(MAX_ABOUT_WORK_CARDS, `At most ${MAX_ABOUT_WORK_CARDS} cards`)
  ),
});

function parseWorkSection(formData: FormData): SectionParseResult {
  const parsed = workSchema.safeParse({
    workIconUrl: formData.get("workIconUrl") ?? undefined,
    workBody: formData.get("workBody") ?? undefined,
    workCards: formData.get("workCards") ?? undefined,
  });
  if (!parsed.success) return invalid(firstIssue(parsed.error));

  const { workIconUrl, workBody, workCards } = parsed.data;
  if (!hasRichTextContent(workBody)) return invalid("Add the Work section text");

  return {
    success: true,
    data: {
      workIconUrl: workIconUrl || null,
      workBody: workBody as string,
      workCards: workCards.map((card) => ({
        id: card.id,
        icon: card.icon,
        title: card.title,
        description: card.description,
      })),
    },
  };
}

const SECTION_PARSERS: Record<AboutPageSection, (formData: FormData) => SectionParseResult> = {
  banner: parseBannerSection,
  who: parseWhoSection,
  videos: parseVideosSection,
  what: parseWhatSection,
  work: parseWorkSection,
};

function isAboutPageSection(value: string): value is AboutPageSection {
  return ABOUT_PAGE_SECTIONS.includes(value);
}

export async function saveAboutPageSection(
  slug: string,
  section: string,
  formData: FormData
): Promise<ActionResult<{ slug: AboutPageSlug }>> {
  if (!isAboutPageSlug(slug)) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Unknown page." } };
  }
  if (!isAboutPageSection(section)) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Unknown section." } };
  }

  const parsed = SECTION_PARSERS[section](formData);
  if (!parsed.success) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: parsed.message } };
  }

  try {
    await prisma.aboutPage.upsert({
      where: { slug },
      create: { slug, ...parsed.data },
      update: parsed.data,
    });

    revalidateAboutPages();
    return { success: true, data: { slug } };
  } catch {
    return { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to save the section." } };
  }
}

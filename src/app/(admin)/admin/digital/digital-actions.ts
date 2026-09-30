"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { findMissingBannerVideoFallback } from "@/lib/banner-video";
import { IDigitalMediaBlock } from "@/interfaces/digital";
import { isDigitalMediaComplete } from "./digital-media";
import {
  MAX_DIGITAL_MEDIA_LABEL_LENGTH,
  MAX_DIGITAL_NAME_LENGTH,
  MAX_DIGITAL_YOUTUBE_DESCRIPTION_LENGTH,
  MAX_DIGITAL_YOUTUBE_TITLE_LENGTH,
} from "./limits";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

const statusSchema = z.enum(["hidden", "public"]);

function revalidateDigitalPages() {
  revalidatePath("/admin/digital");
  // The public QR carousel (src/app/digital/page.tsx, ADR-109) reads
  // published items live at render time with no revalidation of its own.
  revalidatePath("/digital");
}

const DIACRITIC_MARKS_PATTERN = new RegExp("[\\u0300-\\u036f]", "g");

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(DIACRITIC_MARKS_PATTERN, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function generateUniqueDigitalSlug(name: string, excludeId?: string): Promise<string> {
  const base = slugify(name) || "digital";

  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const existing = await prisma.digitalItem.findFirst({
      where: { slug: candidate, id: excludeId ? { not: excludeId } : undefined },
      select: { id: true },
    });
    if (!existing) return candidate;
  }
  throw new Error("Could not generate a unique slug");
}

const digitalFieldsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(MAX_DIGITAL_NAME_LENGTH, `Name must be ${MAX_DIGITAL_NAME_LENGTH} characters or fewer`),
  status: statusSchema,
  qrImageUrl: z.string().trim().optional(),
});

const bannerFieldsSchema = z.object({
  bannerSmUrl: z.string().trim().optional(),
  bannerSmVideoUrl: z.string().trim().optional(),
  bannerMdUrl: z.string().trim().optional(),
  bannerMdVideoUrl: z.string().trim().optional(),
  bannerLgUrl: z.string().trim().optional(),
  bannerLgVideoUrl: z.string().trim().optional(),
  bannerXlUrl: z.string().trim().optional(),
  bannerXlVideoUrl: z.string().trim().optional(),
  bannerVideoUseForSmaller: z.preprocess((value) => value ?? "false", z.enum(["true", "false"])).transform((value) => value === "true"),
});

function emptyToNull(value: string | undefined): string | null {
  return value && value.length > 0 ? value : null;
}

function parseBannerFields(
  formData: FormData
): { success: true; data: z.infer<typeof bannerFieldsSchema> } | { success: false; message: string } {
  const parsed = bannerFieldsSchema.safeParse({
    bannerSmUrl: formData.get("bannerSmUrl") ?? undefined,
    bannerSmVideoUrl: formData.get("bannerSmVideoUrl") ?? undefined,
    bannerMdUrl: formData.get("bannerMdUrl") ?? undefined,
    bannerMdVideoUrl: formData.get("bannerMdVideoUrl") ?? undefined,
    bannerLgUrl: formData.get("bannerLgUrl") ?? undefined,
    bannerLgVideoUrl: formData.get("bannerLgVideoUrl") ?? undefined,
    bannerXlUrl: formData.get("bannerXlUrl") ?? undefined,
    bannerXlVideoUrl: formData.get("bannerXlVideoUrl") ?? undefined,
    bannerVideoUseForSmaller: formData.get("bannerVideoUseForSmaller"),
  });
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Invalid background images" };
  }

  // A size's video is only ever shown alongside its own still image (ADR-089,
  // reused here per ADR-105) — checked unconditionally, not just on publish.
  const fallbackError = findMissingBannerVideoFallback([
    { label: "1920x1080", imageUrl: parsed.data.bannerXlUrl ?? "", videoUrl: parsed.data.bannerXlVideoUrl ?? "" },
    { label: "1440x1080", imageUrl: parsed.data.bannerLgUrl ?? "", videoUrl: parsed.data.bannerLgVideoUrl ?? "" },
    { label: "1080x1440", imageUrl: parsed.data.bannerMdUrl ?? "", videoUrl: parsed.data.bannerMdVideoUrl ?? "" },
    { label: "1080x1920", imageUrl: parsed.data.bannerSmUrl ?? "", videoUrl: parsed.data.bannerSmVideoUrl ?? "" },
  ]);
  if (fallbackError) return { success: false, message: fallbackError };

  return { success: true, data: parsed.data };
}

// Every block is one landing-page button — `label`/`imageUrl` live on the
// block itself (ADR-108). A "youtube" block's videos are shown on that
// button's own video page, so a video only carries what that page needs:
// `url` (required) plus an optional `title`/`description` caption — never
// its own label/image. "flipbook"/"document" hold their one file directly.
const youtubeVideoSchema = z.object({
  id: z.string().min(1),
  url: z.string().trim(),
  title: z.string().trim().max(MAX_DIGITAL_YOUTUBE_TITLE_LENGTH).optional(),
  description: z.string().trim().max(MAX_DIGITAL_YOUTUBE_DESCRIPTION_LENGTH).optional(),
});
const youtubeBlockSchema = z.object({
  id: z.string().min(1),
  type: z.literal("youtube"),
  label: z.string().trim().max(MAX_DIGITAL_MEDIA_LABEL_LENGTH),
  imageUrl: z.string().trim().optional(),
  videos: z.array(youtubeVideoSchema),
});
const flipbookBlockSchema = z.object({
  id: z.string().min(1),
  type: z.literal("flipbook"),
  label: z.string().trim().max(MAX_DIGITAL_MEDIA_LABEL_LENGTH),
  imageUrl: z.string().trim().optional(),
  fileUrl: z.string().trim(),
});
const documentBlockSchema = z.object({
  id: z.string().min(1),
  type: z.literal("document"),
  label: z.string().trim().max(MAX_DIGITAL_MEDIA_LABEL_LENGTH),
  imageUrl: z.string().trim().optional(),
  fileUrl: z.string().trim(),
});
const mediaSchema = z.array(z.discriminatedUnion("type", [youtubeBlockSchema, flipbookBlockSchema, documentBlockSchema]));

// A hidden item is a work in progress (same precedent as Product's
// `validateSegments`) — full completeness (at least one block, every entry
// filled in) is only enforced when publishing; a draft only needs a
// well-formed shape.
function parseMediaField(
  formData: FormData,
  status: "hidden" | "public"
): { valid: true; media: IDigitalMediaBlock[] } | { valid: false; message: string } {
  const raw = formData.get("media");
  if (typeof raw !== "string") return { valid: false, message: "Missing media payload." };

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    return { valid: false, message: "Invalid media payload." };
  }

  const parsed = mediaSchema.safeParse(parsedJson);
  if (!parsed.success) {
    return { valid: false, message: parsed.error.issues[0]?.message ?? "Invalid media payload." };
  }

  if (status === "public" && !isDigitalMediaComplete(parsed.data)) {
    return {
      valid: false,
      message: "At least one media type is required, and every entry must be filled in, to publish.",
    };
  }

  return { valid: true, media: parsed.data };
}

interface IDigitalMutationResult {
  id: string;
  slug: string;
}

export async function createDigitalItem(formData: FormData): Promise<ActionResult<IDigitalMutationResult>> {
  const parsedFields = digitalFieldsSchema.safeParse({
    name: formData.get("name"),
    status: formData.get("status"),
    qrImageUrl: formData.get("qrImageUrl") ?? undefined,
  });
  if (!parsedFields.success) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: parsedFields.error.issues[0]?.message ?? "Invalid input" } };
  }

  if (parsedFields.data.status === "public" && !parsedFields.data.qrImageUrl) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "A QR image is required to publish." } };
  }

  const parsedBanner = parseBannerFields(formData);
  if (!parsedBanner.success) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: parsedBanner.message } };
  }
  if (parsedFields.data.status === "public" && !parsedBanner.data.bannerXlUrl) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "A background image (1920x1080) is required to publish." } };
  }

  const parsedMedia = parseMediaField(formData, parsedFields.data.status);
  if (!parsedMedia.valid) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: parsedMedia.message } };
  }

  try {
    const slug = await generateUniqueDigitalSlug(parsedFields.data.name);
    const siblingCount = await prisma.digitalItem.count();

    const item = await prisma.digitalItem.create({
      data: {
        name: parsedFields.data.name,
        slug,
        status: parsedFields.data.status,
        order: siblingCount,
        qrImageUrl: parsedFields.data.qrImageUrl ?? "",
        bannerSmUrl: emptyToNull(parsedBanner.data.bannerSmUrl),
        bannerSmVideoUrl: emptyToNull(parsedBanner.data.bannerSmVideoUrl),
        bannerMdUrl: emptyToNull(parsedBanner.data.bannerMdUrl),
        bannerMdVideoUrl: emptyToNull(parsedBanner.data.bannerMdVideoUrl),
        bannerLgUrl: emptyToNull(parsedBanner.data.bannerLgUrl),
        bannerLgVideoUrl: emptyToNull(parsedBanner.data.bannerLgVideoUrl),
        bannerXlUrl: emptyToNull(parsedBanner.data.bannerXlUrl),
        bannerXlVideoUrl: emptyToNull(parsedBanner.data.bannerXlVideoUrl),
        bannerVideoUseForSmaller: parsedBanner.data.bannerVideoUseForSmaller,
        media: parsedMedia.media as unknown as Prisma.InputJsonValue,
      },
    });

    revalidateDigitalPages();
    return { success: true, data: { id: item.id, slug: item.slug } };
  } catch {
    return { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to create the item." } };
  }
}

export async function updateDigitalItem(id: string, formData: FormData): Promise<ActionResult<IDigitalMutationResult>> {
  if (!id) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Missing item id." } };
  }

  const existing = await prisma.digitalItem.findUnique({ where: { id } });
  if (!existing) {
    return { success: false, error: { code: "NOT_FOUND", message: "Item not found." } };
  }

  const parsedFields = digitalFieldsSchema.safeParse({
    name: formData.get("name"),
    status: formData.get("status"),
    qrImageUrl: formData.get("qrImageUrl") ?? undefined,
  });
  if (!parsedFields.success) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: parsedFields.error.issues[0]?.message ?? "Invalid input" } };
  }

  if (parsedFields.data.status === "public" && !parsedFields.data.qrImageUrl) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "A QR image is required to publish." } };
  }

  const parsedBanner = parseBannerFields(formData);
  if (!parsedBanner.success) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: parsedBanner.message } };
  }
  if (parsedFields.data.status === "public" && !parsedBanner.data.bannerXlUrl) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "A background image (1920x1080) is required to publish." } };
  }

  const parsedMedia = parseMediaField(formData, parsedFields.data.status);
  if (!parsedMedia.valid) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: parsedMedia.message } };
  }

  try {
    const slug =
      parsedFields.data.name === existing.name ? existing.slug : await generateUniqueDigitalSlug(parsedFields.data.name, id);

    await prisma.digitalItem.update({
      where: { id },
      data: {
        name: parsedFields.data.name,
        slug,
        status: parsedFields.data.status,
        qrImageUrl: parsedFields.data.qrImageUrl ?? "",
        bannerSmUrl: emptyToNull(parsedBanner.data.bannerSmUrl),
        bannerSmVideoUrl: emptyToNull(parsedBanner.data.bannerSmVideoUrl),
        bannerMdUrl: emptyToNull(parsedBanner.data.bannerMdUrl),
        bannerMdVideoUrl: emptyToNull(parsedBanner.data.bannerMdVideoUrl),
        bannerLgUrl: emptyToNull(parsedBanner.data.bannerLgUrl),
        bannerLgVideoUrl: emptyToNull(parsedBanner.data.bannerLgVideoUrl),
        bannerXlUrl: emptyToNull(parsedBanner.data.bannerXlUrl),
        bannerXlVideoUrl: emptyToNull(parsedBanner.data.bannerXlVideoUrl),
        bannerVideoUseForSmaller: parsedBanner.data.bannerVideoUseForSmaller,
        media: parsedMedia.media as unknown as Prisma.InputJsonValue,
      },
    });

    revalidateDigitalPages();
    return { success: true, data: { id, slug } };
  } catch {
    return { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to update the item." } };
  }
}

export async function deleteDigitalItem(id: string): Promise<ActionResult<null>> {
  if (!id) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Missing item id." } };
  }

  try {
    await prisma.digitalItem.delete({ where: { id } });
    revalidateDigitalPages();
    return { success: true, data: null };
  } catch {
    return { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to delete the item." } };
  }
}

export async function updateDigitalItemStatus(id: string, status: "hidden" | "public"): Promise<ActionResult<null>> {
  const parsedStatus = statusSchema.safeParse(status);
  if (!parsedStatus.success) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid status." } };
  }

  const existing = await prisma.digitalItem.findUnique({ where: { id } });
  if (!existing) {
    return { success: false, error: { code: "NOT_FOUND", message: "Item not found." } };
  }
  if (parsedStatus.data === "public" && (!existing.qrImageUrl || !existing.bannerXlUrl)) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: "A QR image and background image are required to publish." },
    };
  }
  if (parsedStatus.data === "public" && !isDigitalMediaComplete(existing.media as unknown as IDigitalMediaBlock[])) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "At least one complete media type is required to publish." } };
  }

  try {
    await prisma.digitalItem.update({ where: { id }, data: { status: parsedStatus.data } });
    revalidateDigitalPages();
    return { success: true, data: null };
  } catch {
    return { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to update status." } };
  }
}

const reorderSchema = z.object({ ids: z.array(z.string().min(1)).min(1) });

export async function reorderDigitalItems(ids: string[]): Promise<ActionResult<null>> {
  const parsed = reorderSchema.safeParse({ ids });
  if (!parsed.success) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid order payload." } };
  }

  try {
    await prisma.$transaction(
      parsed.data.ids.map((id, index) => prisma.digitalItem.update({ where: { id }, data: { order: index } }))
    );
    revalidateDigitalPages();
    return { success: true, data: null };
  } catch {
    return { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to save the new order." } };
  }
}

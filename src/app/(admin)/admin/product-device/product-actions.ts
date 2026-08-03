"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { deleteUpload, saveUpload } from "@/lib/uploads";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_PRODUCT_NAME_LENGTH,
  MAX_PRODUCT_TAGLINE_LENGTH,
  MAX_THUMBNAIL_LABEL,
  MAX_THUMBNAIL_SIZE,
} from "./limits";
import { getSegmentTypeDef } from "./segment-types";
import { CARD_BACKGROUND_VALUES } from "@/lib/card-backgrounds";

const UPLOAD_FEATURE = "products";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

const productTypeSchema = z.enum(["device", "product"]);
const statusSchema = z.enum(["hidden", "public"]);

function revalidateProductPages(type: "device" | "product") {
  const base = type === "device" ? "/admin/product-device/devices" : "/admin/product-device/products";
  revalidatePath(`${base}/items`);
  // The homepage carousel's "Custom" item picker (product-picker-field.tsx)
  // reads every published product server-side on each visit — without this,
  // a product created/edited/hidden here wouldn't show up (or wouldn't drop
  // out) there until something else happened to revalidate that route.
  revalidatePath("/admin/homepage/content");
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

// Slug uniqueness is scoped to `type` only (products don't nest, unlike
// categories), enforced here rather than a DB constraint, same precedent as
// Article.slug's uniqueness-with-retry loop.
async function generateUniqueProductSlug(
  name: string,
  type: "device" | "product",
  excludeId?: string
): Promise<string> {
  const base = slugify(name) || "item";

  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const existing = await prisma.product.findFirst({
      where: { type, slug: candidate, id: excludeId ? { not: excludeId } : undefined },
      select: { id: true },
    });
    if (!existing) return candidate;
  }
  throw new Error("Could not generate a unique slug");
}

const productFieldsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(MAX_PRODUCT_NAME_LENGTH, `Name must be ${MAX_PRODUCT_NAME_LENGTH} characters or fewer`),
  tagline: z
    .string()
    .trim()
    .max(MAX_PRODUCT_TAGLINE_LENGTH, `Tagline must be ${MAX_PRODUCT_TAGLINE_LENGTH} characters or fewer`)
    .optional(),
  categoryId: z.string().min(1, "Category is required"),
  status: statusSchema,
  // Optional so a form that never touched the picker still saves; the card
  // falls back to the default tint when it's null.
  cardBackground: z.enum(CARD_BACKGROUND_VALUES).optional(),
});

const thumbnailSchema = z
  .instanceof(File)
  .refine((file) => file.size <= MAX_THUMBNAIL_SIZE, `Thumbnail must be smaller than ${MAX_THUMBNAIL_LABEL}`)
  .refine((file) => ACCEPTED_IMAGE_TYPES.includes(file.type), "Thumbnail must be a JPEG, PNG, WEBP, or GIF");

// Segment shapes are data-driven (see segment-types.ts), not one Zod schema
// per type — this walks each segment against its type's field definitions,
// checking only that required fields are present and non-empty. Full value
// validation (e.g. "is this really a URL") is left to the browser's `url`
// input type; the goal here is to reject a segment saved with missing
// required content, not to fully re-validate every field server-side.
// A hidden product is a work in progress — same precedent as the article
// form's own draft rule — so required-field completeness is only enforced
// when making it public; a hidden product only needs each segment to have a
// known, well-formed shape (a real type, an id). Without this, a brand-new
// product could never be saved as hidden at all: every product always
// carries an auto-injected hero segment (see `withHeroSegment`,
// product-form.tsx) whose background image starts empty, which would
// otherwise fail this check before the admin has even reached the Page
// Segments tab.
function validateSegments(
  raw: unknown,
  status: "hidden" | "public"
): { valid: true; segments: unknown[] } | { valid: false; message: string } {
  if (!Array.isArray(raw)) return { valid: false, message: "Segments must be a list." };

  for (const segment of raw) {
    if (typeof segment !== "object" || segment === null) {
      return { valid: false, message: "Invalid segment." };
    }
    const { type, id } = segment as { type?: unknown; id?: unknown };
    if (typeof type !== "string" || typeof id !== "string") {
      return { valid: false, message: "Invalid segment." };
    }
    const def = getSegmentTypeDef(type);
    if (!def) return { valid: false, message: `Unknown segment type "${type}".` };

    if (status !== "public") continue;

    for (const field of def.fields) {
      if (!field.required) continue;
      const value = (segment as Record<string, unknown>)[field.key];
      if (field.type === "list") continue; // lists have no "required" concept themselves
      if (value === undefined || value === null || value === "") {
        return { valid: false, message: `"${field.label}" is required in a ${def.label} segment.` };
      }
    }
  }

  return { valid: true, segments: raw };
}

// The hero's `imgAlt` has no form field of its own — it always mirrors the
// hero's own `title`, enforced here rather than trusted from the client, so
// it stays correct even if the title changed after the hero was first
// created (before the "no dedicated field" rule existed, or via a future
// non-UI edit path). Before & After items follow the same rule for
// `beforeAlt`/`afterAlt`, mirroring each item's own caption (see ADR-030), and
// the "document" segment's `alt` mirrors its own `header` (see ADR-032,
// ADR-056).
function normalizeSegments(segments: unknown[]): unknown[] {
  return segments.map((segment) => {
    if (typeof segment !== "object" || segment === null) return segment;
    let record = segment as Record<string, unknown>;
    // A segment can't appear in the nav under a blank name — the client
    // disables the switch for this same reason (segments-builder.tsx), this
    // just re-asserts it server-side rather than trusting the client state.
    if (typeof record.name !== "string" || record.name.trim() === "") {
      record = { ...record, showInNav: false };
    }
    if (record.type === "hero") {
      return { ...record, imgAlt: typeof record.title === "string" ? record.title : "" };
    }
    if (record.type === "beforeAfter" && Array.isArray(record.items)) {
      return {
        ...record,
        items: record.items.map((item) => {
          if (typeof item !== "object" || item === null) return item;
          const itemRecord = item as Record<string, unknown>;
          const caption = typeof itemRecord.title === "string" ? itemRecord.title : "";
          return { ...itemRecord, beforeAlt: caption, afterAlt: caption };
        }),
      };
    }
    if (record.type === "document") {
      return { ...record, alt: typeof record.header === "string" ? record.header : "" };
    }
    return record;
  });
}

function parseSegmentsField(
  formData: FormData,
  status: "hidden" | "public"
): ReturnType<typeof validateSegments> {
  const raw = formData.get("segments");
  if (typeof raw !== "string") return { valid: false, message: "Missing segments payload." };
  try {
    const parsed = JSON.parse(raw);
    const result = validateSegments(parsed, status);
    return result.valid ? { valid: true, segments: normalizeSegments(result.segments) } : result;
  } catch {
    return { valid: false, message: "Invalid segments payload." };
  }
}

// Re-checked against the DB rather than trusted from the client: the tag
// picker only ever offers this item's own `type`, but this is the actual
// enforcement of "a device tag can never end up on a product" (ADR-041) — a
// device tag id sent for a product save (however that happened) is silently
// dropped rather than erroring the whole submission, same lax precedent as
// list-item fields elsewhere in this file.
async function resolveTagIds(formData: FormData, type: "device" | "product"): Promise<string[]> {
  const raw = formData.get("tagIds");
  if (typeof raw !== "string") return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0 || !parsed.every((id) => typeof id === "string")) return [];

    const validTags = await prisma.tag.findMany({ where: { id: { in: parsed }, type }, select: { id: true } });
    return validTags.map((tag) => tag.id);
  } catch {
    return [];
  }
}

// Re-checked against the DB rather than trusted from the client, same
// precedent as `resolveTagIds` above. `primaryCategoryId` is excluded even if
// the client somehow sent it — a category can't be both this product's
// routing category and a secondary cross-listing at once (ADR-085).
async function resolveSecondaryCategoryIds(
  formData: FormData,
  type: "device" | "product",
  primaryCategoryId: string
): Promise<string[]> {
  const raw = formData.get("secondaryCategoryIds");
  if (typeof raw !== "string") return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.every((id) => typeof id === "string")) return [];

    const ids = parsed.filter((id) => id !== primaryCategoryId);
    if (ids.length === 0) return [];

    const validCategories = await prisma.category.findMany({ where: { id: { in: ids }, type }, select: { id: true } });
    return validCategories.map((category) => category.id);
  } catch {
    return [];
  }
}

export async function createProduct(
  formData: FormData
): Promise<ActionResult<{ id: string; slug: string }>> {
  const parsedType = productTypeSchema.safeParse(formData.get("type"));
  if (!parsedType.success) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid item type." } };
  }

  const parsedFields = productFieldsSchema.safeParse({
    name: formData.get("name"),
    tagline: formData.get("tagline") || undefined,
    categoryId: formData.get("categoryId"),
    status: formData.get("status"),
    cardBackground: formData.get("cardBackground") || undefined,
  });
  if (!parsedFields.success) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: parsedFields.error.issues[0]?.message ?? "Invalid input" },
    };
  }

  const category = await prisma.category.findUnique({ where: { id: parsedFields.data.categoryId } });
  if (!category || category.type !== parsedType.data) {
    return { success: false, error: { code: "NOT_FOUND", message: "Category not found." } };
  }

  const parsedSegments = parseSegmentsField(formData, parsedFields.data.status);
  if (!parsedSegments.valid) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: parsedSegments.message } };
  }

  const tagIds = await resolveTagIds(formData, parsedType.data);
  const secondaryCategoryIds = await resolveSecondaryCategoryIds(
    formData,
    parsedType.data,
    parsedFields.data.categoryId
  );

  const fileEntry = formData.get("thumbnail");
  const hasThumbnailFile = fileEntry instanceof File && fileEntry.size > 0;

  if (parsedFields.data.status === "public" && !hasThumbnailFile) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "A thumbnail is required to make this public." } };
  }

  let thumbnail: string | null = null;
  if (hasThumbnailFile) {
    const parsedThumbnail = thumbnailSchema.safeParse(fileEntry);
    if (!parsedThumbnail.success) {
      return {
        success: false,
        error: { code: "VALIDATION_ERROR", message: parsedThumbnail.error.issues[0]?.message ?? "Invalid thumbnail" },
      };
    }
    try {
      thumbnail = await saveUpload(parsedThumbnail.data, UPLOAD_FEATURE);
    } catch {
      return { success: false, error: { code: "UPLOAD_ERROR", message: "Failed to save the thumbnail." } };
    }
  }

  try {
    const slug = await generateUniqueProductSlug(parsedFields.data.name, parsedType.data);
    const siblingCount = await prisma.product.count({ where: { type: parsedType.data } });

    const product = await prisma.product.create({
      data: {
        type: parsedType.data,
        name: parsedFields.data.name,
        slug,
        tagline: parsedFields.data.tagline ?? null,
        cardBackground: parsedFields.data.cardBackground ?? null,
        categoryId: parsedFields.data.categoryId,
        status: parsedFields.data.status,
        thumbnail,
        segments: parsedSegments.segments as Prisma.InputJsonValue,
        order: siblingCount,
        tags: { connect: tagIds.map((id) => ({ id })) },
        secondaryCategories: { connect: secondaryCategoryIds.map((id) => ({ id })) },
      },
    });

    revalidateProductPages(parsedType.data);
    return { success: true, data: { id: product.id, slug: product.slug } };
  } catch {
    if (thumbnail) await deleteUpload(thumbnail, UPLOAD_FEATURE);
    return { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to create the item." } };
  }
}

export async function updateProduct(
  id: string,
  formData: FormData
): Promise<ActionResult<{ id: string; slug: string }>> {
  if (!id) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Missing item id." } };
  }

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) {
    return { success: false, error: { code: "NOT_FOUND", message: "Item not found." } };
  }
  const type = existing.type as "device" | "product";

  const parsedFields = productFieldsSchema.safeParse({
    name: formData.get("name"),
    tagline: formData.get("tagline") || undefined,
    categoryId: formData.get("categoryId"),
    status: formData.get("status"),
    cardBackground: formData.get("cardBackground") || undefined,
  });
  if (!parsedFields.success) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: parsedFields.error.issues[0]?.message ?? "Invalid input" },
    };
  }

  const category = await prisma.category.findUnique({ where: { id: parsedFields.data.categoryId } });
  if (!category || category.type !== type) {
    return { success: false, error: { code: "NOT_FOUND", message: "Category not found." } };
  }

  const parsedSegments = parseSegmentsField(formData, parsedFields.data.status);
  if (!parsedSegments.valid) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: parsedSegments.message } };
  }

  const tagIds = await resolveTagIds(formData, type);
  const secondaryCategoryIds = await resolveSecondaryCategoryIds(formData, type, parsedFields.data.categoryId);

  const fileEntry = formData.get("thumbnail");
  const hasNewThumbnailFile = fileEntry instanceof File && fileEntry.size > 0;
  const hasThumbnail = hasNewThumbnailFile || Boolean(existing.thumbnail);

  if (parsedFields.data.status === "public" && !hasThumbnail) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "A thumbnail is required to make this public." } };
  }

  let thumbnail = existing.thumbnail;
  let newThumbnail: string | null = null;
  if (hasNewThumbnailFile) {
    const parsedThumbnail = thumbnailSchema.safeParse(fileEntry);
    if (!parsedThumbnail.success) {
      return {
        success: false,
        error: { code: "VALIDATION_ERROR", message: parsedThumbnail.error.issues[0]?.message ?? "Invalid thumbnail" },
      };
    }
    try {
      newThumbnail = await saveUpload(parsedThumbnail.data, UPLOAD_FEATURE);
      thumbnail = newThumbnail;
    } catch {
      return { success: false, error: { code: "UPLOAD_ERROR", message: "Failed to save the thumbnail." } };
    }
  }

  try {
    const slug =
      parsedFields.data.name === existing.name
        ? existing.slug
        : await generateUniqueProductSlug(parsedFields.data.name, type, id);

    await prisma.product.update({
      where: { id },
      data: {
        name: parsedFields.data.name,
        slug,
        tagline: parsedFields.data.tagline ?? null,
        cardBackground: parsedFields.data.cardBackground ?? null,
        categoryId: parsedFields.data.categoryId,
        status: parsedFields.data.status,
        thumbnail,
        segments: parsedSegments.segments as Prisma.InputJsonValue,
        // `set` replaces the full relation with exactly this selection —
        // correct for both adding and removing tags, unlike `connect` (which
        // is create-only above since a brand-new product has none to remove).
        tags: { set: tagIds.map((id) => ({ id })) },
        secondaryCategories: { set: secondaryCategoryIds.map((id) => ({ id })) },
      },
    });

    if (newThumbnail && existing.thumbnail) await deleteUpload(existing.thumbnail, UPLOAD_FEATURE);

    revalidateProductPages(type);
    return { success: true, data: { id, slug } };
  } catch {
    if (newThumbnail) await deleteUpload(newThumbnail, UPLOAD_FEATURE);
    return { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to update the item." } };
  }
}

export async function deleteProduct(id: string): Promise<ActionResult<null>> {
  if (!id) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Missing item id." } };
  }

  try {
    const product = await prisma.product.delete({ where: { id } });
    if (product.thumbnail) await deleteUpload(product.thumbnail, UPLOAD_FEATURE);

    revalidateProductPages(product.type as "device" | "product");
    return { success: true, data: null };
  } catch {
    return { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to delete the item." } };
  }
}

export async function updateProductStatus(
  id: string,
  status: "hidden" | "public"
): Promise<ActionResult<null>> {
  const parsedStatus = statusSchema.safeParse(status);
  if (!parsedStatus.success) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid status." } };
  }

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) {
    return { success: false, error: { code: "NOT_FOUND", message: "Item not found." } };
  }
  if (parsedStatus.data === "public" && !existing.thumbnail) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "A thumbnail is required to make this public." } };
  }

  try {
    await prisma.product.update({ where: { id }, data: { status: parsedStatus.data } });
    revalidateProductPages(existing.type as "device" | "product");
    return { success: true, data: null };
  } catch {
    return { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to update status." } };
  }
}

const reorderSchema = z.object({
  type: productTypeSchema,
  ids: z.array(z.string().min(1)).min(1),
});

export async function reorderProducts(
  type: "device" | "product",
  ids: string[]
): Promise<ActionResult<null>> {
  const parsed = reorderSchema.safeParse({ type, ids });
  if (!parsed.success) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid order payload." } };
  }

  try {
    await prisma.$transaction(
      parsed.data.ids.map((id, index) => prisma.product.update({ where: { id }, data: { order: index } }))
    );
    revalidateProductPages(parsed.data.type);
    return { success: true, data: null };
  } catch {
    return { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to save the new order." } };
  }
}

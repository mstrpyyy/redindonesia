"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath, updateTag } from "next/cache";
import { saveUpload } from "@/lib/uploads";
import { z } from "zod";
import {
  ACCEPTED_CATEGORY_VIDEO_TYPES,
  ACCEPTED_IMAGE_TYPES,
  MAX_CATEGORY_BANNER_LABEL,
  MAX_CATEGORY_BANNER_SIZE,
  MAX_CATEGORY_BANNER_VIDEO_LABEL,
  MAX_CATEGORY_BANNER_VIDEO_SIZE,
  MAX_CATEGORY_DEPTH,
  MAX_CATEGORY_DESCRIPTION_LENGTH,
  MAX_CATEGORY_NAME_LENGTH,
  MAX_CATEGORY_TITLE_LENGTH,
  MAX_CATEGORY_YOUTUBE_CAPTION_LENGTH,
  MAX_CATEGORY_YOUTUBE_DESCRIPTION_LENGTH,
} from "./limits";
import { HERO_TEXT_COLOR_VALUES } from "@/lib/hero-text-colors";
import { findMissingBannerVideoFallback } from "@/lib/banner-video";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

const categoryTypeSchema = z.enum(["device", "product"]);

// Separate feature dirs, same reasoning as the article editor's thumbnail vs.
// content-image split: the banner is a form field (uploaded on submit-ready
// select, replaced as a whole), inline body images accumulate independently
// as the rich text is edited.
const CATEGORY_BANNER_UPLOAD_FEATURE = "categories";
const CATEGORY_CONTENT_IMAGE_UPLOAD_FEATURE = "categories-content";
const CATEGORY_VIDEO_THUMBNAIL_UPLOAD_FEATURE = "categories-video";

const categoryBannerSchema = z
  .instanceof(File)
  .refine((file) => file.size > 0, "Banner image is required")
  .refine(
    (file) => file.size <= MAX_CATEGORY_BANNER_SIZE,
    `Banner image must be smaller than ${MAX_CATEGORY_BANNER_LABEL}`
  )
  .refine((file) => ACCEPTED_IMAGE_TYPES.includes(file.type), "Banner image must be a JPEG, PNG, WEBP, or GIF");

// Uploaded immediately on file select, same as every other segment/content
// image field (ADR-021) — by the time the category form submits, both of
// these are already just URL strings.
export async function uploadCategoryBanner(formData: FormData): Promise<ActionResult<{ url: string }>> {
  const parsed = categoryBannerSchema.safeParse(formData.get("file"));
  if (!parsed.success) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid image" },
    };
  }

  try {
    const url = await saveUpload(parsed.data, CATEGORY_BANNER_UPLOAD_FEATURE);
    return { success: true, data: { url } };
  } catch {
    return { success: false, error: { code: "UPLOAD_ERROR", message: "Failed to upload the banner image." } };
  }
}

// Optional MP4 alongside each banner size — same pattern as the homepage
// hero banner's video (ADR-089), extended to categories (ADR-093).
const categoryBannerVideoSchema = z
  .instanceof(File)
  .refine((file) => file.size > 0, "Video is required")
  .refine(
    (file) => file.size <= MAX_CATEGORY_BANNER_VIDEO_SIZE,
    `Video must be smaller than ${MAX_CATEGORY_BANNER_VIDEO_LABEL}`
  )
  .refine((file) => ACCEPTED_CATEGORY_VIDEO_TYPES.includes(file.type), "Video must be an MP4");

export async function uploadCategoryBannerVideo(formData: FormData): Promise<ActionResult<{ url: string }>> {
  const parsed = categoryBannerVideoSchema.safeParse(formData.get("file"));
  if (!parsed.success) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid video" },
    };
  }

  try {
    const url = await saveUpload(parsed.data, CATEGORY_BANNER_UPLOAD_FEATURE);
    return { success: true, data: { url } };
  } catch {
    return { success: false, error: { code: "UPLOAD_ERROR", message: "Failed to upload the banner video." } };
  }
}

// Same size/type rules as the page banner (categoryBannerSchema above) — the
// poster is shown at the same aspect and doesn't warrant its own limit.
export async function uploadCategoryVideoThumbnail(formData: FormData): Promise<ActionResult<{ url: string }>> {
  const parsed = categoryBannerSchema.safeParse(formData.get("file"));
  if (!parsed.success) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid image" },
    };
  }

  try {
    const url = await saveUpload(parsed.data, CATEGORY_VIDEO_THUMBNAIL_UPLOAD_FEATURE);
    return { success: true, data: { url } };
  } catch {
    return { success: false, error: { code: "UPLOAD_ERROR", message: "Failed to upload the thumbnail image." } };
  }
}

const categoryContentImageSchema = z
  .instanceof(File)
  .refine((file) => file.size > 0, "Image is required")
  .refine(
    (file) => file.size <= MAX_CATEGORY_BANNER_SIZE,
    `Image must be smaller than ${MAX_CATEGORY_BANNER_LABEL}`
  )
  .refine((file) => ACCEPTED_IMAGE_TYPES.includes(file.type), "Image must be a JPEG, PNG, WEBP, or GIF");

// Called directly from the category body's rich text toolbar the moment an
// image is picked, same pattern as the article editor's `uploadContentImage`.
export async function uploadCategoryContentImage(formData: FormData): Promise<ActionResult<{ url: string }>> {
  const parsed = categoryContentImageSchema.safeParse(formData.get("image"));
  if (!parsed.success) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid image" },
    };
  }

  try {
    const url = await saveUpload(parsed.data, CATEGORY_CONTENT_IMAGE_UPLOAD_FEATURE);
    return { success: true, data: { url } };
  } catch {
    return { success: false, error: { code: "UPLOAD_ERROR", message: "Failed to upload the image." } };
  }
}

function revalidateCategoryPages(type: "device" | "product") {
  revalidatePath(`/admin/product-device/${type === "device" ? "devices" : "products"}`);
  // Immediately invalidates the public navbar's cached category tree
  // (`getPublicDeviceCategoryTree`/`getPublicProductCategoryTree`,
  // src/lib/categories.ts) instead of waiting out its hour-long fallback
  // window — see ADR-058. `updateTag` (not `revalidateTag`) because this
  // runs inside a Server Action, which is exactly what `updateTag` requires
  // and gets immediate read-your-own-writes semantics with no deprecation
  // warning and no cache-profile argument.
  updateTag(type === "device" ? "device-nav-categories" : "product-nav-categories");
  // A category's name/slug/deletion also feeds the public homepage's
  // "category" mode carousels (breadcrumb label, See More URL — ADR-066) and
  // the public devices/products catch-all, both statically cached by Next
  // with no revalidation of their own. Same fix as `revalidateProductPages`
  // in product-actions.ts.
  revalidatePath("/");
  revalidatePath(type === "device" ? "/devices/[...slug]" : "/products/[...slug]", "page");
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

// Slug uniqueness is scoped to (type, parentId) and enforced here rather than
// with a DB constraint — see the comment on the Category model for why a
// `@@unique([type, parentId, slug])` index can't catch depth-1 duplicates.
async function generateUniqueSiblingSlug(
  name: string,
  type: "device" | "product",
  parentId: string | null,
  excludeId?: string
): Promise<string> {
  const base = slugify(name) || "category";

  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const existing = await prisma.category.findFirst({
      where: { type, parentId, slug: candidate, id: excludeId ? { not: excludeId } : undefined },
      select: { id: true },
    });
    if (!existing) return candidate;
  }
  throw new Error("Could not generate a unique slug");
}

const categoryFieldsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(MAX_CATEGORY_NAME_LENGTH, `Name must be ${MAX_CATEGORY_NAME_LENGTH} characters or fewer`),
  // FormData booleans arrive as strings — defaults to "false" so a payload
  // that never touched the switch still parses instead of failing outright.
  isPage: z.preprocess((value) => value ?? "false", z.enum(["true", "false"])).transform((value) => value === "true"),
});

// A node is either a real page (bannerXlUrl/title/description required, the
// other three banner sizes/body/youtubeUrl optional) or stays a plain
// breadcrumb (all fields null) — see ADR-033. Four banner sizes rather than
// one — see ADR-035; only the largest (`bannerXlUrl`, 2560x1440) is required,
// the public side falls back to it for any size that wasn't uploaded. Only
// validated when `isPage` is true; a breadcrumb-only node's page fields are
// never read from the client.
// Same "true"/"false" string convention as HomePage's own cascade switch
// (homepage/content/actions.ts's `booleanFlagSchema`) — missing/anything else
// defaults to false.
const booleanFlagSchema = z
  .preprocess((value) => value ?? "false", z.enum(["true", "false"]))
  .transform((value) => value === "true");

const categoryPageContentSchema = z.object({
  bannerSmUrl: z.string().trim().optional(),
  bannerSmVideoUrl: z.string().trim().optional(),
  bannerMdUrl: z.string().trim().optional(),
  bannerMdVideoUrl: z.string().trim().optional(),
  bannerLgUrl: z.string().trim().optional(),
  bannerLgVideoUrl: z.string().trim().optional(),
  bannerXlUrl: z.string().trim().min(1, "Banner (2560x1440) image is required"),
  bannerXlVideoUrl: z.string().trim().optional(),
  // One global switch, not per-size — mirrors HomePage's own ADR-091.
  bannerVideoUseForSmaller: booleanFlagSchema,
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(MAX_CATEGORY_TITLE_LENGTH, `Title must be ${MAX_CATEGORY_TITLE_LENGTH} characters or fewer`),
  description: z
    .string()
    .trim()
    .min(1, "Description is required")
    .max(MAX_CATEGORY_DESCRIPTION_LENGTH, `Description must be ${MAX_CATEGORY_DESCRIPTION_LENGTH} characters or fewer`),
  body: z.string().trim().optional(),
  // Optional so a form that never touched the picker still saves; the hero
  // falls back to the same peach it was hardcoded to before this existed
  // (ADR-045) when null.
  heroTextColor: z.enum(HERO_TEXT_COLOR_VALUES).optional(),
  youtubeUrl: z.string().trim().optional(),
  // All optional regardless of `isPage`/`youtubeUrl` — a page can have a
  // plain YouTube URL with none of this extra dressing.
  youtubeThumbnailUrl: z.string().trim().optional(),
  youtubeCaption: z
    .string()
    .trim()
    .max(MAX_CATEGORY_YOUTUBE_CAPTION_LENGTH, `Caption must be ${MAX_CATEGORY_YOUTUBE_CAPTION_LENGTH} characters or fewer`)
    .optional(),
  youtubeDescription: z
    .string()
    .trim()
    .max(
      MAX_CATEGORY_YOUTUBE_DESCRIPTION_LENGTH,
      `Description must be ${MAX_CATEGORY_YOUTUBE_DESCRIPTION_LENGTH} characters or fewer`
    )
    .optional(),
});

interface ICategoryPageContent {
  bannerSmUrl: string | null;
  bannerSmVideoUrl: string | null;
  bannerMdUrl: string | null;
  bannerMdVideoUrl: string | null;
  bannerLgUrl: string | null;
  bannerLgVideoUrl: string | null;
  bannerXlUrl: string | null;
  bannerXlVideoUrl: string | null;
  bannerVideoUseForSmaller: boolean;
  title: string | null;
  description: string | null;
  body: string | null;
  heroTextColor: string | null;
  youtubeUrl: string | null;
  youtubeThumbnailUrl: string | null;
  youtubeCaption: string | null;
  youtubeDescription: string | null;
}

// `undefined`/empty → `null` for an optional field, consistent across all of
// them (banner sizes, body, youtubeUrl).
function emptyToNull(value: string | undefined): string | null {
  return value && value.length > 0 ? value : null;
}

function parseCategoryPageContent(
  isPage: boolean,
  formData: FormData
): { success: true; data: ICategoryPageContent } | { success: false; message: string } {
  if (!isPage) {
    return {
      success: true,
      data: {
        bannerSmUrl: null,
        bannerSmVideoUrl: null,
        bannerMdUrl: null,
        bannerMdVideoUrl: null,
        bannerLgUrl: null,
        bannerLgVideoUrl: null,
        bannerXlUrl: null,
        bannerXlVideoUrl: null,
        bannerVideoUseForSmaller: false,
        title: null,
        description: null,
        body: null,
        heroTextColor: null,
        youtubeUrl: null,
        youtubeThumbnailUrl: null,
        youtubeCaption: null,
        youtubeDescription: null,
      },
    };
  }

  // `FormData.get` returns `null` for a key that was never set (the client
  // only sets the optional fields when they're non-empty) — Zod's
  // `.optional()` accepts `undefined`, not `null`, so a missing optional
  // field has to be normalized here or it fails validation as "expected
  // string, received null".
  const parsed = categoryPageContentSchema.safeParse({
    bannerSmUrl: formData.get("bannerSmUrl") ?? undefined,
    bannerSmVideoUrl: formData.get("bannerSmVideoUrl") ?? undefined,
    bannerMdUrl: formData.get("bannerMdUrl") ?? undefined,
    bannerMdVideoUrl: formData.get("bannerMdVideoUrl") ?? undefined,
    bannerLgUrl: formData.get("bannerLgUrl") ?? undefined,
    bannerLgVideoUrl: formData.get("bannerLgVideoUrl") ?? undefined,
    bannerXlUrl: formData.get("bannerXlUrl"),
    bannerXlVideoUrl: formData.get("bannerXlVideoUrl") ?? undefined,
    bannerVideoUseForSmaller: formData.get("bannerVideoUseForSmaller"),
    title: formData.get("title"),
    description: formData.get("description"),
    body: formData.get("body") ?? undefined,
    heroTextColor: formData.get("heroTextColor") ?? undefined,
    youtubeUrl: formData.get("youtubeUrl") ?? undefined,
    youtubeThumbnailUrl: formData.get("youtubeThumbnailUrl") ?? undefined,
    youtubeCaption: formData.get("youtubeCaption") ?? undefined,
    youtubeDescription: formData.get("youtubeDescription") ?? undefined,
  });

  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Invalid page content" };
  }

  // A size's video is only ever shown alongside its own still image (the
  // image becomes the required poster/fallback) — see ADR-089/093. Checked
  // here, not just client-side, since create/updateCategory are the only
  // write paths.
  const fallbackError = findMissingBannerVideoFallback([
    { label: "2560x1440", imageUrl: parsed.data.bannerXlUrl, videoUrl: parsed.data.bannerXlVideoUrl ?? "" },
    { label: "2048x1536", imageUrl: parsed.data.bannerLgUrl ?? "", videoUrl: parsed.data.bannerLgVideoUrl ?? "" },
    { label: "1536x2048", imageUrl: parsed.data.bannerMdUrl ?? "", videoUrl: parsed.data.bannerMdVideoUrl ?? "" },
    { label: "1440x2560", imageUrl: parsed.data.bannerSmUrl ?? "", videoUrl: parsed.data.bannerSmVideoUrl ?? "" },
  ]);
  if (fallbackError) {
    return { success: false, message: fallbackError };
  }

  // The flag is only meaningful once at least one size has a video — force it
  // back off server-side so a stale "true" can't linger with nothing to
  // cascade (mirrors saveHomePage's own guard).
  const bannerVideoUseForSmaller =
    Boolean(
      parsed.data.bannerXlVideoUrl ||
        parsed.data.bannerLgVideoUrl ||
        parsed.data.bannerMdVideoUrl ||
        parsed.data.bannerSmVideoUrl
    ) && parsed.data.bannerVideoUseForSmaller;

  return {
    success: true,
    data: {
      bannerSmUrl: emptyToNull(parsed.data.bannerSmUrl),
      bannerSmVideoUrl: emptyToNull(parsed.data.bannerSmVideoUrl),
      bannerMdUrl: emptyToNull(parsed.data.bannerMdUrl),
      bannerMdVideoUrl: emptyToNull(parsed.data.bannerMdVideoUrl),
      bannerLgUrl: emptyToNull(parsed.data.bannerLgUrl),
      bannerLgVideoUrl: emptyToNull(parsed.data.bannerLgVideoUrl),
      bannerXlUrl: parsed.data.bannerXlUrl,
      bannerXlVideoUrl: emptyToNull(parsed.data.bannerXlVideoUrl),
      bannerVideoUseForSmaller,
      title: parsed.data.title,
      description: parsed.data.description,
      body: emptyToNull(parsed.data.body),
      heroTextColor: parsed.data.heroTextColor ?? null,
      youtubeUrl: emptyToNull(parsed.data.youtubeUrl),
      youtubeThumbnailUrl: emptyToNull(parsed.data.youtubeThumbnailUrl),
      youtubeCaption: emptyToNull(parsed.data.youtubeCaption),
      youtubeDescription: emptyToNull(parsed.data.youtubeDescription),
    },
  };
}

type ICategoryMutationResult = { id: string; slug: string } & ICategoryPageContent & { isPage: boolean };

export async function createCategory(
  formData: FormData
): Promise<ActionResult<ICategoryMutationResult>> {
  const parsedType = categoryTypeSchema.safeParse(formData.get("type"));
  if (!parsedType.success) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid category type." } };
  }

  const parsedFields = categoryFieldsSchema.safeParse({ name: formData.get("name"), isPage: formData.get("isPage") });
  if (!parsedFields.success) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: parsedFields.error.issues[0]?.message ?? "Invalid input" },
    };
  }

  const pageContent = parseCategoryPageContent(parsedFields.data.isPage, formData);
  if (!pageContent.success) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: pageContent.message } };
  }

  const parentIdRaw = formData.get("parentId");
  const parentId = typeof parentIdRaw === "string" && parentIdRaw.length > 0 ? parentIdRaw : null;

  let depth = 1;
  if (parentId) {
    const parent = await prisma.category.findUnique({ where: { id: parentId } });
    if (!parent || parent.type !== parsedType.data) {
      return { success: false, error: { code: "NOT_FOUND", message: "Parent category not found." } };
    }
    if (parent.depth >= MAX_CATEGORY_DEPTH) {
      return {
        success: false,
        error: { code: "VALIDATION_ERROR", message: `Categories can be nested at most ${MAX_CATEGORY_DEPTH} levels deep.` },
      };
    }
    depth = parent.depth + 1;
  }

  try {
    const slug = await generateUniqueSiblingSlug(parsedFields.data.name, parsedType.data, parentId);
    const siblingCount = await prisma.category.count({ where: { type: parsedType.data, parentId } });

    const category = await prisma.category.create({
      data: {
        type: parsedType.data,
        name: parsedFields.data.name,
        slug,
        depth,
        order: siblingCount,
        parentId,
        isPage: parsedFields.data.isPage,
        ...pageContent.data,
      },
    });

    revalidateCategoryPages(parsedType.data);
    return {
      success: true,
      data: { id: category.id, slug: category.slug, isPage: category.isPage, ...pageContent.data },
    };
  } catch {
    return { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to create category." } };
  }
}

export async function updateCategory(
  id: string,
  formData: FormData
): Promise<ActionResult<ICategoryMutationResult>> {
  if (!id) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Missing category id." } };
  }

  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) {
    return { success: false, error: { code: "NOT_FOUND", message: "Category not found." } };
  }

  const parsedFields = categoryFieldsSchema.safeParse({ name: formData.get("name"), isPage: formData.get("isPage") });
  if (!parsedFields.success) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: parsedFields.error.issues[0]?.message ?? "Invalid input" },
    };
  }

  const pageContent = parseCategoryPageContent(parsedFields.data.isPage, formData);
  if (!pageContent.success) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: pageContent.message } };
  }

  try {
    const slug =
      parsedFields.data.name === existing.name
        ? existing.slug
        : await generateUniqueSiblingSlug(
            parsedFields.data.name,
            existing.type as "device" | "product",
            existing.parentId,
            id
          );

    await prisma.category.update({
      where: { id },
      data: { name: parsedFields.data.name, slug, isPage: parsedFields.data.isPage, ...pageContent.data },
    });

    revalidateCategoryPages(existing.type as "device" | "product");
    return {
      success: true,
      data: { id, slug, isPage: parsedFields.data.isPage, ...pageContent.data },
    };
  } catch {
    return { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to update category." } };
  }
}

export async function deleteCategory(id: string): Promise<ActionResult<null>> {
  if (!id) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Missing category id." } };
  }

  try {
    // `onDelete: Cascade` on the self-relation takes the whole subtree with it.
    const category = await prisma.category.delete({ where: { id } });
    revalidateCategoryPages(category.type as "device" | "product");
    return { success: true, data: null };
  } catch {
    return { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to delete category." } };
  }
}

const reorderSchema = z.object({
  type: categoryTypeSchema,
  parentId: z.string().nullable(),
  ids: z.array(z.string().min(1)).min(1),
});

export async function reorderCategories(
  type: "device" | "product",
  parentId: string | null,
  ids: string[]
): Promise<ActionResult<null>> {
  const parsed = reorderSchema.safeParse({ type, parentId, ids });
  if (!parsed.success) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid order payload." } };
  }

  try {
    await prisma.$transaction(
      parsed.data.ids.map((id, index) =>
        prisma.category.update({
          where: { id },
          data: { order: index },
        })
      )
    );

    revalidateCategoryPages(parsed.data.type);
    return { success: true, data: null };
  } catch {
    return { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to save the new order." } };
  }
}

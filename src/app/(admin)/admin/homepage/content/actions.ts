"use server";

import { prisma } from "@/lib/prisma";
import { saveUpload } from "@/lib/uploads";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  ACCEPTED_HOME_IMAGE_TYPES,
  MAX_CAROUSEL_ITEM_TITLE_LENGTH,
  MAX_CAROUSEL_ITEMS,
  MAX_CAROUSEL_SEE_MORE_URL_LENGTH,
  MAX_CAROUSEL_TITLE_LENGTH,
  MAX_HOME_BANNER_LABEL,
  MAX_HOME_BANNER_SIZE,
} from "./limits";
import { isHomePageSlug, type HomePageSlug } from "@/lib/home-page";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

const HOME_BANNER_UPLOAD_FEATURE = "home-page";

function revalidateHomeCarouselPages() {
  revalidatePath("/admin/homepage/content");
  revalidatePath("/");
}

const homeBannerImageSchema = z
  .instanceof(File)
  .refine((file) => file.size > 0, "Image is required")
  .refine((file) => file.size <= MAX_HOME_BANNER_SIZE, `Image must be smaller than ${MAX_HOME_BANNER_LABEL}`)
  .refine((file) => ACCEPTED_HOME_IMAGE_TYPES.includes(file.type), "Image must be a JPEG, PNG, or WEBP");

export async function uploadHomePageBanner(formData: FormData): Promise<ActionResult<{ url: string }>> {
  const parsed = homeBannerImageSchema.safeParse(formData.get("file"));
  if (!parsed.success) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid image" },
    };
  }

  try {
    const url = await saveUpload(parsed.data, HOME_BANNER_UPLOAD_FEATURE);
    return { success: true, data: { url } };
  } catch {
    return { success: false, error: { code: "UPLOAD_ERROR", message: "Failed to upload the banner image." } };
  }
}

const saveHomePageSchema = z.object({
  bannerSmUrl: z.string().trim().optional(),
  bannerMdUrl: z.string().trim().optional(),
  bannerLgUrl: z.string().trim().optional(),
  bannerXlUrl: z.string().trim().min(1, "Banner (2560x1440) image is required"),
});

export async function saveHomePage(
  slug: string,
  formData: FormData
): Promise<ActionResult<{ slug: HomePageSlug }>> {
  if (!isHomePageSlug(slug)) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Unknown homepage page." } };
  }

  const parsed = saveHomePageSchema.safeParse({
    bannerSmUrl: formData.get("bannerSmUrl") ?? undefined,
    bannerMdUrl: formData.get("bannerMdUrl") ?? undefined,
    bannerLgUrl: formData.get("bannerLgUrl") ?? undefined,
    bannerXlUrl: formData.get("bannerXlUrl"),
  });

  if (!parsed.success) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid input" },
    };
  }

  const { bannerSmUrl, bannerMdUrl, bannerLgUrl, bannerXlUrl } = parsed.data;

  try {
    await prisma.homePage.upsert({
      where: { slug },
      create: {
        slug,
        bannerSmUrl: bannerSmUrl || null,
        bannerMdUrl: bannerMdUrl || null,
        bannerLgUrl: bannerLgUrl || null,
        bannerXlUrl,
      },
      update: {
        bannerSmUrl: bannerSmUrl || null,
        bannerMdUrl: bannerMdUrl || null,
        bannerLgUrl: bannerLgUrl || null,
        bannerXlUrl,
      },
    });

    revalidateHomeCarouselPages();
    return { success: true, data: { slug } };
  } catch {
    return { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to save the page." } };
  }
}

const modeSchema = z.enum(["category", "custom"]);

const carouselItemSchema = z.object({
  id: z.string().min(1),
  title: z
    .string()
    .trim()
    .min(1, "Every item needs a title")
    .max(MAX_CAROUSEL_ITEM_TITLE_LENGTH, `Item title must be ${MAX_CAROUSEL_ITEM_TITLE_LENGTH} characters or fewer`),
  img: z.string().trim().min(1, "Every item needs an image"),
  href: z.string().trim().min(1, "Every item needs a link"),
  // Set when the item was picked from the catalogue (ADR-069) — not
  // re-validated against the `Product` table here, same "admin-authored
  // trust boundary" precedent as every other reference id in this project
  // (e.g. `document` segment's `documentId`).
  productId: z.string().min(1).nullable().optional(),
});

const baseFieldsSchema = z.object({
  size: z.enum(["sm", "md"]).default("md"),
  showSeeMore: z
    .preprocess((value) => value ?? "false", z.enum(["true", "false"]))
    .transform((value) => value === "true"),
  titleDisplayMode: z.enum(["text", "image"]).default("text"),
});

// "image" mode still requires a text title underneath (the carousel's own
// `title`, or the linked category's `name` in "category" mode) — both of
// those are already required independently of this field, so the only new
// check here is that an image was actually provided when this mode is on.
function parseTitleImage(
  titleDisplayMode: "text" | "image",
  formData: FormData
): { success: true; titleImage: string | null } | { success: false; message: string } {
  const raw = formData.get("titleImage");
  const titleImage = typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : null;

  if (titleDisplayMode === "image" && !titleImage) {
    return { success: false, message: "Upload a title image, or switch the title back to text." };
  }

  return { success: true, titleImage };
}

interface IParsedModeFields {
  categoryId: string | null;
  title: string | null;
  seeMoreUrl: string | null;
  items: z.infer<typeof carouselItemSchema>[];
}

// "category" mode only stores `categoryId` — title/product list/"See More"
// URL are all derived live at render time (see ADR-066), so nothing else
// from the form is persisted for it. "custom" mode stores everything the
// admin typed by hand.
function parseModeFields(
  mode: "category" | "custom",
  showSeeMore: boolean,
  formData: FormData
): { success: true; data: IParsedModeFields } | { success: false; message: string } {
  if (mode === "category") {
    const categoryId = formData.get("categoryId");
    if (typeof categoryId !== "string" || categoryId.length === 0) {
      return { success: false, message: "Select a category." };
    }
    return { success: true, data: { categoryId, title: null, seeMoreUrl: null, items: [] } };
  }

  const titleParsed = z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(MAX_CAROUSEL_TITLE_LENGTH, `Title must be ${MAX_CAROUSEL_TITLE_LENGTH} characters or fewer`)
    .safeParse(formData.get("title"));
  if (!titleParsed.success) {
    return { success: false, message: titleParsed.error.issues[0]?.message ?? "Invalid title" };
  }

  let itemsRaw: unknown;
  try {
    itemsRaw = JSON.parse(String(formData.get("items") ?? "[]"));
  } catch {
    return { success: false, message: "Invalid items payload." };
  }
  const itemsParsed = z
    .array(carouselItemSchema)
    .min(1, "Add at least one item")
    .max(MAX_CAROUSEL_ITEMS, `A carousel can have at most ${MAX_CAROUSEL_ITEMS} items`)
    .safeParse(itemsRaw);
  if (!itemsParsed.success) {
    return { success: false, message: itemsParsed.error.issues[0]?.message ?? "Invalid items" };
  }

  const seeMoreUrlRaw = formData.get("seeMoreUrl");
  const seeMoreUrl = typeof seeMoreUrlRaw === "string" ? seeMoreUrlRaw.trim() : "";
  if (seeMoreUrl.length > MAX_CAROUSEL_SEE_MORE_URL_LENGTH) {
    return {
      success: false,
      message: `See More URL must be ${MAX_CAROUSEL_SEE_MORE_URL_LENGTH} characters or fewer`,
    };
  }
  if (showSeeMore && seeMoreUrl.length === 0) {
    return { success: false, message: 'Provide a "See More" URL, or turn the button off.' };
  }

  return {
    success: true,
    data: { categoryId: null, title: titleParsed.data, seeMoreUrl: seeMoreUrl || null, items: itemsParsed.data },
  };
}

// "Lowest level of each branch" (ADR-066) — a category with no sub-categories
// of its own. Re-checked server-side even though the picker only ever lists
// leaves, in case the tree changed between page load and submit.
async function assertLeafCategory(categoryId: string): Promise<string | null> {
  const category = await prisma.category.findUnique({ where: { id: categoryId }, select: { id: true } });
  if (!category) return "That category no longer exists.";

  const childCount = await prisma.category.count({ where: { parentId: categoryId } });
  if (childCount > 0) return "Choose a category with no sub-categories (the lowest level of its branch).";

  return null;
}

export async function createHomeCarousel(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const parsedMode = modeSchema.safeParse(formData.get("mode"));
  if (!parsedMode.success) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid carousel mode." } };
  }

  const parsedBase = baseFieldsSchema.safeParse({
    size: formData.get("size") ?? undefined,
    showSeeMore: formData.get("showSeeMore"),
    titleDisplayMode: formData.get("titleDisplayMode") ?? undefined,
  });
  if (!parsedBase.success) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: parsedBase.error.issues[0]?.message ?? "Invalid input" },
    };
  }

  const modeFields = parseModeFields(parsedMode.data, parsedBase.data.showSeeMore, formData);
  if (!modeFields.success) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: modeFields.message } };
  }

  const titleImageFields = parseTitleImage(parsedBase.data.titleDisplayMode, formData);
  if (!titleImageFields.success) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: titleImageFields.message } };
  }

  if (parsedMode.data === "category" && modeFields.data.categoryId) {
    const leafError = await assertLeafCategory(modeFields.data.categoryId);
    if (leafError) return { success: false, error: { code: "VALIDATION_ERROR", message: leafError } };
  }

  try {
    const order = await prisma.homeCarousel.count();
    const carousel = await prisma.homeCarousel.create({
      data: {
        mode: parsedMode.data,
        order,
        size: parsedBase.data.size,
        showSeeMore: parsedBase.data.showSeeMore,
        categoryId: modeFields.data.categoryId,
        title: modeFields.data.title,
        seeMoreUrl: modeFields.data.seeMoreUrl,
        items: modeFields.data.items,
        titleDisplayMode: parsedBase.data.titleDisplayMode,
        titleImage: titleImageFields.titleImage,
      },
    });

    revalidateHomeCarouselPages();
    return { success: true, data: { id: carousel.id } };
  } catch {
    return { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to create the carousel." } };
  }
}

export async function updateHomeCarousel(id: string, formData: FormData): Promise<ActionResult<{ id: string }>> {
  if (!id) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Missing carousel id." } };
  }

  const existing = await prisma.homeCarousel.findUnique({ where: { id } });
  if (!existing) {
    return { success: false, error: { code: "NOT_FOUND", message: "Carousel not found." } };
  }

  const parsedMode = modeSchema.safeParse(formData.get("mode"));
  if (!parsedMode.success) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid carousel mode." } };
  }

  const parsedBase = baseFieldsSchema.safeParse({
    size: formData.get("size") ?? undefined,
    showSeeMore: formData.get("showSeeMore"),
    titleDisplayMode: formData.get("titleDisplayMode") ?? undefined,
  });
  if (!parsedBase.success) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: parsedBase.error.issues[0]?.message ?? "Invalid input" },
    };
  }

  const modeFields = parseModeFields(parsedMode.data, parsedBase.data.showSeeMore, formData);
  if (!modeFields.success) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: modeFields.message } };
  }

  const titleImageFields = parseTitleImage(parsedBase.data.titleDisplayMode, formData);
  if (!titleImageFields.success) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: titleImageFields.message } };
  }

  if (parsedMode.data === "category" && modeFields.data.categoryId) {
    const leafError = await assertLeafCategory(modeFields.data.categoryId);
    if (leafError) return { success: false, error: { code: "VALIDATION_ERROR", message: leafError } };
  }

  try {
    await prisma.homeCarousel.update({
      where: { id },
      data: {
        mode: parsedMode.data,
        size: parsedBase.data.size,
        showSeeMore: parsedBase.data.showSeeMore,
        categoryId: modeFields.data.categoryId,
        title: modeFields.data.title,
        seeMoreUrl: modeFields.data.seeMoreUrl,
        items: modeFields.data.items,
        titleDisplayMode: parsedBase.data.titleDisplayMode,
        titleImage: titleImageFields.titleImage,
      },
    });

    revalidateHomeCarouselPages();
    return { success: true, data: { id } };
  } catch {
    return { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to update the carousel." } };
  }
}

export async function deleteHomeCarousel(id: string): Promise<ActionResult<null>> {
  if (!id) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Missing carousel id." } };
  }

  try {
    await prisma.homeCarousel.delete({ where: { id } });
    revalidateHomeCarouselPages();
    return { success: true, data: null };
  } catch {
    return { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to delete the carousel." } };
  }
}

const reorderSchema = z.array(z.string().min(1)).min(1);

export async function reorderHomeCarousels(ids: string[]): Promise<ActionResult<null>> {
  const parsed = reorderSchema.safeParse(ids);
  if (!parsed.success) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid order payload." } };
  }

  try {
    await prisma.$transaction(
      parsed.data.map((id, index) => prisma.homeCarousel.update({ where: { id }, data: { order: index } }))
    );

    revalidateHomeCarouselPages();
    return { success: true, data: null };
  } catch {
    return { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to save the new order." } };
  }
}

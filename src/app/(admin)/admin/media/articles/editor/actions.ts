"use server";

import { prisma } from "@/lib/prisma";
import { deleteUpload, saveUpload } from "@/lib/uploads";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  ACCEPTED_IMAGE_TYPES,
  MAX_CONTENT_IMAGE_LABEL,
  MAX_CONTENT_IMAGE_SIZE,
  MAX_EXCERPT_LENGTH,
  MAX_THUMBNAIL_LABEL,
  MAX_THUMBNAIL_SIZE,
  MAX_TITLE_LENGTH,
} from "./limits";

const UPLOAD_FEATURE = "articles";
// Separate from the thumbnail's feature dir — content images are a different
// lifecycle (uploaded on insert, not on form submit; never deleted when the
// article is, since a slug/content edit could still reference them elsewhere).
const CONTENT_IMAGE_UPLOAD_FEATURE = "articles-content";

function revalidateArticlePages(slug?: string) {
  revalidatePath("/admin/media/articles");
  revalidatePath("/media/articles");
  // Static params are generated at build time (see [slug]/page.tsx); anything
  // published/edited/unpublished/deleted afterward needs this to actually
  // reflect on its own page instead of serving a stale prerender.
  if (slug) revalidatePath(`/media/articles/${slug}`);
}

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

const excerptSchema = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z
    .string()
    .trim()
    .max(MAX_EXCERPT_LENGTH, `Excerpt must be ${MAX_EXCERPT_LENGTH} characters or fewer`)
    .optional()
);

// A draft is a work in progress — only "at least one field filled" is
// enforced (checked separately, since that check also considers the
// thumbnail, which lives outside this schema). A published article needs
// title, content, and (checked separately) a thumbnail all present.
const articleFieldsSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("draft"),
    title: z.string().trim().max(MAX_TITLE_LENGTH, `Title must be ${MAX_TITLE_LENGTH} characters or fewer`),
    excerpt: excerptSchema,
    content: z.string().trim(),
  }),
  z.object({
    status: z.literal("published"),
    title: z
      .string()
      .trim()
      .min(1, "Title is required to publish")
      .max(MAX_TITLE_LENGTH, `Title must be ${MAX_TITLE_LENGTH} characters or fewer`),
    excerpt: excerptSchema,
    content: z.string().trim().min(1, "Article content is required to publish"),
  }),
]);

const thumbnailSchema = z
  .instanceof(File)
  .refine((file) => file.size > 0, "Thumbnail is required")
  .refine(
    (file) => file.size <= MAX_THUMBNAIL_SIZE,
    `Thumbnail must be smaller than ${MAX_THUMBNAIL_LABEL}`
  )
  .refine(
    (file) => ACCEPTED_IMAGE_TYPES.includes(file.type),
    "Thumbnail must be a JPEG, PNG, WEBP, or GIF"
  );

function saveThumbnail(file: File): Promise<string> {
  return saveUpload(file, UPLOAD_FEATURE);
}

function deleteThumbnail(coverImage: string): Promise<void> {
  return deleteUpload(coverImage, UPLOAD_FEATURE);
}

const contentImageSchema = z
  .instanceof(File)
  .refine((file) => file.size > 0, "Image is required")
  .refine(
    (file) => file.size <= MAX_CONTENT_IMAGE_SIZE,
    `Image must be smaller than ${MAX_CONTENT_IMAGE_LABEL}`
  )
  .refine(
    (file) => ACCEPTED_IMAGE_TYPES.includes(file.type),
    "Image must be a JPEG, PNG, WEBP, or GIF"
  );

// Called directly from the editor toolbar the moment an image is picked —
// the Tiptap doc needs a real URL to insert, so unlike the thumbnail this
// can't wait for form submit.
export async function uploadContentImage(
  formData: FormData
): Promise<ActionResult<{ url: string }>> {
  const parsedImage = contentImageSchema.safeParse(formData.get("image"));
  if (!parsedImage.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsedImage.error.issues[0]?.message ?? "Invalid image",
      },
    };
  }

  try {
    const url = await saveUpload(parsedImage.data, CONTENT_IMAGE_UPLOAD_FEATURE);
    return { success: true, data: { url } };
  } catch {
    return {
      success: false,
      error: { code: "UPLOAD_ERROR", message: "Failed to upload the image." },
    };
  }
}

const DIACRITIC_MARKS_PATTERN = new RegExp("[\\u0300-\\u036f]", "g");

function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(DIACRITIC_MARKS_PATTERN, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function generateUniqueSlug(title: string): Promise<string> {
  const base = slugify(title) || "article";

  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const existing = await prisma.article.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
  }

  return `${base}-${crypto.randomUUID().slice(0, 6)}`;
}

export async function createArticle(
  formData: FormData
): Promise<ActionResult<{ id: string; slug: string }>> {
  const parsedFields = articleFieldsSchema.safeParse({
    title: formData.get("title"),
    excerpt: formData.get("excerpt"),
    content: formData.get("content"),
    status: formData.get("status"),
  });

  if (!parsedFields.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsedFields.error.issues[0]?.message ?? "Invalid input",
      },
    };
  }

  const fileEntry = formData.get("thumbnail");
  const hasThumbnailFile = fileEntry instanceof File && fileEntry.size > 0;

  if (parsedFields.data.status === "draft") {
    const hasAnyField =
      parsedFields.data.title.length > 0 ||
      Boolean(parsedFields.data.excerpt) ||
      parsedFields.data.content.length > 0 ||
      hasThumbnailFile;
    if (!hasAnyField) {
      return {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Fill in at least one field to save a draft." },
      };
    }
  } else if (!hasThumbnailFile) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: "A thumbnail is required to publish." },
    };
  }

  let coverImage: string | null = null;
  if (hasThumbnailFile) {
    const parsedThumbnail = thumbnailSchema.safeParse(fileEntry);
    if (!parsedThumbnail.success) {
      return {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: parsedThumbnail.error.issues[0]?.message ?? "Invalid thumbnail",
        },
      };
    }

    try {
      coverImage = await saveThumbnail(parsedThumbnail.data);
    } catch {
      return {
        success: false,
        error: { code: "UPLOAD_ERROR", message: "Failed to save the thumbnail." },
      };
    }
  }

  const slug = await generateUniqueSlug(parsedFields.data.title);

  try {
    const article = await prisma.article.create({
      data: {
        title: parsedFields.data.title,
        slug,
        excerpt: parsedFields.data.excerpt ?? null,
        content: parsedFields.data.content,
        coverImage,
        status: parsedFields.data.status,
        publishedAt: parsedFields.data.status === "published" ? new Date() : null,
      },
    });

    revalidateArticlePages(article.slug);
    return { success: true, data: { id: article.id, slug: article.slug } };
  } catch {
    if (coverImage) await deleteThumbnail(coverImage);
    return {
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Failed to create the article." },
    };
  }
}

// First transition into "published" stamps `publishedAt`; re-publishing or
// unpublishing afterwards never touches it — it's kept as the historical
// first-published time, not a live "currently visible since" timestamp.
function computePublishedAt(
  currentPublishedAt: Date | null,
  status: "draft" | "published"
): Date | null {
  if (status === "published" && !currentPublishedAt) return new Date();
  return currentPublishedAt;
}

export async function updateArticle(
  id: string,
  formData: FormData
): Promise<ActionResult<{ id: string; slug: string }>> {
  if (!id) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Missing article id." },
    };
  }

  const existing = await prisma.article.findUnique({ where: { id } });
  if (!existing) {
    return {
      success: false,
      error: { code: "NOT_FOUND", message: "Article not found." },
    };
  }

  const parsedFields = articleFieldsSchema.safeParse({
    title: formData.get("title"),
    excerpt: formData.get("excerpt"),
    content: formData.get("content"),
    status: formData.get("status"),
  });

  if (!parsedFields.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsedFields.error.issues[0]?.message ?? "Invalid input",
      },
    };
  }

  // An untouched file input arrives as an empty File — treat it as "keep image".
  const fileEntry = formData.get("thumbnail");
  const hasThumbnailFile = fileEntry instanceof File && fileEntry.size > 0;

  if (parsedFields.data.status === "draft") {
    const hasAnyField =
      parsedFields.data.title.length > 0 ||
      Boolean(parsedFields.data.excerpt) ||
      parsedFields.data.content.length > 0 ||
      hasThumbnailFile ||
      Boolean(existing.coverImage);
    if (!hasAnyField) {
      return {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Fill in at least one field to save a draft." },
      };
    }
  } else if (!hasThumbnailFile && !existing.coverImage) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: "A thumbnail is required to publish." },
    };
  }

  let newCoverImage: string | undefined;

  if (hasThumbnailFile) {
    const parsedThumbnail = thumbnailSchema.safeParse(fileEntry);
    if (!parsedThumbnail.success) {
      return {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: parsedThumbnail.error.issues[0]?.message ?? "Invalid thumbnail",
        },
      };
    }

    try {
      newCoverImage = await saveThumbnail(parsedThumbnail.data);
    } catch {
      return {
        success: false,
        error: { code: "UPLOAD_ERROR", message: "Failed to save the thumbnail." },
      };
    }
  }

  try {
    // Slug is deliberately never regenerated from an edited title — changing a
    // published article's URL breaks existing links/SEO (see ADR-013).
    await prisma.article.update({
      where: { id },
      data: {
        title: parsedFields.data.title,
        excerpt: parsedFields.data.excerpt ?? null,
        content: parsedFields.data.content,
        status: parsedFields.data.status,
        publishedAt: computePublishedAt(existing.publishedAt, parsedFields.data.status),
        ...(newCoverImage && { coverImage: newCoverImage }),
      },
    });
  } catch {
    if (newCoverImage) await deleteThumbnail(newCoverImage);
    return {
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Failed to update the article." },
    };
  }

  // Only remove the old thumbnail once the DB points at the new one.
  if (newCoverImage && existing.coverImage && existing.coverImage !== newCoverImage) {
    await deleteThumbnail(existing.coverImage);
  }

  revalidateArticlePages(existing.slug);
  return { success: true, data: { id, slug: existing.slug } };
}

export async function deleteArticle(id: string): Promise<ActionResult<null>> {
  if (!id) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Missing article id." },
    };
  }

  try {
    const article = await prisma.article.delete({ where: { id } });
    if (article.coverImage) await deleteThumbnail(article.coverImage);

    revalidateArticlePages(article.slug);
    return { success: true, data: null };
  } catch {
    return {
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Failed to delete the article." },
    };
  }
}

const statusSchema = z.enum(["draft", "published"]);

export async function updateArticleStatus(
  id: string,
  status: "draft" | "published"
): Promise<ActionResult<null>> {
  const parsedStatus = statusSchema.safeParse(status);
  if (!id || !parsedStatus.success) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Invalid request." },
    };
  }

  const existing = await prisma.article.findUnique({
    where: { id },
    select: { slug: true, title: true, content: true, coverImage: true, publishedAt: true },
  });
  if (!existing) {
    return {
      success: false,
      error: { code: "NOT_FOUND", message: "Article not found." },
    };
  }

  // The list table's quick toggle bypasses the full form — still enforce the
  // same "complete before publishing" rule the form does, so an empty draft
  // can't be published via this shortcut.
  if (parsedStatus.data === "published") {
    if (!existing.title.trim() || !existing.content.trim()) {
      return {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Add a title and content before publishing." },
      };
    }
    if (!existing.coverImage) {
      return {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Add a thumbnail before publishing." },
      };
    }
  }

  try {
    await prisma.article.update({
      where: { id },
      data: {
        status: parsedStatus.data,
        publishedAt: computePublishedAt(existing.publishedAt, parsedStatus.data),
      },
    });

    revalidateArticlePages(existing.slug);
    return { success: true, data: null };
  } catch {
    return {
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Failed to update the article's status." },
    };
  }
}

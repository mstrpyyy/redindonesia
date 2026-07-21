"use server";

import { prisma } from "@/lib/prisma";
import { deleteUpload, saveUpload } from "@/lib/uploads";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  ACCEPTED_IMAGE_TYPES,
  MAX_GALLERY_IMAGES,
  MAX_GALLERY_IMG_LABEL,
  MAX_GALLERY_IMG_SIZE,
  NEW_IMAGE_TOKEN,
} from "./upload-limits";

const UPLOAD_FEATURE = "galleries";

// Galleries render on both the admin list and the public media page — both
// must be revalidated or the public page keeps its build-time snapshot.
function revalidateGalleryPages() {
  revalidatePath("/admin/media/galleries");
  revalidatePath("/media/galleries");
}

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

const galleryFieldsSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().trim().min(1, "Description is required"),
});

const newImageSchema = z
  .instanceof(File)
  .refine(
    (file) => file.size <= MAX_GALLERY_IMG_SIZE,
    `Each image must be smaller than ${MAX_GALLERY_IMG_LABEL}`
  )
  .refine(
    (file) => ACCEPTED_IMAGE_TYPES.includes(file.type),
    "Images must be JPEG, PNG, WEBP, or GIF"
  );

function saveGalleryImage(file: File): Promise<string> {
  return saveUpload(file, UPLOAD_FEATURE);
}

function deleteGalleryImage(image: string): Promise<void> {
  return deleteUpload(image, UPLOAD_FEATURE);
}

function getNewImageFiles(formData: FormData): File[] {
  return formData.getAll("images").filter((entry): entry is File => entry instanceof File && entry.size > 0);
}

export async function createGallery(
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const parsedFields = galleryFieldsSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
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

  const newFiles = getNewImageFiles(formData);
  if (newFiles.length === 0) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: "At least one image is required" },
    };
  }
  if (newFiles.length > MAX_GALLERY_IMAGES) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: `A gallery can have at most ${MAX_GALLERY_IMAGES} images`,
      },
    };
  }

  const parsedImages = z.array(newImageSchema).safeParse(newFiles);
  if (!parsedImages.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsedImages.error.issues[0]?.message ?? "Invalid image",
      },
    };
  }

  let images: string[];
  try {
    images = await Promise.all(parsedImages.data.map(saveGalleryImage));
  } catch {
    return {
      success: false,
      error: { code: "UPLOAD_ERROR", message: "Failed to save gallery images." },
    };
  }

  try {
    // Newest gallery takes the first slot; shift everything else down.
    const [, gallery] = await prisma.$transaction([
      prisma.gallery.updateMany({ data: { order: { increment: 1 } } }),
      prisma.gallery.create({
        data: {
          title: parsedFields.data.title,
          description: parsedFields.data.description,
          images,
          order: 0,
        },
      }),
    ]);

    revalidateGalleryPages();
    return { success: true, data: { id: gallery.id } };
  } catch {
    await Promise.all(images.map(deleteGalleryImage));
    return {
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Failed to create gallery." },
    };
  }
}

export async function updateGallery(
  id: string,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  if (!id) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Missing gallery id." },
    };
  }

  const existing = await prisma.gallery.findUnique({ where: { id } });
  if (!existing) {
    return {
      success: false,
      error: { code: "NOT_FOUND", message: "Gallery not found." },
    };
  }

  const parsedFields = galleryFieldsSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
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

  // `imageOrder` is the full final order — a mix of kept existing image paths and
  // `NEW_IMAGE_TOKEN` placeholders, one per new file, in the exact order the client
  // appended those files under "images". This is how the grid's free reordering
  // (existing and new images interleaved) survives the round trip.
  const imageOrderRaw = formData.get("imageOrder");
  if (typeof imageOrderRaw !== "string") {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Missing image order." },
    };
  }

  let imageOrder: string[];
  try {
    imageOrder = z.array(z.string()).parse(JSON.parse(imageOrderRaw));
  } catch {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Invalid image order payload." },
    };
  }

  if (imageOrder.length === 0) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: "At least one image is required" },
    };
  }
  if (imageOrder.length > MAX_GALLERY_IMAGES) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: `A gallery can have at most ${MAX_GALLERY_IMAGES} images`,
      },
    };
  }

  const keptImages = imageOrder.filter((token) => token !== NEW_IMAGE_TOKEN);
  const invalidReference = keptImages.find((image) => !existing.images.includes(image));
  if (invalidReference) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Invalid image reference." },
    };
  }
  const removedImages = existing.images.filter((image) => !keptImages.includes(image));

  const newFiles = getNewImageFiles(formData);
  const newTokenCount = imageOrder.filter((token) => token === NEW_IMAGE_TOKEN).length;
  if (newTokenCount !== newFiles.length) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Image order does not match uploaded files." },
    };
  }

  const parsedImages = z.array(newImageSchema).safeParse(newFiles);
  if (!parsedImages.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsedImages.error.issues[0]?.message ?? "Invalid image",
      },
    };
  }

  let newImages: string[];
  try {
    newImages = await Promise.all(parsedImages.data.map(saveGalleryImage));
  } catch {
    return {
      success: false,
      error: { code: "UPLOAD_ERROR", message: "Failed to save gallery images." },
    };
  }

  let newImageIndex = 0;
  const finalImages = imageOrder.map((token) =>
    token === NEW_IMAGE_TOKEN ? newImages[newImageIndex++] : token
  );

  try {
    await prisma.gallery.update({
      where: { id },
      data: {
        title: parsedFields.data.title,
        description: parsedFields.data.description,
        images: finalImages,
      },
    });
  } catch {
    await Promise.all(newImages.map(deleteGalleryImage));
    return {
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Failed to update gallery." },
    };
  }

  // Only remove dropped files once the DB points at the new image set.
  if (removedImages.length > 0) {
    await Promise.all(removedImages.map(deleteGalleryImage));
  }

  revalidateGalleryPages();
  return { success: true, data: { id } };
}

export async function deleteGallery(id: string): Promise<ActionResult<null>> {
  if (!id) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Missing gallery id." },
    };
  }

  try {
    const gallery = await prisma.gallery.delete({ where: { id } });
    await Promise.all(gallery.images.map(deleteGalleryImage));

    revalidateGalleryPages();
    return { success: true, data: null };
  } catch {
    return {
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Failed to delete gallery." },
    };
  }
}

const reorderSchema = z.array(z.string().min(1)).min(1);

export async function reorderGalleries(ids: string[]): Promise<ActionResult<null>> {
  const parsed = reorderSchema.safeParse(ids);
  if (!parsed.success) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Invalid order payload." },
    };
  }

  try {
    await prisma.$transaction(
      parsed.data.map((id, index) =>
        prisma.gallery.update({ where: { id }, data: { order: index } })
      )
    );

    revalidateGalleryPages();
    return { success: true, data: null };
  } catch {
    return {
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Failed to save the new order." },
    };
  }
}

"use server";

import { prisma } from "@/lib/prisma";
import { deleteUpload, saveUpload } from "@/lib/uploads";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  ACCEPTED_LOGO_TYPES,
  MAX_BRAND_NAME_LENGTH,
  MAX_LOGO_LABEL,
  MAX_LOGO_SIZE,
} from "./limits";

const UPLOAD_FEATURE = "brands";

// Brands render on the admin list, the homepage's "Meet Our Brands" marquee,
// and the About page's "Our Brands" grid — all three must be revalidated or
// the public pages keep their build-time/last-request snapshot.
function revalidateBrandPages() {
  revalidatePath("/admin/product-device/brands");
  revalidatePath("/");
  revalidatePath("/about");
}

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

const brandFieldsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(MAX_BRAND_NAME_LENGTH, `Name must be ${MAX_BRAND_NAME_LENGTH} characters or fewer`),
  // Optional — a brand can be listed with no link at all. An empty string
  // normalizes to `null`; anything else must still look like a real URL.
  url: z
    .string()
    .trim()
    .transform((value) => (value.length > 0 ? value : null))
    .refine(
      (value) => value === null || value.startsWith("/") || /^https?:\/\//.test(value),
      'URL must start with "/" for an internal page, or "http://"/"https://" for an external link'
    ),
});

const logoSchema = z
  .instanceof(File)
  .refine((file) => file.size > 0, "Logo is required")
  .refine((file) => file.size <= MAX_LOGO_SIZE, `Logo must be smaller than ${MAX_LOGO_LABEL}`)
  .refine((file) => ACCEPTED_LOGO_TYPES.includes(file.type), "Logo must be a JPEG, PNG, WEBP, or GIF");

function saveLogo(file: File): Promise<string> {
  return saveUpload(file, UPLOAD_FEATURE);
}

function deleteLogo(logo: string): Promise<void> {
  return deleteUpload(logo, UPLOAD_FEATURE);
}

export async function createBrand(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const parsedFields = brandFieldsSchema.safeParse({
    name: formData.get("name"),
    url: formData.get("url") ?? "",
  });

  if (!parsedFields.success) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: parsedFields.error.issues[0]?.message ?? "Invalid input" },
    };
  }

  const parsedLogo = logoSchema.safeParse(formData.get("logo"));
  if (!parsedLogo.success) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: parsedLogo.error.issues[0]?.message ?? "Invalid logo" },
    };
  }

  let logo: string;
  try {
    logo = await saveLogo(parsedLogo.data);
  } catch {
    return { success: false, error: { code: "UPLOAD_ERROR", message: "Failed to save the logo." } };
  }

  try {
    // Newest brand takes the first slot; shift everything else down.
    const [, brand] = await prisma.$transaction([
      prisma.brand.updateMany({ data: { order: { increment: 1 } } }),
      prisma.brand.create({ data: { ...parsedFields.data, logo, order: 0 } }),
    ]);

    revalidateBrandPages();
    return { success: true, data: { id: brand.id } };
  } catch {
    await deleteLogo(logo);
    return { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to create the brand." } };
  }
}

export async function updateBrand(id: string, formData: FormData): Promise<ActionResult<{ id: string }>> {
  if (!id) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Missing brand id." } };
  }

  const existing = await prisma.brand.findUnique({ where: { id } });
  if (!existing) {
    return { success: false, error: { code: "NOT_FOUND", message: "Brand not found." } };
  }

  const parsedFields = brandFieldsSchema.safeParse({
    name: formData.get("name"),
    url: formData.get("url") ?? "",
  });

  if (!parsedFields.success) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: parsedFields.error.issues[0]?.message ?? "Invalid input" },
    };
  }

  // An untouched file input arrives as an empty File — treat it as "keep logo".
  const fileEntry = formData.get("logo");
  let newLogo: string | undefined;

  if (fileEntry instanceof File && fileEntry.size > 0) {
    const parsedLogo = logoSchema.safeParse(fileEntry);
    if (!parsedLogo.success) {
      return {
        success: false,
        error: { code: "VALIDATION_ERROR", message: parsedLogo.error.issues[0]?.message ?? "Invalid logo" },
      };
    }

    try {
      newLogo = await saveLogo(parsedLogo.data);
    } catch {
      return { success: false, error: { code: "UPLOAD_ERROR", message: "Failed to save the logo." } };
    }
  }

  try {
    await prisma.brand.update({
      where: { id },
      data: {
        ...parsedFields.data,
        ...(newLogo && { logo: newLogo }),
      },
    });
  } catch {
    if (newLogo) await deleteLogo(newLogo);
    return { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to update the brand." } };
  }

  // Only remove the old file once the DB points at the new one.
  if (newLogo && existing.logo !== newLogo) {
    await deleteLogo(existing.logo);
  }

  revalidateBrandPages();
  return { success: true, data: { id } };
}

export async function deleteBrand(id: string): Promise<ActionResult<null>> {
  if (!id) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Missing brand id." } };
  }

  try {
    const brand = await prisma.brand.delete({ where: { id } });
    await deleteLogo(brand.logo);

    revalidateBrandPages();
    return { success: true, data: null };
  } catch {
    return { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to delete the brand." } };
  }
}

const reorderSchema = z.array(z.string().min(1)).min(1);

export async function reorderBrands(ids: string[]): Promise<ActionResult<null>> {
  const parsed = reorderSchema.safeParse(ids);
  if (!parsed.success) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid order payload." } };
  }

  try {
    await prisma.$transaction(
      parsed.data.map((id, index) => prisma.brand.update({ where: { id }, data: { order: index } }))
    );

    revalidateBrandPages();
    return { success: true, data: null };
  } catch {
    return { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to save the new order." } };
  }
}

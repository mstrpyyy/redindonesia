"use server";

import { prisma } from "@/lib/prisma";
import { deleteUpload, saveUpload } from "@/lib/uploads";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  ACCEPTED_IMAGE_TYPES,
  MAX_PROFILE_IMG_LABEL,
  MAX_PROFILE_IMG_SIZE,
} from "./upload-limits";

const UPLOAD_FEATURE = "social-accounts";

// Social accounts render on both the admin list and the public marcom page —
// both must be revalidated or the public page keeps its build-time snapshot.
function revalidateSocialAccountPages() {
  revalidatePath("/admin/support/marcom");
  revalidatePath("/support/marcom-promotion");
}

const socialAccountFieldsSchema = z.object({
  platform: z.string().trim().min(1, "Platform is required"),
  label: z.string().trim().min(1, "Label is required"),
  url: z.url("URL must be a valid URL"),
});

const profileImgSchema = z
  .instanceof(File)
  .refine((file) => file.size > 0, "Profile image is required")
  .refine(
    (file) => file.size <= MAX_PROFILE_IMG_SIZE,
    `Profile image must be smaller than ${MAX_PROFILE_IMG_LABEL}`
  )
  .refine(
    (file) => ACCEPTED_IMAGE_TYPES.includes(file.type),
    "Profile image must be a JPEG, PNG, WEBP, or GIF"
  );

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

function saveProfileImage(file: File): Promise<string> {
  return saveUpload(file, UPLOAD_FEATURE);
}

function deleteProfileImage(profileImg: string): Promise<void> {
  return deleteUpload(profileImg, UPLOAD_FEATURE);
}

export async function createSocialAccount(
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const parsedFields = socialAccountFieldsSchema.safeParse({
    platform: formData.get("platform"),
    label: formData.get("label"),
    url: formData.get("url"),
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

  const parsedImage = profileImgSchema.safeParse(formData.get("profileImg"));
  if (!parsedImage.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsedImage.error.issues[0]?.message ?? "Invalid profile image",
      },
    };
  }

  let profileImg: string;
  try {
    profileImg = await saveProfileImage(parsedImage.data);
  } catch {
    return {
      success: false,
      error: { code: "UPLOAD_ERROR", message: "Failed to save profile image." },
    };
  }

  try {
    // Newest account takes the first slot; shift everything else down.
    const [, account] = await prisma.$transaction([
      prisma.socialAccount.updateMany({ data: { order: { increment: 1 } } }),
      prisma.socialAccount.create({
        data: { ...parsedFields.data, profileImg, order: 0 },
      }),
    ]);

    revalidateSocialAccountPages();
    return { success: true, data: { id: account.id } };
  } catch {
    await deleteProfileImage(profileImg);
    return {
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Failed to create social account." },
    };
  }
}

export async function updateSocialAccount(
  id: string,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  if (!id) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Missing account id." },
    };
  }

  const existing = await prisma.socialAccount.findUnique({ where: { id } });
  if (!existing) {
    return {
      success: false,
      error: { code: "NOT_FOUND", message: "Social account not found." },
    };
  }

  const parsedFields = socialAccountFieldsSchema.safeParse({
    platform: formData.get("platform"),
    label: formData.get("label"),
    url: formData.get("url"),
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
  const fileEntry = formData.get("profileImg");
  let newProfileImg: string | undefined;

  if (fileEntry instanceof File && fileEntry.size > 0) {
    const parsedImage = profileImgSchema.safeParse(fileEntry);
    if (!parsedImage.success) {
      return {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: parsedImage.error.issues[0]?.message ?? "Invalid profile image",
        },
      };
    }

    try {
      newProfileImg = await saveProfileImage(parsedImage.data);
    } catch {
      return {
        success: false,
        error: { code: "UPLOAD_ERROR", message: "Failed to save profile image." },
      };
    }
  }

  try {
    await prisma.socialAccount.update({
      where: { id },
      data: {
        ...parsedFields.data,
        ...(newProfileImg && { profileImg: newProfileImg }),
      },
    });
  } catch {
    if (newProfileImg) await deleteProfileImage(newProfileImg);
    return {
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Failed to update social account." },
    };
  }

  // Only remove the old file once the DB points at the new one.
  if (newProfileImg && existing.profileImg !== newProfileImg) {
    await deleteProfileImage(existing.profileImg);
  }

  revalidateSocialAccountPages();
  return { success: true, data: { id } };
}

export async function deleteSocialAccount(
  id: string
): Promise<ActionResult<null>> {
  if (!id) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Missing account id." },
    };
  }

  try {
    const account = await prisma.socialAccount.delete({ where: { id } });
    await deleteProfileImage(account.profileImg);

    revalidateSocialAccountPages();
    return { success: true, data: null };
  } catch {
    return {
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Failed to delete social account." },
    };
  }
}

const reorderSchema = z.array(z.string().min(1)).min(1);

export async function reorderSocialAccounts(
  ids: string[]
): Promise<ActionResult<null>> {
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
        prisma.socialAccount.update({ where: { id }, data: { order: index } })
      )
    );

    revalidateSocialAccountPages();
    return { success: true, data: null };
  } catch {
    return {
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Failed to save the new order." },
    };
  }
}

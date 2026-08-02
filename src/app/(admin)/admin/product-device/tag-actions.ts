"use server";

import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { ITag } from "@/interfaces/general";
import { MAX_TAG_NAME_LENGTH } from "./limits";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

const typeSchema = z.enum(["device", "product"]);

const nameSchema = z
  .string()
  .trim()
  .min(1, "Tag name is required")
  .max(MAX_TAG_NAME_LENGTH, `Tag name must be ${MAX_TAG_NAME_LENGTH} characters or fewer`);

// Called from the tag picker's "Add ..." option — reuse is enforced here,
// not just the schema's `@@unique([type, name])`: a case-insensitive lookup
// scoped to `type` returns the existing tag instead of creating a
// near-duplicate ("Dermatology" vs "dermatology"), and a device tag never
// matches a product tag of the same name or vice versa (ADR-041).
export async function createTag(type: "device" | "product", name: string): Promise<ActionResult<ITag>> {
  const parsedType = typeSchema.safeParse(type);
  const parsedName = nameSchema.safeParse(name);
  if (!parsedType.success || !parsedName.success) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: parsedName.error?.issues[0]?.message ?? "Invalid tag." },
    };
  }

  try {
    const existing = await prisma.tag.findFirst({
      where: { type: parsedType.data, name: { equals: parsedName.data, mode: "insensitive" } },
    });
    if (existing) return { success: true, data: existing as ITag };

    const tag = await prisma.tag.create({ data: { type: parsedType.data, name: parsedName.data } });
    return { success: true, data: tag as ITag };
  } catch {
    return { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to create the tag." } };
  }
}

// Called from the tag picker's per-row delete action — the Tag <-> Product
// relation is an implicit many-to-many, so this only drops the join rows;
// products that had it applied are untouched aside from losing the tag.
export async function deleteTag(id: string): Promise<ActionResult<null>> {
  if (!id) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Missing tag id." } };
  }

  try {
    await prisma.tag.delete({ where: { id } });
    return { success: true, data: null };
  } catch {
    return { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to delete the tag." } };
  }
}

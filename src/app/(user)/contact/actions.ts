"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { MAX_CONTACT_NAME_LENGTH, MAX_CONTACT_PHONE_LENGTH, MAX_CONTACT_QUESTION_LENGTH } from "./limits";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

const contactSubmissionSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required.")
    .max(MAX_CONTACT_NAME_LENGTH, `Name must be ${MAX_CONTACT_NAME_LENGTH} characters or fewer.`),
  phone: z
    .string()
    .trim()
    .min(1, "Mobile phone is required.")
    .max(MAX_CONTACT_PHONE_LENGTH, `Mobile phone must be ${MAX_CONTACT_PHONE_LENGTH} characters or fewer.`),
  email: z.string().trim().min(1, "Email is required.").email("Enter a valid email address."),
  question: z
    .string()
    .trim()
    .min(1, "Please enter your question.")
    .max(MAX_CONTACT_QUESTION_LENGTH, `Question must be ${MAX_CONTACT_QUESTION_LENGTH} characters or fewer.`),
});

// No revalidate/redirect — this is a fire-and-forget public submission, not
// content that renders anywhere. Rows land in ContactSubmission for the
// admin Contact dashboard's "Form Response" submenu (still a placeholder
// until that list view is built, see ADR-072). No captcha check — removed
// for now, see ADR-074.
export async function submitContactForm(formData: FormData): Promise<ActionResult<null>> {
  const parsed = contactSubmissionSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    question: formData.get("question"),
  });

  if (!parsed.success) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid input" },
    };
  }

  try {
    await prisma.contactSubmission.create({ data: parsed.data });
    return { success: true, data: null };
  } catch {
    return {
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Failed to submit the form. Please try again." },
    };
  }
}

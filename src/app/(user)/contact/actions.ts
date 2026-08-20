"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mailer";
import { MAX_CONTACT_NAME_LENGTH, MAX_CONTACT_PHONE_LENGTH, MAX_CONTACT_QUESTION_LENGTH } from "./limits";

const CONTACT_NOTIFICATION_EMAIL = "info@red-indonesia.co.id";

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

// Rows land in ContactSubmission for the admin Contact dashboard's "Form
// Response" list (src/app/(admin)/admin/contact/form-response) — that page
// has no dynamic API usage, so Next.js's Full Route Cache serves a stale
// snapshot until something revalidates it. Every other content type in this
// app revalidates its admin list on write (see actions.ts across
// admin/media, admin/product-device, etc.); do the same here so new
// submissions actually show up instead of waiting on an unrelated
// markContactSubmissionAsRead call to happen to revalidate it first. No
// captcha check — removed for now, see ADR-074.
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
    revalidatePath("/admin/contact/form-response");
  } catch {
    return {
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Failed to submit the form. Please try again." },
    };
  }

  // Best-effort: the ContactSubmission row above is the source of truth (shown in
  // the admin Form Response list), so a broken/misconfigured SMTP setup must not
  // fail the user's submission — just log it for the deploy owner to notice.
  try {
    const { name, phone, email, question } = parsed.data;
    await sendMail({
      to: CONTACT_NOTIFICATION_EMAIL,
      replyTo: email,
      subject: `Website contact form submission: ${name}`,
      text: `Name: ${name}\nPhone: ${phone}\nEmail: ${email}\n\nQuestion:\n${question}`,
    });
  } catch (error) {
    console.error("Failed to send contact form notification email:", error);
  }

  return { success: true, data: null };
}

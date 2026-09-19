"use server";

import { prisma } from "@/lib/prisma";
import { saveUpload } from "@/lib/uploads";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  ACCEPTED_HOME_IMAGE_TYPES,
  ACCEPTED_HOME_VIDEO_TYPES,
  MAX_CAROUSEL_ITEM_TITLE_LENGTH,
  MIN_CAROUSEL_ITEMS,
  MAX_CAROUSEL_ITEMS,
  MAX_CAROUSEL_SEE_MORE_URL_LENGTH,
  MAX_CAROUSEL_TITLE_LENGTH,
  MAX_HOME_BANNER_LABEL,
  MAX_HOME_BANNER_SIZE,
  MAX_HOME_BANNER_VIDEO_LABEL,
  MAX_HOME_BANNER_VIDEO_SIZE,
  MAX_HOME_HERO_HEADING_LENGTH,
  MAX_HOME_HERO_SUBHEADING_LENGTH,
  MAX_HOME_ABOUT_HEADING_LENGTH,
  MAX_HOME_ABOUT_BODY_LENGTH,
  MIN_HOME_ABOUT_LINK_BUTTONS,
  MAX_HOME_ABOUT_LINK_BUTTONS,
  MAX_HOME_ABOUT_LINK_BUTTON_HREF_LENGTH,
  ACCEPTED_HOME_ABOUT_LINK_BUTTON_IMAGE_TYPES,
  MAX_HOME_ABOUT_LINK_BUTTON_IMAGE_SIZE,
  MAX_HOME_ABOUT_LINK_BUTTON_IMAGE_LABEL,
  MIN_HOME_STATISTICS,
  MAX_HOME_STATISTICS,
  MIN_HOME_STATISTIC_VALUE,
  MAX_HOME_STATISTIC_VALUE,
  MIN_HOME_STATISTIC_NAME_LENGTH,
  MAX_HOME_STATISTIC_NAME_LENGTH,
  MAX_HOME_HIGHLIGHT_VIDEO_TITLE_LENGTH,
  MIN_HOME_HIGHLIGHT_VIDEO_DESCRIPTION_LENGTH,
  MAX_HOME_HIGHLIGHT_VIDEO_DESCRIPTION_LENGTH,
  ACCEPTED_HOME_HIGHLIGHT_VIDEO_THUMBNAIL_TYPES,
  MAX_HOME_HIGHLIGHT_VIDEO_THUMBNAIL_SIZE,
  MAX_HOME_HIGHLIGHT_VIDEO_THUMBNAIL_LABEL,
  MAX_HOME_FEATURE_LIST_TITLE_LENGTH,
  MIN_HOME_FEATURES,
  MAX_HOME_FEATURES,
  MAX_HOME_FEATURE_TITLE_LENGTH,
  MIN_HOME_FEATURE_DESCRIPTION_LENGTH,
  MAX_HOME_FEATURE_DESCRIPTION_LENGTH,
  MAX_HOME_BRANDS_TITLE_LENGTH,
  MAX_HOME_CERTIFICATIONS_TITLE_LENGTH,
  MIN_HOME_CERTIFICATIONS,
  MAX_HOME_CERTIFICATIONS,
  ACCEPTED_HOME_CERTIFICATION_IMAGE_TYPES,
  MAX_HOME_CERTIFICATION_IMAGE_SIZE,
  MAX_HOME_CERTIFICATION_IMAGE_LABEL,
} from "./limits";
import { isHomePageSlug, type HomePageSlug } from "@/lib/home-page";
import { FEATURE_ICON_NAMES } from "@/lib/feature-icons";
import { hasRichTextContent, getYoutubeVideoId } from "@/lib/utils";

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

const homeBannerVideoSchema = z
  .instanceof(File)
  .refine((file) => file.size > 0, "Video is required")
  .refine((file) => file.size <= MAX_HOME_BANNER_VIDEO_SIZE, `Video must be smaller than ${MAX_HOME_BANNER_VIDEO_LABEL}`)
  .refine((file) => ACCEPTED_HOME_VIDEO_TYPES.includes(file.type), "Video must be an MP4");

export async function uploadHomePageBannerVideo(formData: FormData): Promise<ActionResult<{ url: string }>> {
  const parsed = homeBannerVideoSchema.safeParse(formData.get("file"));
  if (!parsed.success) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid video" },
    };
  }

  try {
    const url = await saveUpload(parsed.data, HOME_BANNER_UPLOAD_FEATURE);
    return { success: true, data: { url } };
  } catch {
    return { success: false, error: { code: "UPLOAD_ERROR", message: "Failed to upload the banner video." } };
  }
}

const linkButtonImageSchema = z
  .instanceof(File)
  .refine((file) => file.size > 0, "Image is required")
  .refine(
    (file) => file.size <= MAX_HOME_ABOUT_LINK_BUTTON_IMAGE_SIZE,
    `Image must be smaller than ${MAX_HOME_ABOUT_LINK_BUTTON_IMAGE_LABEL}`
  )
  .refine(
    (file) => ACCEPTED_HOME_ABOUT_LINK_BUTTON_IMAGE_TYPES.includes(file.type),
    "Image must be a JPEG, PNG, or WEBP"
  );

export async function uploadHomePageLinkButtonImage(
  formData: FormData
): Promise<ActionResult<{ url: string }>> {
  const parsed = linkButtonImageSchema.safeParse(formData.get("file"));
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
    return { success: false, error: { code: "UPLOAD_ERROR", message: "Failed to upload the button image." } };
  }
}

const certificationImageSchema = z
  .instanceof(File)
  .refine((file) => file.size > 0, "Image is required")
  .refine(
    (file) => file.size <= MAX_HOME_CERTIFICATION_IMAGE_SIZE,
    `Image must be smaller than ${MAX_HOME_CERTIFICATION_IMAGE_LABEL}`
  )
  .refine(
    (file) => ACCEPTED_HOME_CERTIFICATION_IMAGE_TYPES.includes(file.type),
    "Image must be a PNG or JPG"
  );

export async function uploadHomePageCertificationLogo(
  formData: FormData
): Promise<ActionResult<{ url: string }>> {
  const parsed = certificationImageSchema.safeParse(formData.get("file"));
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
    return { success: false, error: { code: "UPLOAD_ERROR", message: "Failed to upload the logo." } };
  }
}

const highlightVideoThumbnailSchema = z
  .instanceof(File)
  .refine((file) => file.size > 0, "Image is required")
  .refine(
    (file) => file.size <= MAX_HOME_HIGHLIGHT_VIDEO_THUMBNAIL_SIZE,
    `Image must be smaller than ${MAX_HOME_HIGHLIGHT_VIDEO_THUMBNAIL_LABEL}`
  )
  .refine(
    (file) => ACCEPTED_HOME_HIGHLIGHT_VIDEO_THUMBNAIL_TYPES.includes(file.type),
    "Image must be a JPEG, PNG, or WEBP"
  );

export async function uploadHomePageHighlightVideoThumbnail(
  formData: FormData
): Promise<ActionResult<{ url: string }>> {
  const parsed = highlightVideoThumbnailSchema.safeParse(formData.get("file"));
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
    return { success: false, error: { code: "UPLOAD_ERROR", message: "Failed to upload the thumbnail." } };
  }
}

// Same "true"/"false" string convention as HomeCarousel's `showSeeMore`
// (actions.ts's `baseFieldsSchema`) — missing/anything else defaults to false.
const booleanFlagSchema = z
  .preprocess((value) => value ?? "false", z.enum(["true", "false"]))
  .transform((value) => value === "true");

const saveHomePageSchema = z.object({
  heroHeading: z
    .string()
    .trim()
    .max(MAX_HOME_HERO_HEADING_LENGTH, `Hero heading must be ${MAX_HOME_HERO_HEADING_LENGTH} characters or fewer`)
    .optional(),
  heroSubheading: z
    .string()
    .trim()
    .max(
      MAX_HOME_HERO_SUBHEADING_LENGTH,
      `Hero subheading must be ${MAX_HOME_HERO_SUBHEADING_LENGTH} characters or fewer`
    )
    .optional(),
  aboutHeading: z
    .string()
    .trim()
    .max(MAX_HOME_ABOUT_HEADING_LENGTH, `About section heading is too long`)
    .optional(),
  aboutBody: z
    .string()
    .trim()
    .max(MAX_HOME_ABOUT_BODY_LENGTH, `About section body is too long`)
    .optional(),
  // Sent as a JSON string from the client (FormData can't carry an array) —
  // parse it here, then validate the shape. Every entry must be complete;
  // 1-3 entries total.
  aboutLinkButtons: z.preprocess(
    (value) => {
      if (typeof value !== "string" || value.length === 0) return [];
      try {
        return JSON.parse(value);
      } catch {
        return "__invalid__";
      }
    },
    z
      .array(
        z.object({
          id: z.string().min(1),
          href: z
            .string()
            .trim()
            .min(1, "Every link button needs a link")
            .max(
              MAX_HOME_ABOUT_LINK_BUTTON_HREF_LENGTH,
              `A link button URL must be ${MAX_HOME_ABOUT_LINK_BUTTON_HREF_LENGTH} characters or fewer`
            ),
          image: z.string().trim().min(1, "Every link button needs an image"),
        })
      )
      .min(MIN_HOME_ABOUT_LINK_BUTTONS, `Add at least ${MIN_HOME_ABOUT_LINK_BUTTONS} link button`)
      .max(MAX_HOME_ABOUT_LINK_BUTTONS, `At most ${MAX_HOME_ABOUT_LINK_BUTTONS} link buttons`)
  ),
  // Also a JSON string from the client. 1-4 entries, each a positive integer
  // value (up to 999 billion) and a 2-15 char name.
  statistics: z.preprocess(
    (value) => {
      if (typeof value !== "string" || value.length === 0) return [];
      try {
        return JSON.parse(value);
      } catch {
        return "__invalid__";
      }
    },
    z
      .array(
        z.object({
          id: z.string().min(1),
          value: z
            .number()
            .int("A statistic number must be a whole number")
            .min(MIN_HOME_STATISTIC_VALUE, "Every statistic needs a number")
            .max(MAX_HOME_STATISTIC_VALUE, "A statistic number can be at most 999 billion"),
          name: z
            .string()
            .trim()
            .min(MIN_HOME_STATISTIC_NAME_LENGTH, `Every statistic name needs at least ${MIN_HOME_STATISTIC_NAME_LENGTH} characters`)
            .max(MAX_HOME_STATISTIC_NAME_LENGTH, `A statistic name must be ${MAX_HOME_STATISTIC_NAME_LENGTH} characters or fewer`),
        })
      )
      .min(MIN_HOME_STATISTICS, `Add at least ${MIN_HOME_STATISTICS} statistic`)
      .max(MAX_HOME_STATISTICS, `At most ${MAX_HOME_STATISTICS} statistics`)
  ),
  // Highlight Video — title (rich text, checked for real content below),
  // description, and YouTube link are all required; thumbnail is optional.
  highlightVideoTitle: z
    .string()
    .trim()
    .max(MAX_HOME_HIGHLIGHT_VIDEO_TITLE_LENGTH, "Highlight video title is too long")
    .optional(),
  highlightVideoDescription: z
    .string()
    .trim()
    .min(
      MIN_HOME_HIGHLIGHT_VIDEO_DESCRIPTION_LENGTH,
      `Highlight video description needs at least ${MIN_HOME_HIGHLIGHT_VIDEO_DESCRIPTION_LENGTH} characters`
    )
    .max(
      MAX_HOME_HIGHLIGHT_VIDEO_DESCRIPTION_LENGTH,
      `Highlight video description must be ${MAX_HOME_HIGHLIGHT_VIDEO_DESCRIPTION_LENGTH} characters or fewer`
    ),
  highlightVideoYoutubeUrl: z.string().trim().min(1, "Add the highlight video's YouTube link"),
  highlightVideoThumbnailUrl: z.string().trim().optional(),
  // Feature List — title (rich text, checked for real content below) and a
  // JSON string of 2-8 { id, icon, title, description } entries.
  featureListTitle: z
    .string()
    .trim()
    .max(MAX_HOME_FEATURE_LIST_TITLE_LENGTH, "Feature list title is too long")
    .optional(),
  features: z.preprocess(
    (value) => {
      if (typeof value !== "string" || value.length === 0) return [];
      try {
        return JSON.parse(value);
      } catch {
        return "__invalid__";
      }
    },
    z
      .array(
        z.object({
          id: z.string().min(1),
          icon: z.string().refine((name) => FEATURE_ICON_NAMES.includes(name), "Pick an icon"),
          title: z
            .string()
            .trim()
            .min(1, "Every feature needs a title")
            .max(MAX_HOME_FEATURE_TITLE_LENGTH, `A feature title must be ${MAX_HOME_FEATURE_TITLE_LENGTH} characters or fewer`),
          description: z
            .string()
            .trim()
            .min(
              MIN_HOME_FEATURE_DESCRIPTION_LENGTH,
              `Every feature description needs at least ${MIN_HOME_FEATURE_DESCRIPTION_LENGTH} characters`
            )
            .max(
              MAX_HOME_FEATURE_DESCRIPTION_LENGTH,
              `A feature description must be ${MAX_HOME_FEATURE_DESCRIPTION_LENGTH} characters or fewer`
            ),
        })
      )
      .min(MIN_HOME_FEATURES, `Add at least ${MIN_HOME_FEATURES} features`)
      .max(MAX_HOME_FEATURES, `At most ${MAX_HOME_FEATURES} features`)
  ),
  // Brands section — heading only for now (rich text, checked for real
  // content below).
  brandsTitle: z
    .string()
    .trim()
    .max(MAX_HOME_BRANDS_TITLE_LENGTH, "Brands title is too long")
    .optional(),
  // Certifications — a heading (rich text, checked below) + a JSON string of
  // 1-8 { id, image } logo entries.
  certificationsTitle: z
    .string()
    .trim()
    .max(MAX_HOME_CERTIFICATIONS_TITLE_LENGTH, "Certifications title is too long")
    .optional(),
  certifications: z.preprocess(
    (value) => {
      if (typeof value !== "string" || value.length === 0) return [];
      try {
        return JSON.parse(value);
      } catch {
        return "__invalid__";
      }
    },
    z
      .array(
        z.object({
          id: z.string().min(1),
          image: z.string().trim().min(1, "Every certification needs a logo image"),
        })
      )
      .min(MIN_HOME_CERTIFICATIONS, `Add at least ${MIN_HOME_CERTIFICATIONS} certification`)
      .max(MAX_HOME_CERTIFICATIONS, `At most ${MAX_HOME_CERTIFICATIONS} certifications`)
  ),
  bannerSmUrl: z.string().trim().optional(),
  bannerSmVideoUrl: z.string().trim().optional(),
  bannerMdUrl: z.string().trim().optional(),
  bannerMdVideoUrl: z.string().trim().optional(),
  bannerLgUrl: z.string().trim().optional(),
  bannerLgVideoUrl: z.string().trim().optional(),
  bannerXlUrl: z.string().trim().min(1, "Banner (1920x1080) image is required"),
  bannerXlVideoUrl: z.string().trim().optional(),
  // One global switch, not per-size — ADR-091.
  bannerVideoUseForSmaller: booleanFlagSchema,
});

// A size's video is only ever shown alongside its still image (the image
// becomes the required poster/fallback) — see ADR-089. Checked here, not
// just client-side, since `saveHomePage` is the only write path.
const BANNER_SIZE_LABELS: Record<"Sm" | "Md" | "Lg" | "Xl", string> = {
  Sm: "1080x1920",
  Md: "1080x1440",
  Lg: "1440x1080",
  Xl: "1920x1080",
};

function assertVideoHasFallback(
  size: "Sm" | "Md" | "Lg" | "Xl",
  imageUrl: string | undefined,
  videoUrl: string | undefined
): string | null {
  if (videoUrl && !imageUrl) {
    return `Upload a fallback image for the ${BANNER_SIZE_LABELS[size]} banner before adding its video.`;
  }
  return null;
}

export async function saveHomePage(
  slug: string,
  formData: FormData
): Promise<ActionResult<{ slug: HomePageSlug }>> {
  if (!isHomePageSlug(slug)) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Unknown homepage page." } };
  }

  const parsed = saveHomePageSchema.safeParse({
    heroHeading: formData.get("heroHeading") ?? undefined,
    heroSubheading: formData.get("heroSubheading") ?? undefined,
    aboutHeading: formData.get("aboutHeading") ?? undefined,
    aboutBody: formData.get("aboutBody") ?? undefined,
    aboutLinkButtons: formData.get("aboutLinkButtons") ?? undefined,
    statistics: formData.get("statistics") ?? undefined,
    highlightVideoTitle: formData.get("highlightVideoTitle") ?? undefined,
    highlightVideoDescription: formData.get("highlightVideoDescription") ?? "",
    highlightVideoYoutubeUrl: formData.get("highlightVideoYoutubeUrl") ?? "",
    highlightVideoThumbnailUrl: formData.get("highlightVideoThumbnailUrl") ?? undefined,
    featureListTitle: formData.get("featureListTitle") ?? undefined,
    features: formData.get("features") ?? undefined,
    brandsTitle: formData.get("brandsTitle") ?? undefined,
    certificationsTitle: formData.get("certificationsTitle") ?? undefined,
    certifications: formData.get("certifications") ?? undefined,
    bannerSmUrl: formData.get("bannerSmUrl") ?? undefined,
    bannerSmVideoUrl: formData.get("bannerSmVideoUrl") ?? undefined,
    bannerMdUrl: formData.get("bannerMdUrl") ?? undefined,
    bannerMdVideoUrl: formData.get("bannerMdVideoUrl") ?? undefined,
    bannerLgUrl: formData.get("bannerLgUrl") ?? undefined,
    bannerLgVideoUrl: formData.get("bannerLgVideoUrl") ?? undefined,
    bannerXlUrl: formData.get("bannerXlUrl"),
    bannerXlVideoUrl: formData.get("bannerXlVideoUrl") ?? undefined,
    bannerVideoUseForSmaller: formData.get("bannerVideoUseForSmaller"),
  });

  if (!parsed.success) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid input" },
    };
  }

  const {
    heroHeading,
    heroSubheading,
    aboutHeading,
    aboutBody,
    aboutLinkButtons,
    statistics,
    highlightVideoTitle,
    highlightVideoDescription,
    highlightVideoYoutubeUrl,
    highlightVideoThumbnailUrl,
    featureListTitle,
    features,
    brandsTitle,
    certificationsTitle,
    certifications,
    bannerSmUrl,
    bannerSmVideoUrl,
    bannerMdUrl,
    bannerMdVideoUrl,
    bannerLgUrl,
    bannerLgVideoUrl,
    bannerXlUrl,
    bannerXlVideoUrl,
    bannerVideoUseForSmaller,
  } = parsed.data;

  // An "empty" rich text editor still serializes to `<h2></h2>` — store that
  // as NULL so the public side's "fall back to hardcoded copy" check is a
  // plain null check.
  const aboutHeadingHtml = hasRichTextContent(aboutHeading) ? (aboutHeading as string) : null;
  const aboutBodyHtml = hasRichTextContent(aboutBody) ? (aboutBody as string) : null;
  // Normalize to just the fields we persist (drop any extra keys), keeping the
  // client-supplied `id` as a stable key for the list editor.
  const aboutLinkButtonsJson = aboutLinkButtons.map((button) => ({
    id: button.id,
    href: button.href,
    image: button.image,
  }));
  const statisticsJson = statistics.map((stat) => ({
    id: stat.id,
    value: stat.value,
    name: stat.name,
  }));

  if (!hasRichTextContent(highlightVideoTitle)) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Add a highlight video title" } };
  }
  const highlightVideoId = getYoutubeVideoId(highlightVideoYoutubeUrl);
  if (!highlightVideoId) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: "That doesn't look like a valid YouTube link" },
    };
  }
  const highlightVideoTitleHtml = highlightVideoTitle as string;
  const highlightVideoThumbnail = highlightVideoThumbnailUrl || null;

  if (!hasRichTextContent(featureListTitle)) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Add a feature list title" } };
  }
  const featureListTitleHtml = featureListTitle as string;
  const featuresJson = features.map((feature) => ({
    id: feature.id,
    icon: feature.icon,
    title: feature.title,
    description: feature.description,
  }));

  if (!hasRichTextContent(brandsTitle)) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Add a brands title" } };
  }
  const brandsTitleHtml = brandsTitle as string;

  if (!hasRichTextContent(certificationsTitle)) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Add a certifications title" } };
  }
  const certificationsTitleHtml = certificationsTitle as string;
  const certificationsJson = certifications.map((cert) => ({ id: cert.id, image: cert.image }));

  const fallbackError =
    assertVideoHasFallback("Sm", bannerSmUrl, bannerSmVideoUrl) ??
    assertVideoHasFallback("Md", bannerMdUrl, bannerMdVideoUrl) ??
    assertVideoHasFallback("Lg", bannerLgUrl, bannerLgVideoUrl) ??
    assertVideoHasFallback("Xl", bannerXlUrl, bannerXlVideoUrl);
  if (fallbackError) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: fallbackError } };
  }

  // The flag is only meaningful once at least one size has a video — force it
  // back off server-side so a stale "true" can't linger with nothing to
  // cascade.
  const videoUseForSmaller =
    Boolean(bannerXlVideoUrl || bannerLgVideoUrl || bannerMdVideoUrl || bannerSmVideoUrl) && bannerVideoUseForSmaller;

  try {
    await prisma.homePage.upsert({
      where: { slug },
      create: {
        slug,
        heroHeading: heroHeading || null,
        heroSubheading: heroSubheading || null,
        aboutHeading: aboutHeadingHtml,
        aboutBody: aboutBodyHtml,
        aboutLinkButtons: aboutLinkButtonsJson,
        statistics: statisticsJson,
        highlightVideoTitle: highlightVideoTitleHtml,
        highlightVideoDescription,
        highlightVideoYoutubeUrl,
        highlightVideoThumbnailUrl: highlightVideoThumbnail,
        featureListTitle: featureListTitleHtml,
        features: featuresJson,
        brandsTitle: brandsTitleHtml,
        certificationsTitle: certificationsTitleHtml,
        certifications: certificationsJson,
        bannerSmUrl: bannerSmUrl || null,
        bannerSmVideoUrl: bannerSmVideoUrl || null,
        bannerMdUrl: bannerMdUrl || null,
        bannerMdVideoUrl: bannerMdVideoUrl || null,
        bannerLgUrl: bannerLgUrl || null,
        bannerLgVideoUrl: bannerLgVideoUrl || null,
        bannerXlUrl,
        bannerXlVideoUrl: bannerXlVideoUrl || null,
        bannerVideoUseForSmaller: videoUseForSmaller,
      },
      update: {
        heroHeading: heroHeading || null,
        heroSubheading: heroSubheading || null,
        aboutHeading: aboutHeadingHtml,
        aboutBody: aboutBodyHtml,
        aboutLinkButtons: aboutLinkButtonsJson,
        statistics: statisticsJson,
        highlightVideoTitle: highlightVideoTitleHtml,
        highlightVideoDescription,
        highlightVideoYoutubeUrl,
        highlightVideoThumbnailUrl: highlightVideoThumbnail,
        featureListTitle: featureListTitleHtml,
        features: featuresJson,
        brandsTitle: brandsTitleHtml,
        certificationsTitle: certificationsTitleHtml,
        certifications: certificationsJson,
        bannerSmUrl: bannerSmUrl || null,
        bannerSmVideoUrl: bannerSmVideoUrl || null,
        bannerMdUrl: bannerMdUrl || null,
        bannerMdVideoUrl: bannerMdVideoUrl || null,
        bannerLgUrl: bannerLgUrl || null,
        bannerLgVideoUrl: bannerLgVideoUrl || null,
        bannerXlUrl,
        bannerXlVideoUrl: bannerXlVideoUrl || null,
        bannerVideoUseForSmaller: videoUseForSmaller,
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
    .min(MIN_CAROUSEL_ITEMS, `A carousel needs at least ${MIN_CAROUSEL_ITEMS} items`)
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

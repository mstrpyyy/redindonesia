"use client";

import { useState, useTransition } from "react";
import { Monitor, Smartphone, Tablet } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UploadField } from "@/components/upload-field";
import { cn, hasRichTextContent } from "@/lib/utils";
import { findMissingBannerVideoFallback } from "@/lib/banner-video";
import { MiniRichTextEditor } from "@/components/mini-rich-text-editor";
import { AdminSectionTitle } from "@/app/(admin)/components/admin-section-title";
import { LinkButtonsEditor } from "./link-buttons-editor";
import { StatisticsEditor } from "./statistics-editor";
import { FeaturesEditor } from "./features-editor";
import { CertificationsEditor } from "./certifications-editor";
import type {
  IHomeAboutLinkButton,
  IHomeStatistic,
  IHomeFeature,
  IHomeCertification,
} from "@/interfaces/general";
import {
  MAX_HOME_BANNER_LABEL,
  MAX_HOME_BANNER_VIDEO_LABEL,
  MAX_HOME_HERO_HEADING_LENGTH,
  MAX_HOME_HERO_SUBHEADING_LENGTH,
  MAX_HOME_HIGHLIGHT_VIDEO_DESCRIPTION_LENGTH,
} from "./limits";
import {
  saveHomePage,
  uploadHomePageBanner,
  uploadHomePageBannerVideo,
  uploadHomePageHighlightVideoThumbnail,
} from "./actions";
import type { HomePageSlug, IHomePage } from "@/lib/home-page";

function RequiredMark() {
  return <span className="text-destructive"> *</span>;
}

type BannerSizeKey = "Xl" | "Lg" | "Md" | "Sm";

// One column per screen size — icon + dimensions in the header, an Image and
// a Video upload side by side in the body, each cropped to that size's own
// real aspect ratio (not a generic square) so the preview reads as an actual
// miniature of the banner.
//
// `boxSizeClassName` is a fully explicit width+height pair per size, not a
// height + `w-auto`-from-`aspect-ratio` trick: browsers don't reliably run
// CSS `aspect-ratio` auto-sizing for a table cell's intrinsic column-width
// measurement, which previously produced wildly uneven, sometimes
// text-clipping column widths. Explicit values are deterministic in every
// layout context. Larger by default (comfortable on a phone-width admin
// screen, where the table scrolls horizontally regardless), a `md:` variant
// shrinks the four columns just enough that the whole row fits the desktop
// admin content area without needing to scroll at all.
const BANNER_SIZES: {
  key: BannerSizeKey;
  label: string;
  required: boolean;
  aspect: "video" | "4:3" | "3:4" | "9:16";
  boxSizeClassName: string;
  Icon: typeof Monitor;
  iconClassName?: string;
}[] = [
  { key: "Xl", label: "1920x1080", required: true, aspect: "video", boxSizeClassName: "w-56 h-32 md:w-36 md:h-24", Icon: Monitor },
  { key: "Lg", label: "1440x1080", required: false, aspect: "4:3", boxSizeClassName: "w-44 h-32 md:w-28 md:h-24", Icon: Tablet, iconClassName: "rotate-90" },
  { key: "Md", label: "1080x1440", required: false, aspect: "3:4", boxSizeClassName: "w-32 h-44 md:w-24 md:h-32", Icon: Tablet },
  { key: "Sm", label: "1080x1920", required: false, aspect: "9:16", boxSizeClassName: "w-28 h-48 md:w-20 md:h-32", Icon: Smartphone },
];

export function HomePageForm({
  slug,
  initialData,
}: {
  slug: HomePageSlug;
  initialData: IHomePage;
}) {
  const [heroHeading, setHeroHeading] = useState(initialData.heroHeading ?? "");
  const [heroSubheading, setHeroSubheading] = useState(initialData.heroSubheading ?? "");
  const [aboutHeading, setAboutHeading] = useState(initialData.aboutHeading ?? "");
  const [aboutBody, setAboutBody] = useState(initialData.aboutBody ?? "");
  // Seed one empty row when nothing is stored yet — the section always needs
  // at least one button (server-enforced), and a deterministic id keeps SSR
  // and the client hydration in sync (crypto.randomUUID is only used later,
  // in the "Add" handler, which runs client-side only).
  const [aboutLinkButtons, setAboutLinkButtons] = useState<IHomeAboutLinkButton[]>(
    initialData.aboutLinkButtons.length > 0
      ? initialData.aboutLinkButtons
      : [{ id: "link-button-1", href: "", image: "" }]
  );
  const [statistics, setStatistics] = useState<IHomeStatistic[]>(
    initialData.statistics.length > 0
      ? initialData.statistics
      : [{ id: "statistic-1", value: 0, name: "" }]
  );
  const [hlVideoTitle, setHlVideoTitle] = useState(initialData.highlightVideoTitle ?? "");
  const [hlVideoDescription, setHlVideoDescription] = useState(initialData.highlightVideoDescription ?? "");
  const [hlVideoYoutubeUrl, setHlVideoYoutubeUrl] = useState(initialData.highlightVideoYoutubeUrl ?? "");
  const [hlVideoThumbnailUrl, setHlVideoThumbnailUrl] = useState(initialData.highlightVideoThumbnailUrl ?? "");
  const [brandsTitle, setBrandsTitle] = useState(initialData.brandsTitle ?? "");
  const [certificationsTitle, setCertificationsTitle] = useState(
    initialData.certificationsTitle ?? ""
  );
  // No seeded empty row — the editor's empty state is just the "+ Add logo"
  // card. The server still requires at least one on save.
  const [certifications, setCertifications] = useState<IHomeCertification[]>(
    initialData.certifications
  );
  const [featureListTitle, setFeatureListTitle] = useState(initialData.featureListTitle ?? "");
  const [features, setFeatures] = useState<IHomeFeature[]>(
    initialData.features.length > 0
      ? initialData.features
      : [
          { id: "feature-1", icon: "", title: "", description: "" },
          { id: "feature-2", icon: "", title: "", description: "" },
        ]
  );
  const [bannerXlUrl, setBannerXlUrl] = useState(initialData.bannerXlUrl ?? "");
  const [bannerXlVideoUrl, setBannerXlVideoUrl] = useState(initialData.bannerXlVideoUrl ?? "");
  const [bannerLgUrl, setBannerLgUrl] = useState(initialData.bannerLgUrl ?? "");
  const [bannerLgVideoUrl, setBannerLgVideoUrl] = useState(initialData.bannerLgVideoUrl ?? "");
  const [bannerMdUrl, setBannerMdUrl] = useState(initialData.bannerMdUrl ?? "");
  const [bannerMdVideoUrl, setBannerMdVideoUrl] = useState(initialData.bannerMdVideoUrl ?? "");
  const [bannerSmUrl, setBannerSmUrl] = useState(initialData.bannerSmUrl ?? "");
  const [bannerSmVideoUrl, setBannerSmVideoUrl] = useState(initialData.bannerSmVideoUrl ?? "");
  // One global switch, not per-size — ADR-091.
  const [bannerVideoUseForSmaller, setBannerVideoUseForSmaller] = useState(initialData.bannerVideoUseForSmaller);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const canSubmit = bannerXlUrl.length > 0;
  const hasAnyVideo = Boolean(bannerXlVideoUrl || bannerLgVideoUrl || bannerMdVideoUrl || bannerSmVideoUrl);

  const bannerFields: Record<
    BannerSizeKey,
    { imageUrl: string; videoUrl: string; setImageUrl: (value: string) => void; setVideoUrl: (value: string) => void }
  > = {
    Xl: { imageUrl: bannerXlUrl, videoUrl: bannerXlVideoUrl, setImageUrl: setBannerXlUrl, setVideoUrl: setBannerXlVideoUrl },
    Lg: { imageUrl: bannerLgUrl, videoUrl: bannerLgVideoUrl, setImageUrl: setBannerLgUrl, setVideoUrl: setBannerLgVideoUrl },
    Md: { imageUrl: bannerMdUrl, videoUrl: bannerMdVideoUrl, setImageUrl: setBannerMdUrl, setVideoUrl: setBannerMdVideoUrl },
    Sm: { imageUrl: bannerSmUrl, videoUrl: bannerSmVideoUrl, setImageUrl: setBannerSmUrl, setVideoUrl: setBannerSmVideoUrl },
  };

  const handleSave = () => {
    setMessage(null);

    const fallbackError = findMissingBannerVideoFallback([
      { label: "1920x1080", imageUrl: bannerXlUrl, videoUrl: bannerXlVideoUrl },
      { label: "1440x1080", imageUrl: bannerLgUrl, videoUrl: bannerLgVideoUrl },
      { label: "1080x1440", imageUrl: bannerMdUrl, videoUrl: bannerMdVideoUrl },
      { label: "1080x1920", imageUrl: bannerSmUrl, videoUrl: bannerSmVideoUrl },
    ]);
    if (fallbackError) {
      setMessage({ type: "error", text: fallbackError });
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      if (heroHeading.trim()) formData.set("heroHeading", heroHeading.trim());
      if (heroSubheading.trim()) formData.set("heroSubheading", heroSubheading.trim());
      if (hasRichTextContent(aboutHeading)) formData.set("aboutHeading", aboutHeading);
      if (hasRichTextContent(aboutBody)) formData.set("aboutBody", aboutBody);
      formData.set("aboutLinkButtons", JSON.stringify(aboutLinkButtons));
      formData.set("statistics", JSON.stringify(statistics));
      if (hasRichTextContent(hlVideoTitle)) formData.set("highlightVideoTitle", hlVideoTitle);
      formData.set("highlightVideoDescription", hlVideoDescription.trim());
      formData.set("highlightVideoYoutubeUrl", hlVideoYoutubeUrl.trim());
      if (hlVideoThumbnailUrl) formData.set("highlightVideoThumbnailUrl", hlVideoThumbnailUrl);
      if (hasRichTextContent(featureListTitle)) formData.set("featureListTitle", featureListTitle);
      formData.set("features", JSON.stringify(features));
      if (hasRichTextContent(brandsTitle)) formData.set("brandsTitle", brandsTitle);
      if (hasRichTextContent(certificationsTitle))
        formData.set("certificationsTitle", certificationsTitle);
      formData.set("certifications", JSON.stringify(certifications));
      formData.set("bannerXlUrl", bannerXlUrl);
      if (bannerXlVideoUrl) formData.set("bannerXlVideoUrl", bannerXlVideoUrl);
      if (bannerLgUrl) formData.set("bannerLgUrl", bannerLgUrl);
      if (bannerLgVideoUrl) formData.set("bannerLgVideoUrl", bannerLgVideoUrl);
      if (bannerMdUrl) formData.set("bannerMdUrl", bannerMdUrl);
      if (bannerMdVideoUrl) formData.set("bannerMdVideoUrl", bannerMdVideoUrl);
      if (bannerSmUrl) formData.set("bannerSmUrl", bannerSmUrl);
      if (bannerSmVideoUrl) formData.set("bannerSmVideoUrl", bannerSmVideoUrl);
      formData.set("bannerVideoUseForSmaller", bannerVideoUseForSmaller ? "true" : "false");

      const result = await saveHomePage(slug, formData);
      setMessage(
        result.success
          ? { type: "success", text: "Saved." }
          : { type: "error", text: result.error.message }
      );
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <AdminSectionTitle>Hero</AdminSectionTitle>

      <div className="flex flex-col gap-3">
        <p className="text-base font-semibold text-brand-red">
          Banner
          <RequiredMark />
        </p>
        <p className="text-muted-foreground -mt-2 text-xs">
          Image: up to {MAX_HOME_BANNER_LABEL}, JPEG/PNG/WEBP. Video: up to{" "}
          {MAX_HOME_BANNER_VIDEO_LABEL}, MP4, optional per size — image will be used as
          fallback.
        </p>

        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent divide-x">
              {BANNER_SIZES.map((size) => (
                <TableHead key={size.key} className="text-center">
                  <div className="flex flex-col items-center gap-1.5 py-2">
                    <size.Icon className={cn("text-muted-foreground size-7", size.iconClassName)} />
                    <span className="text-sm font-semibold whitespace-nowrap">
                      {size.label}
                      {size.required && <RequiredMark />}
                    </span>
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow className="hover:bg-transparent divide-x">
              {BANNER_SIZES.map((size) => {
                const field = bannerFields[size.key];
                return (
                  <TableCell key={size.key} className="align-top">
                    <div className="flex flex-row justify-center gap-3">
                      <div className="flex flex-col items-center gap-1.5">
                        <Label className="text-sm font-medium text-foreground">
                          Image
                          {size.required && <RequiredMark />}
                        </Label>
                        <UploadField
                          kind="image"
                          aspect={size.aspect}
                          fit="cover"
                          boxSizeClassName={size.boxSizeClassName}
                          uploadAction={uploadHomePageBanner}
                          value={field.imageUrl}
                          onChange={(value) => field.setImageUrl((value as string) ?? "")}
                        />
                      </div>
                      <div className="flex flex-col items-center gap-1.5">
                        <Label className="text-sm font-medium text-foreground">Video</Label>
                        <UploadField
                          kind="video"
                          aspect={size.aspect}
                          fit="cover"
                          boxSizeClassName={size.boxSizeClassName}
                          uploadAction={uploadHomePageBannerVideo}
                          value={field.videoUrl}
                          onChange={(value) => field.setVideoUrl((value as string) ?? "")}
                        />
                      </div>
                    </div>
                  </TableCell>
                );
              })}
            </TableRow>
          </TableBody>
        </Table>

        {hasAnyVideo && (
          <label className="flex items-start gap-2.5 pt-1">
            <Switch
              checked={bannerVideoUseForSmaller}
              onCheckedChange={setBannerVideoUseForSmaller}
              className="mt-0.5 shrink-0"
            />
            <span className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-foreground">Use existing video for empty screen sizes</span>
              <span className="text-muted-foreground text-xs">
                Screen size with no video will use the larger size&apos;s video if it exists.
              </span>
            </span>
          </label>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="hero-heading" className="text-base font-semibold text-brand-red">Hero Heading</Label>
        <Input
          id="hero-heading"
          value={heroHeading}
          onChange={(event) => setHeroHeading(event.target.value)}
          maxLength={MAX_HOME_HERO_HEADING_LENGTH}
          placeholder="e.g. Your Complete Medical Aesthetic Partner"
          disabled={isPending}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="hero-subheading" className="text-base font-semibold text-brand-red">Hero Subheading</Label>
        <Input
          id="hero-subheading"
          value={heroSubheading}
          onChange={(event) => setHeroSubheading(event.target.value)}
          maxLength={MAX_HOME_HERO_SUBHEADING_LENGTH}
          placeholder="e.g. Powering the Future of Your Practice"
          disabled={isPending}
        />
      </div>

      <hr className="my-8 border-t" />

      <AdminSectionTitle>About Section</AdminSectionTitle>

      <div className="flex flex-col gap-2">
        <span className="text-base font-semibold text-brand-red">Heading</span>
        <MiniRichTextEditor
          value={aboutHeading}
          onChange={setAboutHeading}
          placeholder="e.g. 22 Years of Excellence in Medical Aesthetics"
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-base font-semibold text-brand-red">Body</span>
        <MiniRichTextEditor
          mode="body"
          value={aboutBody}
          onChange={setAboutBody}
          placeholder="Since 2004, PT Radian Elok Distriversa has been a cornerstone of..."
        />
      </div>

      <LinkButtonsEditor
        value={aboutLinkButtons}
        onChange={setAboutLinkButtons}
        disabled={isPending}
      />

      <hr className="my-8 border-t" />

      <AdminSectionTitle>Statistics</AdminSectionTitle>

      <StatisticsEditor value={statistics} onChange={setStatistics} disabled={isPending} />

      <hr className="my-8 border-t" />

      <AdminSectionTitle>Highlight Video</AdminSectionTitle>

      <div className="flex flex-col gap-2">
        <span className="text-base font-semibold text-brand-red">Title</span>
        <MiniRichTextEditor
          mode="section-title"
          value={hlVideoTitle}
          onChange={setHlVideoTitle}
          placeholder="Your Strategic Partner in Aesthetic Innovation"
        />
        <span className="text-muted-foreground text-xs">
          Select some words and hit <span className="font-medium">Add Accent</span> to make them brand red.
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-base font-semibold text-brand-red">Description</span>
        <Textarea
          value={hlVideoDescription}
          onChange={(event) => setHlVideoDescription(event.target.value)}
          maxLength={MAX_HOME_HIGHLIGHT_VIDEO_DESCRIPTION_LENGTH}
          rows={3}
          placeholder="Providing elite technology and dedicated service..."
          disabled={isPending}
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-base font-semibold text-brand-red">YouTube Link</span>
        <Input
          value={hlVideoYoutubeUrl}
          onChange={(event) => setHlVideoYoutubeUrl(event.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
          disabled={isPending}
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-base font-semibold text-brand-red">Thumbnail</span>
        <span className="text-muted-foreground -mt-1 text-xs">
          Optional. A 16:9 poster shown before the video plays — YouTube&apos;s own
          thumbnail is used if left empty.
        </span>
        <div className="w-64">
          <UploadField
            kind="image"
            aspect="video"
            uploadAction={uploadHomePageHighlightVideoThumbnail}
            value={hlVideoThumbnailUrl}
            onChange={(value) => setHlVideoThumbnailUrl((value as string) ?? "")}
            disabled={isPending}
          />
        </div>
      </div>

      <hr className="my-8 border-t" />

      <AdminSectionTitle>Feature List</AdminSectionTitle>

      <div className="flex flex-col gap-2">
        <span className="text-base font-semibold text-brand-red">Title</span>
        <MiniRichTextEditor
          mode="section-title"
          value={featureListTitle}
          onChange={setFeatureListTitle}
          placeholder="Why Choose RED ?"
        />
        <span className="text-muted-foreground text-xs">
          Select some words and hit <span className="font-medium">Add Accent</span> to make them brand red.
        </span>
      </div>

      <FeaturesEditor value={features} onChange={setFeatures} disabled={isPending} />

      <hr className="my-8 border-t" />

      <AdminSectionTitle>Brands</AdminSectionTitle>

      <div className="flex flex-col gap-2">
        <span className="text-base font-semibold text-brand-red">Heading</span>
        <MiniRichTextEditor
          mode="section-title"
          value={brandsTitle}
          onChange={setBrandsTitle}
          placeholder="Meet Our Brands"
        />
        <span className="text-muted-foreground text-xs">
          Select some words and hit <span className="font-medium">Add Accent</span> to make them brand red.
        </span>
      </div>

      <hr className="my-8 border-t" />

      <AdminSectionTitle>Certifications</AdminSectionTitle>

      <div className="flex flex-col gap-2">
        <span className="text-base font-semibold text-brand-red">Heading</span>
        <MiniRichTextEditor
          mode="section-title"
          value={certificationsTitle}
          onChange={setCertificationsTitle}
          placeholder="Excellence Through Certified Standards"
        />
        <span className="text-muted-foreground text-xs">
          Select some words and hit <span className="font-medium">Add Accent</span> to make them brand red.
        </span>
      </div>

      <CertificationsEditor
        value={certifications}
        onChange={setCertifications}
        disabled={isPending}
      />

      <div className="flex items-center justify-start gap-3">
        <Button type="button" onClick={handleSave} disabled={isPending || !canSubmit} className="w-32">
          {isPending ? "Saving..." : "Save"}
        </Button>
        {message && (
          <p className={message.type === "error" ? "text-destructive text-sm" : "text-emerald-600 text-sm"}>
            {message.text}
          </p>
        )}
      </div>
    </div>
  );
}

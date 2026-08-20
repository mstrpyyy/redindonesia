"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { RichTextEditor } from "@/components/rich-text-editor";
import { PageBannerFields } from "@/components/page-banner-fields";
import { findMissingBannerVideoFallback, PAGE_BANNER_SIZE_LABELS } from "@/lib/banner-video";
import { MAX_SUPPORT_BANNER_LABEL, MAX_SUPPORT_BANNER_VIDEO_LABEL } from "./limits";
import {
  saveSupportPage,
  uploadSupportPageBanner,
  uploadSupportPageBannerVideo,
  uploadSupportPageContentImage,
} from "./actions";
import type { ISupportPage, SupportPageSlug } from "@/lib/support-pages";

export function SupportPageForm({
  slug,
  initialData,
}: {
  slug: SupportPageSlug;
  initialData: ISupportPage;
}) {
  const [bannerXlUrl, setBannerXlUrl] = useState(initialData.bannerXlUrl ?? "");
  const [bannerXlVideoUrl, setBannerXlVideoUrl] = useState(initialData.bannerXlVideoUrl ?? "");
  const [bannerMdUrl, setBannerMdUrl] = useState(initialData.bannerMdUrl ?? "");
  const [bannerMdVideoUrl, setBannerMdVideoUrl] = useState(initialData.bannerMdVideoUrl ?? "");
  const [bannerSmUrl, setBannerSmUrl] = useState(initialData.bannerSmUrl ?? "");
  const [bannerSmVideoUrl, setBannerSmVideoUrl] = useState(initialData.bannerSmVideoUrl ?? "");
  const [bannerVideoUseForSmaller, setBannerVideoUseForSmaller] = useState(initialData.bannerVideoUseForSmaller);
  const [body, setBody] = useState(initialData.body ?? "");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const canSubmit = bannerXlUrl.length > 0;

  const handleSave = () => {
    setMessage(null);

    const fallbackError = findMissingBannerVideoFallback([
      { label: PAGE_BANNER_SIZE_LABELS.Xl, imageUrl: bannerXlUrl, videoUrl: bannerXlVideoUrl },
      { label: PAGE_BANNER_SIZE_LABELS.Md, imageUrl: bannerMdUrl, videoUrl: bannerMdVideoUrl },
      { label: PAGE_BANNER_SIZE_LABELS.Sm, imageUrl: bannerSmUrl, videoUrl: bannerSmVideoUrl },
    ]);
    if (fallbackError) {
      setMessage({ type: "error", text: fallbackError });
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set("bannerXlUrl", bannerXlUrl);
      if (bannerXlVideoUrl) formData.set("bannerXlVideoUrl", bannerXlVideoUrl);
      if (bannerMdUrl) formData.set("bannerMdUrl", bannerMdUrl);
      if (bannerMdVideoUrl) formData.set("bannerMdVideoUrl", bannerMdVideoUrl);
      if (bannerSmUrl) formData.set("bannerSmUrl", bannerSmUrl);
      if (bannerSmVideoUrl) formData.set("bannerSmVideoUrl", bannerSmVideoUrl);
      formData.set("bannerVideoUseForSmaller", bannerVideoUseForSmaller ? "true" : "false");
      if (body) formData.set("body", body);

      const result = await saveSupportPage(slug, formData);
      setMessage(
        result.success
          ? { type: "success", text: "Saved." }
          : { type: "error", text: result.error.message }
      );
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <PageBannerFields
        bannerXlUrl={bannerXlUrl}
        bannerXlVideoUrl={bannerXlVideoUrl}
        bannerMdUrl={bannerMdUrl}
        bannerMdVideoUrl={bannerMdVideoUrl}
        bannerSmUrl={bannerSmUrl}
        bannerSmVideoUrl={bannerSmVideoUrl}
        bannerVideoUseForSmaller={bannerVideoUseForSmaller}
        onBannerXlUrlChange={setBannerXlUrl}
        onBannerXlVideoUrlChange={setBannerXlVideoUrl}
        onBannerMdUrlChange={setBannerMdUrl}
        onBannerMdVideoUrlChange={setBannerMdVideoUrl}
        onBannerSmUrlChange={setBannerSmUrl}
        onBannerSmVideoUrlChange={setBannerSmVideoUrl}
        onBannerVideoUseForSmallerChange={setBannerVideoUseForSmaller}
        uploadImageAction={uploadSupportPageBanner}
        uploadVideoAction={uploadSupportPageBannerVideo}
        imageSizeLabel={MAX_SUPPORT_BANNER_LABEL}
        videoSizeLabel={MAX_SUPPORT_BANNER_VIDEO_LABEL}
        disabled={isPending}
      />

      <hr className="border-t" />

      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium">Content</p>
        <RichTextEditor
          value={body}
          onChange={setBody}
          onUploadImage={uploadSupportPageContentImage}
          placeholder="Write the page content..."
        />
      </div>

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

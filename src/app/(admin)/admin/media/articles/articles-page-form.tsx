"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { PageBannerFields } from "@/components/page-banner-fields";
import { findMissingBannerVideoFallback, PAGE_BANNER_SIZE_LABELS } from "@/lib/banner-video";
import { MAX_ARTICLES_BANNER_LABEL, MAX_ARTICLES_BANNER_VIDEO_LABEL } from "./limits";
import { saveArticlesPage, uploadArticlesPageBanner, uploadArticlesPageBannerVideo } from "./actions";
import type { IArticlesPage, ArticlesPageSlug } from "@/lib/articles-page";

export function ArticlesPageForm({
  slug,
  initialData,
}: {
  slug: ArticlesPageSlug;
  initialData: IArticlesPage;
}) {
  const [bannerXlUrl, setBannerXlUrl] = useState(initialData.bannerXlUrl ?? "");
  const [bannerXlVideoUrl, setBannerXlVideoUrl] = useState(initialData.bannerXlVideoUrl ?? "");
  const [bannerMdUrl, setBannerMdUrl] = useState(initialData.bannerMdUrl ?? "");
  const [bannerMdVideoUrl, setBannerMdVideoUrl] = useState(initialData.bannerMdVideoUrl ?? "");
  const [bannerSmUrl, setBannerSmUrl] = useState(initialData.bannerSmUrl ?? "");
  const [bannerSmVideoUrl, setBannerSmVideoUrl] = useState(initialData.bannerSmVideoUrl ?? "");
  const [bannerVideoUseForSmaller, setBannerVideoUseForSmaller] = useState(initialData.bannerVideoUseForSmaller);
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

      const result = await saveArticlesPage(slug, formData);
      setMessage(
        result.success
          ? { type: "success", text: "Saved." }
          : { type: "error", text: result.error.message }
      );
    });
  };

  return (
    <div className="flex flex-col gap-4">
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
        uploadImageAction={uploadArticlesPageBanner}
        uploadVideoAction={uploadArticlesPageBannerVideo}
        imageSizeLabel={MAX_ARTICLES_BANNER_LABEL}
        videoSizeLabel={MAX_ARTICLES_BANNER_VIDEO_LABEL}
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

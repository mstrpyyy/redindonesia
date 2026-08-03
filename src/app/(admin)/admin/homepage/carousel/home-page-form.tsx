"use client";

import { useState, useTransition } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { UploadField } from "@/components/upload-field";
import { MAX_HOME_BANNER_LABEL } from "./limits";
import { saveHomePage, uploadHomePageBanner } from "./actions";
import type { HomePageSlug, IHomePage } from "@/lib/home-page";

function RequiredMark() {
  return <span className="text-destructive"> *</span>;
}

export function HomePageForm({
  slug,
  initialData,
}: {
  slug: HomePageSlug;
  initialData: IHomePage;
}) {
  const [bannerXlUrl, setBannerXlUrl] = useState(initialData.bannerXlUrl ?? "");
  const [bannerLgUrl, setBannerLgUrl] = useState(initialData.bannerLgUrl ?? "");
  const [bannerMdUrl, setBannerMdUrl] = useState(initialData.bannerMdUrl ?? "");
  const [bannerSmUrl, setBannerSmUrl] = useState(initialData.bannerSmUrl ?? "");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const canSubmit = bannerXlUrl.length > 0;

  const handleSave = () => {
    setMessage(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("bannerXlUrl", bannerXlUrl);
      if (bannerLgUrl) formData.set("bannerLgUrl", bannerLgUrl);
      if (bannerMdUrl) formData.set("bannerMdUrl", bannerMdUrl);
      if (bannerSmUrl) formData.set("bannerSmUrl", bannerSmUrl);

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
      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium">
          Banner
          <RequiredMark />
        </p>
        <p className="text-muted-foreground -mt-2 text-xs">
          Up to {MAX_HOME_BANNER_LABEL} each. JPEG, PNG, or WEBP.
        </p>

        <div className="flex flex-row flex-wrap justify-start gap-4">
          <div className="flex w-40 flex-col gap-1.5">
            <Label className="text-xxs">
              2560x1440
              <RequiredMark />
            </Label>
            <UploadField
              kind="image"
              aspect="square"
              fit="cover"
              uploadAction={uploadHomePageBanner}
              value={bannerXlUrl}
              onChange={(value) => setBannerXlUrl((value as string) ?? "")}
            />
          </div>

          <div className="flex w-40 flex-col gap-1.5">
            <Label className="text-xxs">2048x1536</Label>
            <UploadField
              kind="image"
              aspect="square"
              fit="cover"
              uploadAction={uploadHomePageBanner}
              value={bannerLgUrl}
              onChange={(value) => setBannerLgUrl((value as string) ?? "")}
            />
          </div>

          <div className="flex w-40 flex-col gap-1.5">
            <Label className="text-xxs">1536x2048</Label>
            <UploadField
              kind="image"
              aspect="square"
              fit="cover"
              uploadAction={uploadHomePageBanner}
              value={bannerMdUrl}
              onChange={(value) => setBannerMdUrl((value as string) ?? "")}
            />
          </div>

          <div className="flex w-40 flex-col gap-1.5">
            <Label className="text-xxs">1440x2560</Label>
            <UploadField
              kind="image"
              aspect="square"
              fit="cover"
              uploadAction={uploadHomePageBanner}
              value={bannerSmUrl}
              onChange={(value) => setBannerSmUrl((value as string) ?? "")}
            />
          </div>
        </div>
      </div>

      {message && (
        <p className={message.type === "error" ? "text-destructive text-sm" : "text-emerald-600 text-sm"}>
          {message.text}
        </p>
      )}

      <div>
        <Button type="button" onClick={handleSave} disabled={isPending || !canSubmit}>
          {isPending ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}

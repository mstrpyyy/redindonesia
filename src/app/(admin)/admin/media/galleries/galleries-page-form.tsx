"use client";

import { useState, useTransition } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { UploadField } from "@/components/upload-field";
import { MAX_GALLERIES_BANNER_LABEL } from "./limits";
import { saveGalleriesPage, uploadGalleriesPageBanner } from "./actions";
import type { IGalleriesPage, GalleriesPageSlug } from "@/lib/galleries-page";

function RequiredMark() {
  return <span className="text-destructive"> *</span>;
}

export function GalleriesPageForm({
  slug,
  initialData,
}: {
  slug: GalleriesPageSlug;
  initialData: IGalleriesPage;
}) {
  const [bannerXlUrl, setBannerXlUrl] = useState(initialData.bannerXlUrl ?? "");
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
      if (bannerMdUrl) formData.set("bannerMdUrl", bannerMdUrl);
      if (bannerSmUrl) formData.set("bannerSmUrl", bannerSmUrl);

      const result = await saveGalleriesPage(slug, formData);
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
          Up to {MAX_GALLERIES_BANNER_LABEL} each. JPEG, PNG, WEBP, or GIF.
        </p>

        <div className="flex flex-row flex-wrap justify-start gap-4">
          <div className="flex w-40 flex-col gap-1.5">
            <Label className="text-xxs">
              2560x1107
              <RequiredMark />
            </Label>
            <UploadField
              kind="image"
              aspect="square"
              fit="cover"
              uploadAction={uploadGalleriesPageBanner}
              value={bannerXlUrl}
              onChange={(value) => setBannerXlUrl((value as string) ?? "")}
            />
          </div>

          <div className="flex w-40 flex-col gap-1.5">
            <Label className="text-xxs">1363x1107</Label>
            <UploadField
              kind="image"
              aspect="square"
              fit="cover"
              uploadAction={uploadGalleriesPageBanner}
              value={bannerMdUrl}
              onChange={(value) => setBannerMdUrl((value as string) ?? "")}
            />
          </div>

          <div className="flex w-40 flex-col gap-1.5">
            <Label className="text-xxs">1107x1107</Label>
            <UploadField
              kind="image"
              aspect="square"
              fit="cover"
              uploadAction={uploadGalleriesPageBanner}
              value={bannerSmUrl}
              onChange={(value) => setBannerSmUrl((value as string) ?? "")}
            />
          </div>
        </div>
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

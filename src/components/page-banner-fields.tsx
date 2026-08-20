"use client";

import { Monitor, Smartphone, Tablet } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UploadField, type UploadActionResult } from "@/components/upload-field";
import { cn } from "@/lib/utils";
import { PAGE_BANNER_SIZE_LABELS, PAGE_BANNER_SIZE_ORDER, type PageBannerSizeKey } from "@/lib/banner-video";

function RequiredMark() {
  return <span className="text-destructive"> *</span>;
}

// Shared by every static-page banner admin form (Articles, Galleries,
// Podcast, Support — Registration & Documentation/Warranty & Service/Career/
// Marcom, and Contact's Content page — see ADR-092). Same table/Image+Video/
// global-cascade-switch pattern the homepage banner introduced (ADR-089/090/
// 091), just parameterized for these five pages' shared 3-size shape
// (1920x830/1080x878/1080x1080) instead of homepage's four-size one.
//
// `boxSizeClassName` is a fully explicit width+height pair per size (not a
// height + `w-auto`-from-`aspect-ratio` trick) — browsers don't reliably run
// CSS `aspect-ratio` auto-sizing for a table cell's intrinsic column-width
// measurement, which produces uneven, sometimes text-clipping columns (see
// the homepage banner table's own history). `aspect="square"` below is just
// a harmless placeholder — `boxSizeClassName` is always supplied, so
// `UploadField`'s named-aspect sizing never actually applies.
const PAGE_BANNER_SIZE_CONFIG: {
  key: PageBannerSizeKey;
  required: boolean;
  boxSizeClassName: string;
  Icon: typeof Monitor;
}[] = [
  { key: "Xl", required: true, boxSizeClassName: "w-72 h-32 md:w-56 md:h-24", Icon: Monitor },
  { key: "Md", required: false, boxSizeClassName: "w-36 h-32 md:w-28 md:h-24", Icon: Tablet },
  { key: "Sm", required: false, boxSizeClassName: "w-32 h-32 md:w-24 md:h-24", Icon: Smartphone },
];

export function PageBannerFields({
  bannerXlUrl,
  bannerXlVideoUrl,
  bannerMdUrl,
  bannerMdVideoUrl,
  bannerSmUrl,
  bannerSmVideoUrl,
  bannerVideoUseForSmaller,
  onBannerXlUrlChange,
  onBannerXlVideoUrlChange,
  onBannerMdUrlChange,
  onBannerMdVideoUrlChange,
  onBannerSmUrlChange,
  onBannerSmVideoUrlChange,
  onBannerVideoUseForSmallerChange,
  uploadImageAction,
  uploadVideoAction,
  imageSizeLabel,
  videoSizeLabel,
  disabled,
}: {
  bannerXlUrl: string;
  bannerXlVideoUrl: string;
  bannerMdUrl: string;
  bannerMdVideoUrl: string;
  bannerSmUrl: string;
  bannerSmVideoUrl: string;
  bannerVideoUseForSmaller: boolean;
  onBannerXlUrlChange: (value: string) => void;
  onBannerXlVideoUrlChange: (value: string) => void;
  onBannerMdUrlChange: (value: string) => void;
  onBannerMdVideoUrlChange: (value: string) => void;
  onBannerSmUrlChange: (value: string) => void;
  onBannerSmVideoUrlChange: (value: string) => void;
  onBannerVideoUseForSmallerChange: (value: boolean) => void;
  uploadImageAction: (formData: FormData) => Promise<UploadActionResult>;
  uploadVideoAction: (formData: FormData) => Promise<UploadActionResult>;
  imageSizeLabel: string;
  videoSizeLabel: string;
  disabled?: boolean;
}) {
  const fields: Record<
    PageBannerSizeKey,
    { imageUrl: string; videoUrl: string; setImageUrl: (value: string) => void; setVideoUrl: (value: string) => void }
  > = {
    Xl: { imageUrl: bannerXlUrl, videoUrl: bannerXlVideoUrl, setImageUrl: onBannerXlUrlChange, setVideoUrl: onBannerXlVideoUrlChange },
    Md: { imageUrl: bannerMdUrl, videoUrl: bannerMdVideoUrl, setImageUrl: onBannerMdUrlChange, setVideoUrl: onBannerMdVideoUrlChange },
    Sm: { imageUrl: bannerSmUrl, videoUrl: bannerSmVideoUrl, setImageUrl: onBannerSmUrlChange, setVideoUrl: onBannerSmVideoUrlChange },
  };
  const hasAnyVideo = Boolean(bannerXlVideoUrl || bannerMdVideoUrl || bannerSmVideoUrl);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium">
        Banner
        <RequiredMark />
      </p>
      <p className="text-muted-foreground -mt-2 text-xs">
        Image: up to {imageSizeLabel}, JPEG/PNG/WEBP/GIF. Video: up to {videoSizeLabel}, MP4,
        optional per size — image will be used as fallback.
      </p>

      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent divide-x">
            {PAGE_BANNER_SIZE_ORDER.map((key) => {
              const size = PAGE_BANNER_SIZE_CONFIG.find((entry) => entry.key === key)!;
              return (
                <TableHead key={key} className="text-center">
                  <div className="flex flex-col items-center gap-1.5 py-2">
                    <size.Icon className="text-muted-foreground size-7" />
                    <span className="text-sm font-semibold whitespace-nowrap">
                      {PAGE_BANNER_SIZE_LABELS[key]}
                      {size.required && <RequiredMark />}
                    </span>
                  </div>
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow className="hover:bg-transparent divide-x">
            {PAGE_BANNER_SIZE_ORDER.map((key) => {
              const size = PAGE_BANNER_SIZE_CONFIG.find((entry) => entry.key === key)!;
              const field = fields[key];
              return (
                <TableCell key={key} className="align-top">
                  <div className="flex flex-row justify-center gap-3">
                    <div className="flex flex-col items-center gap-1.5">
                      <Label className="text-sm font-medium text-foreground">
                        Image
                        {size.required && <RequiredMark />}
                      </Label>
                      <UploadField
                        kind="image"
                        aspect="square"
                        fit="cover"
                        boxSizeClassName={size.boxSizeClassName}
                        uploadAction={uploadImageAction}
                        value={field.imageUrl}
                        onChange={(value) => field.setImageUrl((value as string) ?? "")}
                        disabled={disabled}
                      />
                    </div>
                    <div className="flex flex-col items-center gap-1.5">
                      <Label className="text-sm font-medium text-foreground">Video</Label>
                      <UploadField
                        kind="video"
                        aspect="square"
                        fit="cover"
                        boxSizeClassName={size.boxSizeClassName}
                        uploadAction={uploadVideoAction}
                        value={field.videoUrl}
                        onChange={(value) => field.setVideoUrl((value as string) ?? "")}
                        disabled={disabled}
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
        <label className={cn("flex items-start gap-2.5 pt-1", disabled && "opacity-50")}>
          <Switch
            checked={bannerVideoUseForSmaller}
            onCheckedChange={onBannerVideoUseForSmallerChange}
            disabled={disabled}
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
  );
}

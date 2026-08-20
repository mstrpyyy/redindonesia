"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { Eye, ImagePlus, Trash2, Upload, Video as VideoIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { uploadSegmentAsset } from "@/app/(admin)/admin/product-device/segment-upload-actions";

// Uploads immediately on file select and reports back a plain URL string —
// see the comment on `uploadSegmentAsset` for why this happens at select
// time rather than at form submit.
//
// Lives here (rather than inside product-device, where it started) because
// it's shared across features — product-device's segments/category/product
// files editors, and the Support pages' banner fields — each passing its own
// `uploadAction` for its own upload folder.
export type UploadActionResult =
  | { success: true; data: { url: string } }
  | { success: false; error: { code: string; message: string } };

export function UploadField({
  kind,
  aspect = "video",
  fit = "contain",
  uploadAction = uploadSegmentAsset,
  preview = true,
  boxSizeClassName,
  value,
  onChange,
  disabled,
}: {
  // "icon" is its own kind rather than a smaller "image": it accepts SVG in
  // addition to the raster types (server-validated in
  // segment-upload-actions.ts via ACCEPTED_ICON_TYPES) and renders as a
  // square the height of an Input (h-9), for table-style list rows where the
  // full drag-and-drop box would tower over the row. "carouselImage" renders
  // the same as "image" but with a smaller size cap and no GIF, server-
  // validated via ACCEPTED_CAROUSEL_IMAGE_TYPES/MAX_CAROUSEL_IMAGE_SIZE.
  // "video" accepts mp4 only (server-validated per caller, e.g.
  // ACCEPTED_HOME_VIDEO_TYPES), previews with a muted/looping <video> instead
  // of next/image, but otherwise shares the exact same box/replace/view/
  // delete interaction as "image" — see ADR-089.
  kind: "image" | "icon" | "carouselImage" | "video" | "file";
  // Only meaningful for kind "image"/"carouselImage"/"video" — crops the
  // preview box to this ratio instead of the default 16:9 ("video" as in
  // 16:9, unrelated to the "video" kind). "square" is 1:1 (Before & After's
  // items, and the category banner's own square preview — see ADR-035);
  // "4:3"/"3:4"/"9:16" exist for the same banner's other sizes when shown at
  // their real aspect instead.
  aspect?: "video" | "square" | "4:3" | "3:4" | "9:16";
  // "contain" (default) shows the whole image, letterboxed if its aspect
  // doesn't match the box — the right choice when the box's ratio IS the
  // image's real ratio. "cover" crops to fill instead, for a box whose ratio
  // doesn't match the source (e.g. category banners previewed as a square
  // regardless of their actual 16:9/4:3/3:4/9:16 shape).
  fit?: "contain" | "cover";
  // Defaults to the segment asset uploader; pass a different action for a
  // field that isn't part of a product's segments (e.g. a category banner —
  // see ADR-033) so it lands in that feature's own upload folder instead.
  uploadAction?: (formData: FormData) => Promise<UploadActionResult>;
  // Only meaningful for kind "image"/"carouselImage"/"video". Overrides the
  // box's default `w-full max-w-*` sizing with a caller-supplied class
  // string instead — e.g. `"w-36 h-24"`, explicit fixed width AND height
  // rather than deriving one from the other via the `aspect` ratio. Prefer
  // explicit pairs like this over relying on CSS `aspect-ratio` auto-sizing
  // (one dimension fixed, the other `auto`) inside a `<table>` cell: browsers
  // don't reliably run that auto-sizing during a table's intrinsic
  // column-width measurement, which produces uneven, sometimes
  // text-clipping columns (the homepage banner table hit this). The
  // `aspect-*` ratio class itself is still applied but has no visible effect
  // once both dimensions are explicit.
  boxSizeClassName?: string;
  // Only meaningful for kind "image"/"carouselImage"/"video". Default `true`
  // shows the drag-and-drop box with a live preview. `false` falls through to
  // the same compact "Choose file"-style button kind "file" uses instead —
  // for a spot where a full preview box is more chrome than the field needs
  // (e.g. a document row's thumbnail, where the caller renders its own
  // "view" action alongside).
  preview?: boolean;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, startUploadTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const url = typeof value === "string" ? value : "";

  const handleSelect = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setError(null);

    const formData = new FormData();
    formData.set("kind", kind);
    formData.set("file", file);

    startUploadTransition(async () => {
      const result = await uploadAction(formData);
      if (!result.success) {
        setError(result.error.message);
        return;
      }
      onChange(result.data.url);
    });
  };

  const accept =
    kind === "icon"
      ? "image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
      : kind === "image"
        ? "image/jpeg,image/png,image/webp,image/gif"
        : kind === "carouselImage"
          ? "image/jpeg,image/png,image/webp"
          : kind === "video"
            ? "video/mp4"
            : "image/jpeg,image/png,image/webp,image/gif,application/pdf";

  if (kind === "icon") {
    return (
      <div className="flex flex-col gap-1.5">
        <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={(event) => handleSelect(event.target.files)} />
        <button
          type="button"
          disabled={disabled || isUploading}
          onClick={() => inputRef.current?.click()}
          className="bg-muted hover:border-foreground/50 relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md border-2 border-dashed transition-colors disabled:opacity-50"
        >
          {url ? (
            // Next's built-in optimizer refuses to serve SVG (400) unless
            // `images.dangerouslyAllowSVG` is set in next.config.ts, which it
            // isn't — `unoptimized` bypasses the optimizer for this preview
            // instead of changing that project-wide setting.
            <Image src={url} alt="" fill unoptimized className="object-contain" />
          ) : (
            <ImagePlus className="text-muted-foreground size-4" />
          )}
        </button>
        {error && <p className="text-destructive text-xs">{error}</p>}
      </div>
    );
  }

  if ((kind === "image" || kind === "carouselImage" || kind === "video") && preview) {
    const isVideo = kind === "video";
    const aspectClassName =
      aspect === "square"
        ? "aspect-square"
        : aspect === "4:3"
          ? "aspect-[4/3]"
          : aspect === "3:4"
            ? "aspect-[3/4]"
            : aspect === "9:16"
              ? "aspect-[9/16]"
              : "aspect-video";
    const defaultSizeClassName =
      aspect === "square" ? "w-full max-w-40" : aspect === "4:3" || aspect === "video" ? "w-full max-w-xs" : "w-full max-w-48";
    const boxClassName = cn(
      "bg-muted hover:border-foreground/50 group relative flex items-center justify-center overflow-hidden rounded-md border-2 border-dashed transition-colors",
      disabled && "opacity-50",
      aspectClassName,
      boxSizeClassName ?? defaultSizeClassName
    );
    const objectFitClassName = fit === "cover" ? "object-cover" : "object-contain";

    return (
      <div className="flex flex-col gap-1.5">
        <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={(event) => handleSelect(event.target.files)} />
        {url ? (
          // A plain div, not a <button> — it still opens the file picker on
          // click (to replace the file), but a <button> can't legally
          // contain the "view" link below (nested interactive content), so
          // the click handler moves here instead. The video preview is
          // muted/non-interactive (no `controls`) for the same reason —
          // native controls would swallow this click.
          <div
            role="button"
            tabIndex={disabled || isUploading ? -1 : 0}
            aria-label={isVideo ? "Replace video" : "Replace image"}
            onClick={() => !disabled && !isUploading && inputRef.current?.click()}
            onKeyDown={(event) => {
              if ((event.key === "Enter" || event.key === " ") && !disabled && !isUploading) {
                event.preventDefault();
                inputRef.current?.click();
              }
            }}
            className={cn(boxClassName, "cursor-pointer")}
          >
            {isVideo ? (
              <video src={url} muted loop autoPlay playsInline className={cn("absolute inset-0 size-full", objectFitClassName)} />
            ) : (
              <Image src={url} alt="" fill className={objectFitClassName} />
            )}
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(event) => event.stopPropagation()}
                aria-label={isVideo ? "View video in new tab" : "View full size image"}
                className="bg-background/90 hover:bg-background rounded-md p-2 text-foreground"
              >
                <Eye className="size-4" />
              </a>
              <button
                type="button"
                disabled={disabled}
                onClick={(event) => {
                  event.stopPropagation();
                  onChange("");
                }}
                aria-label={isVideo ? "Delete video" : "Delete image"}
                className="bg-background/90 hover:bg-background text-destructive rounded-md p-2 disabled:pointer-events-none disabled:opacity-50"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
        ) : (
          // `whitespace-normal` overrides the `white-space: pre` some
          // browsers' UA stylesheet puts on <button> by default (notably
          // mobile Safari) — without it this text can't wrap and instead
          // overflows past the box, clipped by its `overflow-hidden`.
          <button
            type="button"
            disabled={disabled || isUploading}
            onClick={() => inputRef.current?.click()}
            className={cn(boxClassName, "whitespace-normal")}
          >
            <span className="text-muted-foreground flex min-w-0 flex-col items-center gap-1 px-1 text-center text-sm wrap-break-word">
              {isVideo ? <VideoIcon className="size-6 shrink-0" /> : <ImagePlus className="size-6 shrink-0" />}
              {isUploading ? "Uploading..." : isVideo ? "Choose video" : "Choose image"}
            </span>
          </button>
        )}
        {error && <p className="text-destructive text-xs">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-1.5">
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={(event) => handleSelect(event.target.files)} />
      {/* Full width and default height so this lines up with an Input beside
          it, with the chosen file's name inside the button rather than in a
          link alongside. */}
      <Button
        type="button"
        variant="secondary"
        disabled={disabled || isUploading}
        onClick={() => inputRef.current?.click()}
        className="w-full justify-start font-normal"
      >
        <Upload className="size-4 shrink-0" />
        <span className="truncate">
          {isUploading ? "Uploading..." : url ? url.split("/").pop() : "Choose file"}
        </span>
      </Button>
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}

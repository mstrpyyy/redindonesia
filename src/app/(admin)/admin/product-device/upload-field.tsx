"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { Eye, ImagePlus, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { uploadSegmentAsset } from "./segment-upload-actions";

// Uploads immediately on file select and reports back a plain URL string —
// see the comment on `uploadSegmentAsset` for why this happens at select
// time rather than at form submit.
//
// Lives in its own file because both the segments builder and the Product
// Files editor need it; it started out inside segments-builder.tsx.
type UploadActionResult =
  | { success: true; data: { url: string } }
  | { success: false; error: { code: string; message: string } };

export function UploadField({
  kind,
  aspect = "video",
  fit = "contain",
  uploadAction = uploadSegmentAsset,
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
  kind: "image" | "icon" | "carouselImage" | "file";
  // Only meaningful for kind "image"/"carouselImage" — crops the preview box
  // to this ratio instead of the default 16:9 ("video"). "square" is 1:1
  // (Before & After's items, and the category banner's own square preview —
  // see ADR-035); "4:3"/"3:4"/"9:16" exist for the same banner's other sizes
  // when shown at their real aspect instead.
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

  if (kind === "image" || kind === "carouselImage") {
    const boxClassName = cn(
      "bg-muted hover:border-foreground/50 group relative flex w-full items-center justify-center overflow-hidden rounded-md border-2 border-dashed transition-colors",
      disabled && "opacity-50",
      aspect === "square"
        ? "aspect-square max-w-40"
        : aspect === "4:3"
          ? "aspect-[4/3] max-w-xs"
          : aspect === "3:4"
            ? "aspect-[3/4] max-w-48"
            : aspect === "9:16"
              ? "aspect-[9/16] max-w-48"
              : "aspect-video max-w-xs"
    );

    return (
      <div className="flex flex-col gap-1.5">
        <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={(event) => handleSelect(event.target.files)} />
        {url ? (
          // A plain div, not a <button> — it still opens the file picker on
          // click (to replace the image), but a <button> can't legally
          // contain the "view full size" <a> below (nested interactive
          // content), so the click handler moves here instead.
          <div
            role="button"
            tabIndex={disabled || isUploading ? -1 : 0}
            aria-label="Replace image"
            onClick={() => !disabled && !isUploading && inputRef.current?.click()}
            onKeyDown={(event) => {
              if ((event.key === "Enter" || event.key === " ") && !disabled && !isUploading) {
                event.preventDefault();
                inputRef.current?.click();
              }
            }}
            className={cn(boxClassName, "cursor-pointer")}
          >
            <Image src={url} alt="" fill className={fit === "cover" ? "object-cover" : "object-contain"} />
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(event) => event.stopPropagation()}
                aria-label="View full size image"
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
                aria-label="Delete image"
                className="bg-background/90 hover:bg-background text-destructive rounded-md p-2 disabled:pointer-events-none disabled:opacity-50"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
        ) : (
          <button type="button" disabled={disabled || isUploading} onClick={() => inputRef.current?.click()} className={boxClassName}>
            <span className="text-muted-foreground flex flex-col items-center gap-1 text-sm">
              <ImagePlus className="size-6" />
              {isUploading ? "Uploading..." : "Choose image"}
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

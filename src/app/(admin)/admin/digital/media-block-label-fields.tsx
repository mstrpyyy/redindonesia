"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { UploadField } from "@/components/upload-field";
import { MAX_DIGITAL_MEDIA_LABEL_IMAGE_LABEL, MAX_DIGITAL_MEDIA_LABEL_LENGTH } from "./limits";
import { uploadDigitalMediaLabelImage } from "./digital-upload-actions";

// The landing-page button's own text + optional visual image — common to
// every media block (youtube/flipbook/document) regardless of what the
// button leads to (see ADR-108). For a "youtube" block, this is the ONE
// button that opens its video page; it is not per-video.
export function MediaBlockLabelFields({
  label,
  imageUrl,
  onLabelChange,
  onImageUrlChange,
}: {
  label: string;
  imageUrl?: string;
  onLabelChange: (value: string) => void;
  onImageUrlChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label>
          Label<span className="text-destructive"> *</span>
        </Label>
        <Input
          value={label}
          onChange={(event) => onLabelChange(event.target.value)}
          maxLength={MAX_DIGITAL_MEDIA_LABEL_LENGTH}
          placeholder="Button label"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Button Image</Label>
        <UploadField
          kind="image"
          aspect="square"
          boxSizeClassName="size-32"
          uploadAction={uploadDigitalMediaLabelImage}
          value={imageUrl ?? ""}
          onChange={(value) => onImageUrlChange((value as string) ?? "")}
        />
        <p className="text-muted-foreground text-xs">This will replace the label for button.</p>
        <p className="text-muted-foreground text-xs">JPEG, PNG, or WEBP. Up to {MAX_DIGITAL_MEDIA_LABEL_IMAGE_LABEL}.</p>
      </div>
    </div>
  );
}

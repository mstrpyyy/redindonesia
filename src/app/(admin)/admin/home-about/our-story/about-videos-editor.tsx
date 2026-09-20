"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UploadField } from "@/components/upload-field";
import type { IAboutVideo } from "@/interfaces/general";
import { uploadAboutPageVideoThumbnail } from "./actions";
import {
  MAX_ABOUT_VIDEOS,
  MAX_ABOUT_VIDEO_DESCRIPTION_LENGTH,
  MAX_ABOUT_VIDEO_HEADING_LENGTH,
} from "./limits";

// The Our Story page's video blocks — a vertical list of cards, each a
// YouTube link with an optional heading, description and poster image.
export function AboutVideosEditor({
  value,
  onChange,
  disabled,
}: {
  value: IAboutVideo[];
  onChange: (next: IAboutVideo[]) => void;
  disabled?: boolean;
}) {
  const atMax = value.length >= MAX_ABOUT_VIDEOS;

  const update = (index: number, patch: Partial<IAboutVideo>) =>
    onChange(value.map((video, i) => (i === index ? { ...video, ...patch } : video)));

  const remove = (index: number) => onChange(value.filter((_, i) => i !== index));

  const add = () =>
    onChange([
      ...value,
      { id: crypto.randomUUID(), youtubeUrl: "", thumbnailUrl: "", heading: "", description: "" },
    ]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-base font-semibold text-brand-red">Videos</span>
        <span className="text-muted-foreground text-xs">
          {value.length} / {MAX_ABOUT_VIDEOS}
        </span>
      </div>

      {value.length === 0 && (
        <p className="text-muted-foreground text-sm">No videos — the video block is hidden on the page.</p>
      )}

      <div className="flex flex-col gap-3">
        {value.map((video, index) => (
          <div key={video.id} className="bg-background flex flex-col gap-3 rounded-md border p-3">
            <div className="flex items-end gap-2">
              <div className="flex flex-1 flex-col gap-1.5">
                <Label className="text-sm font-medium text-foreground">YouTube Link</Label>
                <Input
                  value={video.youtubeUrl}
                  onChange={(event) => update(index, { youtubeUrl: event.target.value })}
                  placeholder="https://www.youtube.com/watch?v=..."
                  disabled={disabled}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Remove video"
                onClick={() => remove(index)}
                disabled={disabled}
                className="text-destructive hover:text-destructive shrink-0"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-sm font-medium text-foreground">Heading (optional)</Label>
              <Input
                value={video.heading}
                onChange={(event) => update(index, { heading: event.target.value })}
                maxLength={MAX_ABOUT_VIDEO_HEADING_LENGTH}
                placeholder="Our Mission in Motion"
                disabled={disabled}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-sm font-medium text-foreground">Description (optional)</Label>
              <Textarea
                value={video.description}
                onChange={(event) => update(index, { description: event.target.value })}
                maxLength={MAX_ABOUT_VIDEO_DESCRIPTION_LENGTH}
                rows={3}
                placeholder="Discover how we've partnered with global leaders..."
                disabled={disabled}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-sm font-medium text-foreground">Thumbnail (optional)</Label>
              <span className="text-muted-foreground -mt-1 text-xs">
                A 16:9 poster shown before the video plays — YouTube&apos;s own thumbnail is used if left empty.
              </span>
              <div className="w-64">
                <UploadField
                  kind="image"
                  aspect="video"
                  uploadAction={uploadAboutPageVideoThumbnail}
                  value={video.thumbnailUrl}
                  onChange={(value) => update(index, { thumbnailUrl: (value as string) ?? "" })}
                  disabled={disabled}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
        disabled={disabled || atMax}
        onClick={add}
      >
        Add video <Plus className="size-4" />
      </Button>
    </div>
  );
}

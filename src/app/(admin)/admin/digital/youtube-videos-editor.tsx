"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { IDigitalYoutubeVideo } from "@/interfaces/digital";
import { createEmptyDigitalYoutubeVideo } from "./digital-media";
import { MAX_DIGITAL_YOUTUBE_DESCRIPTION_LENGTH, MAX_DIGITAL_YOUTUBE_TITLE_LENGTH } from "./limits";

// A youtube block's videos live on its own video page, not as landing-page
// buttons (see ADR-108) — no label/image here, just what that page shows:
// the URL (required) and an optional title/description caption. At least one
// row always stays on screen and isn't removable — a youtube block with zero
// videos has nothing for its button to lead to.
export function YoutubeVideosEditor({
  videos,
  onChange,
}: {
  videos: IDigitalYoutubeVideo[];
  onChange: (videos: IDigitalYoutubeVideo[]) => void;
}) {
  const update = (index: number, next: IDigitalYoutubeVideo) => {
    onChange(videos.map((video, i) => (i === index ? next : video)));
  };
  const canRemove = videos.length > 1;

  return (
    <div className="flex flex-col gap-3">
      {videos.map((video, index) => (
        <div key={video.id} className="flex flex-col gap-2 rounded-md border p-3">
          <div className="flex items-start gap-2">
            <div className="flex flex-1 flex-col gap-2">
              <div className="flex flex-col gap-1.5">
                <Label>
                  Video URL<span className="text-destructive"> *</span>
                </Label>
                <Input
                  type="url"
                  value={video.url}
                  onChange={(event) => update(index, { ...video, url: event.target.value })}
                  placeholder="https://www.youtube.com/watch?v=..."
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Title</Label>
                <Input
                  value={video.title ?? ""}
                  onChange={(event) => update(index, { ...video, title: event.target.value })}
                  maxLength={MAX_DIGITAL_YOUTUBE_TITLE_LENGTH}
                  placeholder="Video title"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Description</Label>
                <Textarea
                  value={video.description ?? ""}
                  onChange={(event) => update(index, { ...video, description: event.target.value })}
                  maxLength={MAX_DIGITAL_YOUTUBE_DESCRIPTION_LENGTH}
                  placeholder="Video description"
                  rows={2}
                />
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Remove video ${index + 1}`}
              disabled={!canRemove}
              onClick={() => onChange(videos.filter((_, i) => i !== index))}
              className="text-destructive hover:text-destructive shrink-0 disabled:pointer-events-none disabled:opacity-40"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>
      ))}

      <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => onChange([...videos, createEmptyDigitalYoutubeVideo()])}>
        Add video <Plus className="size-4" />
      </Button>
    </div>
  );
}

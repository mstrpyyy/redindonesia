"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UploadField } from "@/components/upload-field";
import { IPodcast } from "@/interfaces/general";
import { createPodcast, updatePodcast, uploadPodcastThumbnail } from "./actions";
import { MAX_PODCAST_DESCRIPTION_LENGTH, MAX_PODCAST_TITLE_LENGTH } from "./limits";

interface IPodcastFormProps {
  podcast?: IPodcast;
  onSuccess?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
  onPendingChange?: (pending: boolean) => void;
}

export function PodcastForm({
  podcast,
  onSuccess,
  onDirtyChange,
  onPendingChange,
}: IPodcastFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const initialYoutubeUrl = podcast?.youtubeUrl ?? "";
  const initialTitle = podcast?.title ?? "";
  const initialDescription = podcast?.description ?? "";
  const initialThumbnailUrl = podcast?.thumbnailUrl ?? "";
  const [youtubeUrl, setYoutubeUrl] = useState(initialYoutubeUrl);
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [thumbnailUrl, setThumbnailUrl] = useState(initialThumbnailUrl);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isEdit = podcast !== undefined;

  const isDirty =
    youtubeUrl !== initialYoutubeUrl ||
    title !== initialTitle ||
    description !== initialDescription ||
    thumbnailUrl !== initialThumbnailUrl;

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    onPendingChange?.(isPending);
  }, [isPending, onPendingChange]);

  const handleSubmit = (formData: FormData) => {
    setError(null);
    formData.set("thumbnailUrl", thumbnailUrl);

    startTransition(async () => {
      try {
        const result = isEdit
          ? await updatePodcast(podcast.id, formData)
          : await createPodcast(formData);
        if (!result.success) {
          setError(result.error.message);
          return;
        }
        formRef.current?.reset();
        if (!isEdit) {
          setYoutubeUrl("");
          setTitle("");
          setDescription("");
          setThumbnailUrl("");
        }
        onDirtyChange?.(false);
        onSuccess?.();
      } catch {
        setError("Something went wrong while saving. Please try again.");
      }
    });
  };

  return (
    <form ref={formRef} action={handleSubmit} className="flex min-h-0 flex-1 flex-col gap-4">
      {/* Only this middle section scrolls — Save (and the error message)
          stay pinned below it, same pattern as CategoryForm/GalleryForm
          rather than the whole dialog (header included) scrolling. */}
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-1 py-1">
        <div className="flex flex-col gap-2">
          <Label htmlFor="youtubeUrl">YouTube Link</Label>
          <Input
            id="youtubeUrl"
            name="youtubeUrl"
            type="url"
            placeholder="https://www.youtube.com/watch?v=..."
            value={youtubeUrl}
            onChange={(event) => setYoutubeUrl(event.target.value)}
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            name="title"
            placeholder="Episode title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={MAX_PODCAST_TITLE_LENGTH}
            required
          />
          <p className="text-muted-foreground text-right text-xs">
            {title.length}/{MAX_PODCAST_TITLE_LENGTH}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            name="description"
            placeholder="What this episode is about"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={MAX_PODCAST_DESCRIPTION_LENGTH}
          />
          <p className="text-muted-foreground text-right text-xs">
            {description.length}/{MAX_PODCAST_DESCRIPTION_LENGTH}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Label>Thumbnail (optional)</Label>
          <UploadField
            kind="image"
            aspect="video"
            fit="cover"
            uploadAction={uploadPodcastThumbnail}
            value={thumbnailUrl}
            onChange={(value) => setThumbnailUrl((value as string) ?? "")}
          />
        </div>
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving..." : "Save"}
      </Button>
    </form>
  );
}

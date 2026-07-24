"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Globe, ImagePlus } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { IArticle } from "@/interfaces/general";
import { createArticle, updateArticle } from "./actions";
import { RichTextEditor } from "./rich-text-editor";
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_EXCERPT_LENGTH,
  MAX_THUMBNAIL_LABEL,
  MAX_THUMBNAIL_SIZE,
  MAX_TITLE_LENGTH,
} from "./limits";

interface IArticleFormProps {
  article?: IArticle;
}

export function ArticleForm({ article }: IArticleFormProps) {
  const router = useRouter();
  const isEdit = article !== undefined;
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(article?.title ?? "");
  const [excerpt, setExcerpt] = useState(article?.excerpt ?? "");
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(
    article?.coverImage ?? null
  );
  const [content, setContent] = useState(article?.content ?? "");
  const [error, setError] = useState<string | null>(null);
  const [confirmingPublish, setConfirmingPublish] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isDirty =
    title !== (article?.title ?? "") ||
    excerpt !== (article?.excerpt ?? "") ||
    content !== (article?.content ?? "") ||
    Boolean(thumbnail);

  // Covers the browser/tab-close case — in-app navigation (the Cancel button)
  // is handled separately below, since this event can't show a custom dialog,
  // only the browser's own generic confirmation.
  useEffect(() => {
    if (!isDirty) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const handleThumbnailSelected = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;

    if (file.size > MAX_THUMBNAIL_SIZE) {
      setError(`Thumbnail must be smaller than ${MAX_THUMBNAIL_LABEL}.`);
      return;
    }
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setError("Thumbnail must be a JPEG, PNG, WEBP, or GIF.");
      return;
    }

    setError(null);
    if (thumbnailPreview?.startsWith("blob:")) URL.revokeObjectURL(thumbnailPreview);
    setThumbnail(file);
    setThumbnailPreview(URL.createObjectURL(file));
  };

  const validate = (status: "draft" | "published"): string | null => {
    const hasThumbnail = Boolean(thumbnail) || Boolean(article?.coverImage);

    if (status === "published") {
      if (!hasThumbnail) return "A thumbnail is required to publish.";
      if (!title.trim()) return "Title is required to publish.";
      if (!content.trim()) return "Article content is required to publish.";
    } else if (!title.trim() && !excerpt.trim() && !content.trim() && !hasThumbnail) {
      return "Fill in at least one field to save a draft.";
    }
    return null;
  };

  const submit = (status: "draft" | "published") => {
    if (!formRef.current) return;

    const formData = new FormData(formRef.current);
    if (thumbnail) formData.set("thumbnail", thumbnail);
    else formData.delete("thumbnail");
    formData.set("content", content);
    formData.set("status", status);

    startTransition(async () => {
      try {
        const result = isEdit
          ? await updateArticle(article.id, formData)
          : await createArticle(formData);
        if (!result.success) {
          setError(result.error.message);
          return;
        }
        router.push("/admin/media/articles");
      } catch {
        setError("Something went wrong while saving. Please try again.");
      }
    });
  };

  const handleSaveDraft = () => {
    setError(null);
    const validationError = validate("draft");
    if (validationError) {
      setError(validationError);
      return;
    }
    submit("draft");
  };

  // Publishing always goes through a confirmation dialog — validated first so
  // the dialog only appears when the article is actually ready to publish.
  const handlePublishClick = () => {
    setError(null);
    const validationError = validate("published");
    if (validationError) {
      setError(validationError);
      return;
    }
    setConfirmingPublish(true);
  };

  const confirmPublish = () => {
    setConfirmingPublish(false);
    submit("published");
  };

  const handleCancelClick = () => {
    if (isDirty) setConfirmingCancel(true);
    else router.back();
  };

  const confirmCancel = () => {
    setConfirmingCancel(false);
    router.back();
  };

  return (
    <form ref={formRef} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          name="title"
          placeholder="Article title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={MAX_TITLE_LENGTH}
        />
        <p className="text-muted-foreground text-right text-xs">
          {title.length}/{MAX_TITLE_LENGTH}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="excerpt">Excerpt</Label>
        <Textarea
          id="excerpt"
          name="excerpt"
          placeholder="Optional excerpt"
          value={excerpt}
          onChange={(event) => setExcerpt(event.target.value)}
          maxLength={MAX_EXCERPT_LENGTH}
        />
        <p className="text-muted-foreground text-right text-xs">
          {excerpt.length}/{MAX_EXCERPT_LENGTH}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="thumbnail">Thumbnail</Label>
        <input
          ref={fileInputRef}
          id="thumbnail"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(event) => handleThumbnailSelected(event.target.files)}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="bg-muted hover:border-foreground/50 relative flex aspect-[16/9] w-full max-w-sm items-center justify-center overflow-hidden rounded-md border-2 border-dashed transition-colors"
        >
          {thumbnailPreview ? (
            <Image
              src={thumbnailPreview}
              alt="Thumbnail preview"
              fill
              className="object-cover"
            />
          ) : (
            <span className="text-muted-foreground flex flex-col items-center gap-1 text-sm">
              <ImagePlus className="size-6" />
              Choose thumbnail
            </span>
          )}
        </button>
        <p className="text-muted-foreground text-xs">
          {isEdit
            ? `Choose a file to replace it, or leave empty to keep it. Up to ${MAX_THUMBNAIL_LABEL}.`
            : `Optional for drafts, required to publish. Up to ${MAX_THUMBNAIL_LABEL}.`}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Content</Label>
        <RichTextEditor value={content} onChange={setContent} />
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      <div className="flex items-center justify-between gap-2">
        <Button type="button" variant="secondary" disabled={isPending} onClick={handleCancelClick}>
          Cancel
        </Button>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={handleSaveDraft}
            className="w-36"
          >
            {isPending ? "Saving..." : "Save as draft"}
          </Button>
          <Button type="button" disabled={isPending} onClick={handlePublishClick} className="w-36">
            {isPending ? "Publishing..." : "Publish"}
            <Globe className="size-4" />
          </Button>
        </div>
      </div>

      <AlertDialog open={confirmingPublish} onOpenChange={setConfirmingPublish}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publish this article?</AlertDialogTitle>
            <AlertDialogDescription>
              It will become visible on the public site. You can unpublish it again
              later from the article list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={isPending} onClick={confirmPublish}>
              {isPending ? "Publishing..." : "Publish"}
              <Globe className="size-4" />
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmingCancel} onOpenChange={setConfirmingCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes to this article. Leaving now will discard
              them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancel}>Discard</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}

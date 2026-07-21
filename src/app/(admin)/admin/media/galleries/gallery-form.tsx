"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { Plus, X } from "lucide-react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { restrictToParentElement } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { IGallery } from "@/interfaces/general";
import { createGallery, updateGallery } from "./actions";
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_GALLERY_IMAGES,
  MAX_GALLERY_IMG_LABEL,
  MAX_GALLERY_IMG_SIZE,
  NEW_IMAGE_TOKEN,
} from "./upload-limits";

type GalleryImageItem =
  | { id: string; kind: "existing"; src: string }
  | { id: string; kind: "new"; file: File; previewUrl: string };

interface IGalleryFormProps {
  gallery?: IGallery;
  onSuccess?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
  onPendingChange?: (pending: boolean) => void;
}

interface ISortableImageTileProps {
  item: GalleryImageItem;
  onRemove: (id: string) => void;
}

function SortableImageTile({ item, onRemove }: ISortableImageTileProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });
  const src = item.kind === "existing" ? item.src : item.previewUrl;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      className={cn(
        "group bg-muted relative aspect-square cursor-grab touch-none overflow-hidden rounded-md active:cursor-grabbing",
        isDragging && "relative z-10 shadow-lg"
      )}
    >
      <Image
        src={src}
        alt=""
        fill
        sizes="200px"
        draggable={false}
        className="object-cover"
      />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
        <span className="text-xs font-medium text-white">Drag to reorder</span>
      </div>
      <button
        type="button"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={() => onRemove(item.id)}
        aria-label="Remove image"
        className="bg-destructive absolute top-1 right-1 rounded-full p-1 text-white opacity-0 transition-opacity hover:bg-destructive/90 group-hover:opacity-100"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}

export function GalleryForm({
  gallery,
  onSuccess,
  onDirtyChange,
  onPendingChange,
}: IGalleryFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initialTitle = gallery?.title ?? "";
  const initialDescription = gallery?.description ?? "";
  const initialImages = gallery?.images ?? [];
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [images, setImages] = useState<GalleryImageItem[]>(() =>
    initialImages.map((src) => ({ id: src, kind: "existing" as const, src }))
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const dndId = useId();
  const isEdit = gallery !== undefined;

  const currentExistingSrcs = images
    .filter((item): item is Extract<GalleryImageItem, { kind: "existing" }> => item.kind === "existing")
    .map((item) => item.src);
  const isDirty =
    title !== initialTitle ||
    description !== initialDescription ||
    images.some((item) => item.kind === "new") ||
    currentExistingSrcs.length !== initialImages.length ||
    currentExistingSrcs.some((src, index) => src !== initialImages[index]);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    onPendingChange?.(isPending);
  }, [isPending, onPendingChange]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Revoke on unmount only — a ref keeps the cleanup reading the latest
  // `images` without re-running the effect (and revoking still-in-use URLs)
  // on every reorder.
  const imagesRef = useRef(images);
  useEffect(() => {
    imagesRef.current = images;
  }, [images]);
  useEffect(() => {
    return () => {
      for (const item of imagesRef.current) {
        if (item.kind === "new") URL.revokeObjectURL(item.previewUrl);
      }
    };
  }, []);

  const handleFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const selected = Array.from(files);
    if (images.length + selected.length > MAX_GALLERY_IMAGES) {
      setError(`A gallery can have at most ${MAX_GALLERY_IMAGES} images.`);
      return;
    }
    for (const file of selected) {
      if (file.size > MAX_GALLERY_IMG_SIZE) {
        setError(`Each image must be smaller than ${MAX_GALLERY_IMG_LABEL}.`);
        return;
      }
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        setError("Images must be JPEG, PNG, WEBP, or GIF.");
        return;
      }
    }

    setError(null);
    setImages((current) => [
      ...current,
      ...selected.map((file) => ({
        id: crypto.randomUUID(),
        kind: "new" as const,
        file,
        previewUrl: URL.createObjectURL(file),
      })),
    ]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = (id: string) => {
    setImages((current) => {
      const target = current.find((item) => item.id === id);
      if (target?.kind === "new") URL.revokeObjectURL(target.previewUrl);
      return current.filter((item) => item.id !== id);
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setImages((current) => {
      const oldIndex = current.findIndex((item) => item.id === active.id);
      const newIndex = current.findIndex((item) => item.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return current;
      return arrayMove(current, oldIndex, newIndex);
    });
  };

  const handleSubmit = (formData: FormData) => {
    setError(null);

    if (images.length === 0) {
      setError("At least one image is required.");
      return;
    }

    formData.delete("images");
    if (isEdit) {
      const imageOrder = images.map((item) => {
        if (item.kind === "existing") return item.src;
        formData.append("images", item.file);
        return NEW_IMAGE_TOKEN;
      });
      formData.set("imageOrder", JSON.stringify(imageOrder));
    } else {
      for (const item of images) {
        if (item.kind === "new") formData.append("images", item.file);
      }
    }

    startTransition(async () => {
      try {
        const result = isEdit
          ? await updateGallery(gallery.id, formData)
          : await createGallery(formData);
        if (!result.success) {
          setError(result.error.message);
          return;
        }
        formRef.current?.reset();
        if (!isEdit) {
          setImages([]);
          setTitle("");
          setDescription("");
        }
        onDirtyChange?.(false);
        onSuccess?.();
      } catch {
        setError("Something went wrong while saving. Please try again.");
      }
    });
  };

  return (
    <form
      ref={formRef}
      action={handleSubmit}
      className="flex min-h-0 flex-1 flex-col gap-4"
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          name="title"
          placeholder="IMCAS World Congress 2026"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          placeholder="Palais des Congrès de Paris, Paris, France"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          required
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2">
        <Label>Images</Label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          className="hidden"
          onChange={(event) => handleFilesSelected(event.target.files)}
        />
        <div className="min-h-0 flex-1 overflow-y-auto rounded-md border p-3">
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={images.length >= MAX_GALLERY_IMAGES}
              aria-label="Add images"
              className="text-muted-foreground hover:text-foreground hover:border-foreground/50 flex aspect-square items-center justify-center rounded-md border-2 border-dashed transition-colors disabled:pointer-events-none disabled:opacity-50"
            >
              <Plus className="size-6" />
            </button>
            <DndContext
              id={dndId}
              sensors={sensors}
              collisionDetection={closestCenter}
              modifiers={[restrictToParentElement]}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={images.map((item) => item.id)}
                strategy={rectSortingStrategy}
              >
                {images.map((item) => (
                  <SortableImageTile key={item.id} item={item} onRemove={removeImage} />
                ))}
              </SortableContext>
            </DndContext>
          </div>
        </div>
        <p className="text-muted-foreground text-xs">
          Up to {MAX_GALLERY_IMAGES} images, {MAX_GALLERY_IMG_LABEL} each. Drag to
          reorder.
        </p>
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving..." : "Save"}
      </Button>
    </form>
  );
}

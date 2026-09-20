"use client";

import { useId, useRef, useState, useTransition } from "react";
import Image from "next/image";
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
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Loader2, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { IHomeCertification } from "@/interfaces/general";
import { uploadHomePageCertificationLogo } from "./actions";
import {
  ACCEPTED_HOME_CERTIFICATION_IMAGE_TYPES,
  MAX_HOME_CERTIFICATIONS,
  MAX_HOME_CERTIFICATION_IMAGE_LABEL,
  MIN_HOME_CERTIFICATIONS,
} from "./limits";

function SortableLogoCard({
  cert,
  onRemove,
  disabled,
}: {
  cert: IHomeCertification;
  onRemove: () => void;
  disabled: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: cert.id,
    disabled,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      className={cn(
        "bg-background relative aspect-square w-44 touch-none rounded-md border",
        disabled ? "cursor-default" : "cursor-grab active:cursor-grabbing",
        isDragging && "z-10 shadow-lg"
      )}
    >
      <button
        type="button"
        aria-label="Remove certification"
        onClick={onRemove}
        onPointerDown={(event) => event.stopPropagation()}
        disabled={disabled}
        className="bg-background text-destructive hover:bg-destructive/10 absolute -top-2 -right-2 z-10 rounded-full border p-1 disabled:pointer-events-none disabled:opacity-40"
      >
        <Trash2 className="size-3.5" />
      </button>

      {!disabled && (
        <span
          aria-hidden="true"
          className="text-muted-foreground/70 pointer-events-none absolute top-1 left-1 z-10"
        >
          <GripVertical className="size-4" />
        </span>
      )}

      <Image src={cert.image} alt="" fill sizes="176px" className="pointer-events-none object-contain p-4" />
    </div>
  );
}

// The certification logo strip. Existing logos show as preview cards that can
// be dragged to reorder; adding is a single "+ Add logo" card whose file
// picker takes multiple files at once. To change a logo, remove it and add
// another.
export function CertificationsEditor({
  value,
  onChange,
  disabled,
}: {
  value: IHomeCertification[];
  onChange: (next: IHomeCertification[]) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  // Stable id so dnd-kit's `aria-describedby` matches between SSR and the
  // client (its default is a module-level counter that drifts).
  const dndId = useId();
  const [isUploading, startUpload] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const atMax = value.length >= MAX_HOME_CERTIFICATIONS;
  const remaining = MAX_HOME_CERTIFICATIONS - value.length;
  const busy = Boolean(disabled) || isUploading;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const remove = (index: number) => onChange(value.filter((_, i) => i !== index));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = value.findIndex((cert) => cert.id === active.id);
    const newIndex = value.findIndex((cert) => cert.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onChange(arrayMove(value, oldIndex, newIndex));
  };

  const handleFiles = (fileList: FileList | null) => {
    const files = Array.from(fileList ?? []).slice(0, remaining);
    if (inputRef.current) inputRef.current.value = "";
    if (files.length === 0) return;

    setError(null);
    startUpload(async () => {
      const uploaded: IHomeCertification[] = [];
      let lastError: string | null = null;

      for (const file of files) {
        const formData = new FormData();
        formData.set("file", file);
        const result = await uploadHomePageCertificationLogo(formData);
        if (result.success) {
          uploaded.push({ id: crypto.randomUUID(), image: result.data.url });
        } else {
          lastError = result.error.message;
        }
      }

      if (uploaded.length > 0) onChange([...value, ...uploaded]);
      if (lastError) setError(lastError);
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-base font-semibold text-brand-red">Logos</span>
        <span className="text-muted-foreground text-xs">
          {value.length} / {MAX_HOME_CERTIFICATIONS} (min {MIN_HOME_CERTIFICATIONS})
        </span>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED_HOME_CERTIFICATION_IMAGE_TYPES.join(",")}
        className="hidden"
        onChange={(event) => handleFiles(event.target.files)}
      />

      <div className="flex flex-wrap items-stretch gap-3">
        <DndContext id={dndId} sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={value.map((cert) => cert.id)} strategy={rectSortingStrategy}>
            {value.map((cert, index) => (
              <SortableLogoCard
                key={cert.id}
                cert={cert}
                onRemove={() => remove(index)}
                disabled={busy}
              />
            ))}
          </SortableContext>
        </DndContext>

        {!atMax && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="text-muted-foreground hover:border-foreground/50 hover:text-foreground flex aspect-square w-44 flex-col items-center justify-center gap-2 rounded-md border border-dashed transition-colors disabled:pointer-events-none disabled:opacity-50"
          >
            {isUploading ? <Loader2 className="size-6 animate-spin" /> : <Plus className="size-6" />}
            <span className="text-sm font-medium">{isUploading ? "Uploading..." : "Add logo"}</span>
          </button>
        )}
      </div>

      {error && <p className="text-destructive text-xs">{error}</p>}
      <span className="text-muted-foreground text-xs">
        PNG or JPG, up to {MAX_HOME_CERTIFICATION_IMAGE_LABEL} each — pick several at once, drag to reorder.
      </span>
    </div>
  );
}

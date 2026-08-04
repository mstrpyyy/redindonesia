"use client";

import { useRef, useState, useTransition } from "react";
import NextImage from "next/image";
import { ChevronDown, ChevronRight, ChevronUp, CircleCheck, Plus, Trash2, Upload } from "lucide-react";
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
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  ADDABLE_SEGMENT_TYPES,
  createEmptyListItem,
  createEmptySegmentData,
  getSegmentTypeDef,
  isSegmentComplete,
  type IFieldDef,
} from "./segment-types";
import { UploadField } from "@/components/upload-field";
import { CharLimitWarning, isAtCharLimit } from "@/components/char-limit-warning";
import { SEGMENT_BACKGROUND_COLORS, getSegmentBackgroundColor } from "@/lib/segment-colors";
import { uploadViewer360Frames } from "./viewer360-upload-actions";
import { uploadSegmentContentImage } from "./segment-upload-actions";
import { RichTextEditor } from "@/components/rich-text-editor";
import { HeroTextColorPicker } from "./hero-text-color-picker";
import Viewer360 from "@/app/(user)/components/Viewer360";
import { MAX_VIEWER360_FRAMES, MAX_VIEWER360_FRAME_LABEL } from "./limits";
import type { ICertification, IHeroDoc } from "@/interfaces/segments";
import { getCertificationLogo, getCertificationSubLabel } from "@/lib/certification-logos";

export type ISegmentRecord = Record<string, unknown> & {
  id: string;
  type: string;
  name?: string;
  showInNav?: boolean;
};


// A swatch-driven picker instead of a text dropdown — reads directly from
// SEGMENT_BACKGROUND_COLORS rather than field.options, since this type only
// ever backs that one list. Same popover-and-grid shape as the product card
// background picker in product-form.tsx.
function ColorSwatchInput({
  value,
  onChange,
  disabled,
}: {
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const current = getSegmentBackgroundColor(typeof value === "string" ? value : undefined);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label={`Background color: ${current.label}`}
          className="border-input hover:border-foreground/50 flex w-fit items-center gap-2 rounded-md border bg-transparent p-2 shadow-xs transition-colors disabled:opacity-50"
        >
          <span className={cn("size-6 rounded-sm border", current.bgClassName)} />
          <span className="text-sm">{current.label}</span>
          <ChevronDown className="size-4 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-2">
        <div className="grid grid-cols-7 gap-2">
          {SEGMENT_BACKGROUND_COLORS.map((option) => (
            <button
              key={option.value}
              type="button"
              title={option.label}
              aria-label={option.label}
              aria-pressed={option.value === current.value}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={cn(
                "size-8 rounded-sm border transition-shadow",
                option.bgClassName,
                option.value === current.value && "ring-foreground ring-2 ring-offset-1"
              )}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// One combined control for the viewer360 special-case below, standing in for
// the segment's imgUrlTemplate/totalFrames/extension fields — see ADR-029.
// Order comes from the uploaded files' names (numeric-aware), not selection
// order, so nothing here needs to let the admin reorder frames by hand.
// A turntable sequence is assumed to be one consistent frame size throughout
// (same camera/rig for every shot), so reading just one frame's natural
// dimensions is enough to size the whole viewer correctly — without this,
// Viewer360 falls back to a hardcoded 600x400 canvas and stretches whatever
// aspect ratio the real frames are to fit it.
function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image dimensions"));
    };
    img.src = url;
  });
}

function Viewer360FramesInput({
  imgUrlTemplate,
  totalFrames,
  extension,
  width,
  height,
  onChange,
}: {
  imgUrlTemplate: string;
  totalFrames: number | undefined;
  extension: string;
  width?: number;
  height?: number;
  onChange: (patch: {
    imgUrlTemplate: string;
    extension: string;
    totalFrames: number;
    width?: number;
    height?: number;
  }) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, startUploadTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const hasFrames = Boolean(imgUrlTemplate) && totalFrames !== undefined && totalFrames > 0;

  const handleSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);

    const formData = new FormData();
    Array.from(files).forEach((file) => formData.append("frames", file));

    startUploadTransition(async () => {
      // Read dimensions from whichever frame the browser gives us first —
      // order doesn't matter here, only the size, which every frame shares.
      // A failed read (corrupt file the upload itself will also reject, or
      // an odd format) just skips auto-sizing rather than failing the upload.
      const [result, dimensions] = await Promise.all([
        uploadViewer360Frames(formData),
        readImageDimensions(files[0]).catch(() => null),
      ]);
      if (!result.success) {
        setError(result.error.message);
        return;
      }
      onChange({ ...result.data, ...(dimensions ?? {}) });
    });
  };

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
      <div className="flex flex-col gap-1.5">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          className="hidden"
          onChange={(event) => handleSelect(event.target.files)}
        />
        <Button
          type="button"
          variant="outline"
          disabled={isUploading}
          onClick={() => inputRef.current?.click()}
          className="w-fit"
        >
          <Upload className="size-4" />
          {isUploading ? "Uploading..." : hasFrames ? `Replace ${totalFrames} frames` : "Choose frames"}
        </Button>
        <p className="text-muted-foreground text-xxs">
          Up to {MAX_VIEWER360_FRAMES} images, {MAX_VIEWER360_FRAME_LABEL} each.
        </p>
        {!isUploading && hasFrames && (
          <p className="text-muted-foreground text-xxs">
            {totalFrames} frames uploaded ({extension}).
          </p>
        )}
        {error && <p className="text-destructive text-xs">{error}</p>}
      </div>

      {!isUploading && imgUrlTemplate && totalFrames !== undefined && totalFrames > 0 && (
        // The actual public component, not a mock-up — `key` forces a
        // remount on re-upload so a new batch doesn't inherit the previous
        // one's already-loaded/visible state.
        <div className="max-w-xs">
          <Viewer360
            key={imgUrlTemplate}
            imgUrlTemplate={imgUrlTemplate}
            totalFrames={totalFrames}
            extension={extension}
            width={width}
            height={height}
          />
        </div>
      )}
    </div>
  );
}

// Marks a required field's label instead of every optional one saying so —
// fewer suffixes to read, and the one thing that blocks saving stands out.
function FieldLabelText({ field }: { field: Pick<IFieldDef, "label" | "required"> }) {
  return (
    <>
      {field.label}
      {field.required && <span className="text-destructive"> *</span>}
    </>
  );
}

function isImageFieldType(type: IFieldDef["type"]) {
  return type === "image" || type === "icon" || type === "carouselImage" || type === "file";
}

// One list item's field: label (with the required asterisk) + input + help
// text — shared across every itemFieldLayout so each only differs in how it
// arranges these blocks, not in what a block looks like.
function ItemFieldBlock({
  itemField,
  value,
  onChange,
}: {
  itemField: IFieldDef;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>
        <FieldLabelText field={itemField} />
      </Label>
      <FieldInput field={itemField} value={value} onChange={onChange} />
      {itemField.helpText && <p className="text-muted-foreground text-xxs">{itemField.helpText}</p>}
    </div>
  );
}

function FieldInput({
  field,
  value,
  onChange,
  disabled,
}: {
  field: IFieldDef;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
}) {
  if (field.type === "textarea") {
    return (
      <>
        <Textarea
          value={(value as string) ?? ""}
          onChange={(event) => onChange(event.target.value)}
          required={field.required}
          maxLength={field.maxLength}
          placeholder={field.placeholder}
          disabled={disabled}
        />
        {isAtCharLimit(value, field.maxLength) && <CharLimitWarning maxLength={field.maxLength!} />}
      </>
    );
  }

  if (field.type === "number") {
    return (
      <Input
        type="number"
        value={value === undefined || value === null ? "" : String(value)}
        onChange={(event) => onChange(event.target.value === "" ? undefined : Number(event.target.value))}
        required={field.required}
        disabled={disabled}
      />
    );
  }

  if (field.type === "select") {
    // Falls back to the field's own default (e.g. Highlight's `imageFit`
    // defaults to "fill") for a segment saved before this field existed —
    // otherwise the editor would show a blank "Select..." while the public
    // page (which defaults the same way) already renders a specific value.
    return (
      <Select value={(value as string) ?? field.defaultValue ?? ""} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select..." />
        </SelectTrigger>
        <SelectContent>
          {field.options?.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (field.type === "colorSwatch") {
    // Falls back to the field's own default (e.g. techSpecs' "peach", not
    // ColorSwatchInput's generic black) for a segment saved before this
    // field existed — otherwise the editor would show Black while the
    // public page (which defaults the same way) actually renders Peach.
    return <ColorSwatchInput value={value ?? field.defaultValue} onChange={onChange} disabled={disabled} />;
  }

  if (field.type === "heroTextColor") {
    return <HeroTextColorPicker value={(value as string) ?? ""} onChange={onChange} />;
  }

  if (field.type === "richText") {
    return (
      <RichTextEditor
        value={(value as string) ?? ""}
        onChange={onChange}
        onUploadImage={uploadSegmentContentImage}
        placeholder={field.placeholder}
        // Mirrors the public product page's own h2/h3/p typography — the
        // Text & Image (Highlight) segment's scale, not the page-hero scale
        // CategoryPageView's body uses — so what's typed here previews
        // close to how it will actually render.
        contentClassName="tiptap-content-product tiptap-content-product-compact"
      />
    );
  }

  if (isImageFieldType(field.type)) {
    return (
      <UploadField
        kind={field.type as "image" | "icon" | "carouselImage" | "file"}
        aspect={field.imageAspect}
        value={value}
        onChange={onChange}
        disabled={disabled}
      />
    );
  }

  return (
    <>
      <Input
        type={field.type === "url" ? "text" : "text"}
        value={(value as string) ?? ""}
        onChange={(event) => onChange(event.target.value)}
        required={field.required}
        maxLength={field.maxLength}
        placeholder={field.placeholder}
        disabled={disabled}
      />
      {isAtCharLimit(value, field.maxLength) && <CharLimitWarning maxLength={field.maxLength!} />}
    </>
  );
}

function ListField({
  field,
  items,
  onChange,
  columns = 1,
}: {
  field: IFieldDef;
  items: Record<string, unknown>[];
  onChange: (items: Record<string, unknown>[]) => void;
  // Only the "List" segment (type: "treatments") passes 2 — every other
  // caller keeps the plain single-column stack.
  columns?: 1 | 2;
}) {
  const itemFields = field.itemFields ?? [];

  const updateItem = (index: number, key: string, value: unknown) => {
    onChange(items.map((item, i) => (i === index ? { ...item, [key]: value } : item)));
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  // One row per item, no card border — each itemField
  // renders inline instead of stacked with its own label, and an "icon"
  // field renders as the square UploadField variant so the icon slot sits at
  // the same height as the row's text input. A "textarea" field only drops
  // to its own full-width line underneath when there's a shorter field (e.g.
  // Accordion's title) it would otherwise have to squeeze next to on the
  // same row. When a textarea is the row's only non-icon field (e.g. the
  // List segment's item name), there's nothing to protect from being
  // squeezed, so it stays inline at the same level as the icon/buttons
  // instead of dropping to an indented line below.
  if (field.itemsLayout === "table") {
    const iconField = itemFields.find((itemField) => itemField.type === "icon");
    const nonIconFields = itemFields.filter((itemField) => itemField.type !== "icon");
    const hasShorterInlineField = nonIconFields.some((itemField) => itemField.type !== "textarea");
    const contentFields = hasShorterInlineField
      ? nonIconFields.filter((itemField) => itemField.type !== "textarea")
      : nonIconFields;
    const blockFields = hasShorterInlineField ? nonIconFields.filter((itemField) => itemField.type === "textarea") : [];

    return (
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3">
          {items.map((item, index) => (
            // A real grid, not two stacked flex rows — `blockFields` sits in
            // `col-start-2` so it lines up exactly under `contentFields`
            // (e.g. the description under the title), regardless of how wide
            // the index/icon column or the button cluster actually render.
            <div key={index} className="grid grid-cols-[auto_1fr_auto] items-center gap-x-2 gap-y-2">
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-muted-foreground w-8 shrink-0 text-sm font-medium tabular-nums">
                  #{index + 1}
                </span>
                {iconField && (
                  <FieldInput
                    field={iconField}
                    value={item[iconField.key]}
                    onChange={(value) => updateItem(index, iconField.key, value)}
                  />
                )}
              </div>

              <div className="flex items-center gap-2">
                {contentFields.map((itemField) => (
                  <div key={itemField.key} className="flex-1">
                    <FieldInput
                      field={itemField}
                      value={item[itemField.key]}
                      onChange={(value) => updateItem(index, itemField.key, value)}
                    />
                  </div>
                ))}
              </div>

              <div className="flex shrink-0 items-center gap-0.5">
                <Button type="button" variant="ghost" size="icon-sm" onClick={() => moveItem(index, -1)} disabled={index === 0} aria-label="Move up">
                  <ChevronUp className="size-4" />
                </Button>
                <Button type="button" variant="ghost" size="icon-sm" onClick={() => moveItem(index, 1)} disabled={index === items.length - 1} aria-label="Move down">
                  <ChevronDown className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removeItem(index)}
                  disabled={items.length <= (field.minItems ?? 0)}
                  aria-label="Remove"
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>

              {blockFields.length > 0 && (
                <div className="col-start-2 flex flex-col gap-2">
                  {blockFields.map((itemField) => (
                    <FieldInput
                      key={itemField.key}
                      field={itemField}
                      value={item[itemField.key]}
                      onChange={(value) => updateItem(index, itemField.key, value)}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <Button type="button" variant="secondary" size="sm" className="w-full" onClick={() => onChange([...items, createEmptyListItem(itemFields)])}>
          Add {field.itemLabel ?? "item"} <Plus className="size-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className={cn("grid gap-3", columns === 2 ? "sm:grid-cols-2" : "grid-cols-1")}>
        {items.map((item, index) => (
          <div key={index} className="flex flex-col gap-3 rounded-md border p-3">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm font-medium tabular-nums">#{index + 1}</span>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => moveItem(index, -1)}
                  disabled={index === 0}
                  aria-label="Move up"
                >
                  <ChevronUp className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => moveItem(index, 1)}
                  disabled={index === items.length - 1}
                  aria-label="Move down"
                >
                  <ChevronDown className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removeItem(index)}
                  disabled={items.length <= (field.minItems ?? 0)}
                  aria-label="Remove"
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
            {field.itemFieldLayout === "grid" ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_200px] lg:grid-cols-[1fr_300px] sm:gap-x-6">
                <div className="flex flex-col gap-4">
                  {itemFields
                    .filter((itemField) => !isImageFieldType(itemField.type))
                    .map((itemField) => (
                      <ItemFieldBlock
                        key={itemField.key}
                        itemField={itemField}
                        value={item[itemField.key]}
                        onChange={(value) => updateItem(index, itemField.key, value)}
                      />
                    ))}
                </div>
                <div className="flex flex-col gap-3">
                  {itemFields
                    .filter((itemField) => isImageFieldType(itemField.type))
                    .map((itemField) => (
                      <ItemFieldBlock
                        key={itemField.key}
                        itemField={itemField}
                        value={item[itemField.key]}
                        onChange={(value) => updateItem(index, itemField.key, value)}
                      />
                    ))}
                </div>
              </div>
            ) : field.itemFieldLayout === "row" ? (
              // One field per cell, side by side — unlike "grid", nothing
              // stacks within a cell (e.g. Before & After's before image /
              // after image / caption, each its own column). The two image
              // cells are fixed to their upload box's own width instead of
              // an equal share of the row, so the caption — worth reading,
              // not just glancing at — expands to fill what's left.
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[160px_160px_1fr]">
                {itemFields.map((itemField) => (
                  <ItemFieldBlock
                    key={itemField.key}
                    itemField={itemField}
                    value={item[itemField.key]}
                    onChange={(value) => updateItem(index, itemField.key, value)}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {itemFields.map((itemField) => (
                  <ItemFieldBlock
                    key={itemField.key}
                    itemField={itemField}
                    value={item[itemField.key]}
                    onChange={(value) => updateItem(index, itemField.key, value)}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => onChange([...items, createEmptyListItem(itemFields)])}
      >
        Add {field.itemLabel ?? "item"} <Plus className="size-4" />
      </Button>
    </div>
  );
}

interface ISegmentCardProps {
  segment: ISegmentRecord;
  onChange: (segment: ISegmentRecord) => void;
  onRemove?: () => void;
  onMove?: (direction: -1 | 1) => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  locked?: boolean;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  // Only meaningful for the hero segment's title/description fields — lets
  // those mirror the product's own Name/Tagline instead of being retyped.
  productName?: string;
  productTagline?: string;
  // Only meaningful for the "document" segment's `referenceId` field — lets
  // it pick from documents/certifications already uploaded in the Product
  // Files tab instead of uploading a duplicate copy of the same file.
  heroDocs?: IHeroDoc[];
  heroCertifications?: ICertification[];
}

function SegmentCard({
  segment,
  onChange,
  onRemove,
  onMove,
  canMoveUp,
  canMoveDown,
  locked,
  collapsed,
  onToggleCollapse,
  productName,
  productTagline,
  heroDocs,
  heroCertifications,
}: ISegmentCardProps) {
  const def = getSegmentTypeDef(segment.type);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  if (!def) return null;

  const nameIsEmpty = ((segment.name as string) ?? def.label).trim() === "";

  const renderField = (field: IFieldDef) => {
    const sameAsKey =
      segment.type === "hero" && field.key === "title"
        ? "titleSameAsName"
        : segment.type === "hero" && field.key === "description"
          ? "descriptionSameAsTagline"
          : null;
    const sameAsSource = sameAsKey === "titleSameAsName" ? productName : productTagline;
    const sameAsChecked = sameAsKey ? Boolean(segment[sameAsKey]) : false;

    // Header/Subheader are auto-filled from the picked certification (name/
    // number) and aren't shown on the public page in certification mode
    // (ADR-063) — disabled here so the admin isn't misled into thinking
    // they're editable content.
    const isDisabledCertField =
      segment.type === "document" &&
      (field.key === "header" || field.key === "subheader") &&
      segment.referenceKind === "certification";

    // Placement/fit render inline next to the image field below, not as
    // their own row.
    if (segment.type === "highlight" && (field.key === "imagePlacement" || field.key === "imageFit")) return null;

    if (segment.type === "highlight" && field.key === "image") {
      const placementField = def.fields.find((candidate) => candidate.key === "imagePlacement");
      const fitField = def.fields.find((candidate) => candidate.key === "imageFit");
      return (
        <div key={field.key} className="flex flex-col gap-1.5">
          <Label>
            <FieldLabelText field={field} />
          </Label>
          <div className="flex items-start gap-3">
            <div className="max-w-xs flex-1">
              <FieldInput field={field} value={segment[field.key]} onChange={(value) => onChange({ ...segment, [field.key]: value })} />
            </div>
            <div className="flex flex-col gap-3">
              {placementField && (
                <div className="flex w-32 flex-col gap-1.5">
                  <Label className="text-muted-foreground text-xs">
                    <FieldLabelText field={placementField} />
                  </Label>
                  <FieldInput
                    field={placementField}
                    value={segment.imagePlacement}
                    onChange={(value) => onChange({ ...segment, imagePlacement: value })}
                  />
                </div>
              )}
              {fitField && (
                <div className="flex w-44 flex-col gap-1.5">
                  <Label className="text-muted-foreground text-xs">
                    <FieldLabelText field={fitField} />
                  </Label>
                  <FieldInput
                    field={fitField}
                    value={segment.imageFit}
                    onChange={(value) => onChange({ ...segment, imageFit: value })}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    // The frame sequence is uploaded as one batch (see ADR-029), which
    // fills all three of these fields at once — totalFrames/extension
    // render nothing on their own, and imgUrlTemplate becomes the
    // combined uploader instead of a text input.
    if (segment.type === "viewer360" && (field.key === "totalFrames" || field.key === "extension")) return null;

    if (segment.type === "viewer360" && field.key === "imgUrlTemplate") {
      return (
        <div key={field.key} className="flex flex-col gap-1.5">
          <Label>
            <FieldLabelText field={field} />
          </Label>
          <Viewer360FramesInput
            imgUrlTemplate={(segment.imgUrlTemplate as string) ?? ""}
            totalFrames={segment.totalFrames as number | undefined}
            extension={(segment.extension as string) ?? ""}
            width={segment.width as number | undefined}
            height={segment.height as number | undefined}
            onChange={(patch) => onChange({ ...segment, ...patch })}
          />
        </div>
      );
    }

    // The referenced entry is one of the documents or certifications
    // already uploaded in the Product Files tab, picked by id rather than
    // re-uploaded — see ADR-051 (supersedes ADR-031's href-matching
    // version), extended to certifications by ADR-059. If the stored id no
    // longer resolves in either list — the source entry was since removed
    // from Product Files — the admin gets a visible warning instead of the
    // segment silently pointing at nothing.
    if (segment.type === "document" && field.key === "referenceId") {
      const currentKind = segment.referenceKind === "certification" ? "certification" : "document";
      const currentId = typeof segment.referenceId === "string" ? segment.referenceId : "";
      const documents = heroDocs ?? [];
      const certifications = heroCertifications ?? [];
      const selectedDoc = currentKind === "document" ? documents.find((doc) => doc.id === currentId) : undefined;
      const selectedCert = currentKind === "certification" ? certifications.find((cert) => cert.id === currentId) : undefined;
      const isMissing = currentId !== "" && !selectedDoc && !selectedCert;
      const compositeValue = currentId ? `${currentKind}:${currentId}` : undefined;
      const hasOptions = documents.length > 0 || certifications.length > 0;
      const selectedCertLogo = selectedCert ? getCertificationLogo(selectedCert, "black") : undefined;

      return (
        <div key={field.key} className="flex flex-col gap-1.5">
          <Label>
            <FieldLabelText field={field} />
          </Label>
          <Select
            value={compositeValue}
            onValueChange={(value) => {
              const separatorIndex = value.indexOf(":");
              const kind = value.slice(0, separatorIndex) as "document" | "certification";
              const id = value.slice(separatorIndex + 1);
              const pickedDoc = kind === "document" ? documents.find((doc) => doc.id === id) : undefined;
              const pickedCert = kind === "certification" ? certifications.find((cert) => cert.id === id) : undefined;

              onChange({
                ...segment,
                referenceKind: kind,
                referenceId: id,
                // Header always replaces with the newly picked entry's own
                // name — picking one is what names the segment, not a
                // one-time suggestion. See ADR-056, extended by ADR-059.
                header: pickedDoc?.title || pickedCert?.label || segment.header,
                // Subheader mirrors the certification's own number (when it
                // has one) — disabled/hidden the same way Header is for
                // certification mode, see ADR-063/ADR-064. Picking a
                // document leaves Subheader as whatever the admin already
                // typed, same as before this field existed.
                subheader: pickedCert ? (getCertificationSubLabel(pickedCert) ?? "") : segment.subheader,
              });
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={hasOptions ? "Select a document or certification" : "Nothing uploaded in Product Files yet"} />
            </SelectTrigger>
            <SelectContent>
              {documents.length > 0 && (
                <SelectGroup>
                  <SelectLabel>Documents</SelectLabel>
                  {documents.map((doc) => (
                    <SelectItem key={doc.id} value={`document:${doc.id}`}>
                      {doc.title || doc.href}
                    </SelectItem>
                  ))}
                </SelectGroup>
              )}
              {certifications.length > 0 && (
                <SelectGroup>
                  <SelectLabel>Certifications</SelectLabel>
                  {certifications.map((cert) => (
                    <SelectItem key={cert.id} value={`certification:${cert.id}`}>
                      {cert.label || cert.certType}
                    </SelectItem>
                  ))}
                </SelectGroup>
              )}
            </SelectContent>
          </Select>
          {isMissing && (
            <p className="text-destructive text-xxs">
              The document or certification this segment referenced was removed from Product Files. Choose another.
            </p>
          )}
          <p className="text-muted-foreground text-xxs">
            Uploaded in the Product Files tab, under Downloadable Documents or Certifications.
          </p>
          {selectedDoc?.thumbnailUrl && (
            <div className="relative mt-1 aspect-3/4 w-20 overflow-hidden rounded-md border">
              <NextImage src={selectedDoc.thumbnailUrl} alt="" fill className="object-cover" />
            </div>
          )}
          {selectedCertLogo && (
            <div className="relative mt-1 h-14 w-24 overflow-hidden rounded-md border bg-white p-1">
              <NextImage src={selectedCertLogo} alt="" fill className="object-contain" />
            </div>
          )}
        </div>
      );
    }

    return (
      <div key={field.key} className="flex flex-col gap-1.5">
        <Label>
          <FieldLabelText field={field} />
        </Label>
        {field.type === "list" ? (
          <ListField
            field={field}
            items={(segment[field.key] as Record<string, unknown>[]) ?? []}
            onChange={(items) => onChange({ ...segment, [field.key]: items })}
            columns={segment.type === "treatments" && segment.columns === "2" ? 2 : 1}
          />
        ) : (
          <FieldInput
            field={field}
            value={segment[field.key]}
            disabled={sameAsChecked || isDisabledCertField}
            onChange={(value) => onChange({ ...segment, [field.key]: value })}
          />
        )}
        {field.helpText && <p className="text-muted-foreground text-xxs">{field.helpText}</p>}
        {isDisabledCertField && (
          <p className="text-muted-foreground text-xxs">
            Filled in automatically from the picked certification — not shown for certification highlights.
          </p>
        )}
        {(sameAsKey || field.maxLength) && (
          <div className="flex items-center justify-between gap-2">
            {sameAsKey ? (
              <label className="text-muted-foreground flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={sameAsChecked}
                  onChange={(event) => {
                    const checked = event.target.checked;
                    onChange({
                      ...segment,
                      [sameAsKey]: checked,
                      [field.key]: checked ? (sameAsSource ?? "") : segment[field.key],
                    });
                  }}
                />
                Same as {sameAsKey === "titleSameAsName" ? "name" : "tagline"}
              </label>
            ) : (
              <span />
            )}
            {field.maxLength && typeof segment[field.key] === "string" && (
              <p className="text-muted-foreground text-xxs">
                {(segment[field.key] as string).length}/{field.maxLength}
              </p>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6 rounded-lg border p-4">
      {/* Header row and its divider share a tighter gap-4 (== the card's own
          p-4) so the line sits as close to the row as the row sits to the
          card's top edge — the outer gap-6 is for spacing between content
          blocks below, a different rhythm than this one. */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          {/* The toggle is its own button rather than the whole header row, so
              the move/remove buttons stay siblings instead of nesting inside a
              button — and the completeness dot means a collapsed card still
              says whether it needs attention. */}
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-expanded={!collapsed}
            className="flex flex-1 items-center gap-2 text-left"
          >
            <ChevronRight className={cn("text-muted-foreground size-4 transition-transform", !collapsed && "rotate-90")} />
            <CircleCheck
              className={cn("size-4", isSegmentComplete(segment) ? "text-emerald-600" : "text-muted-foreground/50")}
            />
            <span className="text-base font-semibold">
              <span className="text-brand-red font-bold">{segment.name ? String(segment.name) : def.label}</span>
              {locked && <span className="text-muted-foreground ml-2 font-normal">(required)</span>}
              {segment.name ? (
                <span className="text-muted-foreground ml-2 text-sm font-normal">{def.label}</span>
              ) : null}
            </span>
          </button>
          {!locked && (
            <div className="flex gap-1">
              <Button type="button" variant="ghost" size="icon-sm" onClick={() => onMove?.(-1)} disabled={!canMoveUp} aria-label="Move segment up">
                <ChevronUp className="size-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon-sm" onClick={() => onMove?.(1)} disabled={!canMoveDown} aria-label="Move segment down">
                <ChevronDown className="size-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon-sm" onClick={() => setConfirmingRemove(true)} aria-label="Remove segment" className="text-destructive hover:text-destructive">
                <Trash2 className="size-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Inset to the card's own p-4 padding rather than spanning edge to
            edge — it's a child of that padded container like everything
            else, so no extra margin/width math is needed. */}
        {!collapsed && <div className="border-t" />}
      </div>

      {collapsed ? null : (
        <>
      {!locked && (
        <>
          <div className="flex flex-col gap-1.5">
            <Label>Segment name</Label>
            <Input
              value={(segment.name as string) ?? def.label}
              onChange={(event) => {
                const name = event.target.value;
                onChange({ ...segment, name, showInNav: name.trim() === "" ? false : segment.showInNav });
              }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-start gap-2">
              <Switch
                id={`show-in-nav-${segment.id}`}
                checked={Boolean(segment.showInNav) && !nameIsEmpty}
                disabled={nameIsEmpty}
                onCheckedChange={(checked) => onChange({ ...segment, showInNav: checked })}
              />
              <Label htmlFor={`show-in-nav-${segment.id}`}>Show in navigation shortcut</Label>
            </div>
            {nameIsEmpty && (
              <p className="text-muted-foreground text-xxs">Add a segment name to enable this.</p>
            )}
          </div>
        </>
      )}

      {def.fields.map(renderField)}
        </>
      )}

      <AlertDialog open={confirmingRemove} onOpenChange={setConfirmingRemove}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this segment?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{segment.name ? String(segment.name) : def.label}&rdquo; and everything entered in it will be
              removed from this page. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep segment</AlertDialogCancel>
            <AlertDialogAction onClick={onRemove}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function SegmentsBuilder({
  segments,
  onChange,
  productName,
  productTagline,
  // True when editing an existing item — its segments land collapsed so the
  // tab opens as a scannable list instead of a long scroll of every card's
  // full contents. A brand-new item's segments (including the auto-injected
  // hero) start expanded, since there's nothing to collapse away from yet.
  defaultCollapsed,
}: {
  segments: ISegmentRecord[];
  onChange: (segments: ISegmentRecord[]) => void;
  productName?: string;
  productTagline?: string;
  defaultCollapsed?: boolean;
}) {
  const heroSegment = segments.find((segment) => segment.type === "hero");
  const otherSegments = segments.filter((segment) => segment.type !== "hero");
  const heroDocs = (heroSegment?.heroDocs as IHeroDoc[] | undefined) ?? [];
  const heroCertifications = (heroSegment?.certifications as ICertification[] | undefined) ?? [];

  // Only the segments present at mount (i.e. the ones loaded with the item
  // being edited) are seeded here — a segment added afterward via "Add a
  // segment" is never in this initial set, so it still opens expanded even
  // in an editor that otherwise landed fully collapsed.
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() =>
    defaultCollapsed ? new Set(segments.map((segment) => segment.id)) : new Set()
  );

  const toggleCollapsed = (id: string) => {
    setCollapsedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allCollapsed = segments.every((segment) => collapsedIds.has(segment.id));

  // Note: keeping the hero's title/description in step with Name/Tagline
  // while "Same as ..." is checked is ProductForm's job, not this
  // component's — this tab is unmounted while Name is being edited.

  const handleAdd = (type: string) => {
    const def = getSegmentTypeDef(type);
    if (!def) return;
    onChange([...segments, { id: crypto.randomUUID(), type, name: def.label, ...createEmptySegmentData(def) }]);
  };

  const updateSegment = (id: string, next: ISegmentRecord) => {
    onChange(segments.map((segment) => (segment.id === id ? next : segment)));
  };

  const removeSegment = (id: string) => {
    onChange(segments.filter((segment) => segment.id !== id));
  };

  const moveOtherSegment = (id: string, direction: -1 | 1) => {
    const index = otherSegments.findIndex((segment) => segment.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= otherSegments.length) return;

    const reordered = [...otherSegments];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    onChange(heroSegment ? [heroSegment, ...reordered] : reordered);
  };

  return (
    <div className="flex flex-col gap-4">
      {segments.length > 1 && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground w-fit self-end"
          onClick={() =>
            setCollapsedIds(allCollapsed ? new Set() : new Set(segments.map((segment) => segment.id)))
          }
        >
          {allCollapsed ? "Expand all" : "Collapse all"}
        </Button>
      )}

      {heroSegment && (
        <SegmentCard
          segment={heroSegment}
          onChange={(next) => updateSegment(heroSegment.id, next)}
          locked
          collapsed={collapsedIds.has(heroSegment.id)}
          onToggleCollapse={() => toggleCollapsed(heroSegment.id)}
          productName={productName}
          productTagline={productTagline}
        />
      )}

      {otherSegments.map((segment, index) => (
        <SegmentCard
          key={segment.id}
          segment={segment}
          onChange={(next) => updateSegment(segment.id, next)}
          onRemove={() => removeSegment(segment.id)}
          onMove={(direction) => moveOtherSegment(segment.id, direction)}
          canMoveUp={index > 0}
          canMoveDown={index < otherSegments.length - 1}
          collapsed={collapsedIds.has(segment.id)}
          onToggleCollapse={() => toggleCollapsed(segment.id)}
          heroDocs={heroDocs}
          heroCertifications={heroCertifications}
        />
      ))}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" className="w-full justify-center gap-2" variant={"default"}>
            Add a segment
            <Plus className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-(--radix-dropdown-menu-trigger-width)"
          // Radix restores focus to the trigger button on close by default,
          // which sits below every segment card — adding one pushes that
          // button further down the page, so the browser's native
          // focus-follows-scroll jumps the whole page to the new bottom.
          // Skipping the auto-focus keeps the admin right where they were.
          onCloseAutoFocus={(event) => event.preventDefault()}
        >
          {ADDABLE_SEGMENT_TYPES.map((def) => (
            <DropdownMenuItem key={def.type} onSelect={() => handleAdd(def.type)}>
              {def.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

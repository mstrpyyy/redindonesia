"use client";

import { ChevronDown, ChevronUp, CircleCheck, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { UploadField } from "@/components/upload-field";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { IDigitalMediaBlock } from "@/interfaces/digital";
import {
  DIGITAL_MEDIA_BLOCK_TYPES,
  createEmptyDigitalMediaBlock,
  getDigitalMediaBlockLabel,
  isDigitalMediaBlockComplete,
} from "./digital-media";
import { MediaBlockLabelFields } from "./media-block-label-fields";
import { YoutubeVideosEditor } from "./youtube-videos-editor";
import { uploadDigitalDocumentFile, uploadDigitalFlipbookFile } from "./digital-upload-actions";
import {
  ACCEPTED_DIGITAL_DOCUMENT_TYPES,
  ACCEPTED_DIGITAL_FLIPBOOK_TYPES,
  MAX_DIGITAL_DOCUMENT_LABEL,
  MAX_DIGITAL_FLIPBOOK_LABEL,
} from "./limits";

// The "Add a segment" dropdown pattern from the product editor
// (segments-builder.tsx), scaled down to a fixed 3-type union instead of a
// data-driven field engine — see ADR-106/107/108. Each block is one
// landing-page button (label + optional image); what it leads to differs by
// type — a youtube block's own video page (one or more videos), or a single
// flipbook/document file opened directly.
export function MediaBlocksEditor({
  blocks,
  onChange,
}: {
  blocks: IDigitalMediaBlock[];
  onChange: (blocks: IDigitalMediaBlock[]) => void;
}) {
  const updateBlock = (index: number, next: IDigitalMediaBlock) => {
    onChange(blocks.map((block, i) => (i === index ? next : block)));
  };

  const removeBlock = (index: number) => onChange(blocks.filter((_, i) => i !== index));

  const moveBlock = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-4">
      {blocks.map((block, index) => (
        <div key={block.id} className="flex flex-col gap-3 rounded-md border p-4">
          <div className="flex items-center gap-3">
            <CircleCheck
              className={cn("size-4 shrink-0", isDigitalMediaBlockComplete(block) ? "text-emerald-600" : "text-muted-foreground/50")}
            />
            <span className="flex-1 text-sm font-semibold">{getDigitalMediaBlockLabel(block.type)}</span>
            <div className="flex shrink-0 items-center gap-0.5">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Move up"
                disabled={index === 0}
                onClick={() => moveBlock(index, -1)}
              >
                <ChevronUp className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Move down"
                disabled={index === blocks.length - 1}
                onClick={() => moveBlock(index, 1)}
              >
                <ChevronDown className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Remove block"
                onClick={() => removeBlock(index)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>

          <MediaBlockLabelFields
            label={block.label}
            imageUrl={block.imageUrl}
            onLabelChange={(label) => updateBlock(index, { ...block, label })}
            onImageUrlChange={(imageUrl) => updateBlock(index, { ...block, imageUrl })}
          />

          <hr className="border-t my-4" />

          {block.type === "youtube" && (
            <YoutubeVideosEditor videos={block.videos} onChange={(videos) => updateBlock(index, { ...block, videos })} />
          )}
          {block.type === "flipbook" && (
            <div className="flex flex-col gap-2">
              <Label>
                PDF File<span className="text-destructive"> *</span>
              </Label>
              <UploadField
                kind="file"
                accept={ACCEPTED_DIGITAL_FLIPBOOK_TYPES.join(",")}
                uploadAction={uploadDigitalFlipbookFile}
                value={block.fileUrl}
                onChange={(value) => updateBlock(index, { ...block, fileUrl: (value as string) ?? "" })}
              />
              <p className="text-muted-foreground text-xs">PDF. Up to {MAX_DIGITAL_FLIPBOOK_LABEL}.</p>
            </div>
          )}
          {block.type === "document" && (
            <div className="flex flex-col gap-2">
              <Label>
                File<span className="text-destructive"> *</span>
              </Label>
              <UploadField
                kind="file"
                accept={ACCEPTED_DIGITAL_DOCUMENT_TYPES.join(",")}
                uploadAction={uploadDigitalDocumentFile}
                value={block.fileUrl}
                onChange={(value) => updateBlock(index, { ...block, fileUrl: (value as string) ?? "" })}
              />
              <p className="text-muted-foreground text-xs">PDF, PNG, JPEG, or WEBP. Up to {MAX_DIGITAL_DOCUMENT_LABEL}.</p>
            </div>
          )}
        </div>
      ))}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" className="w-full">
            Add Media <Plus className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {DIGITAL_MEDIA_BLOCK_TYPES.map((option) => (
            <DropdownMenuItem key={option.type} onSelect={() => onChange([...blocks, createEmptyDigitalMediaBlock(option.type)])}>
              {option.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

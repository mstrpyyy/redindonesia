"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChevronDown, CircleCheck, ImagePlus } from "lucide-react";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  CARD_BACKGROUNDS,
  DEFAULT_CARD_BACKGROUND,
  getCardBackground,
  type ICardBackgroundValue,
} from "@/lib/card-backgrounds";
import { DeviceCard } from "@/app/(user)/components/catalogue/DeviceCard";
import { ICategory, IProduct, ITag } from "@/interfaces/general";
import { createProduct, updateProduct } from "./product-actions";
import { CategoryPicker } from "./category-picker";
import { TagPicker } from "./tag-picker";
import { SegmentsBuilder, type ISegmentRecord } from "./segments-builder";
import { ProductFilesEditor, isCertificationComplete, isHeroDocComplete } from "./product-files-editor";
import type { ICertification, IHeroDoc } from "@/interfaces/segments";
import { createEmptySegmentData, getSegmentTypeDef, isSegmentComplete } from "./segment-types";
import { ACCEPTED_IMAGE_TYPES, MAX_PRODUCT_NAME_LENGTH, MAX_PRODUCT_TAGLINE_LENGTH, MAX_THUMBNAIL_LABEL } from "./limits";

// Every product page always opens with a hero segment — auto-inject one if
// this is a new item (or somehow missing) so SegmentsBuilder always has one
// to pin at the top, instead of every consumer having to know this rule.
// A freshly-created hero defaults to mirroring Name/Tagline (checkboxes
// start checked) rather than starting blank. `imgAlt` has no form field of
// its own (auto-derived from the title, see product-actions.ts) but the
// data shape still needs a value here for consistency until the next save.
function withHeroSegment(segments: ISegmentRecord[], name: string, tagline: string): ISegmentRecord[] {
  if (segments.some((segment) => segment.type === "hero")) return segments;
  const heroDef = getSegmentTypeDef("hero");
  if (!heroDef) return segments;
  return [
    {
      id: crypto.randomUUID(),
      type: "hero",
      ...createEmptySegmentData(heroDef),
      title: name,
      description: tagline,
      imgAlt: name,
      // Not in the hero's field defs (they're edited on the Product Files
      // tab), so `createEmptySegmentData` doesn't seed them — see ADR-026.
      heroDocs: [],
      certifications: [],
      titleSameAsName: true,
      descriptionSameAsTagline: true,
    },
    ...segments,
  ];
}

// Order-independent — the picker's selection order isn't meaningful, only
// which tags ended up chosen.
function sameTagIds(a: ITag[], b: ITag[]): boolean {
  if (a.length !== b.length) return false;
  const ids = new Set(a.map((tag) => tag.id));
  return b.every((tag) => ids.has(tag.id));
}

type IEditorTab = "identity" | "thumbnail" | "files" | "segments";

// Source of truth for both the tab strip's order and the Next button's
// walk — the last entry is the only tab that offers Publish.
const EDITOR_TABS: IEditorTab[] = ["identity", "thumbnail", "files", "segments"];

// Grey until the tab's own required content is filled in, green once it is —
// so the editor shows at a glance which sections still need work without
// having to open each one.
function EditorTabTrigger({ value, label, complete }: { value: IEditorTab; label: string; complete: boolean }) {
  return (
    <TabsTrigger value={value}>
      <CircleCheck className={cn(complete ? "text-emerald-600" : "text-muted-foreground/50")} />
      {label}
    </TabsTrigger>
  );
}

interface IProductFormProps {
  type: "device" | "product";
  categories: ICategory[];
  // The full reusable tag pool for this `type` (ADR-041) — the picker's
  // searchable/creatable catalog, not just this item's own selected tags.
  tags: ITag[];
  product?: IProduct;
}

export function ProductForm({ type, categories, tags, product }: IProductFormProps) {
  const router = useRouter();
  const isEdit = product !== undefined;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const listPath = `/admin/product-device/${type === "device" ? "devices" : "products"}/items`;
  // Only the Identity tab's own label/heading follows the item's real type —
  // every other tab (Thumbnail/Files/Segments) keeps its generic "Product"
  // wording regardless of `type`.
  const entityLabel = type === "device" ? "Device" : "Product";

  const [name, setName] = useState(product?.name ?? "");
  const [tagline, setTagline] = useState(product?.tagline ?? "");
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? "");
  const [status, setStatus] = useState<"hidden" | "public">(product?.status ?? "hidden");
  // Computed once and reused as both the initial value and the dirty-check
  // baseline — calling withHeroSegment twice would inject two different
  // random ids for the auto-created hero, falsely marking the form dirty.
  const [initialSegments] = useState<ISegmentRecord[]>(() =>
    withHeroSegment((product?.segments as unknown as ISegmentRecord[]) ?? [], name, tagline)
  );
  const [segments, setSegments] = useState<ISegmentRecord[]>(initialSegments);
  const [cardBackground, setCardBackground] = useState<ICardBackgroundValue>(
    product?.cardBackground ?? DEFAULT_CARD_BACKGROUND
  );
  // Grows locally as new tags are created through the picker (ADR-041) so a
  // freshly-typed tag is immediately searchable again this session, even
  // though Identity's own content unmounts while another tab is active.
  const [availableTags, setAvailableTags] = useState<ITag[]>(tags);
  const [selectedTags, setSelectedTags] = useState<ITag[]>(product?.tags ?? []);
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(product?.thumbnail ?? null);
  const [error, setError] = useState<string | null>(null);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [tab, setTab] = useState<IEditorTab>("identity");
  // Controlled so picking a swatch closes the popover — Radix Popover has no
  // select-and-dismiss of its own the way a Select does.
  const [backgroundPickerOpen, setBackgroundPickerOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // undefined on the last tab, which is what swaps Next out for Publish.
  const nextTab: IEditorTab | undefined = EDITOR_TABS[EDITOR_TABS.indexOf(tab) + 1];

  const identityComplete = name.trim().length > 0 && categoryId !== "";
  const thumbnailComplete = Boolean(thumbnailPreview);
  const segmentsComplete = segments.length > 0 && segments.every(isSegmentComplete);

  // Documents and certifications live on the hero segment's record — the
  // Product Files tab is a second editor over the same data, not a second
  // place it's stored. See ADR-026.
  const heroSegment = segments.find((segment) => segment.type === "hero");
  const heroDocs = (heroSegment?.heroDocs as IHeroDoc[] | undefined) ?? [];
  const heroCertifications = (heroSegment?.certifications as ICertification[] | undefined) ?? [];
  // Files are optional to save, so this only drives the tab's icon: grey while
  // there's nothing here or a half-filled row, green once every row is done.
  const filesComplete =
    heroDocs.length + heroCertifications.length > 0 &&
    heroDocs.every(isHeroDocComplete) &&
    heroCertifications.every(isCertificationComplete);

  const updateHeroFiles = (patch: Partial<{ heroDocs: IHeroDoc[]; certifications: ICertification[] }>) => {
    setSegments((current) =>
      current.map((segment) => (segment.type === "hero" ? { ...segment, ...patch } : segment))
    );
  };

  const isDirty =
    name !== (product?.name ?? "") ||
    tagline !== (product?.tagline ?? "") ||
    categoryId !== (product?.categoryId ?? "") ||
    status !== (product?.status ?? "hidden") ||
    cardBackground !== (product?.cardBackground ?? DEFAULT_CARD_BACKGROUND) ||
    JSON.stringify(segments) !== JSON.stringify(initialSegments) ||
    !sameTagIds(selectedTags, product?.tags ?? []) ||
    Boolean(thumbnail);

  // The hero's title/description can be pinned to the product's Name/Tagline
  // ("Same as name" in the hero card). The sync happens here, at edit time,
  // rather than in an effect inside SegmentsBuilder: Name and Tagline are
  // edited on a different tab, and Radix unmounts the Page Segments tab's
  // content while it's hidden, so nothing over there can react to the change.
  const syncHeroMirror = (
    key: "title" | "description",
    flag: "titleSameAsName" | "descriptionSameAsTagline",
    value: string
  ) => {
    setSegments((current) =>
      current.map((segment) => (segment.type === "hero" && segment[flag] ? { ...segment, [key]: value } : segment))
    );
  };

  const handleNameChange = (value: string) => {
    setName(value);
    syncHeroMirror("title", "titleSameAsName", value);
  };

  const handleTaglineChange = (value: string) => {
    setTagline(value);
    syncHeroMirror("description", "descriptionSameAsTagline", value);
  };

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

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setError("Thumbnail must be a JPEG, PNG, WEBP, or GIF.");
      return;
    }

    setError(null);
    if (thumbnailPreview?.startsWith("blob:")) URL.revokeObjectURL(thumbnailPreview);
    setThumbnail(file);
    setThumbnailPreview(URL.createObjectURL(file));
  };

  const handleSubmit = (nextStatus: "hidden" | "public") => {
    setError(null);

    if (!name.trim()) {
      setError("Name is required.");
      setTab("identity");
      return;
    }
    if (!categoryId) {
      setError("Category is required.");
      setTab("identity");
      return;
    }
    if (nextStatus === "public" && !thumbnailComplete) {
      setError("A thumbnail is required to make this public.");
      setTab("thumbnail");
      return;
    }

    const formData = new FormData();
    formData.set("type", type);
    formData.set("name", name);
    formData.set("tagline", tagline);
    formData.set("categoryId", categoryId);
    formData.set("cardBackground", cardBackground);
    formData.set("status", nextStatus);
    formData.set("segments", JSON.stringify(segments));
    formData.set("tagIds", JSON.stringify(selectedTags.map((tag) => tag.id)));
    if (thumbnail) formData.set("thumbnail", thumbnail);

    startTransition(async () => {
      const result = isEdit ? await updateProduct(product.id, formData) : await createProduct(formData);
      if (!result.success) {
        setError(result.error.message);
        return;
      }
      router.push(listPath);
    });
  };

  const handleCancelClick = () => {
    if (isDirty) setConfirmingCancel(true);
    else router.push(listPath);
  };

  return (
    <div className="flex flex-col gap-8">
      <Tabs value={tab} onValueChange={(value) => setTab(value as IEditorTab)} className="gap-6">
        <TabsList className="w-full">
          <EditorTabTrigger value="identity" label={`${entityLabel} Identity`} complete={identityComplete} />
          <EditorTabTrigger value="thumbnail" label="Product Thumbnail" complete={thumbnailComplete} />
          <EditorTabTrigger value="files" label="Product Files" complete={filesComplete} />
          <EditorTabTrigger value="segments" label="Page Segments" complete={segmentsComplete} />
        </TabsList>

        <TabsContent value="identity" className="flex flex-col gap-4">
          <div>
            <h3 className="text-lg font-semibold text-brand-red">{entityLabel} Identity</h3>
            <p className="text-muted-foreground text-xs">What this item is and where it lives in the catalog.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">
                Name<span className="text-destructive"> *</span>
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(event) => handleNameChange(event.target.value)}
                maxLength={MAX_PRODUCT_NAME_LENGTH}
                placeholder="e.g. Alma Harmony"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label>
                Category<span className="text-destructive"> *</span>
              </Label>
              <CategoryPicker categories={categories} value={categoryId} onChange={setCategoryId} />
            </div>

            <div className="flex flex-col gap-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(value) => setStatus(value as "hidden" | "public")}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hidden">Hidden</SelectItem>
                  <SelectItem value="public">Public</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Tags</Label>
              <TagPicker
                type={type}
                options={availableTags}
                onTagCreated={(tag) => setAvailableTags((current) => [...current, tag])}
                value={selectedTags}
                onChange={setSelectedTags}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="thumbnail" className="flex flex-col gap-4">
          <div>
            <h3 className="text-lg font-semibold text-brand-red">Product Thumbnail</h3>
            <p className="text-muted-foreground text-xs">How this item appears in grids and cards.</p>
          </div>

          {/* Fields left, live preview right — the preview is only useful
              next to the inputs that drive it. Stacks on narrow screens. */}
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
            <div className="flex flex-1 flex-col gap-4 border-r pr-6">
              <div className="flex flex-col gap-2">
                <Label htmlFor="tagline">Tagline</Label>
                <Textarea
                  id="tagline"
                  value={tagline}
                  onChange={(event) => handleTaglineChange(event.target.value)}
                  maxLength={MAX_PRODUCT_TAGLINE_LENGTH}
                  rows={3}
                  placeholder="e.g. Integrated Technologies. Unlimited Diversity"
                />
                <p className="text-muted-foreground text-right text-xs">
                  {tagline.length}/{MAX_PRODUCT_TAGLINE_LENGTH}
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <Label>Transparent Device Image</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(event) => handleThumbnailSelected(event.target.files)}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-muted hover:border-foreground/50 relative flex aspect-square w-full max-w-48 items-center justify-center overflow-hidden rounded-md border-2 border-dashed transition-colors"
                >
                  {thumbnailPreview ? (
                    <Image src={thumbnailPreview} alt="Thumbnail preview" fill className="object-contain" />
                  ) : (
                    <span className="text-muted-foreground flex flex-col items-center gap-1 text-sm">
                      <ImagePlus className="size-6" />
                      Choose image
                    </span>
                  )}
                </button>
                <p className="text-muted-foreground text-xs">
                  {isEdit ? "Choose a file to replace it, or leave empty to keep it." : "Required to publish."} Up to{" "}
                  {MAX_THUMBNAIL_LABEL}.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <Label>Card Background</Label>
                {/* Swatches only, no colour names — each square carries the
                    same gradient class the card gets, so the picker shows the
                    real thing rather than a stand-in. Names survive as the
                    accessible label and hover title. */}
                <Popover open={backgroundPickerOpen} onOpenChange={setBackgroundPickerOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      aria-label={`Card background: ${getCardBackground(cardBackground).label}`}
                      className="border-input hover:border-foreground/50 flex w-fit items-center gap-2 rounded-md border bg-transparent p-2 shadow-xs transition-colors"
                    >
                      <span className={cn("size-8 rounded-sm border", getCardBackground(cardBackground).className)} />
                      <ChevronDown className="size-4 opacity-50" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-auto p-2">
                    <div className="grid grid-cols-7 gap-2">
                      {CARD_BACKGROUNDS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          title={option.label}
                          aria-label={option.label}
                          aria-pressed={option.value === cardBackground}
                          onClick={() => {
                            setCardBackground(option.value);
                            setBackgroundPickerOpen(false);
                          }}
                          className={cn(
                            "size-8 rounded-sm border transition-shadow",
                            option.className,
                            option.value === cardBackground && "ring-foreground ring-2 ring-offset-1"
                          )}
                        />
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Width is explicit (480px card + the box's 2x12px padding)
                because the box below is an `overflow-x-auto` scroll
                container: its min-content width is 0, so left to size itself
                from its content this column collapses. */}
            <div className="flex flex-col gap-2 lg:sticky lg:top-6 lg:w-136 lg:shrink-0">
              {/* The actual public component, not a mock-up — inert here, so
                  nothing in it is focusable or clickable from the editor. */}
              <div className="max-w-full overflow-x-auto p-3">
                <Label>Preview</Label>
                <p className="text-muted-foreground text-xs">
                  The real catalogue card, drawn with what you&apos;ve entered so far.
                </p>
                {/* Pinned to the width a card actually gets in the live
                    two-column catalogue grid at xl ((1000px container - 40px
                    gap) / 2) so its proportions match the real thing instead
                    of stretching with the editor column. Narrow screens
                    scroll rather than squash it. */}
                <div className="pointer-events-none select-none mt-5 w-130" aria-hidden="true">
                  <DeviceCard
                    item={{
                      name: name || "Product name",
                      desc: tagline,
                      url: "#",
                      imgUrl: thumbnailPreview ?? "",
                      background: cardBackground,
                      tags: selectedTags.map((tag) => tag.name),
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="files" className="flex flex-col gap-4">
          <div>
            <h3 className="text-lg font-semibold text-brand-red">Product Files</h3>
            <p className="text-muted-foreground text-xs">
              Downloadable documents and certification badges, both shown in this item&apos;s page hero.
            </p>
          </div>
          <ProductFilesEditor
            documents={heroDocs}
            certifications={heroCertifications}
            onDocumentsChange={(documents) => updateHeroFiles({ heroDocs: documents })}
            onCertificationsChange={(certifications) => updateHeroFiles({ certifications })}
          />
        </TabsContent>

        <TabsContent value="segments" className="flex flex-col gap-4">
          <div>
            <h3 className="text-lg font-semibold text-brand-red">Page Segments</h3>
            <p className="text-muted-foreground text-xs">
              The content sections that make up this item&apos;s detail page.
            </p>
          </div>
          <SegmentsBuilder
            segments={segments}
            onChange={setSegments}
            productName={name}
            productTagline={tagline}
            defaultCollapsed={isEdit}
          />
        </TabsContent>
      </Tabs>

      {error && <p className="text-destructive text-sm">{error}</p>}

      <div className="flex items-center justify-between gap-2">
        <Button type="button" variant="secondary" disabled={isPending} onClick={handleCancelClick}>
          Cancel
        </Button>
        <div className="flex gap-2">
          <Button type="button" variant="outline" disabled={isPending} onClick={() => handleSubmit("hidden")} className="w-36">
            {isPending ? "Saving..." : "Save as hidden"}
          </Button>
          {/* Making it public is only offered from the last tab — everywhere
              else this button walks the admin to the next one, so the editor
              reads as three steps rather than three places you could go
              public from. */}
          {nextTab ? (
            <Button type="button" disabled={isPending} onClick={() => setTab(nextTab)} className="w-36">
              Next
            </Button>
          ) : (
            <Button type="button" disabled={isPending} onClick={() => handleSubmit("public")} className="w-36">
              {isPending ? "Publishing..." : "Make public"}
            </Button>
          )}
        </div>
      </div>

      <AlertDialog open={confirmingCancel} onOpenChange={setConfirmingCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Leaving now will discard them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction onClick={() => router.push(listPath)}>Discard</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

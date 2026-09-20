"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  ICarouselItem,
  ICategory,
  ICategoryPickerOption,
  IHomeCarouselListItem,
  IProductPickerOption,
} from "@/interfaces/general";
import { UploadField } from "@/components/upload-field";
import { createHomeCarousel, updateHomeCarousel } from "./actions";
import { CarouselCategoryPicker } from "./carousel-category-picker";
import { CarouselItemsEditor } from "./carousel-items-editor";
import { MAX_CAROUSEL_TITLE_LENGTH, MIN_CAROUSEL_ITEMS } from "./limits";
import { uploadHomeCarouselTitleImage } from "./upload-actions";

// Only `isPage` categories qualify (a category without a page has nowhere
// for `url` to point) — same "does this node actually resolve to a page"
// check `resolveDevicesRoute` relies on, just walked client-side here since
// the full tree is already on hand as a prop.
function collectPageCategoryOptions(
  nodes: ICategory[],
  type: "device" | "product",
  ancestorSlugs: string[]
): ICategoryPickerOption[] {
  return nodes.flatMap((node) => {
    const slugPath = [...ancestorSlugs, node.slug];
    const self: ICategoryPickerOption[] = node.isPage
      ? [{ id: node.id, type, name: node.name, url: `/${type === "device" ? "devices" : "products"}/${slugPath.join("/")}` }]
      : [];
    return [...self, ...collectPageCategoryOptions(node.children, type, slugPath)];
  });
}

interface ICarouselFormProps {
  carousel?: IHomeCarouselListItem;
  deviceCategories: ICategory[];
  productCategories: ICategory[];
  productOptions: IProductPickerOption[];
  onSuccess?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
  onPendingChange?: (pending: boolean) => void;
  onModeChange?: (mode: "category" | "custom" | null) => void;
}

export function CarouselForm({
  carousel,
  deviceCategories,
  productCategories,
  productOptions,
  onSuccess,
  onDirtyChange,
  onPendingChange,
  onModeChange,
}: ICarouselFormProps) {
  const isEdit = carousel !== undefined;

  const categoryOptions = useMemo(
    () => [
      ...collectPageCategoryOptions(deviceCategories, "device", []),
      ...collectPageCategoryOptions(productCategories, "product", []),
    ],
    [deviceCategories, productCategories]
  );

  const initialMode = carousel?.mode ?? null;
  const initialCategoryId = carousel?.categoryId ?? "";
  const initialTitle = carousel?.title ?? "";
  const initialItems = carousel?.items ?? [];
  const initialSeeMoreUrl = carousel?.seeMoreUrl ?? "";
  const initialSize = carousel?.size ?? "md";
  const initialShowSeeMore = carousel?.showSeeMore ?? true;
  const initialTitleDisplayMode = carousel?.titleDisplayMode ?? "text";
  const initialTitleImage = carousel?.titleImage ?? "";

  const [mode, setMode] = useState<"category" | "custom" | null>(initialMode);
  const [categoryId, setCategoryId] = useState(initialCategoryId);
  const [title, setTitle] = useState(initialTitle);
  const [items, setItems] = useState<ICarouselItem[]>(initialItems);
  const [seeMoreUrl, setSeeMoreUrl] = useState(initialSeeMoreUrl);
  const [size, setSize] = useState<"sm" | "md">(initialSize);
  const [showSeeMore, setShowSeeMore] = useState(initialShowSeeMore);
  const [titleDisplayMode, setTitleDisplayMode] = useState<"text" | "image">(initialTitleDisplayMode);
  const [titleImage, setTitleImage] = useState(initialTitleImage);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isDirty =
    mode !== initialMode ||
    categoryId !== initialCategoryId ||
    title !== initialTitle ||
    seeMoreUrl !== initialSeeMoreUrl ||
    size !== initialSize ||
    showSeeMore !== initialShowSeeMore ||
    titleDisplayMode !== initialTitleDisplayMode ||
    titleImage !== initialTitleImage ||
    JSON.stringify(items) !== JSON.stringify(initialItems);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    onPendingChange?.(isPending);
  }, [isPending, onPendingChange]);

  useEffect(() => {
    onModeChange?.(mode);
  }, [mode, onModeChange]);

  const handleSubmit = () => {
    setError(null);

    if (!mode) return;

    if (mode === "category" && !categoryId) {
      setError("Select a category.");
      return;
    }
    if (mode === "custom" && !title.trim()) {
      setError("Title is required.");
      return;
    }
    if (mode === "custom" && items.length < MIN_CAROUSEL_ITEMS) {
      setError(`Add at least ${MIN_CAROUSEL_ITEMS} items.`);
      return;
    }
    if (mode === "custom" && showSeeMore && !seeMoreUrl.trim()) {
      setError('Provide a "See More" URL, or turn the button off.');
      return;
    }
    if (titleDisplayMode === "image" && !titleImage) {
      setError("Upload a title image, or switch the title back to text.");
      return;
    }

    const formData = new FormData();
    formData.set("mode", mode);
    formData.set("size", size);
    formData.set("showSeeMore", showSeeMore ? "true" : "false");
    formData.set("titleDisplayMode", titleDisplayMode);
    formData.set("titleImage", titleImage);
    if (mode === "category") {
      formData.set("categoryId", categoryId);
    } else {
      formData.set("title", title);
      formData.set("seeMoreUrl", seeMoreUrl);
      formData.set("items", JSON.stringify(items));
    }

    startTransition(async () => {
      try {
        const result = isEdit
          ? await updateHomeCarousel(carousel.id, formData)
          : await createHomeCarousel(formData);
        if (!result.success) {
          setError(result.error.message);
          return;
        }
        if (!isEdit) {
          setMode(null);
          setCategoryId("");
          setTitle("");
          setItems([]);
          setSeeMoreUrl("");
          setSize("md");
          setShowSeeMore(true);
          setTitleDisplayMode("text");
          setTitleImage("");
        }
        onDirtyChange?.(false);
        onSuccess?.();
      } catch {
        setError("Something went wrong while saving. Please try again.");
      }
    });
  };

  const titleDisplayField = (
    <div className="flex flex-col gap-2">
      <Label>Carousel Title Display</Label>
      <Select
        value={titleDisplayMode}
        onValueChange={(value) => setTitleDisplayMode(value as "text" | "image")}
        disabled={isPending}
      >
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="text">Text</SelectItem>
          <SelectItem value="image">Image</SelectItem>
        </SelectContent>
      </Select>
      {titleDisplayMode === "image" && (
        <>
          <p className="text-muted-foreground text-xs">
            {mode === "category"
              ? "Shown instead of the category's name. The category's name is still used as the accessible title."
              : "Shown instead of the title above. The title is still required for accessibility."}
            {" "}Recommended size: 128x32px.
          </p>
          <div>
            {/* Explicit w-64/h-16 (256x64px, same 4:1 ratio as the
                recommended 128x32) rather than the `aspect` prop's fixed
                enum — none of its options are this wide/short. Both
                dimensions being explicit makes the box's own aspect-ratio
                class a no-op, so the preview reads at the real ratio instead
                of stretching to a taller box. */}
            <UploadField
              kind="image"
              boxSizeClassName="w-64 h-16"
              uploadAction={uploadHomeCarouselTitleImage}
              value={titleImage}
              onChange={(value) => setTitleImage((value as string) ?? "")}
              disabled={isPending}
            />
          </div>
        </>
      )}
    </div>
  );

  const cardStyleField = (
    <div className="flex flex-col gap-2">
      <Label>Card Style</Label>
      <Select value={size} onValueChange={(value) => setSize(value as "sm" | "md")} disabled={isPending}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="sm">Square</SelectItem>
          <SelectItem value="md">Transparent</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  if (mode === null) {
    return (
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => {
            setMode("category");
            setShowSeeMore(true);
          }}
          className="hover:border-destructive hover:bg-destructive/5 flex flex-col items-start gap-1 rounded-lg border p-4 text-left transition-colors"
        >
          <span className="text-foreground font-semibold">Product / Device</span>
          <span className="text-muted-foreground text-xs font-normal">
            Pull products or devices straight from a catalogue category.
          </span>
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("custom");
            setShowSeeMore(false);
          }}
          className="hover:border-destructive hover:bg-destructive/5 flex flex-col items-start gap-1 rounded-lg border p-4 text-left transition-colors"
        >
          <span className="text-foreground font-semibold">Custom</span>
          <span className="text-muted-foreground text-xs font-normal">
            Build your own set of cards — mix in existing products/devices or add
            shortcuts to any page.
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {/* Only this middle section scrolls — the Save button (and error
          message) stay pinned below it, same pattern as the Category admin's
          add/edit modal (category-tree.tsx), rather than the whole dialog
          (header included) scrolling. */}
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-1 py-1">
      {mode === "category" && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>
              Category <span className="text-destructive">*</span>
            </Label>
            <p className="text-muted-foreground text-xs">
              Pick a category with no sub-categories of its own. Its title, products, and
              &quot;See More&quot; link are kept in sync automatically.
            </p>
            <CarouselCategoryPicker
              deviceCategories={deviceCategories}
              productCategories={productCategories}
              value={categoryId}
              onChange={setCategoryId}
              disabled={isPending}
            />
          </div>

          {titleDisplayField}
          {cardStyleField}
        </div>
      )}

      {mode === "custom" && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="carousel-title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="carousel-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={MAX_CAROUSEL_TITLE_LENGTH}
              placeholder="e.g. Alma Laser"
              disabled={isPending}
            />
            {titleDisplayMode === "image" && (
              <p className="text-muted-foreground text-xs">
                Still required — used as the accessible title since the image below
                replaces it visually.
              </p>
            )}
          </div>

          {titleDisplayField}

          <div className="border-t" />

          <CarouselItemsEditor
            items={items}
            productOptions={productOptions}
            categoryOptions={categoryOptions}
            onChange={setItems}
          />

          {cardStyleField}
        </div>
      )}

      <div className="border-t" />

      <div className="flex items-end gap-4">
        <div className="flex shrink-0 flex-col gap-2">
          <Label htmlFor="carousel-show-see-more">See More CTA</Label>
          <div className="flex h-9 items-center">
            <Switch
              id="carousel-show-see-more"
              checked={showSeeMore}
              onCheckedChange={setShowSeeMore}
              disabled={isPending}
            />
          </div>
        </div>

        {mode === "custom" && showSeeMore && (
          <div className="flex flex-1 flex-col gap-2">
            <Label htmlFor="carousel-see-more-url">
              See More URL <span className="text-destructive">*</span>
            </Label>
            <Input
              id="carousel-see-more-url"
              value={seeMoreUrl}
              onChange={(event) => setSeeMoreUrl(event.target.value)}
              placeholder="/devices/medical-aesthetic-devices/alma-laser"
              disabled={isPending}
            />
          </div>
        )}
      </div>
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      <Button type="button" onClick={handleSubmit} disabled={isPending}>
        {isPending ? "Saving..." : "Save"}
      </Button>
    </div>
  );
}

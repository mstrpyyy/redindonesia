"use client";

import { useId, useState, useTransition } from "react";
import { ChevronRight, FileText, GripVertical, Pencil, Plus, Trash2 } from "lucide-react";
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
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/rich-text-editor";
import { cn } from "@/lib/utils";
import { DEFAULT_HERO_TEXT_COLOR } from "@/lib/hero-text-colors";
import { HeroTextColorPicker } from "./hero-text-color-picker";
import { ICategory } from "@/interfaces/general";
import {
  createCategory,
  deleteCategory,
  reorderCategories,
  updateCategory,
  uploadCategoryBanner,
  uploadCategoryContentImage,
  uploadCategoryVideoThumbnail,
} from "./actions";
import { UploadField } from "@/components/upload-field";
import { CharLimitWarning, isAtCharLimit } from "@/components/char-limit-warning";
import {
  MAX_CATEGORY_BANNER_LABEL,
  MAX_CATEGORY_DEPTH,
  MAX_CATEGORY_DESCRIPTION_LENGTH,
  MAX_CATEGORY_NAME_LENGTH,
  MAX_CATEGORY_TITLE_LENGTH,
  MAX_CATEGORY_YOUTUBE_CAPTION_LENGTH,
  MAX_CATEGORY_YOUTUBE_DESCRIPTION_LENGTH,
} from "./limits";

type ICategoryType = "device" | "product";

function updateNodeInTree(
  nodes: ICategory[],
  id: string,
  updater: (node: ICategory) => ICategory
): ICategory[] {
  return nodes.map((node) =>
    node.id === id
      ? updater(node)
      : { ...node, children: updateNodeInTree(node.children, id, updater) }
  );
}

function removeNodeFromTree(nodes: ICategory[], id: string): ICategory[] {
  return nodes
    .filter((node) => node.id !== id)
    .map((node) => ({ ...node, children: removeNodeFromTree(node.children, id) }));
}

// `makeChild` receives the parent's depth so the new node's own depth (used
// to disable "Add sub-category" once MAX_CATEGORY_DEPTH is reached) is
// correct immediately, without waiting on a refetch.
function addChildToTree(
  nodes: ICategory[],
  parentId: string,
  makeChild: (parentDepth: number) => ICategory
): ICategory[] {
  return nodes.map((node) =>
    node.id === parentId
      ? { ...node, children: [...node.children, makeChild(node.depth)] }
      : { ...node, children: addChildToTree(node.children, parentId, makeChild) }
  );
}

function reorderChildrenInTree(
  nodes: ICategory[],
  parentId: string,
  orderedIds: string[]
): ICategory[] {
  return nodes.map((node) => {
    if (node.id !== parentId) {
      return { ...node, children: reorderChildrenInTree(node.children, parentId, orderedIds) };
    }
    const byId = new Map(node.children.map((child) => [child.id, child]));
    return { ...node, children: orderedIds.map((id) => byId.get(id)!) };
  });
}

// What both the "add" and "edit" dialogs collect — plain values, not FormData,
// since the page-content fields (banner URL, rich text HTML) already live as
// client state before submit.
export interface ICategoryFormValues {
  name: string;
  isPage: boolean;
  bannerSmUrl: string;
  bannerMdUrl: string;
  bannerLgUrl: string;
  bannerXlUrl: string;
  title: string;
  description: string;
  body: string;
  heroTextColor: string;
  youtubeUrl: string;
  youtubeThumbnailUrl: string;
  youtubeCaption: string;
  youtubeDescription: string;
}

function RequiredMark() {
  return <span className="text-destructive"> *</span>;
}

// Shared by both dialogs — a plain breadcrumb only ever has a name; switching
// "This category has its own page" on reveals the content fields (banner,
// title, description, body, YouTube — see ADR-033).
function CategoryForm({
  initialValues,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initialValues?: Partial<ICategoryFormValues>;
  submitLabel: string;
  onSubmit: (values: ICategoryFormValues) => Promise<{ success: boolean; message?: string }>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initialValues?.name ?? "");
  const [isPage, setIsPage] = useState(initialValues?.isPage ?? false);
  const [bannerSmUrl, setBannerSmUrl] = useState(initialValues?.bannerSmUrl ?? "");
  const [bannerMdUrl, setBannerMdUrl] = useState(initialValues?.bannerMdUrl ?? "");
  const [bannerLgUrl, setBannerLgUrl] = useState(initialValues?.bannerLgUrl ?? "");
  const [bannerXlUrl, setBannerXlUrl] = useState(initialValues?.bannerXlUrl ?? "");
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [description, setDescription] = useState(initialValues?.description ?? "");
  const [body, setBody] = useState(initialValues?.body ?? "");
  const [heroTextColor, setHeroTextColor] = useState(initialValues?.heroTextColor || DEFAULT_HERO_TEXT_COLOR);
  const [youtubeUrl, setYoutubeUrl] = useState(initialValues?.youtubeUrl ?? "");
  const [youtubeThumbnailUrl, setYoutubeThumbnailUrl] = useState(initialValues?.youtubeThumbnailUrl ?? "");
  const [youtubeCaption, setYoutubeCaption] = useState(initialValues?.youtubeCaption ?? "");
  const [youtubeDescription, setYoutubeDescription] = useState(initialValues?.youtubeDescription ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const canSubmit =
    name.trim().length > 0 &&
    (!isPage || (bannerXlUrl.length > 0 && title.trim().length > 0 && description.trim().length > 0));

  const handleSubmit = () => {
    setError(null);
    startTransition(async () => {
      const result = await onSubmit({
        name,
        isPage,
        bannerSmUrl,
        bannerMdUrl,
        bannerLgUrl,
        bannerXlUrl,
        title,
        description,
        body,
        heroTextColor,
        youtubeUrl,
        youtubeThumbnailUrl,
        youtubeCaption,
        youtubeDescription,
      });
      if (!result.success) setError(result.message ?? "Something went wrong.");
    });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {/* Only this middle section scrolls — Cancel/Save (and the error
          message) stay pinned below it, same pattern as GalleryForm's image
          grid, rather than the whole dialog (header included) scrolling. */}
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-1 py-1">
        <div className="flex flex-col gap-2">
          <Label htmlFor="category-name">Name</Label>
          <p className="text-muted-foreground -mt-1 text-xs">
            Internal label — drives the URL slug, breadcrumb, and navigation menu. Not shown as a heading.
          </p>
          <Input
            id="category-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={MAX_CATEGORY_NAME_LENGTH}
            autoFocus
          />
          {isAtCharLimit(name, MAX_CATEGORY_NAME_LENGTH) && (
            <CharLimitWarning maxLength={MAX_CATEGORY_NAME_LENGTH} />
          )}
        </div>

        <hr className="border-t" />

        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <Label htmlFor="category-is-page">This category has its own page</Label>
            <p className="text-muted-foreground text-xs">
              Off: just a breadcrumb segment in the URL, with no content of its own.
            </p>
          </div>
          <Switch id="category-is-page" checked={isPage} onCheckedChange={setIsPage} />
        </div>

        {isPage && (
          <>
            <hr className="border-t" />

            <div className="flex flex-col gap-4">
              <p className="text-base font-semibold">Hero</p>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="category-title">
                  Title
                  <RequiredMark />
                </Label>
                <p className="text-muted-foreground -mt-1 text-xs">
                  The heading shown at the top of this category&apos;s own page. Can read differently from Name above
                  — e.g. Name &quot;Alma Laser&quot; (menu/URL) vs. Title &quot;ALMA LASER&quot; (page heading).
                </p>
                <Input
                  id="category-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={MAX_CATEGORY_TITLE_LENGTH}
                  placeholder="Shown as this page's main heading"
                />
                {isAtCharLimit(title, MAX_CATEGORY_TITLE_LENGTH) && (
                  <CharLimitWarning maxLength={MAX_CATEGORY_TITLE_LENGTH} />
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="category-description">
                  Description
                  <RequiredMark />
                </Label>
                <Textarea
                  id="category-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  maxLength={MAX_CATEGORY_DESCRIPTION_LENGTH}
                  rows={3}
                  placeholder="Shown under the title"
                />
                {isAtCharLimit(description, MAX_CATEGORY_DESCRIPTION_LENGTH) && (
                  <CharLimitWarning maxLength={MAX_CATEGORY_DESCRIPTION_LENGTH} />
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Text Color</Label>
                <p className="text-muted-foreground -mt-1 text-xs">Applies to both Title and Description above.</p>
                <HeroTextColorPicker value={heroTextColor} onChange={setHeroTextColor} />
              </div>

              <div className="flex flex-col gap-3">
                <p className="text-sm font-medium">
                  Banners
                  <RequiredMark />
                </p>
                <p className="text-muted-foreground -mt-2 text-xs">
                  Up to {MAX_CATEGORY_BANNER_LABEL} each. JPEG, PNG, or WEBP.
                </p>

                <div className="flex flex-row flex-wrap justify-start gap-4">
                  <div className="flex w-40 flex-col gap-1.5">
                    <Label className="text-xxs">
                      2560x1440
                      <RequiredMark />
                    </Label>
                    <UploadField
                      kind="image"
                      aspect="square"
                      fit="cover"
                      uploadAction={uploadCategoryBanner}
                      value={bannerXlUrl}
                      onChange={(value) => setBannerXlUrl((value as string) ?? "")}
                    />
                  </div>

                  <div className="flex w-40 flex-col gap-1.5">
                    <Label className="text-xxs">2048x1536</Label>
                    <UploadField
                      kind="image"
                      aspect="square"
                      fit="cover"
                      uploadAction={uploadCategoryBanner}
                      value={bannerLgUrl}
                      onChange={(value) => setBannerLgUrl((value as string) ?? "")}
                    />
                  </div>

                  <div className="flex w-40 flex-col gap-1.5">
                    <Label className="text-xxs">1536x2048</Label>
                    <UploadField
                      kind="image"
                      aspect="square"
                      fit="cover"
                      uploadAction={uploadCategoryBanner}
                      value={bannerMdUrl}
                      onChange={(value) => setBannerMdUrl((value as string) ?? "")}
                    />
                  </div>

                  <div className="flex w-40 flex-col gap-1.5">
                    <Label className="text-xxs">1440x2560</Label>
                    <UploadField
                      kind="image"
                      aspect="square"
                      fit="cover"
                      uploadAction={uploadCategoryBanner}
                      value={bannerSmUrl}
                      onChange={(value) => setBannerSmUrl((value as string) ?? "")}
                    />
                  </div>
                </div>
              </div>
            </div>

            <hr className="border-t" />

            <div className="flex flex-col gap-4">
              <p className="text-base font-semibold">Body</p>
              <RichTextEditor
                value={body}
                onChange={setBody}
                onUploadImage={uploadCategoryContentImage}
                placeholder="Write the page content..."
                // Mirrors the public page's own h2/h3/p typography and
                // spacing (globals.css) so what's typed here previews
                // exactly as it will render, not the more compact defaults
                // the article editor uses.
                contentClassName="tiptap-content-category tiptap-content-category-compact"
              />
            </div>

            <hr className="border-t" />

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-0.5">
                <p className="text-base font-semibold">Video</p>
                <p className="text-muted-foreground text-xs">
                  All optional — a page can skip the video entirely, or show just the URL with no extra dressing.
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="category-youtube">YouTube URL</Label>
                <Input
                  id="category-youtube"
                  type="url"
                  value={youtubeUrl}
                  onChange={(event) => setYoutubeUrl(event.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Custom thumbnail</Label>
                <p className="text-muted-foreground -mt-1 text-xs">
                  Poster with a play button; defaults to YouTube&apos;s thumbnail if empty. Up to{" "}
                  {MAX_CATEGORY_BANNER_LABEL}, JPEG, PNG, or WEBP.
                </p>
                <UploadField
                  kind="image"
                  aspect="video"
                  fit="cover"
                  uploadAction={uploadCategoryVideoThumbnail}
                  value={youtubeThumbnailUrl}
                  onChange={(value) => setYoutubeThumbnailUrl((value as string) ?? "")}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="category-youtube-caption">Caption</Label>
                <Input
                  id="category-youtube-caption"
                  value={youtubeCaption}
                  onChange={(event) => setYoutubeCaption(event.target.value)}
                  maxLength={MAX_CATEGORY_YOUTUBE_CAPTION_LENGTH}
                  placeholder="Shown as a heading above the video"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="category-youtube-description">Description</Label>
                <Textarea
                  id="category-youtube-description"
                  value={youtubeDescription}
                  onChange={(event) => setYoutubeDescription(event.target.value)}
                  maxLength={MAX_CATEGORY_YOUTUBE_DESCRIPTION_LENGTH}
                  rows={2}
                  placeholder="Shown below the caption"
                />
              </div>
            </div>
          </>
        )}
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button type="button" onClick={handleSubmit} disabled={isPending || !canSubmit}>
          {isPending ? "Saving..." : submitLabel}
        </Button>
      </DialogFooter>
    </div>
  );
}

interface ICategoryNodeProps {
  node: ICategory;
  type: ICategoryType;
  disabled: boolean;
  onAddChild: (node: ICategory) => void;
  onEdit: (node: ICategory) => void;
  onDelete: (node: ICategory) => void;
  onReorderChildren: (parentId: string, ids: string[]) => void;
}

function CategoryNode({
  node,
  type,
  disabled,
  onAddChild,
  onEdit,
  onDelete,
  onReorderChildren,
}: ICategoryNodeProps) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children.length > 0;
  const canAddChild = node.depth < MAX_CATEGORY_DEPTH;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: node.id,
    disabled,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(isDragging && "relative z-10")}
    >
      <div
        className={cn(
          "bg-background flex items-center gap-1 rounded-md border p-2",
          isDragging && "shadow-lg",
          disabled && "opacity-70"
        )}
      >
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Reorder ${node.name}`}
          className="text-muted-foreground hover:text-foreground cursor-grab touch-none rounded-md p-1 active:cursor-grabbing"
        >
          <GripVertical className="size-4" />
        </button>

        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          aria-label={expanded ? `Collapse ${node.name}` : `Expand ${node.name}`}
          className={cn(
            "text-muted-foreground hover:text-foreground rounded-md p-1 transition-transform",
            expanded && "rotate-90",
            !hasChildren && "invisible"
          )}
        >
          <ChevronRight className="size-4" />
        </button>

        <div className="flex flex-1 flex-col">
          <span className="flex items-center gap-2 text-sm font-medium">
            {node.name}
            {node.isPage && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    aria-label="This category has its own page"
                    className="text-muted-foreground hover:text-foreground inline-flex"
                  >
                    <FileText className="size-3" />
                  </span>
                </TooltipTrigger>
                <TooltipContent>This category has its own page</TooltipContent>
              </Tooltip>
            )}
          </span>
          <span className="text-muted-foreground text-xs">/{node.slug}</span>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Add sub-category under ${node.name}`}
          disabled={!canAddChild}
          title={canAddChild ? undefined : `Maximum depth is ${MAX_CATEGORY_DEPTH} levels`}
          onClick={() => onAddChild(node)}
        >
          <Plus className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Edit ${node.name}`}
          onClick={() => onEdit(node)}
        >
          <Pencil className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Delete ${node.name}`}
          className="text-destructive hover:text-destructive"
          onClick={() => onDelete(node)}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>

      {expanded && hasChildren && (
        <div className="mt-2 flex flex-col gap-2 border-l pl-4 ml-4">
          <CategoryLevel
            nodes={node.children}
            parentId={node.id}
            type={type}
            disabled={disabled}
            onAddChild={onAddChild}
            onEdit={onEdit}
            onDelete={onDelete}
            onReorderChildren={onReorderChildren}
          />
        </div>
      )}
    </div>
  );
}

interface ICategoryLevelProps {
  nodes: ICategory[];
  parentId: string | null;
  type: ICategoryType;
  disabled: boolean;
  onAddChild: (node: ICategory) => void;
  onEdit: (node: ICategory) => void;
  onDelete: (node: ICategory) => void;
  onReorderChildren: (parentId: string, ids: string[]) => void;
}

// One sibling group = one drag-and-drop scope, so dragging can only reorder
// within the same parent, never move a node across levels.
function CategoryLevel({
  nodes,
  parentId,
  disabled,
  onAddChild,
  onEdit,
  onDelete,
  onReorderChildren,
  type,
}: ICategoryLevelProps) {
  const dndId = useId();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !parentId) return;

    const oldIndex = nodes.findIndex((node) => node.id === active.id);
    const newIndex = nodes.findIndex((node) => node.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    onReorderChildren(parentId, arrayMove(nodes, oldIndex, newIndex).map((node) => node.id));
  };

  return (
    <DndContext
      id={dndId}
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={nodes.map((node) => node.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2">
          {nodes.map((node) => (
            <CategoryNode
              key={node.id}
              node={node}
              type={type}
              disabled={disabled}
              onAddChild={onAddChild}
              onEdit={onEdit}
              onDelete={onDelete}
              onReorderChildren={onReorderChildren}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

// The root list (parentId = null) reuses CategoryLevel too — its
// onReorderChildren call just special-cases parentId === null below.
export function CategoryTree({
  type,
  title,
  initialRoots,
}: {
  type: ICategoryType;
  title: string;
  initialRoots: ICategory[];
}) {
  const [roots, setRoots] = useState(initialRoots);
  const [error, setError] = useState<string | null>(null);
  const [isReordering, startReorderTransition] = useTransition();

  const [addTarget, setAddTarget] = useState<{ parentId: string | null; label: string } | null>(
    null
  );
  const [editTarget, setEditTarget] = useState<ICategory | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ICategory | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  const handleReorder = (parentId: string | null, ids: string[]) => {
    setError(null);

    if (parentId === null) {
      const previous = roots;
      const byId = new Map(roots.map((node) => [node.id, node]));
      setRoots(ids.map((id) => byId.get(id)!));

      startReorderTransition(async () => {
        const result = await reorderCategories(type, null, ids);
        if (!result.success) {
          setRoots(previous);
          setError(result.error.message);
        }
      });
      return;
    }

    const previous = roots;
    setRoots((current) => reorderChildrenInTree(current, parentId, ids));

    startReorderTransition(async () => {
      const result = await reorderCategories(type, parentId, ids);
      if (!result.success) {
        setRoots(previous);
        setError(result.error.message);
      }
    });
  };

  const handleAdd = async (values: ICategoryFormValues) => {
    if (!addTarget) return { success: false, message: "Nothing to add to." };

    const formData = new FormData();
    formData.set("type", type);
    formData.set("name", values.name);
    formData.set("isPage", values.isPage ? "true" : "false");
    if (values.isPage) {
      if (values.bannerSmUrl) formData.set("bannerSmUrl", values.bannerSmUrl);
      if (values.bannerMdUrl) formData.set("bannerMdUrl", values.bannerMdUrl);
      if (values.bannerLgUrl) formData.set("bannerLgUrl", values.bannerLgUrl);
      formData.set("bannerXlUrl", values.bannerXlUrl);
      formData.set("title", values.title);
      formData.set("description", values.description);
      formData.set("body", values.body);
      formData.set("heroTextColor", values.heroTextColor);
      if (values.youtubeUrl) formData.set("youtubeUrl", values.youtubeUrl);
      if (values.youtubeThumbnailUrl) formData.set("youtubeThumbnailUrl", values.youtubeThumbnailUrl);
      if (values.youtubeCaption) formData.set("youtubeCaption", values.youtubeCaption);
      if (values.youtubeDescription) formData.set("youtubeDescription", values.youtubeDescription);
    }
    if (addTarget.parentId) formData.set("parentId", addTarget.parentId);

    const result = await createCategory(formData);
    if (!result.success) return { success: false, message: result.error.message };

    const contentFields = {
      isPage: result.data.isPage,
      bannerSmUrl: result.data.bannerSmUrl,
      bannerMdUrl: result.data.bannerMdUrl,
      bannerLgUrl: result.data.bannerLgUrl,
      bannerXlUrl: result.data.bannerXlUrl,
      title: result.data.title,
      description: result.data.description,
      body: result.data.body,
      heroTextColor: result.data.heroTextColor,
      youtubeUrl: result.data.youtubeUrl,
      youtubeThumbnailUrl: result.data.youtubeThumbnailUrl,
      youtubeCaption: result.data.youtubeCaption,
      youtubeDescription: result.data.youtubeDescription,
    };

    if (!addTarget.parentId) {
      setRoots((current) => [
        ...current,
        {
          id: result.data.id,
          type,
          name: values.name,
          slug: result.data.slug,
          depth: 1,
          order: current.length,
          parentId: null,
          ...contentFields,
          children: [],
        },
      ]);
    } else {
      const parentId = addTarget.parentId;
      setRoots((current) =>
        addChildToTree(current, parentId, (parentDepth) => ({
          id: result.data.id,
          type,
          name: values.name,
          slug: result.data.slug,
          depth: parentDepth + 1,
          order: 0,
          parentId,
          ...contentFields,
          children: [],
        }))
      );
    }

    setAddTarget(null);
    return { success: true };
  };

  const handleEditSubmit = async (values: ICategoryFormValues) => {
    if (!editTarget) return { success: false, message: "Nothing to edit." };

    const formData = new FormData();
    formData.set("name", values.name);
    formData.set("isPage", values.isPage ? "true" : "false");
    if (values.isPage) {
      if (values.bannerSmUrl) formData.set("bannerSmUrl", values.bannerSmUrl);
      if (values.bannerMdUrl) formData.set("bannerMdUrl", values.bannerMdUrl);
      if (values.bannerLgUrl) formData.set("bannerLgUrl", values.bannerLgUrl);
      formData.set("bannerXlUrl", values.bannerXlUrl);
      formData.set("title", values.title);
      formData.set("description", values.description);
      formData.set("body", values.body);
      formData.set("heroTextColor", values.heroTextColor);
      if (values.youtubeUrl) formData.set("youtubeUrl", values.youtubeUrl);
      if (values.youtubeThumbnailUrl) formData.set("youtubeThumbnailUrl", values.youtubeThumbnailUrl);
      if (values.youtubeCaption) formData.set("youtubeCaption", values.youtubeCaption);
      if (values.youtubeDescription) formData.set("youtubeDescription", values.youtubeDescription);
    }

    const result = await updateCategory(editTarget.id, formData);
    if (!result.success) return { success: false, message: result.error.message };

    setRoots((current) =>
      updateNodeInTree(current, editTarget.id, (node) => ({
        ...node,
        name: values.name,
        slug: result.data.slug,
        isPage: result.data.isPage,
        bannerSmUrl: result.data.bannerSmUrl,
        bannerMdUrl: result.data.bannerMdUrl,
        bannerLgUrl: result.data.bannerLgUrl,
        bannerXlUrl: result.data.bannerXlUrl,
        title: result.data.title,
        description: result.data.description,
        body: result.data.body,
        heroTextColor: result.data.heroTextColor,
        youtubeUrl: result.data.youtubeUrl,
        youtubeThumbnailUrl: result.data.youtubeThumbnailUrl,
        youtubeCaption: result.data.youtubeCaption,
        youtubeDescription: result.data.youtubeDescription,
      }))
    );
    setEditTarget(null);
    return { success: true };
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setError(null);

    startDeleteTransition(async () => {
      const result = await deleteCategory(target.id);
      if (!result.success) {
        setError(result.error.message);
      } else {
        setRoots((current) => removeNodeFromTree(current, target.id));
      }
      setDeleteTarget(null);
    });
  };

  const busy = isReordering || isDeleting;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">{title}</h2>
        <Button onClick={() => setAddTarget({ parentId: null, label: `Add ${title.toLowerCase()} category` })}>
          <Plus className="size-4" /> Add category
        </Button>
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      {roots.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          No categories yet. Add the first one to get started.
        </p>
      ) : (
        <CategoryLevel
          nodes={roots}
          parentId={null}
          type={type}
          disabled={busy}
          onAddChild={(node) => setAddTarget({ parentId: node.id, label: `Add sub-category under "${node.name}"` })}
          onEdit={setEditTarget}
          onDelete={setDeleteTarget}
          onReorderChildren={handleReorder}
        />
      )}

      <Dialog open={addTarget !== null} onOpenChange={(open) => !open && setAddTarget(null)}>
        <DialogContent
          className="flex max-h-[85vh] flex-col sm:max-w-2xl"
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>{addTarget?.label}</DialogTitle>
            <DialogDescription>The deepest level in each branch becomes its product catalogue page.</DialogDescription>
          </DialogHeader>
          <CategoryForm submitLabel="Add" onSubmit={handleAdd} onCancel={() => setAddTarget(null)} />
        </DialogContent>
      </Dialog>

      <Dialog open={editTarget !== null} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent
          className="flex max-h-[85vh] flex-col sm:max-w-2xl"
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Edit category</DialogTitle>
            <DialogDescription>The deepest level in each branch becomes its product catalogue page.</DialogDescription>
          </DialogHeader>
          {editTarget && (
            <CategoryForm
              key={editTarget.id}
              initialValues={{
                name: editTarget.name,
                isPage: editTarget.isPage,
                bannerSmUrl: editTarget.bannerSmUrl ?? "",
                bannerMdUrl: editTarget.bannerMdUrl ?? "",
                bannerLgUrl: editTarget.bannerLgUrl ?? "",
                bannerXlUrl: editTarget.bannerXlUrl ?? "",
                title: editTarget.title ?? "",
                description: editTarget.description ?? "",
                body: editTarget.body ?? "",
                heroTextColor: editTarget.heroTextColor ?? DEFAULT_HERO_TEXT_COLOR,
                youtubeUrl: editTarget.youtubeUrl ?? "",
                youtubeThumbnailUrl: editTarget.youtubeThumbnailUrl ?? "",
                youtubeCaption: editTarget.youtubeCaption ?? "",
                youtubeDescription: editTarget.youtubeDescription ?? "",
              }}
              submitLabel="Save"
              onSubmit={handleEditSubmit}
              onCancel={() => setEditTarget(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this category?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-semibold">{deleteTarget?.name}</span>
              {deleteTarget && deleteTarget.children.length > 0
                ? ` and all ${deleteTarget.children.length} of its sub-categories will be deleted. This cannot be undone.`
                : " will be deleted. This cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

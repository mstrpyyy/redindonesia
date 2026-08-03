"use client";

import { useEffect, useId, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, GripVertical, Pencil, Plus, Trash2 } from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { cn } from "@/lib/utils";
import { ICategory, IProductListItem, ITag } from "@/interfaces/general";
import { deleteProduct, reorderProducts, updateProductStatus } from "./product-actions";
import { ItemFilterBar } from "./item-filter-bar";
import { PRODUCT_LIST_PAGE_SIZE, PRODUCT_LIST_PAGE_SIZE_OPTIONS } from "./limits";

function categoryBreadcrumb(category: IProductListItem["category"]): string {
  const parts = [category.parent?.parent?.name, category.parent?.name, category.name].filter(Boolean);
  return parts.join(" / ");
}

interface ISortableRowProps {
  item: IProductListItem;
  editorBasePath: string;
  disabled: boolean;
  onStatusChange: (item: IProductListItem, status: "hidden" | "public") => void;
  onDelete: (item: IProductListItem) => void;
}

function SortableRow({ item, editorBasePath, disabled, onStatusChange, onDelete }: ISortableRowProps) {
  const displayName = item.name || "Untitled";
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled,
  });

  return (
    <TableRow
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("bg-background", isDragging && "relative z-10 shadow-lg", disabled && "opacity-70")}
    >
      <TableCell>
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Reorder ${displayName}`}
          className="text-muted-foreground hover:text-foreground cursor-grab touch-none rounded-md p-1 active:cursor-grabbing"
        >
          <GripVertical className="size-4" />
        </button>
      </TableCell>
      <TableCell>
        <div className="bg-muted relative size-12 shrink-0 overflow-hidden rounded-md">
          {item.thumbnail && <Image src={item.thumbnail} alt={displayName} fill sizes="48px" className="object-cover" />}
        </div>
      </TableCell>
      <TableCell>
        <span className="block max-w-48 truncate font-medium">{displayName}</span>
      </TableCell>
      <TableCell>
        <span className="text-muted-foreground block max-w-64 truncate text-xs">{categoryBreadcrumb(item.category)}</span>
      </TableCell>
      <TableCell>
        <Select value={item.status} onValueChange={(value) => onStatusChange(item, value as "hidden" | "public")} disabled={disabled}>
          <SelectTrigger
            size="sm"
            className="h-auto w-fit gap-1 rounded-full border-none bg-transparent p-0 whitespace-nowrap shadow-none hover:bg-transparent [&>svg]:hidden"
            aria-label={`Change status for ${displayName}`}
          >
            <SelectValue>
              <Badge variant={item.status === "public" ? "default" : "secondary"} className="h-7 w-28 justify-between gap-1 whitespace-nowrap">
                {item.status === "public" ? "Publish" : "Draft"}
                <ChevronDown className="size-3" />
              </Badge>
            </SelectValue>
          </SelectTrigger>
          <SelectContent position="popper" side="bottom" align="start">
            <SelectItem className="text-xs font-medium" value="hidden">Draft</SelectItem>
            <SelectItem className="text-xs font-medium" value="public">Publish</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="text-right">
        <Button variant="ghost" size="icon-sm" asChild aria-label={`Edit ${displayName}`}>
          <Link href={`${editorBasePath}?id=${item.id}`}>
            <Pencil className="size-4" />
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onDelete(item)}
          aria-label={`Delete ${displayName}`}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="size-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

export function ItemTable({
  type,
  title,
  items: initialItems,
  total,
  page,
  pageSize,
  search,
  categoryIds,
  tagIds,
  categories,
  tags,
}: {
  type: "device" | "product";
  title: string;
  items: IProductListItem[];
  total: number;
  page: number;
  pageSize: number | "all";
  search: string;
  categoryIds: string[];
  tagIds: string[];
  categories: ICategory[];
  tags: ITag[];
}) {
  const editorBasePath = `/admin/product-device/items/editor`;
  const router = useRouter();
  const pathname = usePathname();

  const [items, setItems] = useState(initialItems);
  const [deleting, setDeleting] = useState<IProductListItem | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const dndId = useId();

  // `initialItems` is a fresh array every time the server re-fetches after a
  // filter/page/page-size navigation — resync local state to it rather than
  // forcing a remount (a remount would also reset each MultiSelectFilter
  // popover's own open state, closing it after every single select/unselect).
  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const hasFilters = search.trim() !== "" || categoryIds.length > 0 || tagIds.length > 0;
  // See ADR-083: dragging only stays globally consistent when the visible
  // rows are exactly the lowest-`order` contiguous prefix — the plain,
  // unfiltered, page-1 view (which "all" trivially satisfies, since it *is*
  // every row). Any filter or later page disables the handle.
  const canReorder = page === 1 && !hasFilters;
  const totalPages = pageSize === "all" ? 1 : Math.max(1, Math.ceil(total / pageSize));

  function navigate(
    next: { q?: string; categoryIds?: string[]; tagIds?: string[]; page?: number; pageSize?: number | "all" },
    push = false
  ) {
    const nextQ = next.q ?? search;
    const nextCategoryIds = next.categoryIds ?? categoryIds;
    const nextTagIds = next.tagIds ?? tagIds;
    const nextPageSize = next.pageSize ?? pageSize;
    const filtersOrSizeChanged =
      next.q !== undefined || next.categoryIds !== undefined || next.tagIds !== undefined || next.pageSize !== undefined;
    const nextPage = next.page ?? (filtersOrSizeChanged ? 1 : page);

    const params = new URLSearchParams();
    if (nextQ.trim()) params.set("q", nextQ.trim());
    if (nextCategoryIds.length) params.set("categories", nextCategoryIds.join(","));
    if (nextTagIds.length) params.set("tags", nextTagIds.join(","));
    if (nextPageSize !== PRODUCT_LIST_PAGE_SIZE) params.set("pageSize", String(nextPageSize));
    if (nextPageSize !== "all" && nextPage > 1) params.set("page", String(nextPage));

    const qs = params.toString();
    const href = qs ? `${pathname}?${qs}` : pathname;
    if (push) router.push(href, { scroll: false });
    else router.replace(href, { scroll: false });
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    if (!canReorder) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const previous = items;
    const next = arrayMove(items, oldIndex, newIndex);
    setItems(next);
    setError(null);

    startTransition(async () => {
      const result = await reorderProducts(type, next.map((item) => item.id));
      if (!result.success) {
        setItems(previous);
        setError(result.error.message);
      }
    });
  };

  const handleStatusChange = (item: IProductListItem, status: "hidden" | "public") => {
    setError(null);
    const previous = items;
    setItems((current) => current.map((i) => (i.id === item.id ? { ...i, status } : i)));

    startTransition(async () => {
      const result = await updateProductStatus(item.id, status);
      if (!result.success) {
        setItems(previous);
        setError(result.error.message);
      }
    });
  };

  const handleDelete = () => {
    if (!deleting) return;
    const target = deleting;
    setError(null);

    startDeleteTransition(async () => {
      const result = await deleteProduct(target.id);
      if (!result.success) {
        setError(result.error.message);
      } else {
        setItems((current) => current.filter((item) => item.id !== target.id));
      }
      setDeleting(null);
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">{title}</h2>
        <Button asChild>
          <Link href={`${editorBasePath}?type=${type}`}>
            <Plus className="size-4" /> Add {type}
          </Link>
        </Button>
      </div>

      <ItemFilterBar
        categories={categories}
        tags={tags}
        search={search}
        categoryIds={categoryIds}
        tagIds={tagIds}
        onSearchChange={(value) => navigate({ q: value })}
        onCategoryIdsChange={(ids) => navigate({ categoryIds: ids })}
        onTagIdsChange={(ids) => navigate({ tagIds: ids })}
        onClear={() => navigate({ q: "", categoryIds: [], tagIds: [] })}
      />

      {!canReorder && (
        <p className="text-muted-foreground text-xs">
          Reordering is only available on the unfiltered first page — clear filters and return to page 1 to drag items.
        </p>
      )}

      {error && <p className="text-destructive text-sm">{error}</p>}

      <div className="rounded-lg border">
        <DndContext
          id={dndId}
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis, restrictToParentElement]}
          onDragEnd={handleDragEnd}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead className="w-16">Thumbnail</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground h-24 text-center">
                    {hasFilters ? "No matches for these filters." : `No ${type === "device" ? "devices" : "products"} yet.`}
                  </TableCell>
                </TableRow>
              )}
              <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
                {items.map((item) => (
                  <SortableRow
                    key={item.id}
                    item={item}
                    editorBasePath={editorBasePath}
                    disabled={isPending || !canReorder}
                    onStatusChange={handleStatusChange}
                    onDelete={setDeleting}
                  />
                ))}
              </SortableContext>
            </TableBody>
          </Table>
        </DndContext>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          Show
          <Select
            value={String(pageSize)}
            onValueChange={(value) => navigate({ pageSize: value === "all" ? "all" : Number(value) }, true)}
          >
            <SelectTrigger size="sm" className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRODUCT_LIST_PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
          per page · {total} total
        </div>
        <Pagination page={page} totalPages={totalPages} onPageChange={(nextPage) => navigate({ page: nextPage }, true)} />
      </div>

      <Dialog open={deleting !== null} onOpenChange={(open) => !open && !isDeleting && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {type === "device" ? "Device" : "Product"}</DialogTitle>
            <DialogDescription>
              Delete <span className="font-semibold">{deleting?.name || "Untitled"}</span>? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

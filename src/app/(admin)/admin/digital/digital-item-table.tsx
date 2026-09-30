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
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { cn } from "@/lib/utils";
import { AdminSectionTitle } from "@/app/(admin)/components/admin-section-title";
import { IDigitalListItem } from "@/interfaces/digital";
import { deleteDigitalItem, reorderDigitalItems, updateDigitalItemStatus } from "./digital-actions";
import { DIGITAL_LIST_PAGE_SIZE, DIGITAL_LIST_PAGE_SIZE_OPTIONS } from "./limits";

const EDITOR_BASE_PATH = "/admin/digital/editor";

interface ISortableRowProps {
  item: IDigitalListItem;
  disabled: boolean;
  statusDisabled: boolean;
  onStatusChange: (item: IDigitalListItem, status: "hidden" | "public") => void;
  onDelete: (item: IDigitalListItem) => void;
}

function SortableRow({ item, disabled, statusDisabled, onStatusChange, onDelete }: ISortableRowProps) {
  const displayName = item.name || "Untitled";
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled,
  });

  return (
    <TableRow
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("bg-background", isDragging && "relative z-10 shadow-lg")}
    >
      <TableCell>
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Reorder ${displayName}`}
          className={cn(
            "text-muted-foreground hover:text-foreground cursor-grab touch-none rounded-md p-1 active:cursor-grabbing",
            disabled && "cursor-not-allowed opacity-40 hover:text-muted-foreground"
          )}
        >
          <GripVertical className="size-4" />
        </button>
      </TableCell>
      <TableCell>
        <div className="bg-muted relative aspect-[3/4] w-12 shrink-0 overflow-hidden rounded-md">
          {item.qrImageUrl && <Image src={item.qrImageUrl} alt={displayName} fill sizes="64px" className="object-contain" />}
        </div>
      </TableCell>
      <TableCell>
        <span className="block max-w-64 truncate font-medium">{displayName}</span>
      </TableCell>
      <TableCell>
        <Select value={item.status} onValueChange={(value) => onStatusChange(item, value as "hidden" | "public")} disabled={statusDisabled}>
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
          <Link href={`${EDITOR_BASE_PATH}?id=${item.id}`}>
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

export function DigitalItemTable({
  items: initialItems,
  total,
  page,
  pageSize,
  search,
}: {
  items: IDigitalListItem[];
  total: number;
  page: number;
  pageSize: number | "all";
  search: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [items, setItems] = useState(initialItems);
  const [deleting, setDeleting] = useState<IDigitalListItem | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const dndId = useId();

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const hasFilters = search.trim() !== "";
  // Same rule as the product-device ItemTable (ADR-083): dragging only stays
  // globally consistent on the unfiltered first page.
  const canReorder = page === 1 && !hasFilters;
  const totalPages = pageSize === "all" ? 1 : Math.max(1, Math.ceil(total / pageSize));

  function navigate(next: { q?: string; page?: number; pageSize?: number | "all" }, push = false) {
    const nextQ = next.q ?? search;
    const nextPageSize = next.pageSize ?? pageSize;
    const filtersOrSizeChanged = next.q !== undefined || next.pageSize !== undefined;
    const nextPage = next.page ?? (filtersOrSizeChanged ? 1 : page);

    const params = new URLSearchParams();
    if (nextQ.trim()) params.set("q", nextQ.trim());
    if (nextPageSize !== DIGITAL_LIST_PAGE_SIZE) params.set("pageSize", String(nextPageSize));
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
      const result = await reorderDigitalItems(next.map((item) => item.id));
      if (!result.success) {
        setItems(previous);
        setError(result.error.message);
      }
    });
  };

  const handleStatusChange = (item: IDigitalListItem, status: "hidden" | "public") => {
    setError(null);
    const previous = items;
    setItems((current) => current.map((i) => (i.id === item.id ? { ...i, status } : i)));

    startTransition(async () => {
      const result = await updateDigitalItemStatus(item.id, status);
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
      const result = await deleteDigitalItem(target.id);
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
        <AdminSectionTitle>Digital Catalogue</AdminSectionTitle>
        <Button asChild>
          <Link href={EDITOR_BASE_PATH}>
            <Plus className="size-4" /> Add Link
          </Link>
        </Button>
      </div>

      <Input
        value={search}
        onChange={(event) => navigate({ q: event.target.value })}
        placeholder="Search by name..."
        className="max-w-xs"
      />

      {!canReorder && (
        <p className="text-muted-foreground text-xs">
          Reordering is only available on the unfiltered first page — clear the search and return to page 1 to drag items.
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
                <TableHead className="w-20">QR</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground h-24 text-center">
                    {hasFilters ? "No matches for this search." : "No digital links yet."}
                  </TableCell>
                </TableRow>
              )}
              <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
                {items.map((item) => (
                  <SortableRow
                    key={item.id}
                    item={item}
                    disabled={isPending || !canReorder}
                    statusDisabled={isPending}
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
              {DIGITAL_LIST_PAGE_SIZE_OPTIONS.map((size) => (
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
            <DialogTitle>Delete Digital Link</DialogTitle>
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

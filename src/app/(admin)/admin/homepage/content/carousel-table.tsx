"use client";

import { useEffect, useId, useState, useTransition } from "react";
import { GripVertical, Pencil, Plus, Trash2, TriangleAlert } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { ICategory, IHomeCarouselListItem, IProductPickerOption } from "@/interfaces/general";
import { deleteHomeCarousel, reorderHomeCarousels } from "./actions";
import { CarouselForm } from "./carousel-form";

function carouselDisplayTitle(item: IHomeCarouselListItem): string {
  if (item.mode === "category") return item.categoryLabel ?? "Category missing";
  return item.title ?? "Untitled";
}

interface ISortableRowProps {
  item: IHomeCarouselListItem;
  disabled: boolean;
  onEdit: (item: IHomeCarouselListItem) => void;
  onDelete: (item: IHomeCarouselListItem) => void;
}

function SortableRow({ item, disabled, onEdit, onDelete }: ISortableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled,
  });
  const isBroken = item.mode === "category" && !item.categoryId;

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
          aria-label={`Reorder ${carouselDisplayTitle(item)}`}
          className="text-muted-foreground hover:text-foreground cursor-grab touch-none rounded-md p-1 active:cursor-grabbing"
        >
          <GripVertical className="size-4" />
        </button>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <span className="max-w-64 truncate font-medium">{carouselDisplayTitle(item)}</span>
          {isBroken && (
            <span title="This carousel's category was deleted — edit it to pick a new one.">
              <TriangleAlert className="text-destructive size-4" />
            </span>
          )}
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="outline">{item.mode === "category" ? "By Category" : "Custom"}</Badge>
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">
        {item.mode === "custom" ? `${item.items.length} item${item.items.length === 1 ? "" : "s"}` : "—"}
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">{item.showSeeMore ? "Shown" : "Hidden"}</TableCell>
      <TableCell className="text-right">
        <Button variant="ghost" size="icon-sm" onClick={() => onEdit(item)} aria-label={`Edit ${carouselDisplayTitle(item)}`}>
          <Pencil className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onDelete(item)}
          aria-label={`Delete ${carouselDisplayTitle(item)}`}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="size-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

export function CarouselTable({
  carousels,
  deviceCategories,
  productCategories,
  productOptions,
}: {
  carousels: IHomeCarouselListItem[];
  deviceCategories: ICategory[];
  productCategories: ICategory[];
  productOptions: IProductPickerOption[];
}) {
  const [items, setItems] = useState(carousels);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<IHomeCarouselListItem | null>(null);
  const [deleting, setDeleting] = useState<IHomeCarouselListItem | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const dndId = useId();

  const [isAddFormDirty, setIsAddFormDirty] = useState(false);
  const [isEditFormDirty, setIsEditFormDirty] = useState(false);
  const [isAddSaving, setIsAddSaving] = useState(false);
  const [isEditSaving, setIsEditSaving] = useState(false);
  const [pendingClose, setPendingClose] = useState<"add" | "edit" | null>(null);

  useEffect(() => {
    setItems(carousels);
  }, [carousels]);

  const handleAddOpenChange = (open: boolean) => {
    if (!open) {
      if (isAddSaving) return;
      if (isAddFormDirty) {
        setPendingClose("add");
        return;
      }
    }
    setDialogOpen(open);
  };

  const handleEditOpenChange = (open: boolean) => {
    if (!open) {
      if (isEditSaving) return;
      if (isEditFormDirty) {
        setPendingClose("edit");
        return;
      }
      setEditing(null);
    }
  };

  const confirmDiscard = () => {
    if (pendingClose === "add") {
      setDialogOpen(false);
      setIsAddFormDirty(false);
    } else if (pendingClose === "edit") {
      setEditing(null);
      setIsEditFormDirty(false);
    }
    setPendingClose(null);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
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
      const result = await reorderHomeCarousels(next.map((item) => item.id));
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
      const result = await deleteHomeCarousel(target.id);
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
        <h2 className="text-2xl font-semibold">Carousel List</h2>
        <Dialog open={dialogOpen} onOpenChange={handleAddOpenChange}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4" /> Add new carousel
            </Button>
          </DialogTrigger>
          <DialogContent
            showCloseButton={!isAddSaving}
            onOpenAutoFocus={(event) => event.preventDefault()}
            className="flex max-h-[85vh] flex-col sm:max-w-3xl"
          >
            <DialogHeader>
              <DialogTitle>Add Carousel</DialogTitle>
            </DialogHeader>
            <CarouselForm
              deviceCategories={deviceCategories}
              productCategories={productCategories}
              productOptions={productOptions}
              onSuccess={() => {
                setDialogOpen(false);
                setIsAddFormDirty(false);
              }}
              onDirtyChange={setIsAddFormDirty}
              onPendingChange={setIsAddSaving}
            />
          </DialogContent>
        </Dialog>
      </div>

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
                <TableHead>Title</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>See More</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground h-24 text-center">
                    No carousels yet.
                  </TableCell>
                </TableRow>
              )}
              <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
                {items.map((item) => (
                  <SortableRow key={item.id} item={item} disabled={isPending} onEdit={setEditing} onDelete={setDeleting} />
                ))}
              </SortableContext>
            </TableBody>
          </Table>
        </DndContext>
      </div>

      <Dialog open={editing !== null} onOpenChange={handleEditOpenChange}>
        <DialogContent
          showCloseButton={!isEditSaving}
          onOpenAutoFocus={(event) => event.preventDefault()}
          className="flex max-h-[85vh] flex-col sm:max-w-3xl"
        >
          <DialogHeader>
            <DialogTitle>Edit Carousel</DialogTitle>
          </DialogHeader>
          {editing && (
            <CarouselForm
              key={editing.id}
              carousel={editing}
              deviceCategories={deviceCategories}
              productCategories={productCategories}
              productOptions={productOptions}
              onSuccess={() => {
                setEditing(null);
                setIsEditFormDirty(false);
              }}
              onDirtyChange={setIsEditFormDirty}
              onPendingChange={setIsEditSaving}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={pendingClose !== null} onOpenChange={(open) => !open && setPendingClose(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>
              This carousel has unsaved changes. Closing now will discard them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDiscard}>
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={deleting !== null} onOpenChange={(open) => !open && !isDeleting && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Carousel</DialogTitle>
            <DialogDescription>
              Delete <span className="font-semibold">{deleting ? carouselDisplayTitle(deleting) : ""}</span>? This
              cannot be undone.
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

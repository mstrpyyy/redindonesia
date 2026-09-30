"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { Check, Copy, GripVertical, Pencil, Plus, Trash2 } from "lucide-react";
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
import {
  restrictToParentElement,
  restrictToVerticalAxis,
} from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { AdminSectionTitle } from "@/app/(admin)/components/admin-section-title";
import { IBrand, ICategoryUrlSuggestion } from "@/interfaces/general";
import { deleteBrand, reorderBrands } from "./actions";
import { BrandForm } from "./brand-form";

interface ISortableRowProps {
  item: IBrand;
  disabled: boolean;
  copied: boolean;
  onCopy: (item: IBrand) => void;
  onEdit: (item: IBrand) => void;
  onDelete: (item: IBrand) => void;
}

function SortableRow({ item, disabled, copied, onCopy, onEdit, onDelete }: ISortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled });

  return (
    <TableRow
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "bg-background",
        isDragging && "relative z-10 shadow-lg",
        disabled && "opacity-70"
      )}
    >
      <TableCell>
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Reorder ${item.name}`}
          className="text-muted-foreground hover:text-foreground cursor-grab touch-none rounded-md p-1 active:cursor-grabbing"
        >
          <GripVertical className="size-4" />
        </button>
      </TableCell>
      <TableCell>
        <div className="bg-muted relative size-10 overflow-hidden rounded-md">
          <Image
            src={item.logo}
            alt={item.name}
            fill
            sizes="40px"
            draggable={false}
            className="object-contain"
          />
        </div>
      </TableCell>
      <TableCell>
        <span className="max-w-48 truncate font-medium">{item.name}</span>
      </TableCell>
      <TableCell>
        {item.url ? (
          <button
            type="button"
            onClick={() => onCopy(item)}
            title={item.url}
            className="text-muted-foreground hover:text-foreground flex max-w-72 items-center gap-1.5 text-left text-xs transition-colors"
          >
            {copied ? (
              <>
                <Check className="size-3 shrink-0" />
                <span className="truncate">Copied</span>
              </>
            ) : (
              <>
                <Copy className="size-3 shrink-0" />
                <span className="truncate">{item.url}</span>
              </>
            )}
          </button>
        ) : (
          <span className="text-muted-foreground text-xs">No URL</span>
        )}
      </TableCell>
      <TableCell className="text-right">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onEdit(item)}
          aria-label={`Edit ${item.name}`}
        >
          <Pencil className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onDelete(item)}
          aria-label={`Delete ${item.name}`}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="size-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

export function BrandTable({
  brands,
  urlSuggestions,
}: {
  brands: IBrand[];
  urlSuggestions: ICategoryUrlSuggestion[];
}) {
  const [items, setItems] = useState(brands);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<IBrand | null>(null);
  const [deleting, setDeleting] = useState<IBrand | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const dndId = useId();
  const copyResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    setItems(brands);
  }, [brands]);

  useEffect(() => {
    return () => {
      if (copyResetTimer.current) clearTimeout(copyResetTimer.current);
    };
  }, []);

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
      const result = await reorderBrands(next.map((item) => item.id));
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
      const result = await deleteBrand(target.id);
      if (!result.success) {
        setError(result.error.message);
      } else {
        setItems((current) => current.filter((item) => item.id !== target.id));
      }
      setDeleting(null);
    });
  };

  const handleCopy = (item: IBrand) => {
    if (!item.url) return;
    navigator.clipboard
      .writeText(item.url)
      .then(() => {
        setCopiedId(item.id);
        if (copyResetTimer.current) clearTimeout(copyResetTimer.current);
        copyResetTimer.current = setTimeout(() => setCopiedId(null), 2000);
      })
      .catch(() => setError("Could not copy the link to the clipboard."));
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <AdminSectionTitle>Brand List</AdminSectionTitle>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4" /> Create New
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Brand</DialogTitle>
            </DialogHeader>
            <BrandForm urlSuggestions={urlSuggestions} onSuccess={() => setDialogOpen(false)} />
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
                <TableHead className="w-16">Logo</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>URL</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-muted-foreground h-24 text-center"
                  >
                    No brands yet.
                  </TableCell>
                </TableRow>
              )}
              <SortableContext
                items={items.map((item) => item.id)}
                strategy={verticalListSortingStrategy}
              >
                {items.map((item) => (
                  <SortableRow
                    key={item.id}
                    item={item}
                    disabled={isPending}
                    copied={copiedId === item.id}
                    onCopy={handleCopy}
                    onEdit={setEditing}
                    onDelete={setDeleting}
                  />
                ))}
              </SortableContext>
            </TableBody>
          </Table>
        </DndContext>
      </div>

      <Dialog
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Brand</DialogTitle>
          </DialogHeader>
          {editing && (
            <BrandForm
              key={editing.id}
              brand={editing}
              urlSuggestions={urlSuggestions}
              onSuccess={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setDeleting(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Brand</DialogTitle>
            <DialogDescription>
              Delete <span className="font-semibold">{deleting?.name}</span>?
              Its logo will be removed too. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleting(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

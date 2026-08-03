"use client";

import { useEffect, useId, useState, useTransition } from "react";
import { ExternalLink, GripVertical, Pencil, Plus, Trash2 } from "lucide-react";
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
import { IPodcast } from "@/interfaces/general";
import { deletePodcast, reorderPodcasts } from "./actions";
import { PodcastForm } from "./podcast-form";

interface ISortableRowProps {
  item: IPodcast;
  disabled: boolean;
  onEdit: (item: IPodcast) => void;
  onDelete: (item: IPodcast) => void;
}

function SortableRow({ item, disabled, onEdit, onDelete }: ISortableRowProps) {
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
          aria-label={`Reorder ${item.title}`}
          className="text-muted-foreground hover:text-foreground cursor-grab touch-none rounded-md p-1 active:cursor-grabbing"
        >
          <GripVertical className="size-4" />
        </button>
      </TableCell>
      <TableCell>
        <span title={item.title} className="block max-w-48 truncate font-medium">
          {item.title}
        </span>
      </TableCell>
      <TableCell>
        <span
          title={item.description || undefined}
          className="text-muted-foreground block max-w-72 truncate text-xs"
        >
          {item.description || "—"}
        </span>
      </TableCell>
      <TableCell>
        <a
          href={item.youtubeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand-red2 hover:underline inline-flex items-center gap-1 text-xs"
        >
          Watch <ExternalLink className="size-3.5" />
        </a>
      </TableCell>
      <TableCell className="text-right">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onEdit(item)}
          aria-label={`Edit ${item.title}`}
        >
          <Pencil className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onDelete(item)}
          aria-label={`Delete ${item.title}`}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="size-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

export function PodcastTable({ podcasts }: { podcasts: IPodcast[] }) {
  const [items, setItems] = useState(podcasts);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<IPodcast | null>(null);
  const [deleting, setDeleting] = useState<IPodcast | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const dndId = useId();

  const [isAddFormDirty, setIsAddFormDirty] = useState(false);
  const [isEditFormDirty, setIsEditFormDirty] = useState(false);
  const [isAddSaving, setIsAddSaving] = useState(false);
  const [isEditSaving, setIsEditSaving] = useState(false);
  const [pendingClose, setPendingClose] = useState<"add" | "edit" | null>(null);

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

  useEffect(() => {
    setItems(podcasts);
  }, [podcasts]);

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
      const result = await reorderPodcasts(next.map((item) => item.id));
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
      const result = await deletePodcast(target.id);
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
        <h2 className="text-2xl font-semibold">Podcast List</h2>
        <Dialog open={dialogOpen} onOpenChange={handleAddOpenChange}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4" /> Create podcast
            </Button>
          </DialogTrigger>
          <DialogContent
            showCloseButton={!isAddSaving}
            onOpenAutoFocus={(event) => event.preventDefault()}
            className="flex max-h-[85vh] flex-col sm:max-w-lg"
          >
            <DialogHeader>
              <DialogTitle>Create Podcast</DialogTitle>
            </DialogHeader>
            <PodcastForm
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
                <TableHead>Description</TableHead>
                <TableHead>YouTube</TableHead>
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
                    No podcasts yet.
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
                    onEdit={setEditing}
                    onDelete={setDeleting}
                  />
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
          className="flex max-h-[85vh] flex-col sm:max-w-lg"
        >
          <DialogHeader>
            <DialogTitle>Edit Podcast</DialogTitle>
          </DialogHeader>
          {editing && (
            <PodcastForm
              key={editing.id}
              podcast={editing}
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

      <AlertDialog
        open={pendingClose !== null}
        onOpenChange={(open) => {
          if (!open) setPendingClose(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>
              This podcast has unsaved changes. Closing now will discard them.
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

      <Dialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setDeleting(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Podcast</DialogTitle>
            <DialogDescription>
              Delete <span className="font-semibold">{deleting?.title}</span>? This
              cannot be undone.
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

"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { Check, Copy, Globe, GripVertical, Pencil, Plus, Trash2 } from "lucide-react";
import {
  FacebookOutlinedRounded,
  InstagramOutlinedRounded,
  TiktokOutlinedRounded,
  XOutlinedRounded,
  YoutubeOutlinedRounded,
} from "@lineiconshq/react-lineicons";
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
import { ISocialAccount } from "@/interfaces/general";
import { deleteSocialAccount, reorderSocialAccounts } from "./actions";
import { SocialAccountForm } from "./social-account-form";

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  facebook: <FacebookOutlinedRounded className="size-4 shrink-0" />,
  instagram: <InstagramOutlinedRounded className="size-4 shrink-0" />,
  tiktok: <TiktokOutlinedRounded className="size-4 shrink-0" />,
  twitter: <XOutlinedRounded className="size-4 shrink-0" />,
  youtube: <YoutubeOutlinedRounded className="size-4 shrink-0" />,
};

interface ISortableRowProps {
  item: ISocialAccount;
  disabled: boolean;
  copied: boolean;
  onCopy: (item: ISocialAccount) => void;
  onEdit: (item: ISocialAccount) => void;
  onDelete: (item: ISocialAccount) => void;
}

function SortableRow({
  item,
  disabled,
  copied,
  onCopy,
  onEdit,
  onDelete,
}: ISortableRowProps) {
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
          aria-label={`Reorder ${item.label}`}
          className="text-muted-foreground hover:text-foreground cursor-grab touch-none rounded-md p-1 active:cursor-grabbing"
        >
          <GripVertical className="size-4" />
        </button>
      </TableCell>
      <TableCell>
        <div className="bg-muted relative size-10 overflow-hidden rounded-md">
          <Image
            src={item.profileImg}
            alt={item.label}
            fill
            sizes="40px"
            draggable={false}
            className="object-cover"
          />
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1.5 font-medium">
          {PLATFORM_ICONS[item.platform] ?? <Globe className="size-4 shrink-0" />}
          <span className="max-w-48 truncate">{item.label}</span>
        </div>
      </TableCell>
      <TableCell>
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
      </TableCell>
      <TableCell className="text-right">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onEdit(item)}
          aria-label={`Edit ${item.label}`}
        >
          <Pencil className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onDelete(item)}
          aria-label={`Delete ${item.label}`}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="size-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

export function SocialAccountTable({ accounts }: { accounts: ISocialAccount[] }) {
  const [items, setItems] = useState(accounts);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ISocialAccount | null>(null);
  const [deleting, setDeleting] = useState<ISocialAccount | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const copyResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    setItems(accounts);
  }, [accounts]);

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
      const result = await reorderSocialAccounts(next.map((item) => item.id));
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
      const result = await deleteSocialAccount(target.id);
      if (!result.success) {
        setError(result.error.message);
      } else {
        setItems((current) => current.filter((item) => item.id !== target.id));
      }
      setDeleting(null);
    });
  };

  const handleCopy = (item: ISocialAccount) => {
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
        <h2 className="text-2xl font-semibold">Social Media List</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4" /> Add social media
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Social Account</DialogTitle>
            </DialogHeader>
            <SocialAccountForm onSuccess={() => setDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      <div className="rounded-lg border">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis, restrictToParentElement]}
          onDragEnd={handleDragEnd}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead className="w-16">Profile</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Link</TableHead>
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
                    No social media accounts yet.
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
            <DialogTitle>Edit Social Account</DialogTitle>
          </DialogHeader>
          {editing && (
            <SocialAccountForm
              key={editing.id}
              account={editing}
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
            <DialogTitle>Delete Social Account</DialogTitle>
            <DialogDescription>
              Delete <span className="font-semibold">{deleting?.label}</span>?
              Its profile image will be removed too. This cannot be undone.
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

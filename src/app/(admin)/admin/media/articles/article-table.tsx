"use client";

import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowUp, ChevronDown, Pencil, Plus, Trash2 } from "lucide-react";
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
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { IArticle } from "@/interfaces/general";
import { deleteArticle, updateArticleStatus } from "./editor/actions";

// Fixed locale/timeZone so the server-rendered and client-hydrated output
// always match — leaving these to the environment default could format the
// same date differently between the two and trip a hydration mismatch.
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function formatDate(date: Date): string {
  return dateFormatter.format(new Date(date));
}

interface IArticleRowProps {
  article: IArticle;
  isBusy: boolean;
  onUnpublish: (article: IArticle) => void;
  onRequestPublish: (article: IArticle) => void;
  onDelete: (article: IArticle) => void;
}

function ArticleRow({ article, isBusy, onUnpublish, onRequestPublish, onDelete }: IArticleRowProps) {
  const displayTitle = article.title || "Untitled";

  const handleStatusSelect = (value: string) => {
    if (value === "published") onRequestPublish(article);
    else onUnpublish(article);
  };

  return (
    <TableRow>
      <TableCell>
        <div className="bg-muted relative size-12 shrink-0 overflow-hidden rounded-md">
          {article.coverImage && (
            <Image
              src={article.coverImage}
              alt={displayTitle}
              fill
              sizes="48px"
              className="object-cover"
            />
          )}
        </div>
      </TableCell>
      <TableCell>
        {article.title ? (
          <span title={article.title} className="block max-w-64 truncate font-medium">
            {article.title}
          </span>
        ) : (
          <span className="text-muted-foreground block max-w-64 truncate italic">Untitled</span>
        )}
      </TableCell>
      <TableCell>
        <span
          title={article.excerpt || undefined}
          className="text-muted-foreground block max-w-72 truncate text-xs"
        >
          {article.excerpt || "—"}
        </span>
      </TableCell>
      <TableCell>
        <span className="text-muted-foreground text-xs whitespace-nowrap">
          {formatDate(article.updatedAt)}
        </span>
      </TableCell>
      <TableCell>
        <Select value={article.status} onValueChange={handleStatusSelect} disabled={isBusy}>
          <SelectTrigger
            size="sm"
            className="h-auto w-fit gap-1 rounded-full border-none bg-transparent p-0 whitespace-nowrap shadow-none hover:bg-transparent [&>svg]:hidden"
            aria-label={`Change status for ${displayTitle}`}
          >
            <SelectValue>
              <Badge
                variant={article.status === "published" ? "default" : "secondary"}
                className="w-28 h-7 justify-between gap-1 whitespace-nowrap"
              >
                {article.status === "published" ? "Published" : "Draft"}
                <ChevronDown className="size-3" />
              </Badge>
            </SelectValue>
          </SelectTrigger>
          <SelectContent position="popper" side="bottom" align="start">
            <SelectItem className="text-xs font-medium" value="draft">Draft</SelectItem>
            <SelectItem className="text-xs font-medium" value="published">Published</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="text-right">
        <Button variant="ghost" size="icon-sm" asChild aria-label={`Edit ${displayTitle}`}>
          <Link href={`/admin/media/articles/editor?id=${article.id}`}>
            <Pencil className="size-4" />
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onDelete(article)}
          aria-label={`Delete ${displayTitle}`}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="size-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

export function ArticleTable({ articles }: { articles: IArticle[] }) {
  const [items, setItems] = useState(articles);
  const [deleting, setDeleting] = useState<IArticle | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();
  const [publishTarget, setPublishTarget] = useState<IArticle | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isStatusPending, startStatusTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const diff = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      return sortOrder === "asc" ? diff : -diff;
    });
  }, [items, sortOrder]);

  const toggleSortOrder = () => {
    setSortOrder((current) => (current === "asc" ? "desc" : "asc"));
  };

  const applyStatusChange = (id: string, status: "draft" | "published") => {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, status } : item))
    );
  };

  const runStatusChange = (article: IArticle, status: "draft" | "published") => {
    setError(null);
    setBusyId(article.id);

    startStatusTransition(async () => {
      const result = await updateArticleStatus(article.id, status);
      if (result.success) applyStatusChange(article.id, status);
      else setError(result.error.message);
      setBusyId(null);
    });
  };

  const handleUnpublish = (article: IArticle) => runStatusChange(article, "draft");

  const confirmPublish = () => {
    if (!publishTarget) return;
    runStatusChange(publishTarget, "published");
    setPublishTarget(null);
  };

  const handleDelete = () => {
    if (!deleting) return;
    const target = deleting;
    setError(null);

    startDeleteTransition(async () => {
      const result = await deleteArticle(target.id);
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
        <h2 className="text-2xl font-semibold">Article List</h2>
        <Button asChild>
          <Link href="/admin/media/articles/editor">
            <Plus className="size-4" /> Create article
          </Link>
        </Button>
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Thumbnail</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Excerpt</TableHead>
              <TableHead>
                <button
                  type="button"
                  onClick={toggleSortOrder}
                  className="hover:text-foreground flex items-center gap-1"
                >
                  Last Updated
                  {sortOrder === "asc" ? (
                    <ArrowUp className="size-3.5" />
                  ) : (
                    <ArrowDown className="size-3.5" />
                  )}
                </button>
              </TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedItems.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground h-24 text-center">
                  No articles yet.
                </TableCell>
              </TableRow>
            )}
            {sortedItems.map((article) => (
              <ArticleRow
                key={article.id}
                article={article}
                isBusy={isStatusPending && busyId === article.id}
                onUnpublish={handleUnpublish}
                onRequestPublish={setPublishTarget}
                onDelete={setDeleting}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog
        open={publishTarget !== null}
        onOpenChange={(open) => {
          if (!open) setPublishTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publish this article?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-semibold">{publishTarget?.title || "Untitled"}</span>{" "}
              will become visible on the public site. You can unpublish it again later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPublish}>Publish</AlertDialogAction>
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
            <DialogTitle>Delete Article</DialogTitle>
            <DialogDescription>
              Delete{" "}
              <span className="font-semibold">{deleting?.title || "Untitled"}</span>?
              Its thumbnail will be removed too. This cannot be undone.
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

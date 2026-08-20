"use client";

import { useEffect, useState, useTransition } from "react";
import { Mail, MailOpen, PanelRightClose, PanelRightOpen, Phone, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn, formatDateTime } from "@/lib/utils";
import type { IContactSubmission } from "@/lib/contact-submissions";
import { deleteContactSubmission, markContactSubmissionAsRead, markContactSubmissionAsUnread } from "../actions";

// Email-client layout: a scrollable list on the left, the selected message's
// full detail on the right — both panes scroll independently within a fixed
// height instead of the whole admin page scrolling, like an inbox. Starts
// collapsed with nothing selected — opening a row expands the detail pane
// and marks that submission read (readIds tracks this locally so the dot
// disappears immediately, without waiting on a refetch).
export function FormResponseView({ submissions }: { submissions: IContactSubmission[] }) {
  const [items, setItems] = useState(submissions);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(
    () => new Set(submissions.filter((item) => item.isRead).map((item) => item.id))
  );
  const [deleting, setDeleting] = useState<IContactSubmission | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setItems(submissions);
  }, [submissions]);

  const selected = items.find((item) => item.id === selectedId) ?? null;
  const isSelectedUnread = selected ? !readIds.has(selected.id) : false;

  const openSubmission = (item: IContactSubmission) => {
    setSelectedId(item.id);
    setIsDetailOpen(true);
    if (!readIds.has(item.id)) {
      setReadIds((prev) => new Set(prev).add(item.id));
      void markContactSubmissionAsRead(item.id);
    }
  };

  const setReadState = (item: IContactSubmission, isRead: boolean) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      if (isRead) next.add(item.id);
      else next.delete(item.id);
      return next;
    });
    void (isRead ? markContactSubmissionAsRead(item.id) : markContactSubmissionAsUnread(item.id));
  };

  const handleDelete = () => {
    if (!deleting) return;
    const target = deleting;
    setError(null);

    startDeleteTransition(async () => {
      const result = await deleteContactSubmission(target.id);
      if (!result.success) {
        setError(result.error.message);
        setDeleting(null);
        return;
      }

      setItems((current) => current.filter((item) => item.id !== target.id));
      if (selectedId === target.id) {
        setSelectedId(null);
        setIsDetailOpen(false);
      }
      setDeleting(null);
    });
  };

  return (
    <div className="flex flex-col gap-3">
      {error && <p className="text-destructive text-sm">{error}</p>}

      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm">No submissions yet.</p>
      ) : (
        <div className="flex h-[75vh] min-h-[32rem] overflow-hidden rounded-md border">
          <div className={cn("flex flex-col overflow-hidden", isDetailOpen ? "w-80 shrink-0 border-r" : "flex-1")}>
            <div className="flex shrink-0 items-center justify-between gap-2 border-b px-4 py-2">
              <p className="text-sm font-medium">Messages</p>
              {!isDetailOpen && selected && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Expand message"
                      onClick={() => setIsDetailOpen(true)}
                    >
                      <PanelRightOpen className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Expand message</TooltipContent>
                </Tooltip>
              )}
            </div>
            <ul className="overflow-y-auto">
              {items.map((item) => {
                const isActive = item.id === selectedId;
                const isUnread = !readIds.has(item.id);
                return (
                  <li key={item.id} className="group">
                    <div
                      className={cn(
                        "flex items-stretch border-l-2 border-l-transparent transition-colors",
                        isActive
                          ? "border-l-brand-red bg-secondary/50"
                          : "group-hover:bg-secondary/50 group-focus-within:bg-secondary/50"
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => openSubmission(item)}
                        className="flex min-w-0 flex-1 flex-col gap-1 px-4 py-3 text-left"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="flex min-w-0 items-center gap-2">
                            {isUnread && (
                              <span className="bg-brand-red size-2 shrink-0 rounded-full" aria-label="Unread" />
                            )}
                            <span className={cn("truncate text-sm", isUnread ? "font-semibold" : "font-medium")}>
                              {item.name}
                            </span>
                          </span>
                          <span className="text-muted-foreground shrink-0 text-xs">
                            {formatDateTime(item.createdAt)}
                          </span>
                        </div>
                        <p className="text-muted-foreground line-clamp-1 text-xs">{item.question}</p>
                      </button>
                      {!isDetailOpen && (
                        <div className="flex shrink-0 items-center gap-0.5 self-center pr-2 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                aria-label={
                                  isUnread
                                    ? `Mark message from ${item.name} as read`
                                    : `Mark message from ${item.name} as unread`
                                }
                                onClick={() => setReadState(item, isUnread)}
                                className="text-muted-foreground hover:text-foreground"
                              >
                                {isUnread ? <Mail className="size-4" /> : <MailOpen className="size-4" />}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{isUnread ? "Mark as read" : "Mark as unread"}</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Delete message from ${item.name}`}
                                onClick={() => setDeleting(item)}
                                className="text-destructive/70 hover:text-destructive"
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete message</TooltipContent>
                          </Tooltip>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {isDetailOpen && (
            <div className="flex flex-1 flex-col overflow-hidden">
              <div className="flex shrink-0 items-center justify-between gap-2 border-b px-2 py-2">
                <div className="flex items-center gap-1">
                  {selected && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={isSelectedUnread ? "Mark as read" : "Mark as unread"}
                          onClick={() => setReadState(selected, isSelectedUnread)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          {isSelectedUnread ? <Mail className="size-4" /> : <MailOpen className="size-4" />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{isSelectedUnread ? "Mark as read" : "Mark as unread"}</TooltipContent>
                    </Tooltip>
                  )}
                  {selected && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Delete message"
                          onClick={() => setDeleting(selected)}
                          className="text-destructive/70 hover:text-destructive"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Delete message</TooltipContent>
                    </Tooltip>
                  )}
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Hide message"
                      onClick={() => setIsDetailOpen(false)}
                    >
                      <PanelRightClose className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Hide message</TooltipContent>
                </Tooltip>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {selected ? (
                  <div className="flex flex-col gap-6">
                    <div>
                      <h2 className="text-xl font-semibold">{selected.name}</h2>
                      <p className="text-muted-foreground mt-1 text-sm">{formatDateTime(selected.createdAt)}</p>
                    </div>

                    <div className="flex flex-col gap-2 text-sm">
                      <a href={`mailto:${selected.email}`} className="flex items-center gap-2 hover:underline">
                        <Mail className="size-4" />
                        {selected.email}
                      </a>
                      <a href={`tel:${selected.phone}`} className="flex items-center gap-2 hover:underline">
                        <Phone className="size-4" />
                        {selected.phone}
                      </a>
                    </div>

                    <hr className="border-t" />

                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{selected.question}</p>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">Select a message to view it.</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <Dialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setDeleting(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Message</DialogTitle>
            <DialogDescription>
              Delete the message from <span className="font-semibold">{deleting?.name}</span>? This cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleting(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

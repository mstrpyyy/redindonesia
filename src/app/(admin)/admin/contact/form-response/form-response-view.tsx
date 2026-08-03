"use client";

import { useState } from "react";
import { Mail, PanelRightClose, PanelRightOpen, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatDateTime } from "@/lib/utils";
import type { IContactSubmission } from "@/lib/contact-submissions";
import { markContactSubmissionAsRead } from "../actions";

// Email-client layout: a scrollable list on the left, the selected message's
// full detail on the right — both panes scroll independently within a fixed
// height instead of the whole admin page scrolling, like an inbox. Starts
// collapsed with nothing selected — opening a row expands the detail pane
// and marks that submission read (readIds tracks this locally so the dot
// disappears immediately, without waiting on a refetch).
export function FormResponseView({ submissions }: { submissions: IContactSubmission[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(
    () => new Set(submissions.filter((item) => item.isRead).map((item) => item.id))
  );
  const selected = submissions.find((item) => item.id === selectedId) ?? null;

  if (submissions.length === 0) {
    return <p className="text-muted-foreground text-sm">No submissions yet.</p>;
  }

  const openSubmission = (item: IContactSubmission) => {
    setSelectedId(item.id);
    setIsDetailOpen(true);
    if (!readIds.has(item.id)) {
      setReadIds((prev) => new Set(prev).add(item.id));
      void markContactSubmissionAsRead(item.id);
    }
  };

  return (
    <div className="flex h-[75vh] min-h-[32rem] overflow-hidden rounded-md border">
      <div className={cn("flex flex-col overflow-hidden", isDetailOpen ? "w-80 shrink-0 border-r" : "flex-1")}>
        <div className="flex shrink-0 items-center justify-between gap-2 border-b px-4 py-2">
          <p className="text-sm font-medium">Messages</p>
          {!isDetailOpen && selected && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Show message panel"
              onClick={() => setIsDetailOpen(true)}
            >
              <PanelRightOpen className="size-4" />
            </Button>
          )}
        </div>
        <ul className="overflow-y-auto">
          {submissions.map((item) => {
            const isActive = item.id === selectedId;
            const isUnread = !readIds.has(item.id);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => openSubmission(item)}
                  className={cn(
                    "flex w-full flex-col gap-1 border-l-2 border-l-transparent px-4 py-3 text-left hover:bg-secondary/50",
                    isActive && "border-l-brand-red bg-secondary/50"
                  )}
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
              </li>
            );
          })}
        </ul>
      </div>

      {isDetailOpen && (
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex shrink-0 justify-end border-b px-2 py-2">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Collapse message panel"
              onClick={() => setIsDetailOpen(false)}
            >
              <PanelRightClose className="size-4" />
            </Button>
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
  );
}

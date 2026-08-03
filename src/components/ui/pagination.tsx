"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

// Windowed page-number list around the current page, with "…" for gaps —
// always keeps the first and last page visible. e.g. for page=5, total=10:
// [1, "…", 4, 5, 6, "…", 10]
function buildPageWindow(page: number, totalPages: number): (number | "ellipsis")[] {
  const pages = new Set<number>([1, totalPages, page - 1, page, page + 1])
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b)

  const result: (number | "ellipsis")[] = []
  sorted.forEach((p, index) => {
    if (index > 0 && p - sorted[index - 1] > 1) result.push("ellipsis")
    result.push(p)
  })
  return result
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
  className,
}: {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
}) {
  if (totalPages <= 1) return null

  return (
    <nav aria-label="Pagination" className={cn("flex items-center justify-center gap-1", className)}>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label="Previous page"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronLeft className="size-4" />
      </Button>

      {buildPageWindow(page, totalPages).map((entry, index) =>
        entry === "ellipsis" ? (
          <span key={`ellipsis-${index}`} className="text-muted-foreground px-2 text-sm">
            …
          </span>
        ) : (
          <Button
            key={entry}
            type="button"
            variant={entry === page ? "default" : "outline"}
            size="icon-sm"
            aria-label={`Page ${entry}`}
            aria-current={entry === page ? "page" : undefined}
            onClick={() => onPageChange(entry)}
          >
            {entry}
          </Button>
        )
      )}

      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label="Next page"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        <ChevronRight className="size-4" />
      </Button>
    </nav>
  )
}

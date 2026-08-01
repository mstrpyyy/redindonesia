import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

// `text-xxs` (globals.css's `--text-xxs`, this project's own addition to the
// default type scale) isn't recognized by tailwind-merge's built-in
// "T-shirt size" font-size validator — unextended, it falls through to the
// text-color class group instead, so `cn("text-white", "text-xxs")` silently
// drops `text-white` (they're treated as the same conflicting group) rather
// than keeping both. Extending the `text` theme scale with `xxs` fixes this
// for every call site at once instead of each one having to avoid combining
// a text-color class with `text-xxs` in the same `cn()` call.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["xxs"],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// en-GB orders day before month ("24 July 2026") — en-US would format the
// same options as "July 24, 2026".
const articleDateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "long",
  year: "numeric",
})

// e.g. "24 July 2026"
export function formatArticleDate(date: Date) {
  return articleDateFormatter.format(date)
}

// Admin-entered YouTube URLs are plain watch/share links (see the category
// editor's placeholder, "https://www.youtube.com/watch?v=..."), not embed
// URLs or a bare id — this pulls the video id out of whatever format was
// pasted. Returns null for a malformed or non-YouTube URL.
export function getYoutubeVideoId(url: string): string | null {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }

  if (parsed.hostname.includes("youtu.be")) {
    return parsed.pathname.slice(1) || null
  }
  if (parsed.pathname.startsWith("/embed/")) {
    return parsed.pathname.replace("/embed/", "") || null
  }
  return parsed.searchParams.get("v")
}

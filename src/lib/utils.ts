import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

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

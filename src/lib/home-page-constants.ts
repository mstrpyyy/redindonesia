// Client-safe homepage constants — no prisma / server-only imports, so client
// components (e.g. StatCounter) can import them without pulling the DB layer
// into the browser bundle. `home-page.ts` (server) is for the queries.

// Every dynamic homepage element renders this when its CMS value is missing
// or empty (ADR-099) — never a hardcoded default, and never a blank gap.
export const HOMEPAGE_EMPTY_PLACEHOLDER = "-";

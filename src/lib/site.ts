// No production domain is committed to `.env` yet (see DECISIONS.md
// ADR-096) — falls back to the current staging domain so `metadataBase` and
// absolute Open Graph URLs still resolve correctly until `SITE_URL` is set.
export const SITE_URL = process.env.SITE_URL ?? "https://demo.red-indonesia.co.id";

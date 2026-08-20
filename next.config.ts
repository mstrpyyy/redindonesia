import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Next 16's image optimizer 400s any `quality` prop not explicitly
    // allow-listed here — the built-in default only allows 75. Every full-
    // bleed banner/gallery image in this codebase (GalleryViewer.tsx,
    // PageBannerMedia.tsx, catalogue/Hero.tsx) passes `quality={90}` to
    // avoid the default's visible extra compression; without this list
    // those requests were silently failing (400, broken image) rather than
    // actually rendering at higher quality.
    qualities: [75, 90],
  },
  experimental: {
    // Galleries submit up to 50 images per Server Action call; the 1MB
    // default is sized for single-file forms (see ADR-008) and rejects any
    // multi-image gallery submission outright. See ADR-011. The VPS Nginx
    // config's `client_max_body_size` must be raised to match (see
    // ARCHITECTURE.md) — Nginx rejects an oversized request before it ever
    // reaches this limit.
    serverActions: {
      bodySizeLimit: "100mb",
    },
    // Every request — including gallery Server Action submissions — passes
    // through `src/middleware.ts` (proxy) first, which enforces its own,
    // separate 10MB default independent of `serverActions.bodySizeLimit`.
    // Must stay >= the serverActions limit above or large requests get cut
    // off before reaching the action ("Unexpected end of form").
    proxyClientMaxBodySize: "100mb",
  },
};

export default nextConfig;

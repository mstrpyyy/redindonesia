# Architectural Decisions

This file documents the technical decisions made during the development of Radian Elok.

## ADR-001: Tech Stack Selection

**Date:** 2026-05-07
**Status:** Accepted

**Context:**
The project requires a high-performance, SEO-friendly marketing site with interactive product displays (360 views, carousels).

**Options considered:**
1. **Next.js (App Router)**: Modern, built-in SEO, excellent performance, React-based.
2. **Nuxt.js**: Excellent Vue-based alternative, but the team expertise leans towards React.
3. **Astro**: Great for static sites, but may be more complex for highly interactive 360-viewers and complex stateful components.

**Decision:**
Next.js 16 with App Router was chosen for its mature ecosystem, TypeScript support, and built-in optimization for images and fonts.

**Consequences:**
- Fast initial load times and great SEO.
- TypeScript ensures type safety across the catalog data.
- Standardized component structure using shadcn/ui.

## ADR-002: Tailwind CSS v4

**Date:** 2026-05-07
**Status:** Accepted

**Context:**
Styling needs to be maintainable and fast to develop.

**Decision:**
Use Tailwind CSS v4 for utility-first styling.

**Consequences:**
- Reduced CSS bundle size.
- Faster development cycle with JIT compilation.
- Seamless integration with shadcn/ui.

## ADR-003: Static Data Strategy

**Date:** 2026-05-07
**Status:** Accepted (superseded in part by ADR-004 for CMS content)

**Context:**
The initial product catalog is small enough to manage locally without a database.

**Decision:**
Store product and menu data as TypeScript constants in `src/lib/data.ts`.

**Consequences:**
- Zero database overhead/latency.
- Version-controlled data changes.
- Easy to refactor into a CMS or database later.
- Superseded for article content, which now lives in Postgres (ADR-004). Product/menu
  data stays static — no scale pressure there yet.

## ADR-004: Self-hosted Postgres + Prisma over a headless CMS

**Date:** 2026-07-09
**Status:** Accepted

**Context:**
The catalog site needs a lightweight CMS for articles (and future content types)
managed by the client's own team, without paying for or integrating a third-party
headless CMS.

**Options considered:**
1. **Headless CMS (Sanity/Contentful)** — fast to stand up, hosted, but recurring cost,
   external dependency, and less control over the exact data model.
2. **Self-hosted Postgres + Prisma on the existing VPS** — no extra recurring cost
   (same VPS already runs WordPress), full schema control, fits the team's existing
   Next.js/TypeScript skillset.
3. **Prisma 7** — newer, but requires driver adapters and a separate
   `prisma.config.ts`; added complexity not justified yet.

**Decision:**
Self-host PostgreSQL in Docker on the VPS, accessed via Prisma 6
(`prisma-client-js` provider, not v7's driver-adapter model). Schema starts with
`AdminAccount` and `Article`.

**Consequences:**
- No new recurring SaaS cost; data stays on infrastructure already controlled.
- Postgres bound to `127.0.0.1:5432` only — not reachable outside the VPS.
- Revisit Prisma 7 migration once its driver-adapter setup is worth the complexity.

## ADR-005: Single shared admin login, not multi-user/RBAC

**Date:** 2026-07-09
**Status:** Accepted

**Context:**
The client's whole team needs to edit articles. There's no requirement yet for
per-editor accountability or differing permission levels.

**Options considered:**
1. **NextAuth with a full user/role model** — future-proof but adds OAuth/provider
   complexity and a users table with roles for a need that doesn't exist yet.
2. **Single shared `AdminAccount` row, JWT session in an httpOnly cookie** — minimal
   surface area, matches the actual current requirement.

**Decision:**
One seeded `AdminAccount` (bcrypt-hashed password), session issued as a JWT (signed via
`jose`) in an httpOnly/secure/sameSite cookie, verified by `src/middleware.ts` on every
`/admin/*` request except `/admin/login`.

**Consequences:**
- Much smaller auth surface than NextAuth; no OAuth config, no session-store service.
- No per-user audit trail — if that becomes a requirement, this ADR gets superseded by
  a real multi-user model.
- Adding a second admin user later means changing the schema and this decision, not a
  minor tweak — treat that as a new ADR, not a silent addition.

## ADR-006: Admin CMS lives in-app under `/admin`, not a separate app

**Date:** 2026-07-09
**Status:** Accepted

**Context:**
Need a place to put the login, article list, and editor UI.

**Options considered:**
1. **Separate app/subdomain** (e.g. `admin.red-indonesia.co.id`) — clean separation,
   but doubles deployment surface and needs its own Nginx server block.
2. **Routes inside the existing Next.js app** (`/admin/*`) — no new deployment, no new
   Nginx config, session/middleware handled by the same app.

**Decision:**
Build the CMS as routes inside this app under `/admin`, protected by
`src/middleware.ts`.

**Consequences:**
- Zero additional infra to stand up or maintain.
- Admin routes ship in the same build/deploy as the public site — a broken admin page
  can't be deployed independently of the public site (acceptable at current scale).

## ADR-007: Local-disk storage for uploaded images

**Date:** 2026-07-10
**Status:** Superseded by ADR-008

**Context:**
`SocialAccount.profileImg` needs an actual uploaded image, not a pasted URL. The
image-storage decision was flagged as open in `ARCHITECTURE.md` and needs resolving
before writing upload code.

**Options considered:**
1. **Local disk on the VPS, served via `public/`** — zero recurring cost, no external
   account/API key, works with the existing single-VPS deploy. Downside: no CDN/image
   optimization, and the app's own backup routine must be extended to cover
   `public/uploads` (Postgres backups alone won't capture files).
2. **Hosted service (Cloudinary/S3-compatible)** — better durability and CDN, but adds
   a recurring cost, an API key to manage, and a network dependency for every
   upload/render.

**Decision:**
Store uploaded images on local disk under `public/uploads/<feature>/<uuid>.<ext>`
(e.g. `public/uploads/social-accounts/`), written by the server action via
`fs/promises`. The DB stores only the relative `/uploads/...` path. `public/uploads`
is gitignored — it's runtime state on the VPS, not versioned content.

**Consequences:**
- No new third-party dependency or cost.
- Served automatically by Next.js's static handling of `public/` — no Nginx changes.
- File backups (not just the DB) must be added to the VPS backup routine before this
  is load-bearing in production.
- Revisit if traffic/volume ever justifies a CDN — this ADR gets superseded, not
  silently swapped out.

## ADR-008: Uploads stored outside the app directory, served by Nginx

**Date:** 2026-07-16
**Status:** Accepted (supersedes ADR-007)

**Context:**
ADR-007 assumed Next.js would serve runtime-written files under `public/uploads`. That
assumption is wrong in production: the `next start` server builds its static-asset
manifest at **build time**, so files written into `public/` at runtime 404 until the
next build/restart (observed on the VPS — uploads only appear after `pm2 restart`).
Deploys also replace the app directory, wiping `public/uploads` entirely. Local disk
remains the right storage medium (ADR-007's cost reasoning still holds); only the
location and serving path were wrong.

**Options considered:**
1. **Persistent directory outside the app, served directly by Nginx** — no restart
   needed, survives deploys, zero Node overhead per image request. Nginx is already in
   front of the app. Requires one Nginx `location` block and an env var.
2. **Same external directory, served by a Next.js route handler** — no Nginx change,
   but every image request goes through Node; strictly worse when Nginx is already
   available.
3. **Object storage (S3/R2/MinIO)** — better durability/CDN, but adds a third-party
   cost/dependency; overkill for a single-VPS CMS with small profile images.

**Decision:**
Uploads are written to `UPLOAD_DIR` (env var; on the VPS
`/var/lib/radian-elok/uploads`), organized as `<UPLOAD_DIR>/<feature>/<uuid>.<ext>`.
Nginx serves that directory at `/uploads/`. The DB continues to store the relative
`/uploads/<feature>/<filename>` URL, so no data migration is needed — existing files
are moved once with `mv`. In local dev, `UPLOAD_DIR` is unset and falls back to
`public/uploads`, which `next dev` serves from disk without a restart. Shared
save/delete helpers live in `src/lib/uploads.ts` so future upload features (e.g.
article cover images) reuse the same path handling.

**Consequences:**
- Uploads are immediately visible in production with no rebuild/restart, and survive
  deploys.
- One new piece of infra config: the Nginx `location /uploads/` block and the
  `UPLOAD_DIR` env var must exist on the VPS (documented in `ARCHITECTURE.md`).
- The backup-routine consequence from ADR-007 carries over: back up `UPLOAD_DIR`
  alongside Postgres.
- Dev and prod serve `/uploads/` through different mechanisms (Next dev server vs.
  Nginx) — acceptable, since the URL contract is identical.

## ADR-009: In-app route handler for `/uploads/*` alongside Nginx

**Date:** 2026-07-16
**Status:** Accepted (amends ADR-008)

**Context:**
After deploying ADR-008, `next/image` rendering of uploaded images broke in
production: `/_next/image?url=%2Fuploads%2F...` returned "The requested resource
isn't a valid image" even though the direct `/uploads/...` URL worked. Cause: for
relative `url=` sources, the Next.js image optimizer resolves the path through the
server's **own router**, never via an external HTTP request — so Nginx's
`location /uploads/` block is bypassed and the app itself 404s.

**Options considered:**
1. **Route handler `app/uploads/[...path]/route.ts` streaming from `UPLOAD_DIR`** —
   the optimizer resolves through it; Nginx still answers direct browser requests
   first, so the Node hot path is limited to optimizer cache misses.
2. **`unoptimized` prop on affected `<Image>` components** — avoids the handler but
   forfeits resizing/format optimization and must be remembered on every future
   upload-rendering component.
3. **Store absolute URLs + `images.remotePatterns`** — makes DB contents
   environment-dependent; rejected.

**Decision:**
Add the route handler (option 1). It validates path segments against the upload base
directory (`resolveUploadPath` in `src/lib/uploads.ts` rejects traversal), whitelists
image extensions, and serves with long-lived immutable cache headers (safe — filenames
are UUIDs). Verified locally against a production build: direct route 200, optimizer
200 with an optimized payload, traversal and unknown extensions 404.

**Consequences:**
- `next/image` works for uploads in every environment with no per-component flags.
- As a side effect, uploads also work in production even if the Nginx block or
  `UPLOAD_DIR` is misconfigured (served by Node instead of Nginx) — slower, but not
  broken.
- Two servers can answer `/uploads/*` (Nginx, then the app); their cache headers are
  kept equivalent and content is identical, so precedence doesn't matter.

## ADR-010: `yet-another-react-lightbox` for gallery fullscreen viewing

**Date:** 2026-07-21
**Status:** Accepted

**Context:**
`GalleryViewer` originally opened a shadcn/ui `Dialog` sized to content, with a
hand-rolled prev/next viewer and a manually scroll-synced thumbnail list. That
required several rounds of fixes for square-aspect thumbnails, overlap on `md` grid
layouts, dialog height overflowing short viewports, and a `ring` selection outline
getting clipped by the scroll container. Each fix patched a symptom of the same root
cause: a content-sized dialog isn't the right shell for a fullscreen image viewer with
a persistent thumbnail strip.

**Options considered:**
1. **Keep patching the custom `Dialog`** — no new dependency, but continues
   reimplementing zoom, counter, and thumbnail-follow behavior that a purpose-built
   library already solves, with more edge cases likely.
2. **`yet-another-react-lightbox`** — actively maintained, TypeScript-native,
   React 16–19 compatible, true fullscreen portal (not a sized dialog), with official
   `Thumbnails` (bottom-docked strip), `Counter`, and `Zoom` plugins covering exactly
   the behavior being hand-built.
3. **`react-photo-view`** — lighter weight, good pinch-zoom, but no built-in bottom
   thumbnail strip; would still require hand-building that part.
4. **PhotoSwipe** — polished gesture UX, but vanilla-JS-first with a thinner React
   integration; more wiring effort in an App Router setup.

**Decision:**
Adopt `yet-another-react-lightbox` with the `Zoom`, `Fullscreen`, and `Counter`
plugins. `GalleryViewer.tsx` keeps its existing inline preview (main image, prev/next,
4 thumbnails + "See All") and public props (`images`, `title`) unchanged — only the
fullscreen modal was replaced, so `media/galleries/page.tsx` needed no changes.

Two deviations from the library defaults were required to hit best-practice behavior:

1. **Custom thumbnail strip instead of the `Thumbnails` plugin.** The built-in plugin
   renders only a fixed ~5-item sliding window centered on the active slide, with no
   way to scroll the full list. It is replaced by a custom bottom strip rendered via
   `render.controls` that lists every slide in a horizontally scrollable track with
   explicit paging buttons and auto-centers the active thumbnail. Space for it is
   reserved with `styles={{ container: { paddingBottom } }}` — the library subtracts
   container padding from the slide viewport (`useContainerRect`), so the strip sits in
   reserved space rather than overlapping the image.
2. **Slides carry intrinsic `width`/`height` so `Zoom` works.** With a custom
   `render.slide`, the Zoom plugin does not measure the rendered element for image
   slides — it reads dimensions from the slide object. Without them `maxZoom` stays `1`
   and zoom is silently dead. `IGalleryImage` gained optional `width`/`height` (the CMS
   should supply these); until then the component captures each image's natural size via
   `next/image` `onLoad` and feeds it back into the slides, enabling zoom after first
   load.

Custom `render.slide` keeps `next/image` in the loop instead of the library's plain
`<img>`, preserving Next's image optimization. The previous implementation is kept as
`GalleryViewerOld.tsx` (renamed export `GalleryViewerOld`, currently unused) as a
rollback reference.

**Consequences:**
- Fullscreen viewing and zoom (wheel/pinch/double-click/toolbar + native Fullscreen
  button) are library-maintained; the thumbnail strip is the one hand-rolled piece,
  chosen deliberately because the built-in plugin could not show a full scrollable list.
- One new runtime dependency (`yet-another-react-lightbox`) to keep updated.
- The zoom-dimensions coupling is a sharp edge: any future change to `render.slide`
  must keep providing slide `width`/`height`, or zoom breaks with no error.
- `GalleryViewerOld.tsx` is dead code kept intentionally for rollback; delete it once
  the new viewer has been confirmed in production and is no longer needed as a
  reference.
- Verified end-to-end with Playwright against a production build: lightbox opens, the
  strip lists all slides with paging controls and does not overlap the image, zoom
  scales the active slide (~3.2×), and the Fullscreen control is present.

## ADR-011: `Gallery` model with a `String[]` images column; raised Server Action body limit

**Date:** 2026-07-21
**Status:** Accepted

**Context:**
The admin Media → Galleries page needed a CRUD table (title, description, images,
drag-to-reorder), mirroring the existing `SocialAccount` pattern. Unlike
`SocialAccount`, a gallery holds many images per row, and the default Server Action
body limit (1MB, chosen in ADR-008 for single-file forms) cannot fit a multi-image
submission.

**Options considered:**
1. **Separate `GalleryImage` table with a foreign key** — most normalized, supports
   per-image metadata later, but adds a join for a feature that only needs an ordered
   list of paths and no per-image fields today.
2. **`images String[]` column on `Gallery`** — Postgres native array, no join, matches
   the existing single-`order` reorder pattern used by `SocialAccount`; adding
   per-image metadata later would require migrating to a join table anyway.
3. **Keep the 1MB Server Action limit, upload images one request at a time** — avoids
   a global config change, but forces the client into a multi-round-trip save flow
   (partial failure mid-gallery, more error-handling surface) for a form that reads as
   a single "save gallery" action everywhere else in the admin.
4. **Raise `serverActions.bodySizeLimit` globally (chosen) vs. only for this route** —
   Next.js only exposes this as a single global `next.config.ts` setting; there is no
   per-route override.

**Decision:**
Added `Gallery { id, title, description?, images String[], order, createdAt,
updatedAt }`. Reused `src/lib/uploads.ts` per-file (loop `saveUpload`/`deleteUpload`
over the `"galleries"` feature dir — a separate destination from
`/uploads/social-accounts`) instead of building new upload plumbing. The form's image
grid is a single freely-reorderable list mixing kept existing images and staged new
files (the `+` tile always sits at index 0, not part of the sortable set); images are
only uploaded on submit, never as each file is picked. To let the client send that
mixed order back, `updateGallery` accepts an `imageOrder` field — the full final
order as a JSON array of kept image paths interleaved with a `"__new__"` placeholder
per staged file, in the same sequence the corresponding `File`s were appended under
`images` — and reconstructs the final `images` array server-side after uploading.
Capped at 50 images per gallery, 2MB each. A full submission passes through three
independent body-size ceilings, all of which must agree or the request fails before
reaching `updateGallery`/`createGallery` (discovered the hard way: raising only
`serverActions.bodySizeLimit` still failed with "Unexpected end of form" because
`src/middleware.ts` — Next 16's "proxy" — enforces its own separate 10MB default):
1. `experimental.serverActions.bodySizeLimit` — the Server Action's own limit.
2. `experimental.proxyClientMaxBodySize` — the middleware/proxy layer every request
   passes through first; independent of (1) and not implied by raising it.
3. Nginx's `client_max_body_size` on the VPS — enforced ahead of both, at the reverse
   proxy.
All three raised to `100mb` (from Next's `1mb`/`10mb` defaults) to fit a worst-case
full submission (50 × 2MB); the VPS Nginx config change is a manual step (see
`ARCHITECTURE.md`) since Nginx config isn't part of this repo.

**Consequences:**
- All Server Actions in the app — not just the gallery ones — now accept bodies up to
  100MB instead of 1MB. Acceptable since every existing upload form (`SocialAccount`,
  future `Article` cover image) already validates its own file size client- and
  server-side before submission; the global limit is a backstop, not the primary
  guard. A local-disk-backed self-hosted VPS has no serverless payload ceiling to
  worry about, unlike Vercel.
- `updateGallery` trusts `imageOrder` only for token counts and existing-path
  membership (each kept path must already belong to the gallery) — it does not trust
  client-supplied ordering for anything beyond final array order, so a tampered
  payload can at most reorder or omit a gallery's own images, never reference another
  gallery's files.
- There is no reorder-within-gallery endpoint separate from `updateGallery` — a
  reorder-only save still resubmits the full form. Only the gallery-list order
  (`order` column) has its own dedicated `reorderGalleries` action, matching the
  `SocialAccount` pattern.
- If per-image metadata (captions, alt text) is needed later, `images` will need to
  become a proper `GalleryImage` relation — not a schema-compatible extension of the
  current array column.

## ADR-012: Public `/media/galleries` loads only 6 images per gallery up front; rest fetched on demand

**Date:** 2026-07-21
**Status:** Accepted

**Context:** With `/media/galleries` wired to the real `Gallery` table (up to 50
images per row, see ADR-011), rendering every gallery's full `images` array on
initial page load means a single page could ship hundreds of image paths and, more
importantly, prime `next/image`'s optimizer/browser prefetching for images most
visitors never open — `GalleryViewer` only ever displays 5 at a time (1 active + 4
thumbnails) until the user opens the fullscreen lightbox.

**Options considered:**
1. **Ship the full `images` array to the client always (status quo pre-change)** —
   simplest, but scales badly per-gallery as galleries grow toward the 50-image cap.
2. **Slice to the first 6 images server-side; fetch the rest via a Server Action on
   demand (chosen)** — `page.tsx` passes `initialImages` (first 6) + `totalImages`;
   `GalleryViewer` calls the new `getGalleryImages(id)` action the first time it
   actually needs more (lightbox opened, or carousel nav runs past what's loaded),
   then merges the full list into its already-controlled `images` state.
3. **Paginate the lightbox itself (fetch in pages of N while scrolling the
   thumbnail strip)** — better for extreme gallery sizes, but more moving parts
   (cursor state, loading placeholders mid-strip) for a page that today tops out at
   50 images total; revisit if that cap is ever raised significantly.

**Decision:** Option 2. `initialImages`/`totalImages`/`galleryId` replace
`GalleryViewer`'s old `images` prop; a `loadStartedRef` guards against duplicate
in-flight fetches, and `next`/`prev` navigation past the loaded set triggers the
same fetch (modulo arithmetic over the currently-loaded length means clicking
through wraps briefly within the first 6 until the fetch resolves, then the full
set is available). Per-image `alt` text is generated client-side from `title` +
index (`"<title> photo N"`) since `Gallery.images` stores bare paths, no per-image
metadata.

**Consequences:**
- Initial page render cost no longer scales with a gallery's total image count —
  only with the number of galleries (each contributing exactly `min(6, count)`
  paths).
- The image counter (`"N / total"`) reads `totalImages`, not the current in-memory
  `images.length`, so it's accurate before the background fetch completes.
- One additional round trip the first time a visitor actually engages with a
  gallery (opens the lightbox or clicks past thumbnail 6) — acceptable since it's
  gated on genuine interest, not paid on every page load.

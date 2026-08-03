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
**Status:** Accepted (superseded in part by ADR-004 for CMS content, and by ADR-019 for
device/product category data)

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

## ADR-013: Article editor — auto-generated slug, `excerpt` reused as "subtitle"

**Date:** 2026-07-21
**Status:** Accepted

**Context:** Building the article create form (`/admin/media/articles/editor`)
surfaced two gaps between the ask ("title, sub title (optional), thumbnail, rich
text content") and the existing `Article` schema: there's no `subtitle` column
(only `excerpt`), and `slug` is a required unique column with no field in the
request to populate it from.

**Options considered:**
1. **Manual slug field in the form** — gives editorial control over the URL, but
   wasn't asked for, and a bad/duplicate manual slug is a worse first-run experience
   than just generating one from the title.
2. **Auto-generate slug from title server-side (chosen)** — `slugify(title)` +
   uniqueness retry (`-2`, `-3`, ... up to 20 attempts, then a random suffix
   fallback) inside `createArticle`. No slug field in the form at all.
3. **Add a new `subtitle` column** — keeps `excerpt` free for its likely original
   purpose (SEO/listing summary distinct from an on-page subtitle), but is a schema
   change for a field that's semantically identical to `excerpt` (optional short
   line under the title) as far as this task's ask goes.
4. **Reuse `excerpt`, labeled "Subtitle" in the form (chosen)** — no schema change;
   ships today. Documented as an explicit assumption in `TASKS.md` since it's a
   product-naming call, not a technical one — flagged for correction if `excerpt`
   was meant to stay distinct.

**Decision:** Options 2 and 4. The editor form has no slug input; `excerpt` is
labeled "Subtitle" and is what the form's optional second field writes to.

**Consequences:**
- If a true distinction between "subtitle" (display) and "excerpt" (SEO/listing
  summary) is needed later, that's an additive schema change (new `subtitle`
  column) with a one-time backfill decision (copy `excerpt` → `subtitle`, leave
  `excerpt` as-is, or leave `subtitle` empty) — not a breaking one.
- Slugs are stable once created (`updateArticle`, when built, must not regenerate
  the slug from an edited title — changing a published article's URL breaks
  existing links/SEO). Recorded here so the follow-up edit task doesn't relitigate
  it.
- The retry-loop uniqueness check is a hard cap of 20 DB round trips per create;
  the random-suffix fallback beyond that is unreachable in practice (would require
  20 near-identical titles) but avoids a theoretical infinite loop.

## ADR-014: Single editor route for create/edit; `publishedAt` set once, never cleared

**Date:** 2026-07-22
**Status:** Accepted

**Context:** Building the article list table required deciding (a) whether create
and edit live on the same route or split ones (`/new` vs `/[id]`, as the original
stale `TASKS.md` draft sketched), and (b) what happens to `Article.publishedAt`
when an article is unpublished and later republished, or edited without changing
status.

**Options considered — routing:**
1. **Split routes** (`/admin/media/articles/new`, `/admin/media/articles/[id]`) —
   clearer URL semantics, but duplicates the entire form-hosting page for what is
   otherwise identical logic already handled by `ArticleForm`'s `article?` prop
   (same pattern as `GalleryForm`).
2. **One route, `?id=` decides mode (chosen)** — `editor/page.tsx` reads `id` from
   `searchParams` (Next 16 async), loads the article via `getArticleById` if
   present (404 if the id doesn't resolve), and passes it to `ArticleForm`. No
   duplicated page shell.

**Options considered — `publishedAt` semantics:**
1. **Always stamp `publishedAt = now()` on every save while status is
   "published"** — simplest, but destroys the original publish date on every
   subsequent edit of an already-published article, which reads as wrong for any
   "published on" display later.
2. **Set once on first publish, never touch it again afterward (chosen)** — a
   shared `computePublishedAt(currentPublishedAt, status)` used by both
   `updateArticle` and the list table's `updateArticleStatus`: stamps `now()` only
   the first time status becomes `"published"` (`currentPublishedAt` was `null`);
   every other transition (re-publish, unpublish, edit-while-published) leaves it
   untouched.

**Decision:** Option 2 for routing, option 2 for `publishedAt`.

**Consequences:**
- `updateArticleStatus` (list-table toggle) and `updateArticle` (full form save)
  share the exact same publish-date logic via `computePublishedAt` — a status
  change from either surface behaves identically.
- Unpublishing an article does not lose its original publish date — if it's
  republished later, `publishedAt` still reflects when it was *first* made public,
  not the most recent toggle.
- The editor route has no separate "loading" URL segment for edit — `notFound()`
  is called at the page level if `?id=` doesn't resolve to a real article, same as
  a dynamic `[id]` route would 404 on a bad id.

## ADR-015: Rich text toolbar images upload on insert, not on form submit; no orphan cleanup

**Date:** 2026-07-22
**Status:** Accepted

**Context:** Expanding the editor toolbar (underline/italic already existed;
added highlight, text align, text color, and inline images) meant deciding how
an image inserted into the article *body* gets from "file picked" to "URL the
Tiptap doc can reference." The thumbnail (ADR-013) defers its upload until form
submit — that pattern doesn't work here, because the rich text document needs a
real `<img src>` immediately to render the image in the editor as you type;
there's no equivalent of "hold the File in state and append it to FormData
later."

**Options considered:**
1. **Blob/data URL preview until submit, real upload on save** — would need the
   entire submit flow to walk the saved HTML, find blob/data URLs, upload each,
   and rewrite `content` before persisting. Real complexity for marginal benefit.
2. **Upload immediately on insert (chosen)** — toolbar's image button opens a
   file picker; on selection, `uploadContentImage` (new Server Action) validates
   and saves the file via `saveUpload` under a new `articles-content` feature
   dir (kept separate from `articles`, the thumbnail dir, since the two have
   different lifecycles — see Consequences), returning a real `/uploads/...` URL
   that's inserted via `editor.chain().setImage({ src })` right away.

**Decision:** Option 2. `contentImageSchema` mirrors the thumbnail's validation
(JPEG/PNG/WEBP/GIF, size cap — 3MB, slightly higher than the 2MB thumbnail cap
since body images may reasonably need more detail) but is a separate schema/cap
(`MAX_CONTENT_IMAGE_SIZE`) since the two aren't the same use case.

**Consequences:**
- **No orphan cleanup.** If a user inserts an image and then never saves the
  article (navigates away, browser crash), that file stays on disk forever —
  same tradeoff most CMSes with an "upload on insert" editor make (e.g.
  WordPress's media library). Not addressed here; would need either a
  reference-counting sweep job or deferring all uploads to submit (option 1).
- **Deleting an article does not delete its content images**, unlike the
  thumbnail (`deleteArticle` cleans up `coverImage` but never touches image
  `src`s inside `content`). Content images aren't tracked anywhere outside the
  HTML blob itself, so there's no list to walk without parsing `content`.
- If this becomes a real disk-usage problem, the fix is a periodic job that
  parses all `Article.content` for `/uploads/articles-content/...` references
  and deletes files in that directory with zero references — not attempted now
  since it's premature for the current scale.

## ADR-016: Drafts require only one filled field; publishing requires all of them

**Date:** 2026-07-22
**Status:** Accepted

**Context:** The create/edit form originally required title, content, and (on
create) a thumbnail unconditionally — regardless of whether the user was saving a
draft or publishing. That's the wrong bar for a draft, which by definition is an
incomplete work in progress; requiring every field defeats the point of being able
to save progress early.

**Decision:** Split validation by `status`. Publishing keeps the original strict
rule: title, content, and a thumbnail (existing or newly uploaded) are all
required. Saving as a draft only requires *at least one* of title / subtitle /
content / thumbnail to be non-empty — enforced via a `hasAnyField` check that
looks across all four (thumbnail checked separately from the Zod schema, since
it's a `File` on `FormData`, not a schema field). `articleFieldsSchema` became a
`z.discriminatedUnion("status", [...])` so the per-field Zod rules (title/content
`min(1)`) only apply on the `"published"` branch.

Enforced in three places, all of which had to move in lockstep: `createArticle`,
`updateArticle`, and — easy to miss — `updateArticleStatus`, the list table's
one-click Draft⇄Published toggle. That toggle bypasses the form entirely, so
without its own check it could publish an article with an empty title/content/no
thumbnail, defeating the "complete before publishing" rule from the other two
paths. It checks the existing row's `title`/`content`/`coverImage` directly rather
than duplicating the Zod schema, since there's no `FormData` involved.

**Consequences:**
- The `required` HTML attribute was removed from the Title input — it never
  actually enforced anything anyway (the form has no native `onSubmit`/`action`,
  buttons manually build `FormData` and call the Server Action directly), and
  leaving it in place was actively misleading given title is genuinely optional
  for drafts now.
- A previously-published article can't be edited into an incomplete state and
  saved *as published* (still blocked), but nothing stops switching it to
  "draft" first — an intentional escape hatch, not a gap: draft is explicitly
  the "incomplete is fine" state.
- The list table's status-toggle failure now surfaces as an inline error message
  (new `onStatusError` prop on `ArticleRow`) instead of silently no-oping, which
  it did before this change — a latent UX gap this fix also closed.

## ADR-017: Status dropdown in the list table; publish always confirmed, unpublish never is

**Date:** 2026-07-22
**Status:** Accepted

**Context:** The list table's status control was a clickable Badge that toggled
Draft⇄Published on a single click — no dropdown, no confirmation. Two changes were
requested: make status a proper dropdown, and require a confirmation step before
publishing specifically (not unpublishing), from *both* the list table and the
editor form.

**Decision:**
- Replaced the Badge-button with a `shadcn/ui` `Select` (Draft/Published), with the
  current status still rendered as a colored `Badge` inside `SelectValue` so the
  visual read stays the same at a glance.
- Selecting "Published" from the dropdown does not call `updateArticleStatus`
  directly — it opens a shared `AlertDialog` ("Publish this article? ... You can
  unpublish it again later.") at the table level; only confirming actually submits
  the change. Selecting "Draft" (unpublishing) calls the action immediately, no
  confirmation.
- In the editor form, the "Publish" button runs the same field validation it
  always did (title/content/thumbnail required — ADR-016) *before* opening its own
  confirmation `AlertDialog`; only on confirm does it call `submit("published")`.
  "Save as draft" is unaffected — direct, no confirmation, matching the "only
  publishing needs confirming" scope of the ask.
- The dropdown is disabled per-row while that row's status change is in flight
  (`isBusy` derived from `busyId === article.id`), not globally, so changing one
  article's status doesn't visually lock the whole table.

**Consequences:**
- Publish confirmation now exists in exactly two places with the same guarantee
  (validate-then-confirm) but two separate `AlertDialog` instances — one owned by
  `ArticleTable` (shared across all rows, targeting whichever `publishTarget` was
  set), one owned by `ArticleForm` (single article, no target-tracking needed).
  There was no shared component extracted for this since the two call sites differ
  enough (table needs a target-article, form already has its one article in
  closure) that a shared component would mostly just be indirection.
- If `updateArticleStatus`'s server-side re-validation still rejects the publish
  attempt after the user confirmed (e.g. stale client state), the dialog has
  already closed and the failure surfaces as the table's inline error message
  (`onStatusError`/`setError`), not a dialog-level error — acceptable since this
  race is rare (would require the article's own required fields becoming invalid
  between page load and the confirm click, which nothing else in this admin does
  concurrently).

## ADR-018: Article detail page — static generation + targeted on-demand revalidation

**Date:** 2026-07-22
**Status:** Accepted

**Context:** `/media/articles/[slug]` needed the best available combination of
performance and SEO for a public, content-driven page, while staying correctly in
sync with an admin that can publish/edit/unpublish/delete at any time.

**Options considered — rendering strategy:**
1. **Server Component, dynamically rendered per request (no `generateStaticParams`)**
   — always fresh, zero staleness risk, but pays a DB round trip on every visit;
   no advantage here since content only changes via the admin, not per-request.
2. **Static generation with `generateStaticParams` + on-demand revalidation
   (chosen)** — every published article is prerendered at build time; articles
   published afterward still resolve on first request (`dynamicParams` defaults to
   `true`) and are cached from then on. Freshness comes from `revalidatePath`
   calls in the admin actions, not a time-based `revalidate` interval — the page
   is only ever re-rendered when something actually changed.
3. **Client-side fetch (SPA-style)** — rejected outright: no content in the
   initial HTML, worse for SEO and first paint, and there's no interactivity here
   that would justify it.

**Options considered — rendering `content`:**
1. **Sanitize with a library (e.g. DOMPurify) before rendering** — the safer
   general-purpose default for arbitrary HTML, but unnecessary overhead here:
   `content` is never user-submitted, only ever written by the Tiptap editor
   behind the authenticated `/admin` — the trust boundary is "whoever has admin
   credentials," same as the thumbnail/title/every other admin-authored field.
2. **`dangerouslySetInnerHTML` directly (chosen)** — matches the trust level
   already assumed everywhere else in this codebase for admin input.

**Decision:** Options 2 and 2. `revalidateArticlePages()` (in the admin's
`editor/actions.ts`) now takes an optional `slug` and revalidates
`/media/articles/<slug>` in addition to the two list pages it already did —
without this, a static param generated at build time would keep serving its
build-time snapshot forever after an edit, unpublish, or delete, since none of
those actions previously touched the detail page's own cache entry.

**Consequences:**
- New articles published after the last build are one request slower (render +
  cache) than ones baked in at build time — normal ISR-with-on-demand-revalidation
  behavior, not a bug.
- If `Article.content` is ever allowed to include user-submitted or
  third-party-sourced HTML (not just admin-authored), `dangerouslySetInnerHTML`
  here would need to be revisited with sanitization — the current choice is
  specifically scoped to "trusted admin input," not HTML in general.
- OpenGraph/Twitter image URLs are relative (no `metadataBase` set anywhere in the
  app yet) — flagged in `TASKS.md` as a known gap rather than fixed here, since it
  requires picking the canonical production domain, a decision beyond this page.

## ADR-019: `Category` model for the Devices/Products menu tree, replacing ADR-003 for this data

**Date:** 2026-07-27
**Status:** Accepted (supersedes ADR-003 for device/product category data)

**Context:** The "Devices" and "Products" navbar menus (`deviceProductMenu` in
`src/lib/data.ts`) need to become CMS-managed, up to 3 levels deep under each of
the two roots (e.g. Products → Cosmeceutical → Tegoder Cosmetics → Tegoder Face).
The admin routes `/admin/product-device/devices` and `/admin/product-device/products`
already existed as stubs with no data source.

**Options considered — data model:**
1. **Two separate models (`DeviceCategory`, `ProductCategory`)** — mirrors the
   two admin routes 1:1, but the shape (self-referential tree, name/slug/order)
   is identical for both; two models would just duplicate every query and action.
2. **One self-referential `Category` model with a `type` discriminator (chosen)**
   — `type: "device" | "product"` follows the same "string column + Zod enum"
   convention as `Article.status` (a plain string, not a native Prisma enum) rather
   than introducing the project's first real enum type. One set of CRUD/reorder
   actions serves both trees, parameterized by `type`.
3. **`String[]`/JSON blob instead of a relational tree** — rejected on the same
   grounds as ADR-011 (Gallery images): each node here needs its own metadata
   (name, slug, order, depth) and its own stable id to attach a future `Product`
   detail record to, which a blob can't give cheaply.

**Options considered — enforcing the max-depth-3 rule:**
1. **Derive depth by walking `parentId` up to the root on every read** —
   correct, but a recursive query (or N+1 walk) for something checked constantly
   (every "Add sub-category" button render).
2. **Store `depth` as a column, set once at create time (chosen)** — `depth = 1`
   for root nodes (`parentId = null`), otherwise `parent.depth + 1`. Enforced only
   at create time in the server action (reject if `parent.depth >= 3`); never
   recalculated, since nodes never move to a different parent in this feature.

**Options considered — sibling slug uniqueness:**
1. **`@@unique([type, parentId, slug])` DB constraint** — the obvious choice, but
   doesn't work: Postgres unique indexes never treat `NULL = NULL`, so it can't
   catch two depth-1 nodes (both `parentId = null`) reusing the same slug — and
   `deviceProductMenu` already has this exact case today ("Professional Use" /
   "Home Use" repeated under different parents).
2. **Enforce in the server action instead (chosen)** — `createCategory`/
   `updateCategory` check for an existing sibling (`type` + `parentId` + `slug`)
   before writing, same "app-layer check, not a DB constraint" precedent as
   `Article.slug`'s uniqueness-with-retry loop (ADR-013), just scoped to siblings
   instead of globally.

**Decision:** Options 2, 2, and 2 above — a single self-referential `Category`
model (`prisma/schema.prisma`), CRUD + reorder server actions in
`src/app/(admin)/admin/product-device/actions.ts`, and a recursive tree UI
(`category-tree.tsx`) rendering both `/admin/product-device/devices` and
`/admin/product-device/products` off the same component, parameterized by
`type`. Reordering reuses the existing `order` column + `$transaction`-per-index
convention (`SocialAccount`/`Gallery`), scoped per sibling group via drag-and-drop
that's confined to one `SortableContext` per parent, so a drag can never move a
node to a different parent or depth.

**Consequences:**
- `src/lib/data.ts`'s `deviceProductMenu` is now stale for anything reading it as
  a source of truth for admin management — it's still used as-is for the public
  navbar dropdown (`navMenus`) until that's migrated to read `Category` too, a
  separate follow-up task (see `TASKS.md`) so this one stays scoped to the admin
  CRUD surface.
- No `Product` model exists yet — this ADR only covers the category tree, not
  per-product detail content (images, specs, documents). The public
  `/devices/[category]/[brand]/[product]` and `/products/...` routes today render
  fully hardcoded content regardless of URL params; wiring them to `Category` (and
  designing a `Product` model for leaf-level detail) is out of scope here and
  tracked as a separate task.
- Deleting a category cascades (`onDelete: Cascade`) to its entire subtree with no
  soft-delete or undo — acceptable for now since there's no `Product` data
  attached yet to be silently orphaned, but this should be revisited (e.g. a
  "this will also delete N sub-categories" guard was added to the delete
  confirmation dialog, but a real product count warning needs the `Product`
  model to exist first).

## ADR-020: `Product` model with JSON `segments` for device/product detail content

**Date:** 2026-07-27
**Status:** Accepted

**Context:** Follow-up to ADR-019. The public device/product detail page
(`src/app/(user)/devices/[category]/[brand]/[product]/page.tsx`, currently a
hardcoded "Alma Harmony" dummy) is built from ~9 distinct section
components (`HeroDevice`, `HighlightDevice`, `GridListDevice`/treatments,
`Viewer360`, `DropdownDevice`/tech specs, `BasicCarousel`/applicators,
`BeforeAfterDevice`, `DocumentDevice`, `SectionNavDevice`), each with its own
repeating shape, and real products use a different subset/count of them (some
skip the 360 viewer, some have two before/after blocks, none use all nine).
Needed: a way for an admin to assemble a detail page per device/product from
these section "styles," and a way to assign that item to a `Category` node.

**Options considered — content model:**
1. **One column/table per section type** (`ProductHighlight`, `ProductTreatment`,
   `ProductApplicator`, ... as separate relations) — fully relational, but nine
   join tables for content that's only ever read as "the ordered list of
   sections for this product," never queried/filtered individually. A new
   section style later means a new table + migration.
2. **`segments: Json` — an ordered array of typed blocks (chosen)** — same
   "JSON over exploding into join tables" precedent as `Gallery.images`
   (ADR-011), one level richer: each array element is `{ id, type, anchorLabel?,
   ...type-specific fields }`. A new section style is a new TypeScript shape
   (`src/interfaces/segments.ts`) and a new entry in the admin's field-config
   list (`segment-types.ts`), not a schema migration.

**Options considered — category assignment:**
1. **Restrict `Product.categoryId` to depth-3 leaves only** — matches the
   "3 levels deep" framing of the category work, but breaks for brands with no
   sub-brand level (e.g. "ALMA BEAUTY" in the current static
   `deviceProductMenu` has no depth-3 children at all and would need its
   products attached directly at depth 2).
2. **`categoryId` references any `Category` node, validated only by `type`
   matching (chosen)** — an admin picks whichever node is the actual leaf for
   that brand, depth 2 or 3. No DB constraint enforces "must be a leaf";
   nothing currently stops assigning a product to a depth-1/2 node that later
   grows children, which would then show both sub-categories and directly
   assigned products at once — treated as an acceptable authoring
   responsibility for now (see Consequences).

**Options considered — the admin editor UI for segments:**
1. **Nine bespoke section forms, one component per type** — most explicit, but
   ~9x the UI code, and adding a tenth section style means writing a whole new
   form component from scratch.
2. **One generic, schema-driven form engine (chosen)** — `segment-types.ts`
   defines each section type as a list of `{ key, label, type: "text" |
   "textarea" | "number" | "url" | "select" | "list", ... }` field
   descriptors (mirroring the actual prop shapes of `HeroDevice`,
   `HighlightDevice`, etc. read directly from their component source), and one
   `SegmentsBuilder` component renders whichever fields a given segment's type
   calls for, including a generic add/remove/reorder repeater for `"list"`
   fields (e.g. `heroDocs`, `techSpecs` items). Adding a tenth section style
   is a config entry, not a new form component.

**Decision:** Options 2, 2, and 2 above. `Product.segments` validation on the
server (`product-actions.ts`) is data-driven too — it walks each segment
against its type's field descriptors checking only that `required` fields are
present and non-empty, rather than one Zod schema per segment type.

**Consequences:**
- Image/file fields inside segments (`imgUrl`, `imageUrl`, `fileUrl`, etc.) are
  plain URL text inputs for this pass, not an upload-and-insert widget — an
  admin pastes a path already uploaded elsewhere (e.g. via an existing
  gallery/article upload) or an external URL. Only the top-level product
  `thumbnail` gets a real upload button (same `saveUpload`/`deleteUpload`
  pattern as Article/Gallery). Wiring a shared image-upload field into the
  segments builder is a natural follow-up, not done here.
- Segment field values are only checked for "present when required," not
  deeply validated (e.g. a `url`-type field isn't verified to actually be a
  URL server-side) — acceptable since this is admin-only authoring content,
  same trust boundary already assumed for `Article.content`'s
  `dangerouslySetInnerHTML` (ADR-018).
- No category picker combobox with search exists yet (no `cmdk`/Command
  component installed in this project) — `CategoryPicker` is a plain `Select`
  with indented breadcrumb labels. Fine for the current tree sizes; revisit if
  a category tree grows large enough that scanning a flat list becomes
  painful.
- This ADR still doesn't wire the public `/devices/...`/`/products/...` routes
  or the navbar to either `Category` or `Product` — that remains the next
  follow-up task (see `TASKS.md`), now unblocked since both models exist.
- Several dead/unused props were found in the existing section components
  during this work (`DropdownDevice.imageUrl`, `BasicCarousel.href`,
  `ProductCarousel.carouselList[].href`, `BeforeAfter`'s inner `before.title`/
  `after.title`) and a couple of hardcoded values that would need to become
  real props for a segment to drive them (`DropdownDevice`'s "Technology"
  header, all of `DocumentDevice`). None of these components were modified in
  this task — only their prop *shapes* were mirrored into `segment-types.ts`
  for planning the admin form. Actually wiring `segments` JSON into rendered
  public pages (and retrofitting the components' hardcoded/dead props in the
  process) is part of the follow-up task, not this one.

## ADR-021: Real upload widgets for hero/certification/document segment fields; auto-derived hero `imgAlt`

**Date:** 2026-07-27
**Status:** Accepted (partially supersedes ADR-020's "plain URL inputs" call for these fields)

**Context:** ADR-020 shipped every segment "image"/"file" field as a plain
URL text input, deferring real upload widgets as a follow-up. In practice
the hero background, hero/document downloadable files, and certification
logo+certificate are *always* a real upload, never a pasted external URL —
unlike e.g. a highlight's illustrative image, which might reasonably link to
an existing asset. Also: `HeroDevice`'s `imgAlt` is a real prop, but there's
no good reason to make an admin type accessibility alt text by hand when the
hero's own `title` already is that description.

**Options considered — upload mechanism:**
1. **Defer all file handling to form submit** (like the product thumbnail,
   `FormData` + `saveUpload` inside `createProduct`/`updateProduct`) — doesn't
   fit here: segments are an arbitrarily nested JSON tree, and threading
   `File` objects through nested list items to a single submit-time
   `FormData` (in the manner of Gallery's `NEW_IMAGE_TOKEN` ordering scheme)
   would be substantially more complex for a benefit (avoiding a few small
   extra requests) that doesn't matter much for admin-authored content.
2. **Upload immediately on file select, store the returned URL string
   (chosen)** — same pattern as the rich text editor's inline content images
   (ADR-015). By the time the form submits, every segment "image"/"file"
   field is already just a URL string, identical in shape to the fields that
   stayed plain URL inputs — no special-casing needed in `createProduct`/
   `updateProduct` or in `validateSegments`.

**Options considered — cleanup on remove/replace:**
1. **Track every uploaded segment asset and delete it when its segment/list
   item is removed or replaced** — correct, but requires diffing the entire
   segments tree on every save to find which uploaded paths are still
   referenced, a nontrivial amount of bookkeeping for admin-authored content
   where storage cost is not a real concern.
2. **No cleanup — accept orphaned files (chosen)**, identical precedent to
   ADR-015's rich-text content images.

**Options considered — hero `imgAlt`:**
1. **Keep it as a manually-typed field.**
2. **Drop the field from the admin form; derive it server-side from the
   hero's `title` (chosen)** — enforced in `product-actions.ts`
   (`normalizeSegments`) by overwriting whatever `imgAlt` value arrives with
   the segment's own `title`, so it can never drift out of sync even if the
   title changes later. The data shape (`IHeroSegment.imgAlt`) is unchanged;
   only the admin UI and the value's source of truth changed.

**Decision:** Options 2, 2, and 2 above. New action `uploadSegmentAsset`
(`segment-upload-actions.ts`) accepts a `kind: "image" | "file"` and saves
under the `products-content` upload feature; a new `UploadField` client
component (`segments-builder.tsx`) wraps it with an image-preview box or a
"Choose/Replace file" button + filename link, wired into `FieldInput` for the
new `"image"`/`"file"` field types (`segment-types.ts`). Converted: hero's
`imgUrl` (image) and `heroDocs[].href` (file); the standalone `document`
segment's `fileUrl` (file); `certifications[].imageUrl` (image, logo) and a
new `certifications[].fileUrl` (file, certificate) replacing the old optional
`href` link field. Every other segment "url" field (highlight/treatments/
applicators/before-after images, the 360 viewer's frame template) is
unchanged — still a plain URL input, since ADR-020's reasoning for those
still holds.

New products originally also defaulted `certifications` to two pre-filled
Halal/Kemenkes entries — reverted in ADR-022, which replaced free-form
certification entries with an explicit "Add certification" dropdown instead;
new heroes now start with an empty certifications list.

**Consequences:**
- `ICertification` (`src/interfaces/segments.ts`) changed shape: `href?`
  removed, `fileUrl: string` added (required). Any hand-authored segments
  JSON predating this ADR with the old shape would fail `validateSegments`'s
  required-field check on `fileUrl` until re-saved through the form — not a
  concern yet since no products have been created through this UI in
  production.
- Uploaded segment assets accumulate on disk with no reference-counting or
  garbage collection, same as ADR-015's content images — acceptable for
  admin-authored content at this scale, revisit if it becomes a real problem.
- The remaining plain-URL segment image fields are an intentionally
  inconsistent-looking UI (some fields are upload boxes, others are text
  inputs) — a deliberate scope choice per field's real-world usage pattern,
  not an oversight.

## ADR-022: Certifications are a fixed set of typed "styles," not a free-form list

**Date:** 2026-07-27
**Status:** Accepted (further changes hero's `certifications` shape from ADR-021)

**Context:** ADR-021 gave hero certifications a generic `{label, imageUrl,
fileUrl}` shape editable through the generic list/itemFields engine. In
practice there are only three certification "styles" that actually occur —
Halal Indonesia, Kemenkes, and a catch-all "Other" — and each needs different
fields: Halal needs only a certificate file (its logo and title are fixed);
Kemenkes additionally needs an AKL registration number; "Other" needs a
title but no logo at all. A generic itemFields form can't express "this
field only applies to this specific kind of item" — every field would show
for every item type regardless of relevance.

**Options considered:**
1. **Keep the generic shape, just make `fileUrl`/`aklNumber` optional and
   show all fields for every item** — simplest to build, but confusing: an
   admin adding a Halal badge would see an irrelevant "AKL Number" field, and
   nothing would stop mismatched combinations (a "Halal" entry with a custom
   title, say).
2. **Discriminated union + dropdown-driven add flow (chosen)** —
   `ICertification` (`src/interfaces/segments.ts`) becomes
   `IHalalCertification | IKemenkesCertification | IOtherCertification`,
   keyed on a `certType` field. Clicking "Add certification" opens a
   dropdown (`DropdownMenu`, same pattern as "Add a segment") offering the
   three styles by name; picking one creates an item pre-populated with that
   style's fixed fields (Halal/Kemenkes's `label` and `imageUrl` are set
   automatically to the shared brand logo, never editable) and only the
   fields relevant to that style are rendered.

**Decision:** Option 2. A dedicated `CertificationsField` component
(`segments-builder.tsx`) replaces the generic `ListField` specifically for
hero's `certifications` key — special-cased in `SegmentCard`'s field loop
the same way the title/description "same as" checkboxes are. The
`certifications` field definition in `segment-types.ts` keeps `type: "list"`
(so it still defaults to `[]` and is recognized as a list) but drops
`itemFields` entirely, since the generic engine no longer renders it.

**Consequences:**
- `ICertification` is a second breaking shape change in as many ADRs (ADR-021
  added `fileUrl`/removed `href`; this one adds `certType` and splits into a
  union) — still not a concern since no products exist in production yet
  through this UI.
- Server-side validation is unaffected: `validateSegments` in
  `product-actions.ts` never inspects list *item* shapes (only top-level
  segment fields), so the discriminated union isn't specially validated
  there either — any structural correctness comes entirely from the bespoke
  client component, not a server-side schema. Fine for now given the
  admin-only trust boundary already established in ADR-020/021; would need
  real per-`certType` server validation if this data ever needed to be
  trusted from a less-controlled source.
- Halal/Kemenkes logos are hardcoded constants in `segments-builder.tsx`
  (`CERTIFICATION_HALAL_LOGO`/`CERTIFICATION_KEMENKES_LOGO`), set automatically
  by `createCertification` when that style is chosen from the dropdown.
- New heroes no longer come with any certifications pre-filled — every entry,
  including Halal/Kemenkes, is now added explicitly via the dropdown. This
  reverses the "pre-filled Halal/Kemenkes" behavior ADR-021 introduced; a
  deliberate choice made after building it, not an oversight.

## ADR-023: Tabbed device/product editor with per-tab completion indicators

**Date:** 2026-07-28
**Status:** Accepted

**Context:** The device/product editor rendered Product Identity, Product
Thumbnail and Page Segments as three stacked `<section>`s in one scroll. The
segments builder grows without bound (nine segment types, each with repeatable
list fields), so the two short sections above it were pushed far off-screen and
there was no way to see which parts of an item still needed content without
scrolling the whole form.

**Options considered:**
1. Keep one scroll, add a sticky in-page section nav — no unmounting, so all
   existing cross-section behavior keeps working; but doesn't actually shorten
   the page, and a completion summary would have to live in a separate widget.
2. Accordion sections (the `Accordion` primitive already exists) — collapses the
   noise without new dependencies, but multiple sections can be open at once so
   the page can still be arbitrarily long, and it reads as "optional detail"
   rather than "three required steps".
3. Tabs, one per section, with a per-tab completion icon — exactly one section
   visible at a time, and the tab strip doubles as the completion summary.
   Costs a new `Tabs` primitive and forces cross-tab state to move upward.

**Decision:** Option 3. Added `src/components/ui/tabs.tsx` (shadcn, importing
from the already-installed unified `radix-ui` package like `accordion.tsx`
does). Each trigger shows a `CircleCheck`: `text-muted-foreground/50` while
that tab's required content is missing, `text-emerald-600` once it's filled.
Completeness is derived, never stored — Identity is Name + Category, Thumbnail
is an image present, Page Segments is `segments.every(isSegmentComplete)`, and
`isSegmentComplete` (new, in `segment-types.ts`) walks the same required-field
rule the server's `validateSegments` applies, so a green Segments tab means the
save won't be rejected for missing segment content.

**Consequences:**
- Radix's `TabsContent` renders `{isSelected && children}` — inactive tab
  content is unmounted, and `forceMount` does not change that. Any behavior
  that has to react to another tab's state cannot live inside a tab. The hero's
  "Same as name/tagline" mirroring did exactly that (two effects in
  `SegmentsBuilder` watching `productName`/`productTagline`), so it moved up
  into `ProductForm` as `syncHeroMirror`, called from the Name/Tagline change
  handlers. This is also the shape React's `set-state-in-effect` lint rule
  wants, and it surfaced a latent bug: `SegmentsBuilder` never passed
  `productName`/`productTagline` down to the locked hero card, so checking
  "Same as name" copied an empty string — the effects had been papering over
  it. Now fixed.
- Any future field whose value depends on another tab's state must follow the
  same rule: derive it in `ProductForm`, not in the tab that displays it.
- The indicators are informational only. Saving is unchanged — a draft with
  three grey tabs still saves; publishing still fails on a missing thumbnail
  (now with a jump to the Thumbnail tab rather than an error under a form the
  user has to scroll).
- Tab state is component-local, not in the URL, so a reload always lands on
  Product Identity. Acceptable for a form that already warns on unload; worth
  revisiting if deep-linking to a specific tab is ever wanted.

## ADR-024: Thumbnail preview renders the real catalogue card, not a reference image

**Date:** 2026-07-28
**Status:** Accepted

**Context:** The Product Thumbnail section had a "Show example" toggle that
revealed a static PNG (`thumbnail-reference.png`) of a well-formatted
thumbnail. It showed an admin what a *good input* looks like, but never what
*their* item would look like — and a screenshot goes stale the moment the
public card's styling changes.

**Options considered:**
1. Keep the static reference image — zero coupling, but it can silently drift
   from the real card and never reflects the admin's own content.
2. Rebuild the card's markup inside the editor as a preview — full control over
   the preview, but it's a copy: two sets of Tailwind classes to keep in sync,
   and "preview" stops being true the first time only one side is updated.
3. Extract the public card into a shared component and mount the real thing in
   the editor — the preview cannot drift, at the cost of constraining that
   component to stay mountable from the admin tree.

**Decision:** Option 3. The card markup moved out of `DeviceList.tsx` into
`src/app/(user)/components/catalogue/DeviceCard.tsx`, and the admin thumbnail
tab renders that exact component fed by the form's live Name, Tagline and
thumbnail preview (a `blob:` URL before save — `next/image` treats `blob:`/
`data:` sources as unoptimized automatically, which is how the existing
thumbnail preview already worked). `IDeviceList` moved to `src/interfaces/`
as `IDeviceCardItem`, per the shared-interface rule.

**Consequences:**
- `DeviceCard` is now shared surface: it must stay free of anything the admin
  tree can't mount (no page-level data fetching, no provider it doesn't own).
  Its AOS attributes stay out of the component — `DeviceList` passes them
  through rest props, so the editor doesn't inherit scroll animations that
  would need `AOSProvider`.
- The card gained an empty-`imgUrl` branch (a neutral placeholder) that the
  public site will never hit, since publishing requires a thumbnail. It exists
  so the preview can render before an image is chosen.
- The preview is wrapped in `pointer-events-none` + `aria-hidden` — it's an
  illustration, so its "View Product" link must not be reachable by click or
  by keyboard from the editor.
- `public/image/cms/product-device/device/thumbnail-reference.png` is now
  unreferenced. Left in place rather than deleted; it was never committed.

## ADR-025: Card background tints as a closed set of full Tailwind class strings

**Date:** 2026-07-28
**Status:** Accepted

**Context:** Catalogue cards all rendered one hardcoded gradient
(`bg-linear-to-br from-brand-peach/20 to-white`). Admins need to choose a tint
per product. The choice has to reach both the public card and the admin
preview, and it has to survive a save.

**Options considered:**
1. Store a raw colour (hex, or a Tailwind colour name) and build the class at
   render time — maximum freedom, but `from-${colour}/20` is invisible to
   Tailwind's scanner, so nothing gets compiled and every card renders
   untinted. Safelisting works around it at the cost of a config list that
   drifts from the data.
2. Store an inline `style` gradient built from a hex value — sidesteps Tailwind
   entirely and allows any colour, but breaks the project's "Tailwind classes
   only, no inline styles" rule and puts colour values in the database where
   they can't be restyled later.
3. A closed set of named tints, each mapped to a complete class string in
   source — the scanner sees every class, the DB stores a stable key, and the
   look can be changed later without touching data.

**Decision:** Option 3. `src/lib/card-backgrounds.ts` holds six options
(peach/purple/green/blue/orange/pink), each with the card's full gradient
class and a solid `swatchClassName` for the picker dot. `Product.cardBackground`
is a nullable `String` validated with `z.enum(CARD_BACKGROUND_VALUES)`.
`getCardBackground` resolves null or unrecognised values to peach.

**Consequences:**
- Adding a tint means adding a row with its class string spelled out in full.
  A composed string will silently produce an unstyled card — noted in the file's
  header comment and in the task's "Do not".
- Admins get six choices, not arbitrary colour. If free colour is ever wanted,
  it means revisiting this ADR, not extending the list.
- The column is nullable rather than defaulted to `'peach'`, so "never chosen"
  stays distinguishable from "deliberately peach". Both render identically today;
  the distinction matters if the default ever changes.
- The swatch in the dropdown is a solid fill, not the real gradient — at dot
  size a 20%-opacity tint fading to white is unreadable. The gradient itself is
  shown as a full-width bar under the picker, and in the live card preview.
- The picker lives on the Thumbnail tab, next to the preview it drives, rather
  than on Identity with the other stored fields. Grouped by what it visually
  affects, not by where it lands in the table.

## ADR-026: Product Files tab edits hero-owned data from outside the segment

**Date:** 2026-07-28
**Status:** Accepted

**Context:** The hero segment carried two list fields — `heroDocs` (downloadable
brochures) and `certifications` (Halal/Kemenkes/Other badges). Both were edited
inside the hero's card in the segments builder: `heroDocs` through the generic
`list`/`itemFields` engine, `certifications` through the bespoke
`CertificationsField` from ADR-022. Each entry rendered as a bordered sub-card
with stacked labelled fields, so three documents and two certifications turned
the hero card into a long scroll of chrome for what is, in substance, two flat
lists. They also read as product-level assets rather than page-layout content,
which is what the rest of the segments builder is for.

**Options considered:**
1. Leave them in the hero and just flatten the row layout — smallest change, but
   the hero card stays long and the conceptual mismatch remains.
2. Promote them to their own `Product` columns (two `Json` fields or a related
   table) and edit them on a new tab — cleanest conceptually, but the public
   `HeroDevice` takes them as hero props, so it needs a data migration plus a
   rework of how the detail page assembles hero props, for no user-visible gain.
3. Keep the data on the hero record and move only the editing to a new tab —
   the public render path is untouched, at the cost of one screen editing
   another screen's data.

**Decision:** Option 3. `heroDocs` and `certifications` stay on the hero
segment's record. Their field definitions are removed from the hero entry in
`SEGMENT_TYPES`, so the segments builder no longer renders them, and a new
`ProductFilesEditor` on a "Product Files" tab reads and writes the same keys via
`updateHeroFiles`. `UploadField` moved out of `segments-builder.tsx` into its own
file so both editors can use it.

**Consequences:**
- `createEmptySegmentData` walks a type's `fields`, so with the defs gone it no
  longer seeds `heroDocs: []` / `certifications: []`. `withHeroSegment` seeds
  them explicitly instead. Anything else constructing a hero must do the same —
  this is the one seam the move introduces.
- Server-side `validateSegments` also walks `fields`, so these two keys are now
  outside its loop. No practical change: both are lists, and the loop already
  skipped lists. Unknown keys survive `normalizeSegments` (it spreads the
  record), so existing stored data round-trips untouched.
- The layout is one row per entry: documents are name + file, certifications are
  type + file with a name input only for "Other". Kemenkes keeps its AKL number
  input — the field is rendered on the public product page, so dropping it would
  have made the number uneditable while leaving it in the data.
- Changing a certification's type calls `createCertification` for the new type
  rather than patching the existing object. The three are a discriminated union
  with different keys, so patching would leave a stale `aklNumber` on a row that
  is no longer Kemenkes.
- The tab's completion dot is green only when at least one file exists and every
  row is filled. Files remain optional to save, so this is advisory, consistent
  with the other tabs under ADR-023.
- ADR-022's decision stands — certifications are still a closed set of typed
  styles chosen from a dropdown. Only where that dropdown lives has changed.

## ADR-027: Certification style is fixed at add-time

**Date:** 2026-07-28
**Status:** Accepted

**Context:** ADR-026 shipped the Product Files tab with a per-row `Select` for a
certification's style, alongside the add-time choice. That made style mutable:
picking a different one called `createCertification` and replaced the row
wholesale, silently dropping the AKL number and the uploaded file. The control
looked like an edit but behaved like a reset.

**Options considered:**
1. Keep the row dropdown and preserve what carries over (`fileUrl`, and `label`
   when both sides are "Other") — least surprising in the moment, but the union's
   whole point is that each style has its own required shape, so partial carry-over
   means a row can sit in a half-valid state the completeness check has to special-case.
2. Keep the dropdown but confirm before switching — honest, but a confirm dialog
   for a row in a list is heavy, and the outcome is still "you lose the contents".
3. Make style immutable once chosen, editable only by removing and re-adding.

**Decision:** Option 3. The row shows its style as a plain label; the only place a
style is chosen is the "Add certification" dropdown. `CERTIFICATION_TYPES` now
backs the add menu and the row label through `getCertificationTypeLabel`.

**Consequences:**
- Correcting a mis-picked style costs a remove plus an add, including re-uploading
  the certificate. Acceptable: certifications are added rarely, usually two or
  three per product, and the previous behaviour discarded the upload anyway
  without saying so.
- `createCertification` is now called from exactly one place (the add menu), so
  a row's `certType` can never disagree with the keys present on it. The
  completeness helpers can branch on `certType` without defensive checks.
- Supersedes ADR-026's consequence bullet describing type-switching behaviour;
  the rest of ADR-026 stands.

## ADR-028: Segment nav membership is a switch, name is its own field

**Date:** 2026-07-28
**Status:** Accepted

**Context:** One free-text field, "Section nav label (optional)", carried two
decisions: whether a segment appears in the page section nav, and what it is
called there. Blank meant hidden, which is not discoverable.

**Options considered:**
1. Keep one field — fewer inputs, but visibility stays expressed by absence.
2. Split into a name field and a switch — two inputs, each with one job.

**Decision:** Option 2. `anchorLabel` becomes `name` (defaulting to the segment
type's label when the segment is added) plus `showInNav`.

**Consequences:**
- Existing rows have `anchorLabel` and no `name`/`showInNav`. The name input
  falls back to the type label for display, and nav membership starts off, so
  previously-listed sections need re-enabling. No live impact: the public detail
  page is still hardcoded and never read `anchorLabel`.

## ADR-029: 360° viewer frames upload as one batch, not a typed URL pattern

**Date:** 2026-07-28
**Status:** Accepted

**Context:** The viewer360 segment stored `imgUrlTemplate` + `totalFrames` +
`extension`, and the admin typed all three by hand — the frame images
themselves had to already exist at that URL pattern via some other upload
path (there wasn't one in this CMS). This assumed frames were placed there
outside the admin entirely. The ask was for a real upload path: up to 100
images, 100KB each.

**Options considered:**
1. One Server Action call per frame (reusing the existing single-file
   `uploadSegmentAsset`) — no new code, but 100 round-trips for one save.
2. One batch call for the whole sequence, same shape as the Gallery feature's
   multi-file upload (ADR-011) — one request, consistent with an already-
   proven pattern in this codebase.

**Decision:** Option 2. `uploadViewer360Frames` (new) takes every frame in one
`FormData` under a repeated `frames` key, validates each against
`MAX_VIEWER360_FRAME_SIZE`/`ACCEPTED_IMAGE_TYPES`, and requires they all
resolve to the same extension — the public `Viewer360` component builds each
frame's URL as `${imgUrlTemplate}${n}${extension}`, one shared extension, not
per-file. Frames are ordered by filename (numeric-aware `localeCompare`), not
by `FileList`/selection order, which isn't reliable. Each is saved under one
random batch id shared by the sequence (`<batchId>_<n><ext>`) via a new
optional `filename` parameter on `saveUpload` — the existing function only
ever generated a random name per call, which can't produce the exact numbered
sequence this needs.

In the editor, one `Viewer360FramesInput` control replaces the three
individual fields for `imgUrlTemplate`/`totalFrames`/`extension` (special-
cased in `SegmentCard`'s field loop, same pattern as Text + Image's
image+placement row) — uploading a batch fills all three at once instead of
the admin typing a prefix to match files placed there some other way.

**Consequences:**
- All frames in one upload must share a file type. Mixing, say, `.jpg` and
  `.webp` frames in one sequence is rejected outright ("All frames must be the
  same file type") rather than silently picking one.
- No delete-on-replace cleanup, consistent with every other segment asset
  upload in this codebase: re-uploading a sequence orphans the previous
  batch's files on disk rather than deleting them.
- `saveUpload`'s new `filename` parameter is optional and every existing
  caller is unaffected — they don't pass it, so they keep the random-name
  behavior.
- Reordering after upload isn't supported; correcting frame order means
  renaming files and re-uploading the whole batch.

## ADR-030: Before & After items get real upload widgets and a derived alt; caption becomes optional

**Date:** 2026-07-29
**Status:** Accepted (supersedes ADR-021's "before-after images unchanged"
call for this field)

**Context:** The Before & After segment's items still had ADR-020's original
shape: `beforeImageUrl`/`afterImageUrl` as plain URL text inputs, plus a
hand-typed `beforeAlt`/`afterAlt` pair. In practice these images are always a
real upload, same as every other field ADR-021 already converted — before-
after was just left out of that pass. The ask this time: real upload inputs
capped the same as the Carousel's item image (1MB, JPEG/PNG/WEBP), laid out
as three cells per item (before image, after image, caption), and caption no
longer required.

**Decision:**
- `beforeImageUrl`/`afterImageUrl` become `type: "carouselImage"` fields
  (reusing the existing 1MB/JPEG-PNG-WEBP upload kind from ADR-020's Carousel
  work — no new upload kind needed, the limits already matched what was
  asked for here).
- `beforeAlt`/`afterAlt` are dropped from the admin form entirely and
  derived server-side from the item's own caption (`title`), same rule
  ADR-021 set for the hero's `imgAlt` — enforced in `normalizeSegments`
  (`product-actions.ts`). `IBeforeAfterItem`'s shape is unchanged; only the
  admin UI and the values' source of truth changed.
- `title` (Caption) loses `required: true` and gains `maxLength: 50`.
- A new `itemFieldLayout: "row"` (`segment-types.ts`, rendered in
  `segments-builder.tsx`'s `ListField`) gives each item field its own column
  side by side, for cases like this one where none of the fields stack —
  distinct from the existing `"grid"` layout (Carousel), which stacks text
  fields in one column and image fields in another. Items still render as the
  same bordered-card-per-item every other list field uses (`itemsLayout`
  omitted/`"card"`) — an itemized `"table"` variant (shared outer border, no
  per-item card) was tried for this segment and reverted in favor of staying
  consistent with the rest of the list fields.
- A new `imageAspect: "square"` (`IFieldDef`, read by `FieldInput` and passed
  to `UploadField`'s new `aspect` prop) crops the before/after image boxes to
  1:1 instead of the default 16:9, at a smaller cap (`max-w-36`) than the
  Carousel's — two same-sized thumbnails read better side by side than two
  wide video-aspect boxes would.

**Consequences:**
- Since caption is now optional, an item saved with no caption gets
  `beforeAlt`/`afterAlt` of `""` — an empty alt is valid (decorative image),
  not a validation error.
- Same no-delete-on-replace and no-server-side-list-required caveats as every
  other segment upload field (ADR-021) — re-uploading orphans the old file,
  and `validateSegments` still doesn't walk into list items.

## ADR-031: Document Highlight's file field picks from Product Files, not a fresh upload

**Date:** 2026-07-29
**Status:** Accepted

**Context:** The Document Highlight segment (`type: "document"`)'s `fileUrl`
was a plain `UploadField`, letting the admin upload a PDF that's very likely
already sitting in the Product Files tab's Downloadable Documents list
(`IHeroDoc[]`, stored on the hero segment's `heroDocs` — ADR-026). Uploading
again there would just create a second copy of the same file on disk. The ask:
pick from what's already uploaded instead.

**Options considered:**
1. Keep it a plain upload, let the admin paste/re-upload — simplest, but
   guarantees duplicate files for the common case (the brochure is already in
   Product Files) and gives the admin no way to know that.
2. Thread `heroDocs` down to the field and render a `<Select>` of its entries
   instead of an uploader (chosen).

**Decision:** Option 2. `SegmentsBuilder` derives `heroDocs` from the hero
segment (same source `ProductFilesEditor` reads) and passes it through
`SegmentCard` to a new special case for `segment.type === "document" &&
field.key === "fileUrl"` (same pattern as the highlight image+placement and
viewer360 special cases already in that field loop) — a `Select` listing each
document's title, storing its `href` as the field's value. If the field's
current value doesn't match any current `heroDocs` entry (saved before this
change, or the source document was since removed from Product Files), it's
added as an extra option rather than silently dropped, so an existing save
doesn't quietly lose its file.

**Consequences:**
- Document Highlight now has a soft dependency on Product Files having at
  least one document uploaded first; the picker shows "No documents uploaded
  yet" as its placeholder until then rather than blocking the segment.
- `fileUrl`'s stored shape is unchanged (still a plain URL string) — only the
  admin's way of setting it changed, so `IDocumentSegment` and
  `validateSegments` need no changes.
- This only covers Document Highlight's `fileUrl`; other segment fields that
  happen to be documents/files (certifications' `fileUrl`, hero's `heroDocs`
  themselves) are untouched and still their own uploaders.

## ADR-032: Document Highlight's thumbnail becomes a real upload; alt auto-derived from heading

**Date:** 2026-07-29
**Status:** Accepted

**Context:** Document Highlight's `thumbnailUrl` was still a plain `type:
"url"` text input (paste a path already uploaded elsewhere), and `alt` was a
separate hand-typed field the admin had to fill in themselves — both left
over from ADR-020's original pass, which ADR-021's upload-widget conversion
didn't touch for this segment.

**Decision:**
- `thumbnailUrl` becomes `type: "image"` — a real upload widget, same
  MAX_SEGMENT_IMAGE_SIZE/ACCEPTED_IMAGE_TYPES limits as every other plain
  `"image"` field (hero background, highlight image).
- `alt` is dropped from the admin form and derived server-side from the
  segment's own `heading`, same rule as the hero's `imgAlt` (ADR-021) and
  Before & After's `beforeAlt`/`afterAlt` (ADR-030) — enforced in
  `normalizeSegments` (`product-actions.ts`). `IDocumentSegment`'s shape is
  unchanged (`alt: string` still required); only the admin UI and the value's
  source of truth changed.

**Consequences:**
- Same no-delete-on-replace caveat as every other segment upload field
  (ADR-021) — replacing the thumbnail orphans the old file on disk.
- Renaming a document's heading after the fact silently changes its
  thumbnail's alt text too — same accepted tradeoff as the hero's `imgAlt`,
  correctness over independence.

## ADR-033: Category nodes can be a real page or stay a pure breadcrumb

**Date:** 2026-07-29
**Status:** Accepted

**Context:** ADR-019 scoped `Category` to a pure nav/tree model — id, type,
name, slug, depth, order, parentId — every node behaving identically: just a
breadcrumb segment routing to whatever's nested under it. The ask: let an
admin decide, per node, whether it's also a real page with its own banner,
title, description, rich-text body, and an optional YouTube video, or stays a
plain breadcrumb. The dev database had zero `Category`/`Product` rows at the
time this was built, so no data migration or destructive step was needed —
this is a purely additive schema change.

**Options considered:**
1. A separate `CategoryPage` table, one-to-one with `Category` — keeps the
   tree model untouched, but adds a join for a 1:1 relationship that's really
   just "this row has more columns sometimes."
2. Add the content fields directly to `Category`, all nullable, gated by a new
   `isPage` boolean (chosen) — same precedent `Product` already uses (its own
   content lives on the row, not a side table), no join needed.

**Decision:** Option 2. `Category` gained `isPage`, `bannerUrl`, `title`,
`description`, `body` (`@db.Text`), `youtubeUrl` — all null unless `isPage` is
true, in which case `bannerUrl`/`title`/`description` are required and `body`/
`youtubeUrl` stay optional (a page doesn't always need body copy beyond the
banner/title/description, e.g. a brand page that's just a product grid).
`title` is deliberately separate from the tree's existing `name`: `name` still
drives the slug/breadcrumb/menu label everywhere, `title` is only the page's
own heading, letting the two read differently if needed.

The admin "Add category"/"Edit category" dialog (`CategoryForm`, replacing
`CategoryNameForm` in `category-tree.tsx`) grew a "This category has its own
page" switch; turning it on reveals the five content fields in the same
dialog (widened to `sm:max-w-2xl` with scroll) rather than a separate
full-page editor. Toggling a node back to breadcrumb-only clears its content
fields to null server-side (`createCategory`/`updateCategory` in `actions.ts`)
rather than leaving them stale and hidden.

Two existing pieces were generalized to support this rather than duplicated:
- `UploadField` (`upload-field.tsx`) gained an optional `uploadAction` prop
  (defaulting to the existing `uploadSegmentAsset`), so the category banner
  uploads through a new `uploadCategoryBanner` action into its own
  `"categories"` feature folder instead of being lumped into
  `"products-content"`.
- `RichTextEditor` — previously hardcoded to the article editor's own upload
  action and placeholder — moved from
  `src/app/(admin)/admin/media/articles/editor/` to `src/components/` (along
  with its private `ColorPickerButton` helper) and now takes `onUploadImage`
  and `placeholder` as props. The article editor passes `uploadContentImage`
  and its old placeholder; the category body passes a new
  `uploadCategoryContentImage` action into its own `"categories-content"`
  folder. Its client-side image size/type pre-check was dropped in the
  process — it only duplicated what the server already validates.

**Consequences:**
- This pass is admin-side only. `/devices/[category]/page.tsx` and
  `/devices/[category]/[brand]/page.tsx` still render their existing
  hardcoded/stub content regardless of `isPage` — wiring them to this data is
  a separate task (see `TASKS.md`), consistent with ADR-019 already having
  deferred that same gap once.
- No delete-on-replace for a swapped-out banner or inline body image, same
  accepted orphan-file tradeoff as ADR-015/ADR-021.
- `validateSegments`-style server-side required-field checking for `Category`
  now lives inline in `createCategory`/`updateCategory` (via
  `parseCategoryPageContent`) rather than the data-driven `IFieldDef` engine
  the segments builder uses — `Category` isn't a segment, so reusing that
  system wasn't a fit; this is a small, one-off schema instead.

## ADR-034: Navbar's Devices dropdown reads live `Category` data; Products stays static

**Date:** 2026-07-29
**Status:** Accepted

**Context:** The public navbar's "Devices & Products" dropdown (desktop
`LargeDropdown`, mobile `SidebarDropdown`) still read the static
`deviceProductMenu` array (`src/lib/data.ts`) instead of the `Category` table
the admin CRUD (ADR-019) manages — an explicitly tracked gap (ADR-019's
consequences, and the open `TASKS.md` "Wire public Devices/Products routes and
the navbar to `Category`/`Product`" task). Confirmed with the user: this pass
covers only the **Devices** side. There's no public `/products/...` route
tree at all yet (only `/devices/...` exists, and even that still renders
hardcoded stub content) — wiring Products' nav data now would only produce
dead links from the main nav, so Products keeps reading the static data until
its routes exist.

**Options considered — bridging live data into the nav:**
1. Have `Navbar`/`Sidebar` (both `"use client"`) fetch `Category` themselves
   via a route handler or client-side fetch.
2. Fetch in the nearest Server Component ancestor and pass the result down as
   a prop (chosen) — `<Navbar />` is rendered in exactly one place,
   `src/app/(user)/layout.tsx`, already a Server Component. Simpler than a
   round-trip fetch, and keeps the data server-only until render.

**Options considered — caching the query (navbar renders on every page):**
1. `unstable_cache` + `revalidateTag`, invalidated on demand from the admin
   category actions — this codebase's usual convention (articles/galleries
   invalidate via `revalidatePath` from their own mutations, never a timer).
   Ruled out here: this Next.js version (16.1.6) changed `revalidateTag`'s
   signature to require a second "cache profile" argument tied to the newer
   `"use cache"`/`cacheLife` model, which doesn't apply to a plain
   `unstable_cache` call — fighting that for marginal benefit didn't seem
   worth it.
2. `unstable_cache` with a short time-based `revalidate` (chosen — 300s, no
   tags) — `Category` changes are infrequent, admin-driven edits, not
   time-sensitive content; a few minutes of staleness after an edit is a
   reasonable, simple tradeoff. `getCategoryTree` itself (the admin's own
   uncached reads) is untouched — caching is scoped to a new
   `getPublicDeviceCategoryTree` wrapper only, so admin pages keep seeing
   fully fresh data immediately after every save.

**Decision:** `src/lib/categories.ts` gained `getPublicDeviceCategoryTree()`
(cached `getCategoryTree("device")`, `revalidate: 300`) and
`mapCategoriesToNavMenu()` (maps `ICategory[]` → the navbar's `INavbarMenu[]`
shape, omitting `menu` entirely on a leaf rather than `[]` — matching the
static data's own leaf convention, since `LargeDropdown`/`SidebarDropdown`
check `if (menu.menu)` truthiness). `src/lib/data.ts` gained
`buildNavMenus(liveDeviceMenu)`, which splices that live tree into the
existing `navMenus`/`deviceProductMenu` structure's Devices branch — falling
back to the static branch if the live tree is empty (no categories yet, or
the DB read failed), so the nav never renders visibly blank.
`(user)/layout.tsx` fetches (inside a `try/catch` — a DB hiccup must not break
every page's navbar) and passes the merged result into a new `menus` prop on
`Navbar`, which now also forwards it into `SidebarMenu` (previously
`Sidebar.tsx` independently imported the same static `navMenus` itself — one
source of truth now instead of two copies that only stayed in sync by
coincidence). `navMenus` needed an explicit `INavbarMenu[]` type annotation
(previously inferred, with `type` widened to `string`) so it type-checks
against the same interface `Navbar`'s new prop uses.

`LargeDropdown.tsx` and `SidebarDropdown.tsx` needed **no changes** — both
already render exactly the 3 nested levels `Category.depth` (1–3) produces,
and already tolerate a leaf with no `menu`. This was purely a data-source
swap for the Devices branch, not a rendering change.

**Consequences:**
- Admin edits to device categories take up to 5 minutes to reach the public
  nav (the tradeoff for sidestepping the `revalidateTag` friction above) —
  acceptable for how infrequently this tree actually changes; revisit if that
  turns out to matter in practice.
- Products' navbar data, the `/devices/[category]/...` pages' actual content,
  and any `/products/...` routes are all still outstanding — see the amended
  `TASKS.md` task.
- This is the first caching (`unstable_cache`) in the codebase — scoped
  narrowly to this one public-facing read, not a general pattern applied
  elsewhere yet.

## ADR-035: Category page banner is four fixed sizes, one per orientation/breakpoint

**Date:** 2026-07-29
**Status:** Accepted

**Context:** A category page's single `bannerUrl` (ADR-033) was one image
stretched across every viewport. The homepage and about-page hero sections
already solve this differently: four separate static images
(`herobanner-sm/md/lg/xl.webp`, `src/app/(user)/(homepage)/(sections)/Hero.tsx`)
shown/hidden via Tailwind `portrait:`/`landscape:` + breakpoint classes,
never cropped/upscaled. The ask: give the category banner the same
sm/md/lg/xl structure, at exactly the same fixed resolutions those hero
images already use — 1440x2560 (sm, mobile portrait), 1536x2048 (md, tablet
portrait), 2048x1536 (lg, tablet/small-desktop landscape), 2560x1440 (xl,
desktop landscape) — with only the largest (xl) required.

There was one existing category with a `bannerUrl` set (`ALMA LASER`) at the
time of this change — not a fresh/empty table — so this couldn't be a plain
additive migration.

**Decision:** `Category.bannerUrl` → four columns, `bannerSmUrl`/
`bannerMdUrl`/`bannerLgUrl`/`bannerXlUrl`, all nullable; only `bannerXlUrl` is
required when `isPage` is true (enforced in `categoryPageContentSchema`,
`actions.ts`), matching the "only the largest banner is required" ask —
2560x1440 is exactly 16:9, so its preview box already reused the existing
`aspect="video"` `UploadField` variant; the other three needed new ratios
added to `UploadField`'s `aspect` prop (`"4:3"`, `"3:4"`, `"9:16"`, via
Tailwind's `aspect-[<w>/<h>]` arbitrary values) alongside the existing
`"video"`/`"square"`. Upload size capped at 2MB per image (down from the
banner's previous 3MB — `MAX_CATEGORY_BANNER_SIZE`/`_LABEL` in `limits.ts`),
still through the one existing `uploadCategoryBanner` action (ADR-033),
reused unchanged by all four inputs.

Migration: hand-written SQL
(`prisma/migrations/20260729090000_category_banner_sizes/`) rather than a
plain `prisma migrate dev` — that command refused to run non-interactively
once it detected the pending column drop would lose the one non-null
`bannerUrl` row, which is exactly correct behavior to not silently discard.
The migration adds the four new columns, backfills `bannerXlUrl` from the old
`bannerUrl` for any row that had one (the old single banner was that
category's primary/required image, the direct equivalent of the new required
`bannerXlUrl`), then drops `bannerUrl` — applied via `prisma db execute` and
recorded via `prisma migrate resolve --applied` so `migrate dev`/`deploy`
don't try to reapply or flag drift later. Verified directly against the dev
DB: the existing `ALMA LASER` row's banner survived the migration in
`bannerXlUrl`, the other three are `null`.

**Consequences:**
- The public `/devices/[category]/...` pages (still unwired, per the
  outstanding `TASKS.md` task) will need to pick the right size the same way
  `Hero.tsx` does — CSS orientation/breakpoint classes, not a rendering
  change here — and fall back to `bannerXlUrl` for any size an admin left
  empty, matching what the admin copy already tells the admin to expect.
- `ICategoryPageContent`/`ICategoryFormValues` grew from one banner field to
  four; every call site that touched the old single `bannerUrl` (both admin
  actions and `category-tree.tsx`'s form state/tree-merge helpers) needed a
  matching update — mechanical, but touched more surface than a single-field
  change normally would.
- Same no-delete-on-replace orphan-file tradeoff as every other segment/
  category upload field (ADR-015/ADR-021/ADR-033) — now across four fields
  instead of one.

## ADR-036: Category detail pages render `Category` CMS content directly; `Product`/segments wiring deferred

**Date:** 2026-07-30
**Status:** Accepted

**Context:** The open `TASKS.md` item for wiring the public Devices routes
bundled several unrelated pieces behind one "not yet designed" placeholder:
`Product`/segments rendering, a `/products/...` route tree, the Products
navbar, and rendering `Category`'s own page content (ADR-033/ADR-035). At the
time of this pass there was exactly one populated `isPage` `Category` row to
test against (`ALMA LASER`, depth 2 under `Medical Aesthetic Devices`) and
zero `Product` rows — so only the `Category`-rendering slice was actually
buildable and testable; the rest still needs real product data or a routing
decision that doesn't matter yet.

**Options considered — routing structure:**
1. A catch-all `/devices/[...slug]/page.tsx` resolving depth 1-3 in one route.
2. Keep the existing fixed `[category]/[brand]/[product]` segment folders
   (chosen) — they already existed before this task, and every `Category` row
   today is at most 2 levels deep (no depth-3 rows exist yet), so nothing
   forces the catch-all's added complexity yet. The depth-3-vs-catch-all
   question the original task flagged is left for the follow-up task, where
   it can actually be decided against real depth-3 categories/products.

**Decision:** `getCategoryBySlugPath(type, slugPath)`
(`src/lib/categories.ts`) resolves a category strictly through parent→child
slug links (not a global slug search), so a path that doesn't actually nest
that way (e.g. a real brand slug under the wrong root category) 404s instead
of resolving to the wrong node. Both `[category]/page.tsx` and
`[category]/[brand]/page.tsx` call it and hand the resolved `Category` to one
new shared `CategoryPageView` (`components/catalogue/`) — a `Category` row
renders the same way regardless of depth: its own hero/body/YouTube when
`isPage` (ADR-033), otherwise a plain heading, then either a grid of its own
sub-categories (mapped into the existing `IDeviceCardItem` shape, reusing
`DeviceCard`) or, for a leaf, its own published `Product` rows via new
`getPublishedProductCards(categoryId, urlPrefix)`.

`DeviceFilterList`'s `filterList` prop became optional and it gained
`heading`/`emptyMessage` — the old hardcoded Categories/Treatments/
Technologies filter options had no real taxonomy behind them (no matching
`Product` fields exist), so a page with nothing real to filter by omits the
filter bar entirely rather than rendering an inert one; the same grid
component now serves both "browse sub-categories" and "browse products"
without a fork.

`HeroDevice` (`components/catalogue/Hero.tsx`) gained an optional `bannerUrls`
(sm/md/lg/xl) prop alongside its original single `imgUrl`, rendered with the
same `portrait:`/`landscape:` breakpoint-swap pattern the homepage `Hero.tsx`
already uses — the responsive-banner consequence ADR-035 flagged as still
owed to the public side. Existing hardcoded pages (`[product]/page.tsx`) keep
using plain `imgUrl`, untouched.

A new `getYoutubeEmbedUrl()` (`src/lib/utils.ts`) converts whatever plain
watch/share URL an admin pastes (the category editor's own placeholder,
`https://www.youtube.com/watch?v=...`) into a `youtube-nocookie.com/embed/...`
URL for the existing `MediaDevice` iframe.

**Consequences:**
- Verified against the dev DB: `/devices/medical-aesthetic-devices/alma-laser`
  renders the real `ALMA LASER` row (all four banner sizes, title,
  description, rich-text body, YouTube embed); its depth-1 parent
  (`isPage: false`) renders a plain heading plus a working child grid to both
  `ALMA LASER` and its sibling `ALMA BEAUTY` (also `isPage: false`, confirming
  the non-page branch works even though it wasn't the named test case).
- `/devices/[category]/[brand]/[product]/page.tsx` is untouched — still fully
  hardcoded "Alma Harmony" content regardless of URL params, since there are
  zero `Product` rows to wire it to yet. The navbar's Products side, the
  `DropdownDevice`/`DocumentDevice` hardcoded-prop retrofits, and any
  `/products/...` route tree remain open (see `TASKS.md`).
- No caching added here, unlike ADR-034's navbar tree (`unstable_cache`) —
  these are per-page reads triggered by an actual page visit, not something
  rendered on every request site-wide.

## ADR-037: Category video gets a custom poster + click-to-play, plus an editor that mirrors the public page

**Date:** 2026-07-30
**Status:** Accepted

**Context:** Three admin-side gaps in the `Category` page editor (ADR-033):
(1) the rich text editor for `body` only ever showed the compact `.tiptap-content`
defaults (article-page typography), not the `.tiptap-content-category` type
scale (ADR-036) the public category page actually renders it with — so what an
admin saw while writing didn't match what visitors would see; (2) the YouTube
field was a bare URL input with no way to give the embed a poster image, a
short caption, or a description, and the public embed always loaded the
iframe immediately with no lighter-weight preview state; (3) "Name" and
"Title" sat next to each other in the form with no explanation of why a page
needs both (`name` drives the slug/breadcrumb/nav label, `title` is the
page's own heading — ADR-033 — but that distinction lived only in a code
comment, not in the UI an admin actually sees).

**Decision:**
1. `RichTextEditor` (`src/components/rich-text-editor.tsx`) gained an optional
   `contentClassName` prop, appended after its base `tiptap-content` class.
   The category body editor now passes `contentClassName="tiptap-content-category"`,
   so the editor's own typography/spacing matches the public render exactly —
   no separate "preview mode" needed, the editing surface just already looks
   right.
2. `Category` gained three new nullable columns — `youtubeThumbnailUrl`,
   `youtubeCaption`, `youtubeDescription` (migration
   `20260730033926_category_youtube_media`, purely additive, no data loss).
   All optional regardless of `youtubeUrl` being set — a page can have a
   plain video URL with none of this extra dressing. The admin form's
   "YouTube URL" input became a bordered "Video" section (matching the
   existing "Banners" box's style) with the URL, a thumbnail `UploadField`
   (new `uploadCategoryVideoThumbnail` action → its own `categories-video`
   upload folder, same size/type rule as the page banner), a caption `Input`,
   and a description `Textarea`. The public `MediaDevice`
   (`components/catalogue/Media.tsx`) renders the caption as an h3 and
   description as a p above the video; when a thumbnail is set, the video
   starts as a poster image with a play-button overlay and only mounts the
   iframe once clicked — unset, it embeds and autoplays-on-scroll exactly as
   before this change, so existing categories with just a bare `youtubeUrl`
   (e.g. `ALMA LASER`) are unaffected.
3. Added one line of helper copy under each of "Name" and "Title" in the
   category form spelling out the distinction plainly (URL/breadcrumb/nav
   label vs. this page's own heading), rather than relying on an admin
   inferring it from two similarly-named fields.

**Consequences:**
- `ICategory`/`ICategoryFormValues`/`ICategoryPageContent` all grew the three
  new fields; every call site touching the old single-field YouTube shape
  (admin actions, `category-tree.tsx`'s tree-merge helpers, `getCategoryTree`,
  `CategoryPageView`) needed a matching update — mechanical, same shape of
  change as ADR-035's four-banner-field growth.
- Regenerating the Prisma client after this migration required restarting the
  already-running dev server — its held file lock on the query engine DLL
  blocked `prisma generate` on Windows (EPERM renaming the `.dll.node` file in
  place). Restarting is the fix; there's no in-place workaround for a locked
  native binary.
- Same no-delete-on-replace orphan-file tradeoff as every other upload field
  (ADR-015/ADR-021/ADR-033/ADR-035) — now also for the video thumbnail.
- `getPublishedProductCards`/`getCategoryBySlugPath` and the two page routes
  were not touched by this change — this is entirely admin-form and
  `CategoryPageView`/`MediaDevice` rendering.

## ADR-038: Public `/devices/...` routing is one catch-all, not fixed depth folders

**Date:** 2026-07-30
**Status:** Accepted (supersedes ADR-036's deferred routing question for `Product`)

**Context:** ADR-036 wired the public `Category` pages but left `Product`/
segments rendering undesigned, flagging that the routing shape depended on
category depth, which wasn't yet exercised by real data. `Product.categoryId`
can point to a `Category` at depth 1, 2, or 3 (`MAX_CATEGORY_DEPTH` in
`src/app/(admin)/admin/product-device/limits.ts`), so a product's canonical
URL is 2-4 segments deep depending on where an admin filed it — and depth-3
categories had no route at all yet either, fixed or otherwise.

**Options considered:**
1. Fixed folders per depth — `[category]/[product]`,
   `[category]/[brand]/[product]`, `[category]/[brand]/[sub]/[product]`,
   alongside the existing `[category]/page.tsx` and `[category]/[brand]/page.tsx`.
   Explicit and simple per route, but three more files, and still nothing
   for a `Category` at depth 3 without a fourth.
2. One catch-all `src/app/(user)/devices/[...slug]/page.tsx` (chosen) —
   replaces both existing category files and the old hardcoded product page.
   Resolves the full slug path as a `Category` first (unchanged behavior);
   failing that, resolves all-but-last as the category and the last segment
   as a published `Product`'s own slug under it. Handles any depth in one
   place, including depth-3 categories, which is new.

**Decision:** Option 2. New `resolveDevicesRoute(type, slugPath)`
(`src/lib/devices-route.ts`) does the two-step resolution described above; it
takes `type: "device" | "product"` so the same function can serve a future
`/products/...` catch-all with no rework, though that route tree itself
remains deferred (see `TASKS.md`). `getCategoryBySlugPath`
(`src/lib/categories.ts`) had its slug-walking loop extracted into
`findCategoryInTree(tree, slugPath)` so `resolveDevicesRoute` can try two
different slug paths against one fetched tree instead of two full
`prisma.category.findMany` + tree-rebuild passes per product page view.

New `ProductPageView` (`src/app/(user)/components/catalogue/`) is the
product-branch equivalent of `CategoryPageView`: the `hero` segment drives
`HeroDevice` directly (certifications/heroDocs render through its existing
`children` slot — no `Hero.tsx` change needed), and every other segment maps
onto its real public component in stored order
(`HighlightDevice`/`GridListDevice`/`Viewer360`/`DropdownDevice`/
`BasicCarousel`/`BeforeAfterDevice`/`DocumentDevice`). Each non-hero segment
renders inside a `<div id={`segment-${segment.id}`}>` — prefixed rather than
the bare `crypto.randomUUID()`, since a UUID often starts with a digit and
`AosProvider`'s global hash-click handler runs `document.querySelector` on
the href, which throws on a digit-leading id.

`GridListDevice` (`GridFeature.tsx`) gained optional `columns`/
`backgroundColor` props (defaulting to its previous hardcoded
`md:grid-cols-2`/`bg-black` look) so the `treatments` segment's own fields —
already admin-editable, previously inert — actually drive it.

**Consequences:**
- `techSpecs`/`document` still render through `DropdownDevice`/`DocumentDevice`
  exactly as they exist today (hardcoded "Technology" header, fully hardcoded
  brochure content) — deliberately deferred, not fixed here. A `techSpecs`
  segment's own `header` field is ignored, and every `document` segment shows
  identical placeholder content regardless of the product. Tracked as a
  follow-up task in `TASKS.md`.
- Because category slugs are unique per parent while product slugs are unique
  per `type` globally (two separate uniqueness domains, per
  `generateUniqueProductSlug` in `product-actions.ts`), a child category could
  in principle share a slug with a sibling product and permanently shadow it
  at that exact URL, since the resolver tries the category match first. Rare,
  entirely admin-caused, and trivially fixed by renaming either slug — not
  worth a cross-model uniqueness check for this pass.
- No `generateStaticParams` for this route — category pages have no static
  generation today by existing precedent, and correctly enumerating both
  categories and products for one mixed catch-all is separate work, left as a
  deliberate gap rather than attempted here.
- The `/products/...` route tree, the Products navbar (ADR-034's equivalent
  for Devices), and the `DropdownDevice`/`DocumentDevice` retrofits remain
  open — see `TASKS.md`.

## ADR-039: Rich Text is a segment field type, reusing the shared Tiptap editor

**Date:** 2026-07-31
**Status:** Accepted

**Context:** Product/device pages needed a freeform content segment (long-form
copy with headings, lists, links, inline images) alongside the existing
structured segments (Highlight, List, Accordion, etc. — ADR-020). The article
editor and the category body (`CategoryPageView`) both already solve this with
a Tiptap-based `RichTextEditor`, factored out to `src/components/rich-text-editor.tsx`
precisely so a third consumer wouldn't have to rebuild it.

**Options considered:**
1. A one-off "Rich Text" segment component outside the generic field engine
   (segment-types.ts/segments-builder.tsx), wired directly in `SegmentCard`.
   Works, but every other segment goes through the shared field-definition
   system, so this would be the only exception an admin dev has to remember.
2. A new `"richText"` `IFieldType` (chosen) — a `richText` segment with one
   required `body` field of this type. `FieldInput` in `segments-builder.tsx`
   special-cases it the same way it already does `colorSwatch`, rendering
   `RichTextEditor` instead of a plain input. Required-field completeness
   (`isSegmentComplete`, `validateSegments`) needs no special-casing — an
   empty editor still serializes to `""`, matching every other required
   field's own-empty check.

**Decision:** Option 2. Inline image uploads from the segment's toolbar go
through a new `uploadSegmentContentImage` (`segment-upload-actions.ts`), which
validates with the same `segmentImageSchema` and lands in the same
`products-content` upload feature every other segment asset already uses —
no new upload directory. The editor's `contentClassName` reuses
`tiptap-content-category tiptap-content-category-compact` (the same classes
the category body's editor uses), and the public render in `ProductPageView`
reuses `tiptap-content tiptap-content-category` — the segment's typography
matches the category page's body copy rather than introducing a third scale.

**Consequences:**
- Any future segment needing rich text (or a differently-scaled variant) can
  reuse this same `"richText"` field type instead of another bespoke wiring.
- Like every other segment asset (`uploadSegmentAsset`), an image inserted
  into the body and then removed, or a whole `richText` segment deleted,
  leaves the uploaded file orphaned on disk — same known gap as the rest of
  the segments system, not reopened here.

## ADR-040: `Product.status` values renamed draft/published → hidden/public

**Date:** 2026-07-31
**Status:** Accepted

**Context:** The admin asked for the Devices/Products status wording to read
"Public"/"Hidden" instead of "Published"/"Draft" — closer to what the toggle
actually controls (site visibility) than the article-editor-style
draft/publish workflow language, which doesn't fit a catalog item as well.
This only applies to `Product` (devices/products) — `Article.status` keeps
its own draft/published values, since the ask was specifically about the
Product Identity tab and nothing in the article editor was in scope.

**Options considered:**
1. Relabel only — keep the stored column values as `"draft"`/`"published"`,
   just change the admin UI's displayed text to "Hidden"/"Public". No
   migration, zero risk to existing rows or the public site's own
   `status: "public"` queries. Rejected: leaves a permanent mismatch between
   what the database says and what everyone reading it (this code, a future
   admin dev, a raw DB query) sees, for no real benefit.
2. Rename the stored value (chosen) — `Product.status` itself becomes
   `"hidden"` | `"public"`, with a migration rewriting every existing row so
   the site's own public-visibility queries (`getPublishedProductCards`,
   `getPublishedProductBySlug` in `src/lib/products.ts`, both still named for
   history/behavior — see Consequences) keep matching what used to be
   `"published"`.

**Decision:** Option 2. New migration
`20260731120000_rename_product_status_values` runs two `UPDATE`s
(`'draft' → 'hidden'`, `'published' → 'public'`) before altering the
column's default to `'hidden'` — order matters, since altering the default
first wouldn't touch existing rows anyway, but running the rewrite before
the default change keeps the migration's intent (existing data first,
schema default second) obvious on read. Every `"draft" | "published"` type
union and string comparison in the Product code path
(`product-actions.ts`, `product-form.tsx`, `item-table.tsx`,
`src/lib/products.ts`, `IProduct`/`IProductListItem` in
`src/interfaces/general.ts`) was renamed to `"hidden" | "public"` in the
same pass — a partial rename would leave TypeScript's own union types lying
about what the database can actually contain. The admin form's action
buttons were reworded to match ("Save as hidden" / "Make public") since
leaving the old draft/publish verbs next to the new Hidden/Public status
badge would read as two different vocabularies for the same toggle.

**Consequences:**
- This migration mutates existing data, not just schema — it must be applied
  (`prisma migrate deploy`, or `migrate dev` locally) before or as part of
  deploying this change; deploying the code first against an un-migrated
  database would make every existing "published" product invisible (its
  status is still the literal string `"published"`, which no longer matches
  the new `status: "public"` queries).
- `getPublishedProductCards`/`getPublishedProductBySlug`
  (`src/lib/products.ts`) keep their old names despite now filtering on
  `"public"` — a pure rename with no behavior change, left out of this pass
  to keep the diff focused on the status values themselves.
- `Article.status` is intentionally untouched and still uses draft/published
  — the two models' status fields are no longer the same vocabulary. Any
  future shared "content status" concept would need to reconcile this.

## ADR-041: Reusable tags, type-scoped, picked/created inline on Identity — no Tags page

**Date:** 2026-07-31
**Status:** Accepted

**Context:** Devices/Products need a filterable, reusable tag (e.g.
"Dermatology", "Skin Restoration") — free text would duplicate near-identical
strings ("Dermatology" vs "dermatology" vs "Dermatologi") and make filtering
unreliable. The admin explicitly ruled out a standalone Tags management page
and asked for tag creation to happen inline, from a custom dropdown on the
Identity tab, that supports scrolling a list, searching it, and adding a new
tag on the fly. The admin also explicitly required that Device tags and
Product tags never be shared — a "Dermatology" device tag must be a
different thing from a "Dermatology" product tag.

**Options considered:**
1. Free-text string array on `Product` (like `segments Json`) — no schema
   change, but no real reuse (every product re-types its own strings) and no
   efficient way to filter/rename later. Rejected — defeats "created tags can
   be reused."
2. One global `Tag` model shared across both types — simpler (one pool,
   `@unique` on `name`), but the admin explicitly asked for no sharing
   between Devices and Products.
3. `Tag` scoped by `type` (chosen) — same partitioning `Category` already
   uses: `@@unique([type, name])` instead of a bare unique on `name`, so
   "Dermatology" can exist once as a device tag and once as a product tag,
   as two unrelated rows.

**Decision:** Option 3. `Tag` is a flat many-to-many with `Product`
(`prisma/migrations/20260731130000_add_tag`) — flat because, unlike
`Category`, a tag doesn't drive a page URL or a breadcrumb, it's purely a
filter facet, so a tree would be over-modeling it. `getTags(type)`
(`src/lib/tags.ts`) fetches the full pool for one type; `TagPicker`
(`tag-picker.tsx`) renders it as a Popover with a search `Input`, a
`max-h-56 overflow-y-auto` scrollable list of toggleable rows, and an
"Add ..." row that only appears when the search text has no exact
(case-insensitive) match. `createTag(type, name)` (`tag-actions.ts`) does
that same case-insensitive-within-`type` lookup server-side before creating,
so the reuse guarantee holds even if two admins type the same tag in
different casing at nearly the same time — the second one gets back the
first one's row instead of racing to create a near-duplicate. No cmdk/Command
component was introduced — same reasoning `category-picker.tsx` already
documented for not building a search combobox — this one is custom Popover +
Input + plain filtering, not a new UI-library dependency.
`product-actions.ts`'s `resolveTagIds` re-validates the submitted tag ids
against the DB, scoped to the product's own `type`, rather than trusting the
client — the actual enforcement of "never shared," since the picker only
ever offering same-type tags is a UI nicety, not a guarantee.

**Consequences:**
- No standalone Tags admin page exists — renaming or deleting a tag
  independent of any product isn't possible yet. If that's ever needed, it's
  a new page reading/writing the same `Tag` model, not a schema change.
- Filtering the public catalogue by tag is deliberately out of scope for this
  pass — tags can be created and assigned, but nothing on the public site
  reads them yet. Tracked as a follow-up in `TASKS.md`.
- A tag with zero products left attached (every product using it was
  edited to remove it, or deleted) stays in the DB forever — same "no
  orphan cleanup" precedent as uploaded segment assets, not reopened here.

## ADR-042: Navbar's Products dropdown reads live `Category` data — Products joins Devices

**Date:** 2026-07-31
**Status:** Accepted (closes the gap ADR-034 deliberately left open for Products)

**Context:** ADR-034 wired the Devices dropdown to live `Category` data but
kept Products on the static `deviceProductMenu` array, specifically because
no public `/products/...` route existed yet — wiring live category links
with nowhere for them to land would have produced dead links from the main
nav. ADR-038's `/devices/...` catch-all was already built generically
(`resolveDevicesRoute`, `ProductPageView`, `getPublishedProductCards` all take
`type: "device" | "product"`), so the blocker ADR-034 named no longer applied
once the admin asked for real product categories in the nav.

**Decision:** Two changes land together, since wiring the nav without the
route would just recreate ADR-034's exact concern:
1. `src/app/(user)/products/[...slug]/page.tsx` — a near-verbatim copy of
   the Devices catch-all with `type: 'product'` and its own `urlPrefix`.
   Both routes now share the same resolver/view components; a future
   behavior fix to either (pagination, metadata, etc.) needs applying to
   both files by hand since there's no shared page component between them,
   only shared logic underneath.
2. `getPublicProductCategoryTree` (`src/lib/categories.ts`) — same
   `unstable_cache`/300s pattern as `getPublicDeviceCategoryTree`.
   `buildNavMenus` (`src/lib/data.ts`) now takes both live trees and splices
   each into its own branch of `deviceProductMenu` independently — dropping
   the old "return static `navMenus` unchanged if the one live tree is
   empty" early-return, since with two independent branches one type's
   empty/failed fetch must not blank the other's already-working branch.

**Consequences:**
- The Products dropdown and its links now behave exactly like Devices': live
  `Category` tree, up to `MAX_CATEGORY_DEPTH` (3) levels, falling back to the
  static `deviceProductMenu` data per-branch if empty or the DB read fails.
- The `/devices/...` and `/products/...` catch-alls are two files with
  duplicated route logic (metadata, category/product branching, the
  `isPage` redirect) — accepted the same way ADR-038 already accepted no
  `generateStaticParams`; a shared route helper is possible future cleanup,
  not attempted here.
- `DropdownDevice`'s hardcoded "Technology" header and `DocumentDevice`'s
  fully hardcoded content are unaffected — that retrofit is split into its
  own `TASKS.md` entry, unrelated to routing.

## ADR-043: A category branch with no page anywhere in it is dropped from the navbar

**Date:** 2026-07-31
**Status:** Accepted

**Context:** `isPage: false` (ADR-033) already made a plain-breadcrumb
category render inert in the nav (`NavMenuLink`: plain text, no `href`,
`cursor-text`) rather than a dead link. But it still showed up — a
breadcrumb-only leaf, or a whole branch where nothing at any depth is a real
page, occupied space in the dropdown as a label with nothing to click,
including its own submenu arrow if it had breadcrumb-only children. Now that
both Devices and Products read live `Category` data (ADR-034, ADR-042),
that's the first place this actually shows up for real trees, not just a
theoretical gap.

**Decision:** `mapCategoriesToNavMenu` (`src/lib/categories.ts`) now filters
out any category whose own subtree has no page anywhere in it —
`hasPageInBranch` checks `category.isPage || children.some(hasPageInBranch)`,
recursively. This runs at every level (the function calls itself on
`category.children`), so it both drops a fully dead root and prunes dead
leaves out of an otherwise-kept branch, in one pass, with no separate
pruning step. A node that's a page itself is always kept regardless of its
children — matches existing precedent (a page-having leaf needs no children
to justify existing).

**Consequences:**
- This is nav-only — the admin's own category tree (`category-tree.tsx`)
  still shows every node regardless of `isPage`, and the public
  `/devices/...`/`/products/...` catch-all still resolves and renders a
  breadcrumb-only category's own URL if someone has it directly (just not
  linked from the nav) — unaffected by this change either way.
- An admin has no way to tell, from the tree UI alone, that a branch they're
  building is currently invisible in the live nav because nothing under it
  is a page yet — flagged as a follow-up rather than solved here (see
  `TASKS.md`).

## ADR-044: Static nav fallback only fires on "no categories at all," not "no categories are pages yet"

**Date:** 2026-07-31
**Status:** Accepted (refines ADR-034/ADR-042's fallback rule)

**Context:** `buildNavMenus` (ADR-034, extended by ADR-042) fell back to the
static `deviceProductMenu` placeholder whenever a branch's *live* nav array
was empty — originally meant for "no categories created yet" or "the DB read
failed." ADR-043 then started producing a legitimately empty live array in a
third case: categories exist, but none of them (nor anything beneath them)
is marked `isPage: true` yet. In the real data at the time (every Product
category, and one whole Device root, all `isPage: false`), this collapsed
the entire Products dropdown back to the old hardcoded placeholder — which
read as "the nav is still dummy, nothing changed" even though live data was
being fetched and correctly filtered the whole time. Confirmed with the
admin: an empty-because-not-published branch should show as empty, not
silently swap in fake static links.

**Decision:** `buildNavMenus` now takes an `ILiveCategoryBranch` per type
(`{ hasCategories: boolean; menu: INavbarMenu[] }`) instead of just the
mapped `menu` array. `hasCategories` is set from the *raw* `Category` row
count (`deviceCategories.length > 0` in `(user)/layout.tsx`), before
ADR-043's page-based filtering — so it answers "does this type have any
categories at all" independent of whether any of them are pages. The static
fallback now only fires when `hasCategories` is false; when it's true, the
live (possibly `[]` after filtering) menu is used as-is, even if that means
an empty panel under that root in `LargeDropdown`/`SidebarDropdown` today.

**Consequences:**
- A type with real categories but none marked as pages yet now shows an
  empty, still-clickable "Products" (or "Devices") section in the nav
  rather than fake links to content that isn't there — the honest
  reflection of "content is being built, not published yet."
- No empty-state treatment (a "Nothing here yet" message, or hiding the
  root button entirely) was added for that empty-panel case — out of scope
  for this pass, and removing the root button entirely risks breaking
  `LargeDropdown`'s `menu[0]` assumption if both branches ever end up empty
  at once.
- The static `deviceProductMenu` fallback is now reachable only by an actual
  DB failure or a freshly-created site with zero categories of that type —
  narrower than before, exactly as intended.

## ADR-045: Category hero text color is a closed swatch set, not a free color picker

**Date:** 2026-07-31
**Status:** Accepted

**Context:** A category page's hero title/description was hardcoded to
`text-brand-peach` (`Hero.tsx`). The admin asked for this to be editable per
category, from a fixed set: the brand's own black/white/red/peach, plus "a
common color like in tiptap swatch" (the rich text editor's own text-color
picker, `rich-text-editor.tsx`'s `TEXT_COLORS`).

**Decision:** New `src/lib/hero-text-colors.ts` follows the exact precedent
`card-backgrounds.ts`/`segment-colors.ts` already set: a closed
`HERO_TEXT_COLOR_VALUES` set (not a raw hex/color input), each option
carrying two separately-spelled-out literal classes —
`className` (`text-*`, applied to the real hero) and `swatchClassName`
(`bg-*`, applied to the admin picker's swatch) — never one derived from the
other by string manipulation at runtime, since Tailwind's scanner only
detects complete literal class names in source. (An earlier draft of this
picker did exactly that — `option.className.replace("text-", "bg-")` — which
would have silently compiled to unstyled swatches; caught and fixed before
landing.) 12 values: black/white/red/peach (red/peach are the brand's own
`--color-brand-red`/`--color-brand-peach`, not generic shades) plus 8 more
mirroring tiptap's generic swatch (grays, orange, amber, green, blue,
purple) minus the black/white/red already covered.
`Category.heroTextColor` is a nullable `String` column (same "closed set as
a stored string key" pattern as `Product.cardBackground`) — an unset value
falls back to `peach` via `getHeroTextColor`, matching the exact look every
row had before this column existed. `Hero.tsx`'s `HeroDevice` gained an
optional `textColorClassName` prop (default `'text-brand-peach'`, preserving
the old hardcoded behavior everywhere that doesn't pass it) rather than
changing its own default — only `CategoryPageView` passes a resolved value;
`ProductPageView`'s hero is untouched, this was scoped to Category only.

**Consequences:**
- Product/device hero text color remains fixed at the brand peach — only
  Category pages got this control, matching the actual ask.
- Adding a 13th color later means adding one more entry to
  `HERO_TEXT_COLORS` (both classes spelled out) — same low-friction pattern
  as adding a new segment background color or card tint.

## ADR-046: BPOM added as a fourth fixed certification style

**Date:** 2026-07-31
**Status:** Accepted

**Context:** Halal and Kemenkes (ADR-022) were the only two "fixed logo +
required registration number" certification styles; the admin asked for
BPOM (Indonesia's food/drug regulatory agency) added the same way, with a
registration number field and a file upload.

**Decision:** `IBpomCertification` (`certType: 'bpom'`, `registrationNumber`,
plus the same `label`/`imageUrl`/`fileUrl` every fixed style carries) added
to the `ICertification` union, following Kemenkes's exact shape with its own
field name. `product-files-editor.tsx` gained the matching
`createCertification`/`isCertificationComplete` branches and an add-time
menu entry; `ProductPageView.tsx`'s `CertificationBadge` gained the
`registrationNumber` sub-label case. The logo
(`CERTIFICATION_BPOM_LOGO = "/image/home/certificate/bpom.png"`) is reused
as-is from the homepage's own Credibility section — the only BPOM asset that
already existed in this project.

**Consequences:**
- Unlike Halal (`logo-halal-notext-white.png`) and Kemenkes
  (`kemenkes-white.png`), there is no white/monochrome/transparent variant of
  the BPOM mark — the badge (`ProductPageView`'s glassy dark button) renders
  the full-color logo as-is. Visually inconsistent with the other two badges
  sitting next to it; not fixed here since fabricating a logo variant isn't
  something to invent — swap in a proper white/transparent BPOM asset under
  the same filename (or update `CERTIFICATION_BPOM_LOGO`) whenever one's
  available.
- Existing Halal/Kemenkes/Other certification rows are unaffected — this
  only adds a new option to the closed set (ADR-022's decision still
  stands).

## ADR-047: Product/device hero text color reuses the Category hero's own picker and 12-color set

**Date:** 2026-07-31
**Status:** Accepted (extends ADR-045 to the product/device hero)

**Context:** ADR-045 gave the Category page's hero title/description an
admin-chosen text color, but the product/device hero (a `hero` segment,
edited through the generic field engine in `segment-types.ts`/
`segments-builder.tsx`, not the Category form) still hardcoded
`text-brand-peach`. The admin asked for the same control there, using the
same options.

**Decision:** `HeroTextColorPicker` (previously private to
`category-tree.tsx`) moved to its own file, `hero-text-color-picker.tsx`, so
both editors render the exact same widget over the exact same
`HERO_TEXT_COLORS` set rather than two copies that could drift. The hero
segment gained a new field: `{ key: "textColor", type: "heroTextColor",
defaultValue: DEFAULT_HERO_TEXT_COLOR }` (a new `IFieldType`, alongside
`colorSwatch`/`richText`'s precedent of a field type mapping to a
special-cased widget in `segments-builder.tsx`'s `FieldInput`), not required
— an old hero segment saved before this field existed simply has no
`textColor` key and falls back to peach via `getHeroTextColor`, no
migration needed since segments are JSON. `ProductPageView.tsx` resolves
`hero.textColor` the same way `CategoryPageView.tsx` already resolves
`category.heroTextColor`.

**Consequences:**
- One color picker, one color list, two editors — adding a 13th color (or
  changing the picker's layout) is a one-file change that both surfaces pick
  up.
- The hero's "Device Certifications:" heading (`ProductPageView.tsx`) stays
  hardcoded `text-brand-peach`, untouched — the ask was the hero's own
  title/description, not every peach-colored accent nearby.

## ADR-048: Secondary hero text derives black/white from the title color's own luma, not a second admin control

**Date:** 2026-07-31
**Status:** Accepted (supersedes the hardcoded shades ADR-047 left in place)

**Context:** ADR-047 made the product/device hero's title/description color
admin-editable, but "Download Documents" (`Hero.tsx`), "Device
Certifications:", and "Click to view" (both `ProductPageView.tsx`)
stayed hardcoded (`text-neutral-300`, `text-brand-peach`, `text-neutral-400`
respectively) — colors picked back when the title was always peach on an
assumed-dark photo. Once the title can be any of 12 colors, those fixed
secondary shades stop reliably reading against whatever backdrop the admin
picked the title color *for*. The admin asked these three automatically
become black or white based on "the background" — but the actual banner is
an arbitrary photo with no computable color at build/render time, and
nothing here samples image pixels. The practical signal available is the
admin's own title color choice, which they presumably already picked to
read well against that specific photo.

**Decision:** Each `HERO_TEXT_COLORS` entry (`src/lib/hero-text-colors.ts`)
gained two more literal fields — `contrastClassName` (`text-black` or
`text-white`) and `mutedContrastClassName` (same, at 60% opacity) — assigned
by standard YIQ luma of the color itself (`0.299R + 0.587G + 0.114B`,
threshold 128/255): a light title color (white, peach, light-gray, amber)
gets white secondary text, on the assumption it was picked for a dark-
skewing backdrop; a dark title color (black, red, dark-gray, gray, orange,
green, blue, purple) gets black secondary text. No new admin control was
added — this rides entirely on the color already chosen for the title.
"Download Documents" uses `contrastClassName` (`Hero.tsx`, new
`contrastClassName` prop); "Device Certifications:" uses the same, "Click to
download file" uses `mutedContrastClassName` for its deliberately
lower-emphasis look (`ProductPageView.tsx`).

**Consequences:**
- This is a heuristic, not a measurement — a title color picked against an
  unusually-lit banner (e.g. brand red on a mid-gray photo where black
  secondary text is actually harder to read than white) can still land on
  the "wrong" side. Accepted: this only ever needs to be as good as the
  admin's own title-color choice, which has the same limitation.
- The Category hero (`CategoryPageView.tsx`) doesn't render either "Download
  Documents" or a certifications block, so it needed no change here —
  `contrastClassName` only matters where `Hero.tsx`'s `heroDocs` prop (or a
  `children` block like `ProductPageView`'s) is actually used.
- Adding a 13th color to `HERO_TEXT_COLORS` now means classifying its own
  luma too, not just picking a `className`/`swatchClassName`.

## ADR-049: Certification badge text and logo both follow the hero's black/white contrast

**Date:** 2026-07-31
**Status:** Accepted (extends ADR-048 to `CertificationBadge`)

**Context:** ADR-048 made "Device Certifications:"/"Click to view"
follow the hero's black/white contrast, but the certification badges
themselves (`CertificationBadge`, `ProductPageView.tsx`) still hardcoded
`text-white` (via the plain-div path and the `transparent` Button variant),
and each fixed style's logo (Halal/Kemenkes/BPOM) was always its single
stored `imageUrl` — the same white-on-dark-assumption logos ADR-046 already
flagged as not fitting every backdrop.

**Decision:** `CertificationBadge` takes a new `contrastClassName` prop
(from the same `heroColor.contrastClassName` ADR-048 already computes) and
uses it in place of the hardcoded `text-white` on both render paths — the
plain `<div>` (no `fileUrl`) directly, and the `Button variant='transparent'`
path via the same "wrap in an inner span" technique ADR-048 used for the
document button, since `transparent` also hardcodes `text-white` in
`button.tsx`. New `src/lib/certification-logos.ts` pairs each fixed style
with a `{ white, black }` asset — `CertificationBadge` picks between them
instead of trying to recolor a raster PNG with a CSS filter (unreliable for
a multi-color mark like BPOM's). `product-files-editor.tsx`'s own
`createCertification` now seeds `imageUrl` from this same file's `.white`
variant, so the two places a certification's logo is chosen stay in sync.

**Consequences:**
- Halal has a genuine white/black monochrome pair, so it fully reacts.
  Kemenkes only ever had a white monochrome mark — its full-color mark
  stands in for "black" (color logos are generally designed for light
  backgrounds anyway), an approximation, not a true monochrome asset. BPOM
  has neither variant — the same full-color mark is used for both, meaning
  it still won't read well against every backdrop; unchanged from ADR-046's
  gap, just now centralized in one lookup instead of one hardcoded constant.
  Swap in real white/black BPOM and black Kemenkes assets under
  `CERTIFICATION_LOGOS` whenever they exist — no other code needs to change.
- The `imageUrl` field stored on each certification record is now only a
  seed/fallback value, not the actual source the public page renders from —
  the public render always recomputes the logo from `certType` + the
  current hero color, ignoring what's stored.

## ADR-050: Static nav fallback narrowed to an actual DB read failure only

**Date:** 2026-07-31
**Status:** Accepted (further narrows ADR-044)

**Context:** ADR-044 stopped the static placeholder from firing when
categories exist but none are pages yet, but still fell back to it whenever
a type had zero categories at all — indistinguishable, at the time, from an
actual DB read failure, since both cases collapsed to the same empty array.
In production, a genuinely empty CMS (no Devices/Products categories
created yet) rendered the static `deviceProductMenu` placeholder names,
which read as "the real data never got wired up" rather than "nothing's
been entered yet." Confirmed with the admin: an empty CMS should show an
empty nav branch, full stop — the static fallback should only exist for the
one case it was originally meant for: an actual DB error.

**Decision:** `(user)/layout.tsx` now catches each category-tree fetch to
`null` (the read threw) instead of `[]` (collapsing both failure and
genuine emptiness into the same value, as before) — `[]` now only ever means
"the read succeeded and returned nothing." `ILiveCategoryBranch.hasCategories`
(`src/lib/data.ts`) was renamed `fetchSucceeded` to match: `buildNavMenus`
now falls back to the static branch only when the read itself failed, not
whenever the resulting list happens to be empty.

**Consequences:**
- A production CMS with zero categories of a type now shows an empty (but
  still present, still clickable) branch in the nav for that type, same as
  the "categories exist but none are pages" case ADR-044 already covered —
  the two are now handled by the exact same code path instead of two
  separate ones.
- The static `deviceProductMenu` data is now reachable only by an actual
  thrown error from `getPublicDeviceCategoryTree`/`getPublicProductCategoryTree`
  — if that data is ever deleted entirely, nothing currently depends on it
  for a normal empty-CMS state, only for masking a real outage.

## ADR-051: Document Highlight segment picks a file from Product Files by id, not its own upload

**Date:** 2026-08-01
**Status:** Accepted (supersedes ADR-031, ADR-032)

**Context:** The client asked for two changes together: (1) add a thumbnail
upload to the Product Files tab's Downloadable Documents rows, and (2) remove
the thumbnail from the Document Highlight segment. Removing the segment's own
thumbnail raised the question of where its public-facing image comes from —
resolved with the client as: the segment should reference one of the
product's own uploaded documents instead of carrying its own file. Separately,
the segment's public renderer (`DocumentDevice`) was found to take zero props
and always render hardcoded Alma Harmony placeholder content regardless of
what any product's `document` segment actually stored — a pre-existing bug,
fixed in the same pass since it directly affects the same segment.

**Decision:**
- `IHeroDoc` (`src/interfaces/segments.ts`) gains `id: string` and an
  optional `thumbnailUrl?: string`. `product-files-editor.tsx`'s Downloadable
  Documents rows gained a second `UploadField kind="image"` per row, still
  one line — `UploadField` gained a `preview` prop (default `true`) so this
  one can opt out of the drag-and-drop box and render the same compact
  "choose file"-style button the file column already uses; a separate Eye
  button next to it opens the current thumbnail in a new tab, mirroring how
  the file column's own Eye button already works for `href`. New documents
  get `id: crypto.randomUUID()` on add.
- `IDocumentSegment` drops `fileUrl`/`thumbnailUrl` entirely and gains
  `documentId: string` — it keeps only its own `heading`/`subheading` text.
  `segments-builder.tsx`'s existing `document`/`fileUrl` special case (ADR-031,
  an href-matching `<Select>`) is replaced with a `document`/`documentId` case
  that matches by `id` instead, showing a visible warning if the stored id no
  longer resolves against `heroDocs` (e.g. the source document was since
  removed from Product Files) rather than silently pointing at nothing.
- `heroDocs` entries saved before this field existed have no `id` — backfilled
  once at form-open time (`ensureHeroDocIds`, `product-form.tsx`), the same
  "computed once and reused" precedent `withHeroSegment` already uses for the
  auto-injected hero, so a stable id exists before the picker ever renders.
- `DocumentDevice` (`src/app/(user)/components/catalogue/Document.tsx`) gains
  real props (`heading`, `subheading?`, `fileUrl`, `thumbnailUrl`, `alt`)
  instead of zero props and hardcoded content. `ProductPageView.tsx`'s
  `renderSegment` gains a `heroDocs: IHeroDoc[]` parameter (the only segment
  case that needs data beyond its own segment record) and resolves the
  referenced document by id; a missing reference or a resolved document with
  no thumbnail renders nothing, the same "drop rather than render broken"
  precedent already used for the `applicators` case.

**Consequences:**
- This lifts the "do not change `document` segment's field shape" constraint
  from the still-open `TASKS.md` task ("DropdownDevice`/`DocumentDevice`
  data-driven retrofits") — that constraint is now stale.
- A document referenced by a Document Highlight segment can no longer be
  safely deleted from Product Files without the admin noticing — the warning
  in the picker is the only signal; nothing blocks the deletion itself.
- Every existing `document` segment's stored `fileUrl`/`thumbnailUrl` is
  orphaned data going forward (the shape no longer has those keys) — no
  migration was run since segments live in a `Json` column; an existing
  Document Highlight segment simply shows an empty `documentId` until an
  admin picks a real document.

## ADR-052: New "Video" segment for Products (reuses VideoTextSection)

**Date:** 2026-08-01
**Status:** Accepted

**Context:** The client asked for a YouTube video segment on device/product
pages, using the same admin layout/inputs as the Category page's existing
YouTube video section (URL, optional custom thumbnail, optional caption,
optional description — `ICategory.youtube*`, ADR-037).

**Decision:** New `type: "video"` entry in `SEGMENT_TYPES`
(`segment-types.ts`) — `url` (required), `thumbnailUrl` (image, optional),
`caption` (text), `description` (textarea). Fully data-driven: every field
uses a type the generic `FieldInput`/`SegmentCard` engine already handles
(including the image upload, via the existing `uploadSegmentAsset` action),
so no special-case render code was needed in `segments-builder.tsx`, unlike
`viewer360`/`document`/`highlight`. `IVideoSegment` added to the
`IProductSegment` union with terse keys (`url`/`thumbnailUrl`/`caption`/
`description`) rather than mirroring `Category`'s `youtube*`-prefixed names —
no naming collision risk since it's an independent JSON blob, and the prefix
on `Category` only exists because those fields sit flat alongside other
prefixed groups on that model.
`ProductPageView.tsx`'s new `case 'video'` reuses `VideoTextSection`
(`src/app/(user)/components/VideoTextSection.tsx`) and `getYoutubeVideoId()`
(`src/lib/utils.ts`) directly — the same component the Category page's own
video section already renders through — rather than duplicating its
click-to-play/poster logic. A URL that doesn't parse to a valid video id
drops the segment (renders nothing).

**Consequences:**
- Any future change to `VideoTextSection`'s look/behavior affects both
  Category pages and this new Product segment identically, which is the
  intent — a divergence would need a deliberate prop or a new component, not
  an accidental one from copy-pasted markup.
- `video` was added to `ADDABLE_SEGMENT_TYPES` automatically (it excludes
  only `hero`), so it appears in the "Add a segment" menu with no extra
  wiring.

## ADR-053: LKPP added as a fifth, link-only certification style

**Date:** 2026-08-01
**Status:** Accepted

**Context:** The client asked for "LKPP" added to the certification options,
specifying its input is a link — unlike Halal/Kemenkes/BPOM/Other (ADR-022,
ADR-046), which all require an uploaded certificate file alongside their
other fields. This is the first certification style with no file upload at
all.

**Decision:** `ILkppCertification { certType: 'lkpp'; label: string; linkUrl:
string }` added to the `ICertification` union — no `imageUrl` (no fixed
logo, same as "Other") and no `fileUrl`. `product-files-editor.tsx`'s
`CERTIFICATION_TYPES`/`createCertification`/`isCertificationComplete` gained
matching `lkpp` branches, and the row rendering makes the file/`UploadField`
column conditional (`certification.certType !== "lkpp"`) — the first time
that column isn't rendered unconditionally for every row. `ProductPageView.tsx`'s
`CertificationBadge` computes a single `href` (`linkUrl` for LKPP, `fileUrl`
for every other style) instead of checking `fileUrl` directly, and skips the
logo lookup for `lkpp` the same way it already does for `other`.

**Consequences:**
- Every other certification style's "required file" assumption
  (`isCertificationComplete`'s shared `if (certification.fileUrl === "")
  return false` opening check) had to become conditional on `certType` for
  the first time — future certification styles need to consider whether they
  follow the file-required majority or the link-only LKPP precedent.
- LKPP has no logo badge at all (same as "Other") — if the client wants a
  fixed LKPP mark later, that's an additive change to
  `certification-logos.ts` plus a new `imageUrl`/`CERTIFICATION_LKPP_LOGO`
  constant, not a breaking one.

## ADR-054: Accordion (Tech Specs) background color picker; peach added to the shared palette

**Date:** 2026-08-01
**Status:** Accepted

**Context:** The client asked for a background color option on the Accordion
segment, which has always rendered a hardcoded `bg-brand-peach/30` — the
same closed-swatch-picker pattern already exists for the List segment
(`treatments`, `src/lib/segment-colors.ts`), but that palette has no peach
entry; its 7 colors are a black-to-white gradation plus the two brand reds.
Confirmed with the client: existing Accordions should keep their current
peach look by default rather than switching to the palette's own default
(black).

**Decision:** Added a `peach` entry (`bg-brand-peach/30`, `text-black`) to
`SEGMENT_BACKGROUND_COLORS`/`SEGMENT_BACKGROUND_COLOR_VALUES`. `techSpecs`
gained a `backgroundColor` field (`type: "colorSwatch"`, same as `treatments`)
but with `defaultValue: "peach"` set explicitly on the field — deliberately
not reusing `DEFAULT_SEGMENT_BACKGROUND_COLOR` (black, `treatments`' own
default), since the two segments' "no value stored yet" fallback needs to
differ. `Dropdown.tsx` (`DropdownDevice`) resolves its background via
`getSegmentBackgroundColor(backgroundColor ?? "peach")` rather than the
generic function's own default, for the same reason. The admin editor's
`ColorSwatchInput`/`FieldInput` also needed a matching fallback
(`value ?? field.defaultValue`) so a `techSpecs` segment saved before this
field existed shows "Peach" selected in the editor, not "Black" — without
this, the editor and the public page would have disagreed about what an old
Accordion's background actually renders as.

**Consequences:**
- `peach` is now available to any segment using the shared
  `SEGMENT_BACKGROUND_COLOR_VALUES` enum, not just Accordion — e.g. the List
  segment could offer it too with no further code change, just admin choice.
- The Accordion's individual `AccordionTrigger`/`AccordionContent` rows stay
  hardcoded `bg-white` regardless of the section's own background — only the
  outer wrapping section and its header text color respond to the picker,
  matching what was visually true before (the peach tint only ever showed
  around/behind the white cards, never on them).

## ADR-055: Product status button wording reverts to Save as Draft / Publish

**Date:** 2026-08-01
**Status:** Accepted (supersedes ADR-040's UI wording; `Product.status`
values unchanged)

**Context:** ADR-040 deliberately renamed the Devices/Products status
wording from Draft/Publish to Hidden/Public (both the stored `status` values
and the editor's button labels) at the client's request. The client has now
asked for the opposite wording back — "save as draft" / "publish" — for the
editor's two save buttons and the status displayed elsewhere in the admin
(the Identity tab's Status dropdown, and the list table's status badge).

**Decision:** Labels only, no data change. `product-form.tsx`'s save buttons
now read "Save as Draft" (was "Save as hidden") and "Publish" (was "Make
public"); its Identity tab Status `<Select>` now shows "Draft"/"Publish"
(was "Hidden"/"Public") — "Publish" rather than "Published" so the status
value reads as the same word as the action button, not a different tense;
`item-table.tsx`'s status badge and quick-change `<Select>` follow the same
wording. `Product.status`'s actual stored values stay `"hidden" | "public"`
(ADR-040's schema decision is unaffected) — only the text an admin reads
changed.

**Consequences:**
- The database column, every server action, and every internal comment
  keep saying `hidden`/`public` — only these four UI surfaces changed. A
  future reader grepping the codebase for "Draft"/"Publish" will only find
  display strings, not the actual enum.
- If the client reverses this wording again, it's the same kind of
  label-only change — no migration either way, since ADR-040 already decided
  the stored values aren't tied to the display language.

## ADR-056: Document Highlight — document picker comes first; Header replaced by it; heading/subheading renamed

**Date:** 2026-08-01
**Status:** Accepted (refines ADR-051 — same feature, no reversal)

**Context:** Follow-up feedback on ADR-051's Document Highlight redesign:
the client wants the document picker to be the first field (picking the
file is the natural starting point, not an afterthought below two text
fields), the picked document's own name to auto-fill the segment's heading
field as a convenience, and the field names changed from heading/subheading
to header/subheader.

**Decision:** `IDocumentSegment.heading`/`subheading` renamed to `header`/
`subheader`. `segment-types.ts`'s `document` entry reorders its fields so
`documentId` comes first, then `header`, then `subheader`. The `documentId`
picker's `onValueChange` (`segments-builder.tsx`) always replaces `header`
with the newly picked document's own `title` — picking a document is what
names the segment, so every pick (not just the first, blank-field one)
replaces whatever was there. `DocumentDevice`'s own props and
`normalizeSegments`'s `alt`-derivation (`product-actions.ts`) were renamed to
match, keeping the naming consistent end to end rather than just at the
admin-facing label.

**Consequences:**
- Unlike the hero's "Same as name" checkbox, there's no toggle to opt out —
  picking a different document always overwrites `header`, even if the
  admin had customized it for the previously-picked document. Retyping
  after picking is the only way to diverge from the document's own name.
- No data migration: this is a same-day refinement of ADR-051, which had not
  yet been exercised against any real saved product data.

## ADR-057: Document Highlight — thumbnail-less fallback is an outline button; fixed "Download Document" label + layout order

**Date:** 2026-08-01
**Status:** Accepted (refines ADR-051/ADR-056 — same feature, no reversal)

**Context:** Follow-up feedback: a Downloadable Document's thumbnail
(`IHeroDoc.thumbnailUrl`) is optional (ADR-051), but `ProductPageView.tsx`'s
`document` case still dropped the whole segment whenever the referenced
document had no thumbnail — treating "no thumbnail" the same as "the
reference is broken," which isn't the intent. Separately, the client wants a
fixed three-line layout: a static "Download Document" label, then the
segment's own Header, then its Subheader — rather than the previous
Subheader-above-Header arrangement.

**Decision:**
- `DocumentDevice`'s `thumbnailUrl` prop becomes optional. When absent, the
  whole large image card (the `aspect-3/4` red box with hover-revealed
  "Click to Download" overlay) is replaced entirely by a small standalone
  pill button — `rounded-full`, bordered (`border-brand-red`, not filled),
  text + `ArrowDownToLine` icon, filling solid on hover — rather than
  keeping the big box with a placeholder graphic inside it. The overlay
  button's text/icon only needed to be revealed on hover because it sat on
  top of a photo; with no photo, there's nothing to reveal it from, so it's
  simply always visible as its own element instead of an overlay.
- `ProductPageView.tsx`'s `document` case only drops the segment when the
  referenced document itself can't be found (removed from Product Files) —
  a resolved document with no thumbnail now renders through the fallback
  above instead of being treated as broken.
- `DocumentDevice`'s heading block is now a fixed three-line order: a
  hardcoded "Download Document" label, then `header`, then `subheader` (if
  set) — previously `subheader` rendered above `header`, and there was no
  "Download Document" label at all.

**Consequences:**
- "Download Document" is a hardcoded string, not a field — every Document
  Highlight segment shows the same label; if the client wants this
  customizable later, it becomes a new (likely optional, defaulting to this
  same text) segment field.
- A thumbnail-less document highlight no longer reserves the same visual
  weight (a large photo-sized card) as one with a thumbnail — it renders as
  a compact button instead, so a page mixing both looks intentionally
  different per entry rather than uniformly sized.

## ADR-058: Category edits now invalidate the public navbar cache on-demand via `updateTag`

**Date:** 2026-08-01
**Status:** Accepted (corrects an assumption behind ADR-042/ADR-050's caching notes)

**Context:** Reported bug: category edits didn't reliably show up in the
public navbar, and a hard refresh (Ctrl+Shift+R) never fixed it. Root cause:
`getPublicDeviceCategoryTree`/`getPublicProductCategoryTree`
(`src/lib/categories.ts`) are wrapped in `unstable_cache` with only a
time-based `revalidate: 300` (5 minutes) — a **server-side** Data Cache
entry, invisible to and unaffected by a browser hard refresh. The category
mutation actions (`createCategory`/`updateCategory`/`deleteCategory`/
`reorderCategories`, `actions.ts`) never invalidated it on write, based on a
code comment asserting this Next.js version's `revalidateTag` "requires a
second cache-profile argument" incompatible with a plain `unstable_cache`
call. Checking the installed Next.js 16.1.6 source
(`node_modules/next/dist/server/web/spec-extension/revalidate.js`) showed
this was a mistaken assumption: `revalidateTag(tag)` without a profile still
works (just emits a deprecation warning), and — more relevantly — Next 16
ships `updateTag(tag)`, a profile-free on-demand invalidation function
purpose-built for exactly this "invalidate from the Server Action that just
wrote the data" case, with no deprecation warning.

**Decision:** Both `unstable_cache` calls gained a matching `tags` option
(`["device-nav-categories"]`/`["product-nav-categories"]`, same strings as
their existing key parts). `revalidateCategoryPages` (`actions.ts`, called
by all four category mutations already) now also calls
`updateTag("device-nav-categories" | "product-nav-categories")` for the
mutated type. The time-based `revalidate` is kept, but raised from 300 to
3600 seconds and demoted to a fallback safety net — the primary invalidation
path is now on-demand, immediate, and tied to the actual write.

**Consequences:**
- A category create/edit/delete/reorder now reflects in the public navbar
  on the very next request, with no stale window — no browser action (hard
  refresh or otherwise) was ever going to fix this, since the staleness was
  server-side.
- `updateTag` only works when called from within a Server Action (it throws
  otherwise) — safe here since every call site is one, but a future
  route-handler-based category mutation would need `revalidateTag(tag,
  profile)` instead and would need its own profile decision.
- No change to `getCategoryTree`/`getCategoryBySlugPath` (uncached, used by
  the admin pages and the public category/product detail routes) — this
  fix is scoped to the two navbar-specific cached reads.

## ADR-059: Document Highlight can reference a Certification, not just a Document

**Date:** 2026-08-02
**Status:** Accepted (extends ADR-051/ADR-056 — same feature, no reversal).
The data model and admin picker described below are unchanged; the
certification-mode **layout** described here (a separate single-column
`CertificationHighlightDevice` component) was corrected same-day by
ADR-061 — see that ADR for the actual shipped layout.

**Context:** The client asked for the Document Highlight segment to be able
to feature a certification (from Product Files' Certifications list) as an
alternative to a downloadable document, with its own layout: "View
Certification" instead of "Download Document", the certification's logo/
name/number, then the segment's own Header/Subheader.

**Decision:**
- `ICertification`'s five variants each gain an `id: string` (backfilled for
  existing rows the same way `IHeroDoc.id` was, ADR-051 — new
  `ensureHeroFileIds`, renamed from `ensureHeroDocIds`, now backfills both
  lists in `product-form.tsx`). `createCertification` (`product-files-editor.tsx`)
  generates one on create.
- `IDocumentSegment` drops `documentId` for `referenceKind: 'document' |
  'certification'` + `referenceId: string` — one composite reference instead
  of two mutually-exclusive fields, so the existing generic required-field
  check (`referenceId` non-empty) stays correct with no per-type
  special-casing needed in `isSegmentComplete`/`validateSegments`.
- The admin picker (`segments-builder.tsx`) is now one grouped `<Select>` —
  a "Documents" group and a "Certifications" group — writing a composite
  `"document:<id>"`/`"certification:<id>"` value that's split back into
  `referenceKind`/`referenceId` on change. Header still always replaces with
  the picked entry's own name (document title or certification label),
  matching ADR-056.
- Three certType-branching helpers (`getCertificationLogo`,
  `getCertificationSubLabel`, `getCertificationHref`) extracted to
  `src/lib/certification-logos.ts`, shared by the hero's `CertificationBadge`
  (`ProductPageView.tsx`, refactored to use them instead of its own inline
  switch) and the new certification-mode renderer — avoids a third copy of
  the same five-way certType branch.
- New `CertificationHighlightDevice` (`Document.tsx`) — a single stacked
  column (label, logo, name, number, then header/subheader), a different
  layout from `DocumentDevice`'s side-by-side text/visual split.
  `ProductPageView.tsx`'s `document` case branches on `segment.referenceKind`
  to resolve against `heroDocs` or `heroCertifications` and render the
  matching component; an unresolved reference (removed from Product Files)
  drops the segment, same "drop rather than render broken" precedent as
  `applicators`.

**Consequences:**
- `alt` (still derived server-side from `header`) is unused in
  certification mode — `CertificationHighlightDevice` uses the
  certification's own `name` as its logo's alt text instead. Left in the
  segment shape rather than made conditional, since removing it for one mode
  only would complicate the generic shape for no real benefit.
- **Assumption, flagged for follow-up:** the certification layout's stacking
  order (label → logo → name → number → header → subheader, all one column)
  is a literal reading of the request's itemized order, not a side-by-side
  split mirroring `DocumentDevice`. Revisit if a side-by-side layout was
  actually intended.

## ADR-060: LKPP gets a real logo, sourced from the homepage's existing assets

**Date:** 2026-08-02
**Status:** Accepted (supersedes ADR-053's "no logo" note for LKPP)

**Context:** ADR-053 gave LKPP no logo, since none was available at the
time. The client has since pointed to existing assets:
`public/image/home/certificate/lkkp.png` and `lkkp-black.png` — already
used by the homepage's Credibility section (`Credibility.tsx`), which also
already relies on this exact `lkkp` (not `lkpp`) spelling. That's a
pre-existing typo in the asset filenames, not something introduced here;
renaming the files would also require updating `Credibility.tsx`, an
unrelated section, so the existing filenames are reused as-is rather than
"fixed" as a side effect of this change.

**Decision:** `CERTIFICATION_LOGOS` (`certification-logos.ts`) gains an
`lkpp` entry (`white: lkkp.png`, `black: lkkp-black.png`, following the same
unsuffixed-is-white/`-black`-suffixed-is-black convention every other style
already uses). `getCertificationLogo`'s exclusion list drops `lkpp`, leaving
only `other` (a free-text style with no consistent mark) without a logo.
No change to `ILkppCertification`'s shape — the logo resolves by `certType`
through this helper at render time, same as every other style; the field
itself has been a display-only fallback since ADR-049, not something worth
adding for a value nothing reads.

**Consequences:**
- LKPP's logo now shows everywhere `getCertificationLogo` is called — the
  hero's `CertificationBadge` pill and the Document Highlight segment's
  certification layout (ADR-059) both pick it up automatically, no
  per-call-site change needed.
- If the filename typo (`lkkp` → `lkpp`) is ever fixed, both this entry and
  `Credibility.tsx`'s reference need updating together.

## ADR-061: Document Highlight's certification mode reuses DocumentDevice's own layout

**Date:** 2026-08-02
**Status:** Accepted (corrects ADR-059's layout; the data model/picker parts
of ADR-059 are unaffected)

**Context:** ADR-059 shipped certification mode as a separate, single-column
component (`CertificationHighlightDevice`) — an assumption flagged in that
same ADR as needing confirmation. The client corrected it same-day: the
certification layout should be the *same* side-by-side layout
`DocumentDevice` already uses for plain documents (text block including the
label/header/subheader on one side, a thumbnail-or-button visual on the
other) — not a new, differently-structured component. The only actual
addition is a larger version of the hero's logo+name+number certification
badge, inserted into the text block immediately before the header.

**Decision:** `CertificationHighlightDevice` is deleted. `DocumentDevice`
(`Document.tsx`) gains one new optional prop, `certification?: { logo?:
string; name: string; number?: string }`:
- When set, the small top label reads "View Certification" instead of
  "Download Document", and a new block (logo image + name + number, sized
  up from the hero's `CertificationBadge` pill) renders inside the same
  `<h2>`, between that label and the header.
- The visual/CTA side (thumbnail image, or the outline button when there's
  no thumbnail) is completely unchanged — certifications have no thumbnail
  of their own (their logo now lives in the text block instead), so this
  side always falls through to the existing outline "Click to Download"
  button, pointed at the certification's own href
  (`getCertificationHref` — `fileUrl` for every style except LKPP's
  `linkUrl`).
- `ProductPageView.tsx`'s `document` case now calls `DocumentDevice` for
  both `referenceKind` values — the certification branch passes
  `fileUrl={getCertificationHref(certification)}`,
  `alt={certification.label}`, and the new `certification` prop; the
  document branch is untouched.

**Consequences:**
- One component (`DocumentDevice`) now serves both modes instead of two —
  matches the client's explicit ask that certification mode "is the same
  layout" as document mode, differing only by the added info block and
  label text.
- The certification's own file/link is only reachable through the visual
  side's button, same click target as a document's file — there's no
  separate click-through on the logo/name/number block itself.

## ADR-062: Certification logo/name/number moved inside the button, replacing "Click to Download"

**Date:** 2026-08-02
**Status:** Accepted (refines ADR-061 — same feature, no reversal)

**Context:** Follow-up correction to ADR-061: the client wants the
logo/name/number block moved out of the `<h2>` text block and into the
button itself, in place of the "Click to Download" text — keeping the
download icon. Since certifications never have a thumbnail, this always
targets the no-thumbnail outline-button branch, not the thumbnail-image
branch.

**Decision:** `DocumentDevice`'s `<h2>` is back to just label + header +
subheader (no certification info block). The no-thumbnail button branch
now renders `certification ? (logo + name/number stack) : 'Click to
Download'`, with the `ArrowDownToLine` icon unconditionally following
either — so a plain document with no thumbnail still reads "Click to
Download" + icon, exactly as before, and a certification instead shows its
logo + name + number + icon, with no leftover "Click to Download" text.

**Consequences:**
- The thumbnail-image button branch is untouched — certifications never
  reach it, since they have no `thumbnailUrl`.
- The button's `hover:bg-black hover:text-white` color inversion doesn't
  extend to the logo image (a static asset can't recolor on hover) — same
  limitation the hero's `CertificationBadge` already has.

## ADR-063: Certification info moves back to the text block; Header/Subheader not applicable

**Date:** 2026-08-02
**Status:** Accepted (corrects ADR-062 — same feature, no reversal of the
underlying data model)

**Context:** Second correction in the same session: the client moved the
logo/name/number back out of the button (ADR-062) into the text block,
under "View Certification" — and clarified that Header/Subheader are not
applicable to certification mode at all; they should not render.

**Decision:** The button reverts fully to ADR-061's version — always
"Click to Download" + icon, no certification branching. The `<h2>` text
block now renders the logo/name/number under the "View Certification"
label *instead of* header/subheader (not alongside them, as ADR-061 first
had it) — certification mode and document mode are now mutually exclusive
within that block: document mode shows header/subheader, certification
mode shows logo/name/number, never both.

**Consequences:**
- `segment.header`/`segment.subheader` are still stored and still required
  server-side (`validateSegments` has no per-`referenceKind` awareness, per
  ADR-051's original scope note) — they're simply unused at render time in
  certification mode. Not worth threading conditional-required logic
  through the generic field engine for a display-only concern.
- The admin form still shows Header/Subheader inputs regardless of which
  reference kind is picked — only the public render treats them as
  certification-mode no-ops. Hiding those inputs in the admin when
  certification is selected is a possible follow-up, not done here.

## ADR-064: Admin Header/Subheader auto-fill and disable for certification mode

**Date:** 2026-08-02
**Status:** Accepted (follows through on ADR-063 in the admin editor)

**Context:** ADR-063 made Header/Subheader not applicable to certification
mode on the public page, but the admin form still showed them as freely
editable text inputs with no indication they're unused — inviting an admin
to type something that silently never renders. The client asked for them
to instead auto-fill and lock once a certification is picked.

**Decision:** The reference picker's `onValueChange`
(`segments-builder.tsx`) now sets both fields when a certification is
picked: `header` from the certification's `label` (already the case, ADR-
056/059) and `subheader` from `getCertificationSubLabel()` (the
certificate/AKL/registration number — empty string for styles with none,
e.g. Other/LKPP). `renderField`'s generic default branch gained an
`isDisabledCertField` check (`segment.type === "document"`, key is
`header`/`subheader`, `referenceKind === "certification"`) that disables
the input and shows a small note ("Filled in automatically from the picked
certification — not shown for certification highlights") — reusing the
same `disabled` prop path the hero's "Same as name/tagline" fields already
use.

**Consequences:**
- Picking a document still leaves Subheader exactly as the admin typed it
  (no autofill/disable for document mode) — this only applies once
  `referenceKind` is `"certification"`.
- If the admin switches from a certification back to a document, Header/
  Subheader become editable again immediately (the `isDisabledCertField`
  check is live, not a one-time lock) — whatever value was auto-filled
  stays until edited or the next certification pick overwrites it again.

## ADR-065: Tag deletion happens inline in the tag picker, not a Tags page

**Date:** 2026-08-02
**Status:** Accepted

**Context:** ADR-041 gave tags inline create-on-the-fly from the Identity
tab's picker and explicitly ruled out a standalone Tags management page.
There was no way to remove a tag from the reusable pool at all — a
mistyped or now-unwanted tag stuck around forever. The client asked for a
delete feature, and the existing "no separate page" precedent (create
lives in the picker, not elsewhere) applies the same way to delete.

**Options considered:**
1. A standalone `/admin/.../tags` page listing every tag with a delete
   button — consistent with typical CMS patterns, but reopens the exact
   thing ADR-041 rejected (a whole page for something small enough to
   manage inline), and would be the only entry point to something the
   admin otherwise never navigates to directly.
2. Delete inline from the tag picker's dropdown list — a small trash icon
   per row, revealed on hover, next to the existing checkmark toggle.
   Consistent with how the same picker already handles create. Chosen.

**Decision:** `deleteTag(id)` (`tag-actions.ts`) does a plain
`prisma.tag.delete`. Since `Tag`/`Product` is an implicit many-to-many,
this only drops the join rows — no cascade to the products that had it
applied, they just lose the tag. `TagPicker` gained a per-row delete
button (hover-revealed, stops propagation so it doesn't also toggle
selection) that opens the same `AlertDialog` confirm pattern
`category-tree.tsx` already uses for deleting a category, since a tag
delete is just as irreversible and just as likely to be in use elsewhere.
On confirm, the picker calls a new `onTagDeleted(id)` prop rather than
mutating its own `options`/`value` — `product-form.tsx` owns both
`availableTags` (the pool) and `selectedTags` (this item's picks) as
separate state, and a deleted tag needs to disappear from both at once if
it happened to be applied to the item currently being edited.

**Consequences:**
- No confirmation of how many other products currently carry the tag
  before deleting — the dialog warns it's removed from "every
  {device|product} using it" but doesn't count them. Acceptable for now;
  revisit if admins ask for a usage count before confirming.
- No audit trail — a deleted tag's name is gone once confirmed, same as
  category deletion today.

## ADR-066: `HomeCarousel` model — category-linked carousels resolve live, not snapshotted

**Date:** 2026-08-03
**Status:** Accepted

**Context:** The homepage's product carousels were hardcoded (`almaCarouselList`/
`innoCarouselList` in `src/lib/data.ts`, every card linking to the same
placeholder URL). The client asked for admin CRUD under a new "Homepage →
Carousel" section, with two authoring modes: pick a leaf category (the
"lowest level of each branch") and have title/products/"See More" link fill
in automatically, or build a carousel entirely by hand. The "See More"
button must be optional either way.

**Options considered — category mode's data:**
1. **Snapshot the category's name/products/URL into the row at save time,
   same shape as custom mode** — simplest schema (one shared set of columns
   for both modes), but the whole point of "automatically fill" is
   undermined the moment the category is renamed, a product is
   published/unpublished under it, or the category moves — the carousel
   would silently drift from what the admin thinks they configured.
2. **Store only `categoryId`; resolve title/products/URL live at render
   time (chosen)** — `getCategoryAncestry(categoryId)` (`src/lib/
  categories.ts`) walks the `parentId` chain (at most `MAX_CATEGORY_DEPTH`
   hops) to get the name breadcrumb and slug path; `getPublishedProductCards`
   (already built for the catalogue grid, ADR-036) supplies the product
   list. A category-mode carousel is a live view over the category, not a
   copy of it.

**Options considered — enforcing "lowest level of each branch":**
1. **Reuse the product editor's own `CategoryPicker`, which never lists a
   root** — that component deliberately excludes depth-1 nodes (assumes
   every root always has sub-brands, true for product assignment today) but
   would wrongly hide a root that happens to have zero children, which *is*
   the lowest level of that branch.
2. **New `CarouselCategoryPicker`, flattening both the Devices and Products
   trees down to nodes with `children.length === 0`, root or not (chosen)**
   — a plain grouped `Select` (no `cmdk` in this project, same precedent as
   `CategoryPicker`), with each option labeled by its full breadcrumb.
   Re-checked server-side (`assertLeafCategory` in `actions.ts`) in case the
   tree changed between page load and submit.

**Options considered — category deletion:**
1. **`onDelete: Cascade`** — matches `Category`'s own self-relation, but
   would silently delete a homepage section out from under the admin the
   moment someone prunes a category tree elsewhere in the admin.
2. **`onDelete: SetNull` (chosen)** — `categoryId` is nullable; a deleted
   category leaves the `HomeCarousel` row in place with `categoryId: null`,
   surfaced in the admin list as a "category missing" warning (mirrors the
   document-picker precedent in ADR-051/057: broken references are shown,
   not silently discarded).

**Options considered — the "See More" button being optional:**
1. **Empty URL = hidden, no separate toggle** — works for custom mode (a
   blank input naturally means "no link"), but category mode's URL is
   always derivable, so there would be no way to omit the button there.
2. **A `showSeeMore` boolean, independent of mode (chosen)** — controls
   whether the button renders at all in both modes; custom mode's URL input
   is only required when the toggle is on.

**Options considered — custom mode's item list:** Same precedent as
`Gallery.images`/`Product.segments` (ADR-011/ADR-020) — `items: Json`
holding an ordered `{id, title, img, href}[]` array rather than a join
table, since the list has no independent query need of its own and is
always read as "this carousel's ordered cards."

**Decision:** Options 2, 2, 2, and 2 above. `HomeCarousel { mode, order,
size, showSeeMore, categoryId?, title?, seeMoreUrl?, items }` — the last
three columns are unused/null in "category" mode. Admin CRUD
(`src/app/(admin)/admin/homepage/carousel/`) mirrors the Gallery/Category
table pattern (drag-reorder via `@dnd-kit`, dialog add/edit, discard-changes
confirmation). The public homepage (`getPublicHomeCarousels()`) resolves
every row and drops any that end up with zero items — a category with no
published products, or one that's been deleted — rather than rendering an
empty carousel.

**Consequences:**
- A category-mode carousel needs zero maintenance when products under that
  category change — publish a new product, and it appears in the homepage
  carousel on the next render, no admin action needed. This is a deliberate
  trade for the snapshot alternative's stability: an admin cannot "freeze"
  a category carousel's exact card set at a point in time without switching
  it to custom mode.
- `getCategoryAncestry` costs up to `MAX_CATEGORY_DEPTH` sequential queries
  per category-mode carousel per homepage render (no caching layer, unlike
  the navbar's `unstable_cache`d category tree) — acceptable at the
  homepage's current carousel count; revisit if this list grows large
  enough to matter.
- The old hardcoded Alma/Inno carousel content was not migrated into the
  new system — every card pointed at the same placeholder URL, so there
  was nothing real to preserve; the client re-creates what they want
  through the admin.
- Custom-mode item images upload immediately on file select (same pattern
  as every other admin-authored image field, ADR-015/ADR-021) into a new
  `home-carousel-items` upload feature directory, with no orphan cleanup on
  remove — same accepted trade-off as those ADRs.

## ADR-067: Carousel title can be swapped for an image; text title stays mandatory

**Date:** 2026-08-03
**Status:** Accepted (amends ADR-066)

**Context:** Follow-up to ADR-066. The client asked for the carousel's
visible name to optionally be an image (e.g. a brand logo) instead of plain
text, in either authoring mode — but a text title must still be captured
even when an image is used, for accessibility/SEO ("semantics").

**Options considered:**
1. **Infer display mode from whether a title image is present** — no new
   column, but ambiguous: an admin who uploads an image then wants to
   temporarily go back to text would have to delete the image (losing it)
   rather than just flipping a toggle.
2. **Explicit `titleDisplayMode: "text" | "image"` column, independent of
   `mode` (chosen)** — matches this project's existing convention for this
   kind of choice (`Category.isPage` is an explicit boolean rather than
   inferred from whether page fields are filled). Toggling back to "text"
   leaves a previously uploaded `titleImage` in the row untouched — it
   reappears if the admin switches back to "image" later, rather than
   being deleted.

**Decision:** `HomeCarousel` gains `titleDisplayMode` (default `"text"`) and
`titleImage` (nullable). Required only when `titleDisplayMode === "image"`
(`parseTitleImage` in `actions.ts`); enforced for both `mode`s. No change
was needed to the public `ProductHomeSection` component — it already
renders an `sr-only` span with the text `title` unconditionally, and swaps
in `titleImg` visually only when provided (pre-existing behavior, used by
the original hardcoded Alma/Inno logos). `getPublicHomeCarousels()` simply
passes `titleImage` through only when `titleDisplayMode === "image"`; the
text `title` (the carousel's own `title` in "custom" mode, or the linked
category's `name` in "category" mode) is unconditionally required
independently of this ADR, so no new validation was needed there.

**Consequences:**
- The image, once uploaded, persists in the row even after switching back
  to "text" display — no orphan cleanup either way, consistent with
  ADR-015/ADR-021's accepted no-cleanup trade-off for admin-authored assets.
- "category" mode has no editable text-title field at all (the category's
  own required `name` always satisfies the accessibility requirement), so
  the admin form's helper copy differs slightly by mode when explaining
  what the image replaces.

## ADR-068: Custom carousel items get a search-as-you-type catalogue picker, no `cmdk` added

**Date:** 2026-08-03
**Status:** Accepted

**Context:** Follow-up to ADR-066. "Custom" mode carousel items were
entirely hand-typed (title, image upload, link). The client asked for a
searchable dropdown over every device/product so an admin can pick a real
catalogue item instead of re-typing its name/image/URL from scratch.
ADR-020 had previously noted this project has no `cmdk`/`Command` component
installed, so a category picker settled for a plain grouped `Select`.

**Options considered — search UI:**
1. **Install shadcn's `Command` component (adds the `cmdk` package)** — the
   idiomatic shadcn combobox, but a new runtime dependency for a need this
   codebase already has a working pattern for (see option 2).
2. **Reuse the `TagPicker`'s existing `Popover` + `Input` + client-side
   filtered list pattern (chosen)** — no new dependency; `TagPicker`
   (`src/app/(admin)/admin/product-device/tag-picker.tsx`) already proved
   this exact shape (search box in a `PopoverContent`, filtered list below)
   for a different picker. `ProductPickerField` follows it, using
   `PopoverAnchor` (not `PopoverTrigger`) so opening is driven by the input's
   own focus/typing rather than a separate trigger click.

**Options considered — where the picker attaches:**
1. **A separate "Pick from catalogue" button/icon per item row, alongside
   the existing title/image/link fields** — keeps manual entry and picking
   visually distinct, but adds a column to an already-dense row and forces a
   choice between two entry points for what is conceptually one field
   (the item's name).
2. **Attach the dropdown directly to the title field itself (chosen)** —
   typing behaves as a normal free-text title (still needed for items that
   link somewhere outside the catalogue, e.g. an external URL); a dropdown
   of matching published devices/products appears alongside, and picking
   one fills `title`/`img`/`href` from that product. Nothing is mutually
   exclusive — an admin can still hand-edit any field after picking.

**Options considered — what's searchable:** A new `getPublishedProductPickerOptions()`
(`src/lib/products.ts`) flattens every **published** `Product` row across
both `type`s (device and product — "all product & devices" per the ask)
into `{id, type, name, thumbnail, url}`, resolving each one's real public
detail URL via the existing `getCategoryAncestry` (same helper ADR-066
already built). Only published items are offered — an admin shouldn't be
able to link the public homepage to a draft/hidden item's page.

**Decision:** Options 2, 2, and the picker function above.
`ProductPickerField` (`src/app/(admin)/admin/homepage/carousel/
product-picker-field.tsx`) replaces the plain title `Input` in each custom
item row's search field; `carousel-items-editor.tsx` threads
`productOptions` down to it. `page.tsx` fetches
`getPublishedProductPickerOptions()` alongside the two category trees.

**Consequences:**
- No new npm dependency for this feature (`cmdk` still isn't installed) —
  if a full `cmdk`-style combobox (keyboard-arrow navigation, `Command`
  primitives) is wanted broadly across the admin later, that's a bigger,
  separate decision affecting more than this one field.
- `getPublishedProductPickerOptions()` costs one ancestry walk (up to
  `MAX_CATEGORY_DEPTH` sequential queries) per published product, on every
  page load of `/admin/homepage/carousel` — same accepted trade-off as
  `getHomeCarousels`'s and `getPublicHomeCarousels()`'s own per-row ancestry
  lookups; revisit if the catalogue grows large enough for this to matter.
- Picking a thumbnail-less product leaves the row's image exactly as it was
  (unset, or whatever was already there) rather than clearing it — the
  admin still has to upload one manually in that case.
- The picker only offers suggestions; it never forces a match. A custom
  item can still point anywhere (an external URL, a page outside the
  catalogue) by simply not picking a suggestion.

## ADR-069: Picked catalogue items lock image/link; row layout redone for a visible preview + scroll cap

**Date:** 2026-08-03
**Status:** Accepted (amends ADR-068)

**Context:** Follow-up to ADR-068. Three gaps found once the catalogue
picker was in use: (1) picking a product still left its image/link editable,
so an admin could silently drift a picked item's link away from the actual
product it was picked for; (2) the image field was a compact icon-only
upload button (`preview={false}`) — the picked/uploaded image was never
actually visible in the row; (3) the items list had no cap on its own
height, so it grew past the dialog's `max-h-[85vh]` with more than a
handful of items instead of scrolling internally (`GalleryForm`'s image
grid already solves this the same way for its own list).

**Options considered — locking:**
1. **Leave image/link editable after picking** — simplest, but lets a
   picked item's link/image quietly diverge from the product it claims to
   represent.
2. **Disable image/link once a product is picked, track the binding via a
   new `productId` on `ICarouselItem` (chosen)** — `ProductPickerField`'s
   `onPick` now also sets `productId`; `UploadField`/`Input` both take
   `disabled={item.productId != null}`. No way to unbind and re-enable the
   fields in place — correcting a wrong pick means removing the row and
   adding another, the same precedent `product-files-editor.tsx` already
   set for a certification's fixed style ("removing the row and adding
   another"). `productId` is not re-validated against the `Product` table
   on save — same admin-authored trust boundary as every other reference id
   in this project (e.g. a `document` segment's `documentId`).

**Options considered — layout:**
1. **Keep the single-line row, just widen the image box** — minimal change,
   but a single line has no room left for a real preview image plus a
   locked-state explanation once image/link are disabled.
2. **Two-line card per item (chosen)** — line one: drag handle, the
   catalogue picker (renamed "Browse or Add Item," full width), remove
   button. Line two: a real square image preview (`aspect="square"`,
   default `preview={true}` instead of the previous `false`) beside the
   link input, plus a one-line note when locked. The picker intentionally
   sits above the image/link it fills, reflecting that it's the entry point
   for both fields.

**Options considered — scrolling:** Wrap the item list in
`max-h-80 overflow-y-auto` (its own fixed cap, not dependent on the
surrounding flex chain reaching all the way down with `min-h-0`) — same
precedent as `GalleryForm`'s image grid (`min-h-0 flex-1 overflow-y-auto`),
just a fixed max-height instead of `flex-1` since this list sits among
several other form sections rather than being the form's only content.

**Decision:** Options 2, 2, and the scroll wrapper above.

**Consequences:**
- `ICarouselItem.productId` is optional/nullable — unset for hand-typed
  custom items and for "category" mode's live-resolved public items
  (`getPublicHomeCarousels` never sets it, since that path doesn't go
  through this admin editor at all).
- The old three-column header strip (Image/Title/Link) above the list was
  dropped in favor of a label above each field inside its own card, since
  the layout is no longer a flat single-line table.
- Items beyond the capped `max-h-80` (20rem) window scroll within the list
  itself instead of pushing the "Add item" button and Save button
  off-screen.

## ADR-070: `SupportPage` model for banner + rich text on static Support pages

**Date:** 2026-08-03
**Status:** Accepted

**Context:** Registration & Documentation, Warranty & Service, and Career
under the public Support menu each had a hardcoded `PageBanner` image and an
empty `<div className="h-150">` placeholder below it. The admin needs to
manage each page's banner (three responsive sizes — 2560x1107 required,
1363x1107 and 1107x1107 optional, mirroring `PageBanner`'s existing
`defImage`/`mdImage`/`smImage` props) and a rich text body underneath.
Marcom & Promotion is excluded — it already has its own content model
(`SocialAccount`) and wasn't part of this ask.

**Options considered:**
1. **Reuse `Category`'s `isPage` banner/body fields** — rejected; `Category`
   is the device/product taxonomy tree, and these three pages have no
   taxonomy relationship to it. Bending it into a generic "any page with a
   banner" model would break its own invariants (depth, parent/child,
   type discriminator) for no shared benefit.
2. **One `SupportPage` model, one row per fixed slug, upserted (chosen)** —
   `slug` is one of `SUPPORT_PAGE_SLUGS` (`src/lib/support-pages.ts`), not a
   free-form catalogue slug — there is no add/delete flow, only
   create-or-update by slug from each page's own admin form. Mirrors
   `Category`'s three-banner-size + rich text body shape (ADR-033/ADR-035)
   without the tree/taxonomy fields that don't apply here.

**Decision:** Option 2. `bannerXlUrl`/`bannerMdUrl`/`bannerSmUrl`/`body` all
nullable at the DB layer (a row may not exist yet before the first save);
`bannerXlUrl` required in practice via the save Server Action's Zod schema
and the form's disabled-until-set Save button, same split `Category` already
uses for its own isPage-gated required fields.

**Consequences:**
- Three admin routes (`/admin/support/{registration-documentation,
  warranty-service,career}`) each render the same `SupportPageForm`,
  parameterized by slug — one shared component, not three near-duplicates.
- The public pages fall back to their original hardcoded dummy banner image
  when no admin banner has been saved yet, and render nothing where the
  empty placeholder div used to be until a rich text body is saved
  (`hasRichTextContent`, same empty-Tiptap-HTML guard `CategoryPageView`
  already uses).
- `UploadField` (previously `product-device/upload-field.tsx`, used only by
  category/product-device editors) moved to `src/components/upload-field.tsx`
  since a second, unrelated feature area now needs it — each caller still
  passes its own `uploadAction` for its own upload folder.

## ADR-071: Carousel "Card Style" relabeled Square/Transparent; Square clips its image to the card

**Date:** 2026-08-03
**Status:** Accepted

**Context:** `ProductCarousel`'s `size` prop ("sm"/"md") controls two very
different-looking card treatments — `size: "sm"` is a fully opaque white
card the image sits inside, `size: "md"` is a shorter card with the image
deliberately floating above it over the transparent background (the
original Alma/Inno homepage look). "Small"/"Medium" never described that
difference; the client asked for names that do. Separately, the "sm"
variant's image wasn't actually staying inside its card — its rectangular
image wrapper sat at the same z-index above the card's rounded corners with
no clipping, so the image visually poked past the card's rounded top edges.

**Options considered — renaming:**
1. **Rename the stored/prop values themselves (`"sm"`/`"md"` → `"square"`/
   `"transparent"`)** — reads better in code, but touches the DB column,
   every Zod schema, and `IHomeCarousel`/`ProductCarousel`'s prop type for a
   change that's purely about what the admin sees in one dropdown.
2. **Relabel only the admin form's `SelectItem` text — "Small"→"Square",
   "Medium"→"Transparent" — keep `size: "sm" | "md"` as the stored value
   everywhere else (chosen)** — same precedent as ADR-055 (Draft/Publish
   wording restored over `status`'s unchanged `"hidden"/"public"` values):
   the display text and the stored representation are allowed to diverge
   when only the text was asked to change. Also renamed the field's own
   `Label` from "Card Size" to "Card Style," since "Square"/"Transparent"
   describe a look, not a dimension.

**Options considered — containing the Square image:**
1. **Shrink the image's height percentage so it never reaches the card's
   rounded corners** — fragile, depends on every image's aspect ratio
   happening to leave enough margin; a wide image would still reach the
   corners.
2. **Clip the image's absolutely-positioned wrapper to the same
   `rounded-4xl` shape as the card underneath (`overflow-hidden rounded-4xl`,
   Square only) (chosen)** — guarantees containment regardless of the
   image's own aspect ratio, since the browser now clips at the exact same
   boundary the card's own corners are drawn at. Left untouched for
   Transparent (`size: "md"`), where floating past the (shorter) card is the
   intended look.

**Decision:** Options 2 and 2 above, in `carousel-form.tsx` and
`src/app/(user)/components/Carousels.tsx`'s `ProductCarousel`.

**Consequences:**
- Existing carousels keep working with no data migration — every stored
  `HomeCarousel.size` value ("sm"/"md") is still valid, only its on-screen
  label changed.
- While fixing this, also found (and fixed, unrelated to naming) that every
  carousel card's "View Details" button linked to a hardcoded dummy URL
  (`'devices/medical-aesthetics/alma-laser/alma-harmony'`) instead of each
  item's own `href` — meaning no admin-configured carousel link (custom
  item or category-mode product card) ever actually worked on the public
  homepage until this fix.
- If `"sm"`/`"md"` ever need to read clearly as `"square"`/`"transparent"`
  in code too (not just the admin label), that's a follow-up schema/prop
  rename, not a silent extension of this one.

# Implementation Tasks

This file tracks the tasks for the development agent (Claude).

## [x] Task: Move user uploads out of `public/` (env-configured dir + Nginx)

**Context:** Uploads written to `public/uploads` at runtime 404 in production until
`pm2 restart`, because `next start` only serves `public/` files that existed at build
time — and deploys wipe the directory. See ADR-008.
**Approach:** Resolve the upload base directory from the `UPLOAD_DIR` env var, falling
back to `public/uploads` for local dev. Extract generic save/delete helpers into
`src/lib/uploads.ts` for reuse by future upload features (article cover images). URLs
stored in the DB are unchanged (`/uploads/<feature>/<filename>`); Nginx serves the
directory in production.
**Files to create or modify:**
- `src/lib/uploads.ts` — new: `saveUpload(file, feature)` / `deleteUpload(path, feature)`
- `src/app/(admin)/admin/support/marcom/actions.ts` — delegate to the shared helpers
- `ARCHITECTURE.md`, `DECISIONS.md` — ADR-008, Nginx config, VPS migration steps
**Acceptance criteria:**
- [x] With `UPLOAD_DIR` unset, uploads land in `public/uploads/<feature>/` (dev behavior
  unchanged).
- [x] With `UPLOAD_DIR` set, no file is ever written under `public/`.
- [x] DB values remain relative `/uploads/...` URLs — no data migration needed.
- [x] `tsc --noEmit` passes.
**Do not:** Introduce object storage or change the 1MB upload limit.
**Deploy note (manual, on VPS):** create `/var/lib/radian-elok/uploads` (owner
`deploy`), move existing files from `public/uploads/`, set `UPLOAD_DIR` in the app
env, add the Nginx `location /uploads/` block (see `ARCHITECTURE.md`), reload Nginx.

## [x] Task: Route handler for `/uploads/*` (next/image optimizer fix)

**Context:** After the ADR-008 rollout, `<Image>` renders of uploaded files failed in
production ("The requested resource isn't a valid image") because the image optimizer
resolves relative `url=` sources through the Next.js router, bypassing Nginx. See
ADR-009.
**Approach:** Catch-all route handler streams files from `UPLOAD_DIR` with extension
whitelist, traversal guard, and immutable cache headers.
**Files to create or modify:**
- `src/app/uploads/[...path]/route.ts` — new GET handler
- `src/lib/uploads.ts` — add `resolveUploadPath()` containment check
**Acceptance criteria:**
- [x] `GET /uploads/<feature>/<file>` returns the file with correct Content-Type.
- [x] `/_next/image?url=%2Fuploads%2F...` returns an optimized image (verified against
  a local production build with `UPLOAD_DIR` outside the project).
- [x] Path traversal (`..`) and non-image extensions return 404.
**Do not:** Remove the Nginx `location /uploads/` block — it remains the fast path for
direct browser requests.

## [x] Task: Admin Media → Galleries CRUD table (drag-and-drop reorder)

**Context:** `/admin/media/galleries` was an empty placeholder page. The client needs
to manage the galleries that back the public `/media/galleries` page (title,
description, a set of images) the same way `SocialAccount` is managed on the Marcom
page.
**Approach:** Mirror the `SocialAccount` CRUD + drag-reorder pattern (`@dnd-kit`,
Server Actions, `src/lib/uploads.ts`). New `Gallery` model with `images String[]`
(see ADR-011) instead of a join table, since no per-image metadata is needed yet.
Raised `serverActions.bodySizeLimit` to `10mb` to fit multi-image submissions.
**Files to create or modify:**
- `prisma/schema.prisma`, `prisma/migrations/20260721000000_gallery/` — new `Gallery` model
- `next.config.ts` — `serverActions.bodySizeLimit: "10mb"`
- `src/interfaces/general.ts` — `IGallery`
- `src/lib/galleries.ts` — `getGalleries()`
- `src/app/(admin)/admin/media/galleries/upload-limits.ts` — new
- `src/app/(admin)/admin/media/galleries/actions.ts` — new: create/update/delete/reorder
- `src/app/(admin)/admin/media/galleries/gallery-form.tsx` — new
- `src/app/(admin)/admin/media/galleries/gallery-table.tsx` — new
- `src/app/(admin)/admin/media/galleries/page.tsx` — wire up the table
**Acceptance criteria:**
- [x] Table shows Title, Description, Images (thumbnail stack), Actions columns.
- [x] "Gallery List" heading with "Add new gallery" button on the same row.
- [x] Rows can be reordered via drag-and-drop; order persists via `reorderGalleries`.
- [x] Add/Edit gallery opens in a large dialog with Title/Description inputs and a
  responsive image grid — a fixed `+` tile at index 0 opens the file picker, images
  can be freely reordered via drag-and-drop and removed, up to 50 images total.
- [x] Images are only uploaded to disk on submit, never on file selection.
- [x] Gallery images are stored under a separate `/uploads/galleries` destination,
  distinct from `/uploads/social-accounts`.
- [x] Attempting to close the Add/Edit dialog (Escape, overlay click, close button)
  while the title, description, or image set has unsaved changes prompts a "Discard
  unsaved changes?" confirmation instead of closing immediately.
- [x] While a save is in flight (Server Action pending), the Add/Edit dialog cannot
  be closed at all — Escape, overlay click, and the close button (hidden while
  saving) are all inert — since the in-flight request can't be cancelled.
- [x] Title and Description are both required (client `required` attribute + server
  validation); opening the dialog does not auto-focus the Title field.
- [x] `tsc --noEmit` passes.
**Do not:** Build the public `/media/galleries` wiring to the `Gallery` table in this
task — that page still uses dummy data and is a separate task.

## [x] Task: Wire public `/media/galleries` to the `Gallery` table

**Context:** `src/app/(user)/media/galleries/page.tsx` currently renders a single
hardcoded IMCAS gallery three times from a static file list. The admin CRUD table
(added above) now manages real `Gallery` rows.
**Approach:** Replace the static `imcasGalleryFiles` data with a Prisma query
(`getGalleries()`, ordered by `order`), render one section per gallery instead of
three copies of the same one, alternating `flex-row`/`flex-row-reverse` by index
parity (matching the original hand-written layout). A gallery can hold up to 50
images, so `GalleryViewer` was changed to accept only the first 6 image paths
(`initialImages`) plus a `totalImages` count, and to lazily fetch the rest via a new
`getGalleryImages` Server Action only when actually needed (lightbox opened, or
carousel navigation runs past what's loaded) — not on initial page load.
**Files to create or modify:**
- `src/app/(user)/media/galleries/page.tsx`
- `src/app/(user)/media/galleries/actions.ts` — new: `getGalleryImages(id)`
- `src/app/(user)/components/GalleryViewer.tsx` — `initialImages`/`totalImages`/
  `galleryId` props, progressive image loading
**Acceptance criteria:**
- [x] Page renders one section per `Gallery` row, ordered by `order`.
- [x] Empty state when there are no galleries yet.
- [x] Existing layout/styling (alternating image side, `GalleryViewer`) is preserved.
- [x] Only the first 6 images per gallery are sent to the client on initial render;
  the rest are fetched on demand, not shipped up front.
- [x] `tsc --noEmit` passes.
**Do not:** Change `GalleryViewer`'s props or the admin table built above.

## [ ] Task: Add Instagram/TikTok highlights to Marcom & Promotion page

**Context:** The Marcom & Promotion support page (`Tambahkan highlight akun Instagram
Radian Elok`) currently has an empty content area below the banner. The client wants
their social accounts (Radian Elok's own + the brand accounts they distribute)
highlighted there.
**Approach:** Follow the existing `socialMediaList` pattern already used in
`src/app/components/Footer.tsx` (array of `{ icon, href, text }`) rather than
inventing a new data shape. Render each account as a card/link block (Instagram icon
for the IG accounts, TikTok icon for the TikTok account) inside the empty `<div
className="h-150">` area of the page.
**Accounts to list:**
- https://www.instagram.com/radian.elok.distriversa — Radian Elok Distriversa (own account)
- https://www.instagram.com/almalasers.indonesia
- https://www.instagram.com/innoaesthetics.indonesia
- https://www.instagram.com/tegoder.indonesia
- https://www.instagram.com/novuma.indonesia
- https://www.tiktok.com/@radianelok
**Files to create or modify:**
- `src/app/(pages)/support/marcom-promotion/page.tsx` — replace the empty `h-150` div
  with the highlight section
**Acceptance criteria:**
- [ ] All 6 accounts are listed with correct hrefs (strip the `utm_source`/`igsh`
  tracking query params — link to the clean profile URL).
- [ ] Each link opens in a new tab (`target="_blank" rel="noopener noreferrer"`).
- [ ] Instagram accounts use the Instagram icon, the TikTok account uses the TikTok
  icon (`lucide-react` / `@lineiconshq/react-lineicons`, matching what `Footer.tsx`
  already imports).
- [ ] Layout uses Tailwind classes only, consistent with the rest of the page (uses
  `BodyWrapper` / matches other support pages' spacing).
**Do not:** Rename or restructure the existing `socialMediaList` in `Footer.tsx` — add
a separate list local to this page, since the account set here differs from the
footer's.

---

## [ ] Task: Project Initialization Audit

**Context:** Ensure the current project structure and dependencies are correctly configured and aligned with the architecture.
**Approach:** Review `package.json`, `tsconfig.json`, and basic layout to ensure they match the documented architecture.
**Files to create or modify:**
- `/package.json` — check dependencies
- `/tsconfig.json` — verify paths and module resolution
**Acceptance criteria:**
- [ ] Dependencies are up to date and consistent.
- [ ] Path aliases (e.g., `@/*`) are correctly configured.
- [ ] Project builds successfully.
**Do not:** Add any new features or components during this audit.

---

## CMS Buildout (Admin Login → Article Editor)

Infrastructure (VPS, Nginx, PM2, Postgres, Prisma migration for `AdminAccount` and
`Article`) is already provisioned and deployed to `demo.red-indonesia.co.id`. The
tasks below are the remaining application-layer work, in dependency order. Build and
test locally, then `git push` → `git pull && npm run build && pm2 restart` on the VPS.

## [ ] Task: Seed script for first AdminAccount

**Context:** No signup UI exists — this is a single shared login for the whole client
team, not a multi-user system. Need one seeded row to log in with.
**Approach:** Add a `prisma/seed.ts` that creates one `AdminAccount` with a bcrypt-hashed
password. Read username/password from env vars, not hardcoded.
**Files to create or modify:**
- `prisma/seed.ts`
- `package.json` — add `prisma.seed` config entry
**Acceptance criteria:**
- [ ] Running the seed creates exactly one `AdminAccount` row.
- [ ] Password is bcrypt-hashed before storage, never stored in plaintext.
- [ ] Re-running the seed does not duplicate or error (upsert on `username`).
**Do not:** Build a signup/registration page.

## [ ] Task: Admin login page (`/admin/login`)

**Context:** Entry point for the shared admin login.
**Approach:** Server action that looks up `AdminAccount` by username, compares password
with bcrypt, and on success issues a session (see next task).
**Files to create or modify:**
- `src/app/admin/login/page.tsx`
- `src/app/admin/login/actions.ts` — server action, validate input with Zod
**Acceptance criteria:**
- [ ] Invalid credentials show an error without leaking whether the username exists.
- [ ] Successful login redirects to `/admin`.
- [ ] Form uses shadcn/ui primitives (`Input`, `Button`, `Card`).
**Do not:** Implement OAuth/social login or a "remember me" beyond the session cookie.

## [ ] Task: Session handling (JWT in httpOnly cookie)

**Context:** Lightweight session, not full NextAuth — no multi-provider/OAuth need.
**Approach:** Use `jose` to sign/verify a JWT; set as httpOnly, secure, sameSite cookie
on login; provide a `getSession()` helper for server components/actions.
**Files to create or modify:**
- `src/lib/session.ts` — sign, verify, set-cookie, clear-cookie helpers
**Acceptance criteria:**
- [ ] Cookie is httpOnly, secure in production, and has a sane expiry.
- [ ] Tampered/expired tokens fail verification cleanly (no unhandled throw).
- [ ] `JWT_SECRET` read from env, never committed.
**Gemini decision needed if:** Session lifetime/refresh strategy isn't specified.

## [ ] Task: Middleware to protect `/admin/*`

**Context:** All admin routes except the login page must require a valid session.
**Approach:** Next.js middleware checks the session cookie via the verify helper from
the session task; redirects to `/admin/login` if missing/invalid.
**Files to create or modify:**
- `src/middleware.ts`
**Acceptance criteria:**
- [ ] `/admin/login` is reachable without a session.
- [ ] Every other `/admin/*` path redirects unauthenticated requests to `/admin/login`.
- [ ] Authenticated requests pass through untouched.

## [ ] Task: Article list page (`/admin`)

**Context:** Landing page after login — overview of all articles.
**Approach:** Server component querying `Article` via Prisma, table of title/status/
publishedAt with links to edit each one and a "New Article" action.
**Files to create or modify:**
- `src/app/admin/page.tsx`
**Acceptance criteria:**
- [ ] Lists all articles with draft/published status visible.
- [ ] Uses shadcn/ui `Table`.
- [ ] Empty state when there are no articles yet.

## [x] Task: Article create form (`/admin/media/articles/editor`)

**Context:** Create articles with rich text content. Image upload storage was
already decided (local disk via `src/lib/uploads.ts`, ADR-007/008/009) and reused
here rather than re-litigated per the old `Gemini decision needed` note below, which
is now stale.
**Approach:** Tiptap editor (`@tiptap/react` + `starter-kit` + `underline`/`link`/
`placeholder` extensions) bound to `Article.content` as HTML; save via a Server
Action, validated with Zod. Slug is auto-generated from the title server-side
(`slugify` + uniqueness retry loop, `-2`/`-3`/... suffix on collision) rather than a
manual field — no manual-slug UI was asked for. Two submit actions ("Save as draft"
/ "Publish") map directly to `Article.status`; `publishedAt` is set to now only on
publish.
**Files to create or modify:**
- `src/app/(admin)/admin/media/articles/editor/upload-limits.ts` — new
- `src/app/(admin)/admin/media/articles/editor/actions.ts` — new: `createArticle`
- `src/app/(admin)/admin/media/articles/editor/rich-text-editor.tsx` — new: Tiptap
  wrapper + toolbar
- `src/app/(admin)/admin/media/articles/editor/article-form.tsx` — new
- `src/app/(admin)/admin/media/articles/editor/page.tsx` — wire up the form
- `src/interfaces/general.ts` — `IArticle`
- `src/app/globals.css` — `.tiptap-content` styles for the editor's rendered HTML
**Acceptance criteria:**
- [x] Title, optional subtitle, thumbnail, and rich text content are all editable.
- [x] Slug is auto-generated and unique; no raw DB unique-constraint error can reach
  the user.
- [x] "Save as draft" vs. "Publish" controls `Article.status`/`publishedAt`.
- [x] Title capped at 200 characters, Subtitle at 300 (client `maxLength` + server
  Zod validation), both with a live character counter. Thumbnail capped at 2MB.
- [x] Saving as draft only requires at least one of title/subtitle/content/
  thumbnail to be filled — not all of them. Publishing still requires title,
  content, and thumbnail. Enforced both client-side and server-side (including
  the list table's quick status-toggle, which bypasses the form entirely).
- [x] `tsc --noEmit` passes.
**Do not:** Build the edit-by-id route or the article list page in this task — this
covers create only. Both are tracked below.
**Assumption:** "Sub title" reuses the existing `Article.excerpt` column (labeled
"Subtitle" in the form) rather than adding a new column — both are an optional short
line under the title; a separate field would duplicate `excerpt` without a clear
distinction. Flag if `excerpt` was meant to stay a separate SEO/listing summary.

## [x] Task: Article list page + edit-by-id (`/admin/media/articles`)

**Context:** `/admin/media/articles` was an empty placeholder. The create form
(above) had no way to view, edit, delete, or publish/unpublish what's been saved.
**Approach:** Mirrored the `Gallery`/`SocialAccount` admin table pattern — server
component queries `Article` via `getArticles()` (`src/lib/articles.ts`), a
`shadcn/ui` `Table` of thumbnail/title/subtitle/status. The single `editor/page.tsx`
route serves both create and edit — `?id=<id>` present loads that article via
`getArticleById` and passes it to `ArticleForm` as an `article?: IArticle` prop
(like `GalleryForm`); absent, it's a blank create form. Editing does not require
re-uploading a thumbnail (kept unless replaced) and never regenerates the slug from
an edited title (see ADR-013). Status is changeable two ways: the full edit form's
"Save as draft"/"Publish" buttons, or a Draft/Published `Select` dropdown directly
in the list table (`updateArticleStatus`) — the latter needed since the ask called
out changing publicity status as a capability distinct from editing. Publishing —
from either surface — always requires confirming an `AlertDialog` first (see
ADR-017); unpublishing does not.
**Files to create or modify:**
- `src/lib/articles.ts` — new: `getArticles()`, `getArticleById(id)`
- `src/app/(admin)/admin/media/articles/page.tsx` — table + "Create article" link
- `src/app/(admin)/admin/media/articles/article-table.tsx` — new
- `src/app/(admin)/admin/media/articles/editor/actions.ts` — added `updateArticle`,
  `deleteArticle`, `updateArticleStatus`
- `src/app/(admin)/admin/media/articles/editor/article-form.tsx` — accepts optional
  `article` prop for edit mode
- `src/app/(admin)/admin/media/articles/editor/page.tsx` — reads `?id=` (async
  `searchParams`), loads the article, 404s on an unknown id
- `src/components/ui/badge.tsx` — new (shadcn)
**Acceptance criteria:**
- [x] Lists all articles with thumbnail/title/subtitle/status visible.
- [x] Empty state when there are no articles yet.
- [x] Edit action redirects to the editor pre-filled with that article's data.
- [x] Delete action requires confirmation before removing the article and its
  thumbnail.
- [x] Status (draft/published) can be changed directly from the list, without
  opening the editor.
- [x] Editing an existing article preserves its slug (slug is not regenerated from
  title changes on update — only on create).
- [x] `tsc --noEmit` passes.

## [x] Task: Wire public `/media/articles` to the `Article` table

**Context:** `/media/articles` was an empty placeholder (`<div className="h-150">`
below the banner). It needs to read published articles from the database instead.
**Approach:** Server Component (no `"use client"`) querying `Article` directly via a
new lean `getPublishedArticles()` — filtered to `status: "published"`, ordered by
`publishedAt desc`, and `select`-ing only the fields a list card needs (title, slug,
excerpt, coverImage, publishedAt) rather than the full row, since `content` can be a
large Tiptap-produced HTML blob that a list view never renders. Fully server-rendered
(no client fetch/waterfall) for both performance and SEO — the article list is
present in the initial HTML, crawlable without JS. `revalidatePath("/media/articles")`
already fires from every create/update/delete/status-change action (added earlier for
the admin work), so the page stays fresh via on-demand revalidation rather than
needing a time-based `revalidate` interval.
**Files to create or modify:**
- `src/lib/articles.ts` — added `getPublishedArticles()`
- `src/app/(user)/media/articles/page.tsx` — grid of article cards, `Metadata` export
**Acceptance criteria:**
- [x] Only published articles are visible publicly.
- [x] Cards link to `/media/articles/[slug]`, ordered newest-published-first.
- [x] Empty state when nothing is published yet.
- [x] Page has its own SEO `Metadata` (title/description) rather than inheriting only
  the root layout's.
- [x] `tsc --noEmit` passes.
**Do not:** Build the `/media/articles/[slug]` detail page in this task — see the
follow-up task below. Cards link there, but that route doesn't exist yet.

## [x] Task: Public article detail page (`/media/articles/[slug]`)

**Context:** The article list linked every card to `/media/articles/<slug>`, which
didn't exist yet — those links 404'd.
**Approach:** Dynamic route `[slug]/page.tsx` with `generateStaticParams` (SSG —
every published article prerendered at build time; `dynamicParams` defaults to
`true` so articles published after build still resolve on first request and cache
from then on) and `generateMetadata` (title/description/OpenGraph/Twitter card from
the article's title/excerpt/coverImage). Renders `content` as raw HTML
(`dangerouslySetInnerHTML`, wrapped in `.tiptap-content` for the shared Tiptap
styling) since it's server-authored HTML from the admin's rich text editor, not
user-submitted content. Also emits `application/ld+json` `Article` structured data
for search engine rich results. Fetched via a new `getPublishedArticleBySlug(slug)`
gated to `status: "published"` — a draft's slug 404s publicly even if guessed.
**Files to create or modify:**
- `src/lib/articles.ts` — added `getPublishedArticleBySlug(slug)`,
  `getPublishedArticleSlugs()` (lean, slug-only, for `generateStaticParams`)
- `src/app/(user)/media/articles/[slug]/page.tsx` — new
- `src/app/(admin)/admin/media/articles/editor/actions.ts` — `revalidateArticlePages`
  now also takes an optional `slug` and revalidates that specific detail page (it
  previously only revalidated the list pages, which would have left a stale
  prerendered detail page after an edit/unpublish/delete)
**Acceptance criteria:**
- [x] A published article's slug renders its full content.
- [x] A draft's slug 404s publicly (`notFound()`), even with the exact correct slug.
- [x] An unknown slug 404s.
- [x] Page metadata (title, description, OpenGraph/Twitter image) reflects that
  article; structured data (JSON-LD) is present for the article.
- [x] `tsc --noEmit` passes.
**Known gap:** No `metadataBase` is set anywhere in the app (root layout or
`next.config.ts`), so the OpenGraph/Twitter image URLs here resolve as relative
paths rather than fully-qualified URLs — Next.js accepts this without erroring,
but some link-preview crawlers (e.g. link unfurling in chat apps) expect an
absolute URL. Fixing it means picking the canonical production domain
(`demo.red-indonesia.co.id` today, per the planned cutover in `ARCHITECTURE.md`
eventually `red-indonesia.co.id`) — a site-wide decision beyond this task's scope,
not something to guess at silently here.

## [x] Task: `Category` model + admin tree-management UI for Devices/Products

**Context:** The "Devices" and "Products" navbar menus were hardcoded in
`src/lib/data.ts` (`deviceProductMenu`), max 3 levels deep under each root (e.g.
Products → Cosmeceutical → Tegoder Cosmetics → Tegoder Face). The admin routes
`/admin/product-device/devices` and `/admin/product-device/products` already
existed as stubs. See ADR-019.
**Approach:** One self-referential `Category` Prisma model (`type: "device" |
"product"` discriminator, `depth` stored 1-3, `order` scoped per sibling group,
`onDelete: Cascade`), shared CRUD + reorder server actions parameterized by
`type`, and a recursive tree UI: expand/collapse per node, add-root/add-child
(disabled past depth 3)/edit/delete (with a sub-category-count warning) via
Dialog/AlertDialog, and same-parent-only drag reordering (`@dnd-kit`, one
`SortableContext` per sibling group so a drag can never move a node to a
different parent).
**Files to create or modify:**
- `prisma/schema.prisma` — new `Category` model + migration
  `20260727050029_add_category`
- `src/interfaces/general.ts` — new `ICategory`
- `src/lib/categories.ts` — new: `getCategoryTree(type)` (flat rows → nested tree)
- `src/app/(admin)/admin/product-device/actions.ts` — new: `createCategory`,
  `updateCategory`, `deleteCategory`, `reorderCategories`
- `src/app/(admin)/admin/product-device/limits.ts` — new: `MAX_CATEGORY_DEPTH`,
  `MAX_CATEGORY_NAME_LENGTH`
- `src/app/(admin)/admin/product-device/category-tree.tsx` — new: the recursive
  tree UI, shared by both admin pages
- `src/app/(admin)/admin/product-device/devices/page.tsx`,
  `.../products/page.tsx` — wired to `getCategoryTree` + `<CategoryTree>`
  (also fixed both stubs' component name, previously both named `DevicesPage`)
- `ARCHITECTURE.md`, `DECISIONS.md` (ADR-019)
**Acceptance criteria:**
- [x] Both admin pages render their respective tree, starting from the DB
  (`[]` renders an empty state, not an error).
- [x] Adding a category at depth 3 disables "Add sub-category" on that node;
  the server independently rejects a depth-4 create even if attempted directly.
- [x] Editing a name regenerates its slug only when the name actually changed;
  siblings can reuse a slug already used under a different parent.
- [x] Deleting a node with sub-categories deletes the whole subtree (cascade)
  and the confirmation dialog states how many will go with it.
- [x] Dragging a node only reorders it among its own siblings — there is no way
  to drag it to a different parent or depth.
- [x] `tsc --noEmit` passes; `eslint` reports nothing new.
**Do not:** Wire the public `/devices/...`/`/products/...` catalog routes or the
navbar's `deviceProductMenu` to `Category` in this task — see the follow-up task
below. Do not create a `Product` model here; this task is the category tree only.

## [x] Task: `Product` model + admin CRUD for device/product items (segments)

**Context:** Follow-up to the category tree task (ADR-019). Devices/products
need actual leaf-level content (not just taxonomy) assignable to any
`Category` node, editable via the admin. See ADR-020.
**Approach:** `Product` model with `type`/`categoryId`/`name`/`slug`/
`tagline?`/`thumbnail?`/`status`/`order` plus a `segments: Json` array of
typed content blocks (hero, highlight, treatments grid, 360 viewer, tech spec
accordion, applicator carousel, before/after, document download — the exact
section styles used by the existing hardcoded device detail page). Segment
field definitions are data-driven (`segment-types.ts`) and rendered by one
generic form engine (`segments-builder.tsx`) rather than nine bespoke forms.
Category assignment via a breadcrumb-labeled `Select` (`category-picker.tsx`).
Admin list/create/edit mirrors the Article pattern (table + full-page editor,
`?type=&id=` query params, one shared editor route for both device and
product items).
**Files to create or modify:**
- `prisma/schema.prisma` — new `Product` model + migration `20260727070805_add_product`
- `src/interfaces/segments.ts` — new: per-segment-type shapes (`IProductSegment` union)
- `src/interfaces/general.ts` — new `IProduct`, `IProductListItem`
- `src/lib/products.ts` — new: `getProductItems(type)`, `getProductById(id)`
- `src/app/(admin)/admin/product-device/segment-types.ts` — new: field configs per segment type
- `src/app/(admin)/admin/product-device/segments-builder.tsx` — new: generic segment field renderer + repeater
- `src/app/(admin)/admin/product-device/category-picker.tsx` — new: breadcrumb `Select`
- `src/app/(admin)/admin/product-device/product-actions.ts` — new: `createProduct`, `updateProduct`, `deleteProduct`, `updateProductStatus`, `reorderProducts`
- `src/app/(admin)/admin/product-device/product-form.tsx`, `item-table.tsx` — new
- `src/app/(admin)/admin/product-device/devices/items/page.tsx`,
  `products/items/page.tsx`, `items/editor/page.tsx` — new
- `src/app/(admin)/admin/product-device/limits.ts` — added product/thumbnail constants
- `src/app/(admin)/components/sidebar.tsx` — added "Product/Device Items" nav links
- `ARCHITECTURE.md`, `DECISIONS.md` (ADR-020)
**Acceptance criteria:**
- [x] Both `/admin/product-device/{devices,products}/items` list their type's
  items with thumbnail, name, category breadcrumb, and status.
- [x] Creating/editing an item requires a category of the matching `type` and
  a thumbnail before it can be published (drafts don't require either).
- [x] Segments can be added, reordered, and removed per item; each segment
  type only shows the fields that type actually needs.
- [x] Reordering items (drag) and changing status persist via server actions,
  matching the existing `Gallery`/`Article` list conventions.
- [x] `tsc --noEmit` passes, `eslint` reports nothing new, `next build` succeeds.
**Do not:** Wire the public `/devices/...`/`/products/...` routes or the navbar
to `Category`/`Product` in this task, or add real file-upload widgets for
segment image/file fields (plain URL inputs for now) — see the follow-up task
below.

## [x] Task: Real upload widgets for hero/certification/document segment fields

**Context:** Follow-up to the task above (ADR-020 deferred all segment
image/file fields as plain URL inputs). In practice the hero background,
hero/document downloadable files, and certification logo+certificate are
always a real upload, never a pasted URL. See ADR-021.
**Approach:** New `"image"`/`"file"` field types upload immediately on select
(same pattern as the rich text editor's inline content images, ADR-015) via a
new `uploadSegmentAsset` action, storing the returned URL — no change needed
to `validateSegments`/save logic since the field is still just a string by
submit time. Hero's `imgAlt` field removed from the form entirely; the server
now derives it from the hero's own `title`.
**Files to create or modify:**
- `src/app/(admin)/admin/product-device/segment-upload-actions.ts` — new: `uploadSegmentAsset`
- `src/app/(admin)/admin/product-device/segments-builder.tsx` — new `UploadField` component, wired into `FieldInput`
- `src/app/(admin)/admin/product-device/segment-types.ts` — `imgUrl`/`heroDocs[].href`/`document.fileUrl`/`certifications[].imageUrl` → `"image"`/`"file"`; `certifications[].fileUrl` added, `href` removed; `imgAlt` field removed from hero
- `src/app/(admin)/admin/product-device/product-actions.ts` — `normalizeSegments` forces hero `imgAlt = title` server-side
- `src/app/(admin)/admin/product-device/product-form.tsx` — new hero default (`imgAlt`)
- `src/app/(admin)/admin/product-device/limits.ts` — segment upload size/type constants
- `src/interfaces/segments.ts` — `ICertification` shape change
- `ARCHITECTURE.md`, `DECISIONS.md` (ADR-021)
**Acceptance criteria:**
- [x] Selecting a file for one of the converted fields uploads it immediately and shows a preview (image) or a filename link (file), without needing to submit the form first.
- [x] Hero's alt text is never manually entered and always equals its title, even after the title is edited later.
- [x] `tsc --noEmit` passes, `eslint` reports nothing new, `next build` succeeds.
**Do not:** Convert every remaining segment "url" field to an upload widget —
only the fields listed above are always a real upload in practice; the rest
(highlight/treatments/applicators/before-after images, 360 viewer frame
template) stay plain URL inputs.

## [x] Task: Typed certification "styles" (Halal/Kemenkes/Other) via dropdown

**Context:** Follow-up to the task above. Hero certifications only ever come
in three real styles — Halal Indonesia, Kemenkes (needs an AKL number), and a
custom "Other" (needs a title, no logo) — which a generic one-shape-fits-all
list form can't express well. See ADR-022.
**Approach:** `ICertification` becomes a discriminated union on `certType`.
Clicking "Add certification" opens a dropdown offering the three styles;
picking one creates an item pre-populated with that style's fixed fields
(Halal/Kemenkes's logo, never editable) and only relevant fields render. A
bespoke `CertificationsField` component replaces the generic `ListField` for
this one key. New heroes start with no certifications pre-filled — every
entry, including Halal/Kemenkes, is added explicitly.
**Files to create or modify:**
- `src/interfaces/segments.ts` — `ICertification` → `IHalalCertification | IKemenkesCertification | IOtherCertification`
- `src/app/(admin)/admin/product-device/segments-builder.tsx` — new `CertificationsField`, `createCertification`; special-cased in `SegmentCard`'s field loop
- `src/app/(admin)/admin/product-device/segment-types.ts` — `certifications` field drops `itemFields` (no longer used by the generic engine)
- `src/app/(admin)/admin/product-device/product-form.tsx` — removed the Halal/Kemenkes default-prefill added in the previous task
- `DECISIONS.md` (ADR-022, and an amendment note on ADR-021's now-reverted default-prefill consequence)
**Acceptance criteria:**
- [x] "Add certification" shows exactly three choices: Halal Indonesia, Kemenkes, Other.
- [x] Halal shows only a certificate file upload; Kemenkes shows an AKL Number field plus certificate file; Other shows a Title field plus certificate file.
- [x] Halal/Kemenkes's logo and label are set automatically and not editable in the form.
- [x] A new hero's certifications list starts empty.
- [x] `tsc --noEmit` passes, `eslint` reports nothing new, `next build` succeeds.
**Do not:** Add server-side per-`certType` validation in this task — `validateSegments` still only checks top-level segment fields, not list item shapes, consistent with every other list field.

## [x] Task: Split the device/product editor into completion-tracked tabs

**Context:** The editor was one long scroll — Product Identity, Product
Thumbnail and Page Segments stacked vertically — so the segments builder
(which grows unboundedly) buried the two short sections above it, and there
was no way to see at a glance what still needed filling in.
**Approach:** Add a `Tabs` shadcn primitive (the unified `radix-ui` package is
already a dependency, same import style as `accordion.tsx`) and split the
three sections into tab panels under the "Device Editor" heading. Each trigger
carries a `CircleCheck` icon: `text-muted-foreground/50` while that tab's
required content is missing, `text-emerald-600` once it's filled. Cancel /
Save as draft / Publish stay outside the tabs as a shared footer, and a failed
submit switches to the tab holding the offending field.
**Files to create or modify:**
- `src/components/ui/tabs.tsx` — new: shadcn `Tabs`/`TabsList`/`TabsTrigger`/`TabsContent`
- `src/app/(admin)/admin/product-device/product-form.tsx` — tab shell, per-tab completeness, hero mirroring moved here
- `src/app/(admin)/admin/product-device/segment-types.ts` — new `isSegmentComplete` helper
- `src/app/(admin)/admin/product-device/segments-builder.tsx` — dropped the two mirroring effects; hero card now gets `productName`/`productTagline`
- `DECISIONS.md` (ADR-023)
**Acceptance criteria:**
- [x] The editor shows three tabs — Product Identity, Product Thumbnail, Page Segments — under the editor heading.
- [x] Each tab's icon is grey when incomplete and green when complete: Identity needs Name + Category, Thumbnail needs an image, Page Segments needs every segment's required fields filled.
- [x] Editing Name/Tagline on the Identity tab still updates a hero pinned with "Same as name/tagline", even though the Segments tab is unmounted.
- [x] Submitting with a missing Name or Category switches to the Identity tab; publishing without a thumbnail switches to the Thumbnail tab.
- [x] `tsc --noEmit` passes and `eslint` reports nothing new.
**Do not:** Gate saving on tab completeness — the indicators are informational; a draft with empty tabs must still save, exactly as before.

## [x] Task: Live catalogue-card preview in place of the thumbnail example image

**Context:** Follow-up to the task above. The Product Thumbnail tab's "Show
example" toggle revealed a static PNG of a well-formatted thumbnail — it never
showed the admin's own item, and it goes stale whenever the public card's
styling changes. See ADR-024.
**Approach:** Extract the catalogue card out of `DeviceList.tsx` into its own
`DeviceCard` component and render that same component in the editor, fed by the
form's live Name, Tagline and thumbnail preview. AOS attributes stay at the
`DeviceList` call site (passed through rest props) so the admin doesn't inherit
scroll animations. The preview is `pointer-events-none` + `aria-hidden`.
**Files to create or modify:**
- `src/app/(user)/components/catalogue/DeviceCard.tsx` — new: the extracted card, plus an empty-`imgUrl` placeholder branch
- `src/app/(user)/components/catalogue/DeviceList.tsx` — maps to `DeviceCard`; local `IDeviceList` removed
- `src/interfaces/general.ts` — new `IDeviceCardItem`
- `src/app/(admin)/admin/product-device/product-form.tsx` — "Show example" toggle and its state replaced by the preview
- `DECISIONS.md` (ADR-024)
**Acceptance criteria:**
- [x] The Product Thumbnail tab shows a card that updates live as Name, Tagline and the chosen image change.
- [x] The preview is the same component the public catalogue renders, not a copy of its markup.
- [x] The preview renders before an image is chosen, with a placeholder in the image slot.
- [x] The preview's "View Product" link is not clickable or focusable from the editor.
- [x] The public `/devices/[category]/[brand]` grid is unchanged, AOS animations included.
- [x] `tsc --noEmit` passes, `eslint` reports nothing new, `next build` succeeds.
**Do not:** Pull admin-only concerns into `DeviceCard` — it stays a public
component that the editor happens to mount.

## [x] Task: Per-product catalogue card background tint

**Context:** Every catalogue card rendered the same hardcoded peach gradient
(`from-brand-peach/20 to-white`). Admins want to pick a tint per item so
cards in a grid can be told apart at a glance.
**Approach:** A closed set of tints in `src/lib/card-backgrounds.ts` (the brand
peach plus Tailwind's default 500-shade palette), each
with its full Tailwind class string written out (never composed — the scanner
only sees complete class names). `DeviceCard` resolves `item.background`
through `getCardBackground`, which falls back to peach for null/unknown. The
picker is a `Select` with a colour swatch per option, sitting under the
thumbnail field so it's next to the live preview it drives. Persisted as a
nullable `Product.cardBackground` column, validated server-side with
`z.enum(CARD_BACKGROUND_VALUES)`.
**Files to create or modify:**
- `src/lib/card-backgrounds.ts` — new: the six options, `getCardBackground`, `CARD_BACKGROUND_VALUES`
- `prisma/schema.prisma` + `prisma/migrations/20260728000000_add_product_card_background/` — nullable `cardBackground` column
- `src/interfaces/general.ts` — `IDeviceCardItem.background`, `IProduct.cardBackground`
- `src/app/(user)/components/catalogue/DeviceCard.tsx` — resolves the tint instead of hardcoding it
- `src/app/(admin)/admin/product-device/product-form.tsx` — swatch picker, wired to the preview and the payload
- `src/app/(admin)/admin/product-device/product-actions.ts` — Zod enum + persistence on create/update
- `src/lib/products.ts` — reads the column back
- `ARCHITECTURE.md` (Product model), `DECISIONS.md` (ADR-025)
**Acceptance criteria:**
- [x] The Thumbnail tab has a Card Background dropdown listing every tint, each with a colour swatch, and the swatch shows on the closed trigger too.
- [x] Choosing a tint updates the live preview card immediately.
- [x] The choice survives save and reload.
- [x] A product with no stored value (every row predating the column) renders the original peach tint.
- [x] An invalid value posted to the server is rejected by Zod, not written through.
**Do not:** Build the class string from fragments (`from-${colour}/20`) — Tailwind
compiles nothing for it. Add new tints to `CARD_BACKGROUNDS` as complete strings.

## [x] Task: Move hero documents and certifications to a "Product Files" tab

**Context:** Downloadable documents and certification badges were two fields
buried inside the hero segment card, rendered through the generic field engine
as stacked bordered sub-cards — a lot of chrome for what is really two flat
lists. They're also conceptually product-level assets, not page-layout content.
See ADR-026.
**Approach:** Move only the *editing*, not the data — both still live on the
hero segment's record, since the public `HeroDevice` renders them and ADR-020's
"segments mirror component props" rule still holds. Drop the two field defs
from the hero's `fields` array so the segments builder stops rendering them,
seed the keys in `withHeroSegment` instead of `createEmptySegmentData`, and add
a `ProductFilesEditor` on a new tab with one row per entry.
**Files to create or modify:**
- `src/app/(admin)/admin/product-device/upload-field.tsx` — new: `UploadField` extracted out of segments-builder so both editors share it
- `src/app/(admin)/admin/product-device/product-files-editor.tsx` — new: the two list editors, `createCertification`, completeness helpers
- `src/app/(admin)/admin/product-device/segments-builder.tsx` — drops `UploadField`, `CertificationsField`, `createCertification`, the logo constants, and the hero certifications special-case
- `src/app/(admin)/admin/product-device/segment-types.ts` — hero loses its `heroDocs`/`certifications` field defs
- `src/app/(admin)/admin/product-device/product-form.tsx` — new tab, seeds the two keys, `filesComplete`, `updateHeroFiles`
- `DECISIONS.md` (ADR-026)
**Acceptance criteria:**
- [x] The editor has a fourth tab, "Product Files", between Product Thumbnail and Page Segments.
- [x] The hero segment card no longer shows documents or certifications.
- [x] Documents are one row each: name input, file upload, remove.
- [x] "Add certification" opens a dropdown of the three styles and creates the row with the chosen one.
- [x] Certifications are one row each: the style as a fixed label, a number/name input, file upload, remove — the middle input is a certificate number for Halal, an AKL number for Kemenkes, and a name for "Other".
- [x] A row's style cannot be changed after it's added; correcting it means removing the row and adding another.
- [x] Existing products keep their stored documents and certifications, and the public hero renders them unchanged.
**Do not:** Move the data itself off the hero segment — the public `HeroDevice`
reads it from there, and relocating it would need a data migration for no gain.

## [x] Task: Wire public Category pages (`/devices/[category]`, `/devices/[category]/[brand]`) to `Category` CMS data

**Context:** Follow-up to ADR-019/ADR-033/ADR-034. `/devices/[category]/page.tsx`
was a bare unwired stub and `/devices/[category]/[brand]/page.tsx` ignored its
route params entirely, rendering the same hardcoded "Alma Laser" content no
matter which category/brand was requested. `Category` carries optional page
content (`isPage`/banner sizes/`title`/`description`/`body`/`youtubeUrl` —
ADR-033/ADR-035), unused by any public page until now. Only one real `isPage`
row existed to test against (`ALMA LASER`, depth 2) — this pass is scoped to
just the `Category` rendering, not `Product`/segments (zero `Product` rows
exist yet, so there's nothing to wire or test there). See ADR-036.
**Approach:** `getCategoryBySlugPath(type, slugPath)` (`src/lib/categories.ts`)
resolves a category strictly through parent→child slug links. Both page
routes resolve their own slug path and render one shared `CategoryPageView`
(`components/catalogue/`): hero/body/YouTube when `isPage`, otherwise a plain
heading, then a grid of either the category's own sub-categories or (leaf) its
published `Product` rows via new `getPublishedProductCards()`. `HeroDevice`
gained an optional responsive `bannerUrls` prop (sm/md/lg/xl, same breakpoint
pattern as the homepage hero) alongside its original single `imgUrl`.
`DeviceFilterList`'s `filterList` is now optional (no real filter taxonomy
exists behind the old hardcoded Categories/Treatments/Technologies options).
**Files to create or modify:**
- `src/lib/categories.ts` — `getCategoryBySlugPath()`
- `src/lib/products.ts` — `getPublishedProductCards()`
- `src/lib/utils.ts` — `getYoutubeEmbedUrl()`
- `src/app/(user)/components/catalogue/Hero.tsx` — optional `bannerUrls` prop
- `src/app/(user)/components/catalogue/DeviceList.tsx` — optional `filterList`,
  new `heading`/`emptyMessage` props
- `src/app/(user)/components/catalogue/CategoryPageView.tsx` — new, shared by
  both routes below
- `src/app/(user)/devices/[category]/page.tsx`,
  `src/app/(user)/devices/[category]/[brand]/page.tsx` — resolve real
  `Category` data, `notFound()` on an unmatched slug path
- `DECISIONS.md` (ADR-036)
**Acceptance criteria:**
- [x] `/devices/medical-aesthetic-devices/alma-laser` renders the real
  `ALMA LASER` row — all four banner sizes, title, description, rich-text
  body, and YouTube embed — verified against the dev DB.
- [x] `/devices/medical-aesthetic-devices` (isPage: false) renders a plain
  heading and a grid linking to its two children (`ALMA LASER`, `ALMA BEAUTY`).
- [x] An unmatched category/brand slug path 404s.
- [x] A leaf category with no published products shows an empty state
  instead of an error (`ALMA LASER` has zero `Product` rows today).
- [x] `tsc --noEmit` passes.
**Do not:** Wire `Product`/segments rendering, the `[category]/[brand]/[product]`
route, or the Products navbar in this task — see the follow-up task below.

## [x] Task: Category editor — mirror public typography, richer YouTube media, clearer Name/Title

**Context:** Three gaps in the `Category` page editor found while reviewing it
against the now-wired public pages (ADR-036). See ADR-037.
**Approach:** (1) `RichTextEditor` gained an optional `contentClassName` prop;
the category body editor passes `tiptap-content-category` so it mirrors the
public page's own h2/h3/p typography and spacing while writing, not the more
compact article-editor defaults. (2) `Category` gained `youtubeThumbnailUrl`/
`youtubeCaption`/`youtubeDescription` (all optional, migration
`20260730033926_category_youtube_media`); the admin form's bare YouTube URL
input became a bordered "Video" section (URL, thumbnail upload, caption,
description), and the public `MediaDevice` shows a click-to-play poster when a
thumbnail is set (unset falls back to the previous immediate-embed behavior)
plus the caption/description as an h3/p above it. (3) Added one-line helper
copy under "Name" and "Title" spelling out the URL/breadcrumb/nav-label vs.
page-heading distinction (ADR-033) directly in the form.
**Files to create or modify:**
- `prisma/schema.prisma`, `prisma/migrations/20260730033926_category_youtube_media/`
- `src/interfaces/general.ts` — `ICategory` gains the three fields
- `src/lib/categories.ts` — `getCategoryTree` row mapping
- `src/app/(admin)/admin/product-device/limits.ts` — caption/description length constants
- `src/app/(admin)/admin/product-device/actions.ts` — `uploadCategoryVideoThumbnail`,
  `categoryPageContentSchema`/`ICategoryPageContent`/`parseCategoryPageContent`
- `src/app/(admin)/admin/product-device/category-tree.tsx` — Video section,
  Name/Title helper text, `contentClassName` wiring
- `src/components/rich-text-editor.tsx` — `contentClassName` prop
- `src/app/(user)/components/catalogue/Media.tsx` — thumbnail/caption/description props, click-to-play
- `src/app/(user)/components/catalogue/CategoryPageView.tsx` — passes the three new fields through
- `DECISIONS.md` (ADR-037)
**Acceptance criteria:**
- [x] Typing in the category body editor renders with the same h2/h3/p
  sizing and spacing the public page uses, not the article editor's defaults.
- [x] The Video section accepts a URL, an optional custom thumbnail, an
  optional caption, and an optional description — all independently optional.
- [x] A category with only a YouTube URL (no thumbnail) still embeds and
  plays exactly as before (verified against `ALMA LASER`, unaffected by this
  change).
- [x] A category with a thumbnail set shows a poster + play button instead of
  an immediately-loaded iframe; clicking it swaps to the actual embed.
- [x] "Name" and "Title" each have a one-line explanation of what they're for
  and how they differ.
- [x] `tsc --noEmit` passes; verified against the dev DB and a running dev server.
**Do not:** Auto-derive a fallback thumbnail from the YouTube video ID — the
thumbnail is admin-provided only; skipping it keeps the previous embed
behavior instead of guessing at a poster.

## [x] Task: Wire `Product`/segments rendering to the public `/devices/...` detail page + SEO

**Context:** Split off from the task above (ADR-036). `Product.categoryId` can
point to a category at depth 1, 2, or 3 (`MAX_CATEGORY_DEPTH`), so a product's
URL is 2-4 segments deep depending on where it's filed — the routing choice
this task's predecessor deferred.
**Approach:** One catch-all `src/app/(user)/devices/[...slug]/page.tsx`
replaces the fixed `[category]/page.tsx`, `[category]/[brand]/page.tsx`, and
the fully-hardcoded `[category]/[brand]/[product]/page.tsx` — it resolves the
full slug path as a `Category` first (unchanged behavior from before), else
resolves all-but-last as the category and the last segment as a published
`Product`'s own slug under it. A new `ProductPageView` maps every non-hero
segment type onto its real public component; the hero's `heroDocs`/
`certifications` render through `HeroDevice`'s existing `children` slot.
**Files to create or modify:**
- `src/lib/categories.ts` — extracted `findCategoryInTree` so a caller
  checking two slug paths against the same tree fetches it once
- `src/lib/products.ts` — new `getPublishedProductBySlug(categoryId, slug)`
- `src/lib/devices-route.ts` — new: `resolveDevicesRoute(type, slugPath)`,
  shared category-vs-product resolver (takes `type` so it can serve a future
  `/products/...` catch-all with no rework)
- `src/app/(user)/devices/[...slug]/page.tsx` — new, replaces the 3 files below
- `src/app/(user)/components/catalogue/ProductPageView.tsx` — new
- `src/app/(user)/components/catalogue/GridFeature.tsx` — `columns`/
  `backgroundColor` props so the `treatments` segment's own fields actually
  drive it (previously hardcoded `bg-black`/`md:grid-cols-2`)
**Acceptance criteria:**
- [x] A published product's URL (at whatever depth it's filed) renders its
  own segments through the real catalogue components, in admin-chosen order.
- [x] Existing category URLs at every depth render unchanged.
- [x] A draft product's URL, or an unknown product/category slug, 404s.
- [x] `generateMetadata` reflects the product's own name/tagline/hero image.
- [x] A `showInNav` segment's nav link scrolls to its own section.
**Do not:** Wire the `/products/...` route tree or the Products navbar (see the
follow-up task below), or retrofit `DropdownDevice`'s hardcoded "Technology"
header / `DocumentDevice`'s fully hardcoded content — both render exactly as
they did before; a `techSpecs` segment's own header is ignored, and every
`document` segment currently shows identical placeholder content regardless of
the product.

## [x] Task: Products navbar + route tree

**Context:** Split off from the task above — deferred because it needed its
own pass, not because it was blocked on anything. Picked back up when the
admin asked for the navbar's Products dropdown to show real categories
instead of the static `deviceProductMenu` data (see ADR-042).
**Approach:** `resolveDevicesRoute` (`src/lib/devices-route.ts`) already took
a `type: "device" | "product"` param for exactly this — the `/products/...`
route tree is a near-identical copy of the `/devices/...` catch-all
(ADR-038) with `type: 'product'`, since `ProductPageView`/`CategoryPageView`/
`getPublishedProductCards` were already generic across type. Wiring the
navbar followed ADR-034's own Devices precedent, just applied to the
Products branch too.
**Files to create or modify:**
- `src/app/(user)/products/[...slug]/page.tsx` — new, mirrors the Devices
  catch-all
- `src/lib/categories.ts` — new `getPublicProductCategoryTree` (cached,
  mirrors `getPublicDeviceCategoryTree`)
- `src/lib/data.ts` — `buildNavMenus` now splices both live trees, each
  falling back to its own static branch independently
- `src/app/(user)/layout.tsx` — fetches both trees, passes both in
**Acceptance criteria:**
- [x] The navbar's Products dropdown shows live `Category` data, the same
  way Devices already did.
- [x] Clicking a real product category in the nav lands on a working page
  instead of a 404.
- [x] An empty/failed product category fetch falls back to the static
  branch without blanking the Devices branch (or vice versa).
**Do not:** Assume `/products/...` must mirror `/devices/...`'s exact catch-all
shape without checking whether `Product`-type categories have the same
variable-depth situation Device-type ones do. (They do — same `Category`
model, same `MAX_CATEGORY_DEPTH`.)

## [x] Task: `DropdownDevice`/`DocumentDevice` data-driven retrofits

**Context:** Split off from the Products navbar task above — unrelated to
routing/navigation, deferred because it needs its own pass.
**Approach:** Picked back up as part of a larger client batch (see the tasks
below). `DropdownDevice` gained a `header` prop, wired from `techSpecs`'s own
`header` field. `DocumentDevice` gained real props, but not the
`fileUrl`/`thumbnailUrl` shape originally envisioned here — the client's ask
changed the `document` segment's own shape in the same pass (see "Document
Highlight becomes a Product Files picker" below, ADR-051), so this task's
original "do not change segment shape" constraint is superseded.
**Files to create or modify:**
- `src/app/(user)/components/catalogue/Dropdown.tsx` — `header` prop
- `src/app/(user)/components/catalogue/Document.tsx` — real props
- `src/app/(user)/components/catalogue/ProductPageView.tsx` — wires both
**Acceptance criteria:**
- [x] `techSpecs`'s admin-entered header renders instead of a hardcoded
  "Technology".
- [x] `document` segments render their own heading/subheading/file/thumbnail
  instead of identical hardcoded placeholder content.
**Do not:** ~~Change `techSpecs`/`document` segments' own field shapes~~ —
superseded; see ADR-051.

## [x] Task: Product status button wording reverts to Save as Draft / Publish

**Context:** ADR-040 had deliberately renamed the editor's status wording
from Draft/Publish to Hidden/Public. The client has now asked for the
original wording back for the two save buttons, the Identity tab's status
dropdown, and the list table's status badge. See ADR-055.
**Approach:** Label-only change — `Product.status`'s stored values
(`"hidden" | "public"`) are unchanged; only the displayed text moved back to
Draft/Publish language across all four surfaces.
**Files to create or modify:**
- `src/app/(admin)/admin/product-device/product-form.tsx` — save buttons,
  Identity tab Status `<Select>`
- `src/app/(admin)/admin/product-device/item-table.tsx` — status badge and
  quick-change `<Select>`
- `DECISIONS.md` (ADR-055, supersedes ADR-040's wording)
**Acceptance criteria:**
- [x] The editor's two save buttons read "Save as Draft" and "Publish".
- [x] The Identity tab's Status dropdown and the list table's status badge
  both read "Draft"/"Publish" instead of "Hidden"/"Public".
- [x] `Product.status` values and every server action are unchanged.
**Do not:** Rename the stored `status` column values — this is UI text only.

## [x] Task: Document Highlight becomes a Product Files picker; thumbnail moves there; public rendering fixed

**Context:** The client asked to add a thumbnail upload to Product Files'
Downloadable Documents rows, and remove the thumbnail from the Document
Highlight segment. Confirmed with the client: the segment should instead
reference one of the product's own uploaded documents by picker, keeping
only its own heading/subheading text. Rendering was also broken — the public
`DocumentDevice` took zero props and always showed hardcoded Alma Harmony
content regardless of any product's actual `document` segment data. See
ADR-051 (supersedes ADR-031, ADR-032).
**Approach:** `IHeroDoc` gains `id`/optional `thumbnailUrl`; existing rows
without an id are backfilled once at form-open (`ensureHeroDocIds`).
`IDocumentSegment` drops `fileUrl`/`thumbnailUrl`, gains `documentId`. The
admin picker (`segments-builder.tsx`) matches by id instead of href, warning
if the reference no longer resolves. `DocumentDevice` takes real props;
`ProductPageView.tsx` resolves the referenced document from `heroDocs` and
renders nothing if it's missing or thumbnail-less.
**Files to create or modify:**
- `src/interfaces/segments.ts` — `IHeroDoc`, `IDocumentSegment`
- `src/app/(admin)/admin/product-device/product-files-editor.tsx` — document
  row thumbnail upload, id generation
- `src/app/(admin)/admin/product-device/segment-types.ts` — `document`
  fields (`documentId` replaces `fileUrl`/`thumbnailUrl`)
- `src/app/(admin)/admin/product-device/segments-builder.tsx` — id-based
  picker special case, dead grid-split removal
- `src/app/(admin)/admin/product-device/product-form.tsx` — `ensureHeroDocIds`
- `src/app/(user)/components/catalogue/Document.tsx` — real props
- `src/app/(user)/components/catalogue/ProductPageView.tsx` — `documentId`
  resolution
- `DECISIONS.md` (ADR-051, refined by ADR-056)
**Acceptance criteria:**
- [x] Downloadable Documents rows have a thumbnail upload alongside the
  existing title/file.
- [x] Document Highlight has no file/thumbnail fields of its own — it picks
  one existing document by name, plus its own Header/Subheader.
- [x] The document picker is the first field; picking a document always
  replaces Header with that document's own name (ADR-056).
- [x] Picking a since-removed document shows a visible warning in the admin,
  not a silent broken reference.
- [x] The public page renders that document's real heading/subheading/file/
  thumbnail, not hardcoded placeholder content.
- [x] `tsc --noEmit` passes.
**Do not:** Move `heroDocs`/`certifications` off the hero segment's record —
unchanged from ADR-026.

## [x] Task: List segment's item text field becomes a textarea

**Context:** The client asked for the List segment's per-item text input to
support multiple lines.
**Approach:** `treatments`' item field `name` changed from `type: "text"` to
`type: "textarea"` — `ListField`'s existing table-layout logic already moves
any textarea-typed item field to its own full-width line automatically, no
`segments-builder.tsx` change needed. Added `whitespace-pre-line` to the
public render so typed line breaks actually show.
**Files to create or modify:**
- `src/app/(admin)/admin/product-device/segment-types.ts`
- `src/app/(user)/components/catalogue/GridFeature.tsx`
**Acceptance criteria:**
- [x] The List segment's item name field is a multi-line textarea in the
  admin editor.
- [x] Line breaks typed there render as separate lines on the public page.
**Do not:** Change any other segment's item fields — scoped to `treatments`
only.

## [x] Task: Rich text editor — left/center/right image alignment

**Context:** The client asked for inserted images in the rich text editor to
be positionable left/center/right. The existing `TextAlign` extension is
scoped to `heading`/`paragraph` and sets `text-align`, which has no effect on
a block-level `<img>`'s own position.
**Approach:** New `AlignableImage` (extends Tiptap's base `Image`, adds an
`align` attribute rendered as `data-align` on the `<img>`) swapped in for the
plain `Image` extension. Three new toolbar buttons, enabled only when an
image node is selected, call `updateAttributes("image", { align })`. CSS
rules key off `[data-align=...]` (a plain HTML attribute, not a Tailwind
class) since this same HTML renders on the public site via
`dangerouslySetInnerHTML` — float-based for left/right (so paragraph text
wraps around the image), `margin: auto` for center, plus `clear: both` on
headings/lists/blockquotes and a container clearfix so a floated image
doesn't visually bleed into following content.
**Files to create or modify:**
- `src/components/tiptap-image-align.ts` — new
- `src/components/rich-text-editor.tsx` — swaps extension, adds toolbar
  buttons
- `src/app/globals.css` — `.tiptap-content img[data-align=...]` rules
**Acceptance criteria:**
- [x] Selecting an inserted image and clicking align left/center/right
  moves it accordingly, both in the editor and on the public render of the
  same HTML.
- [x] Paragraph text wraps around a left/right-aligned image; headings/
  lists/blockquotes after it start a fresh full-width line instead of being
  squeezed into the remaining space.
- [x] `tsc --noEmit` passes.
**Do not:** Use a Tailwind utility class for alignment — this HTML is stored
and rendered outside the admin bundle, where Tailwind can't see the class to
compile it.

## [x] Task: New "Video" segment for Products (YouTube)

**Context:** The client asked for a YouTube video segment on device/product
pages, using the same admin layout/inputs as the Category page's existing
YouTube video section. See ADR-052.
**Approach:** New `type: "video"` `SEGMENT_TYPES` entry (url, optional
thumbnail, caption, description) — fully data-driven, no special-case render
needed. Public render reuses `VideoTextSection`/`getYoutubeVideoId()`
directly, the same components the Category page's own video section
already renders through, rather than duplicating that logic.
**Files to create or modify:**
- `src/interfaces/segments.ts` — `IVideoSegment`
- `src/app/(admin)/admin/product-device/segment-types.ts` — new entry
- `src/app/(user)/components/catalogue/ProductPageView.tsx` — `case 'video'`
- `DECISIONS.md` (ADR-052)
**Acceptance criteria:**
- [x] "Video" appears in the "Add a segment" menu and can be added/edited/
  reordered/removed like any other segment.
- [x] A valid YouTube URL renders the same click-to-play embed the Category
  page's video section uses; an unparseable URL renders nothing rather than
  a broken embed.
- [x] `tsc --noEmit` passes.
**Do not:** Duplicate `VideoTextSection`'s click-to-play/poster logic in a
new component — reuse it directly.

## [x] Task: LKPP added as a fifth, link-only certification style

**Context:** The client asked for "LKPP" added to the certification options,
specifying its input is a link — unlike every existing style (Halal,
Kemenkes, BPOM, Other), which all require an uploaded certificate file. See
ADR-053.
**Approach:** `ILkppCertification` (no `imageUrl`, no `fileUrl` — just
`linkUrl`) added to the `ICertification` union. The admin row rendering and
`CertificationBadge` on the public page both branch on `certType === "lkpp"`
to use a link input/href instead of a file upload/`fileUrl`.
**Files to create or modify:**
- `src/interfaces/segments.ts` — `ILkppCertification`
- `src/app/(admin)/admin/product-device/product-files-editor.tsx`
- `src/app/(user)/components/catalogue/ProductPageView.tsx`
- `DECISIONS.md` (ADR-053)
**Acceptance criteria:**
- [x] "LKPP" appears in the "Add certification" menu.
- [x] An LKPP row has a link input and no file upload; other styles are
  unchanged.
- [x] The public certification badge links to the LKPP entry's URL, with no
  logo (same as "Other").
- [x] `tsc --noEmit` passes.
**Do not:** Add a file upload to LKPP — the client specified a link only.

## [x] Task: Accordion header bug — stuck on "Technology"

**Context:** The Accordion (`techSpecs`) segment has always carried its own
required `header` field, but the public `DropdownDevice` component hardcoded
the literal text "Technology" and had no prop to receive it.
**Approach:** `DropdownDevice` gained an optional `header` prop (falls back
to "Technology" if omitted); `ProductPageView.tsx` passes the segment's own
`header` through.
**Files to create or modify:**
- `src/app/(user)/components/catalogue/Dropdown.tsx`
- `src/app/(user)/components/catalogue/ProductPageView.tsx`
**Acceptance criteria:**
- [x] An Accordion segment's admin-entered header renders on the public
  page instead of the literal text "Technology".
**Do not:** Change `techSpecs`'s own field shape — this was a rendering-side
fix only.

## [x] Task: Highlight ("Text & Image") segment — image fit vs. fill

**Context:** The client asked for an option to have the Highlight segment's
image either fit (show the whole image, letterboxed) or fill (crop to fill,
the original behavior) its box, with rounded corners removed when "fit" is
chosen.
**Approach:** New `imageFit: 'fill' | 'fit'` select field, defaulting to
`'fill'` so existing products render unchanged, rendered inline next to the
existing `imagePlacement` control. Public `HighlightDevice` switches
`object-cover`/rounded-corner classes to `object-contain` with no rounding
at all when `'fit'` is chosen. The fixed `aspect-*` box itself is unchanged
in both modes — only `object-fit` and rounding change.
**Files to create or modify:**
- `src/interfaces/segments.ts` — `IHighlightSegment.imageFit`
- `src/app/(admin)/admin/product-device/segment-types.ts` — new field
- `src/app/(admin)/admin/product-device/segments-builder.tsx` — inline
  render next to placement
- `src/app/(user)/components/catalogue/Highlight.tsx`,
  `src/app/(user)/components/catalogue/ProductPageView.tsx`
**Acceptance criteria:**
- [x] A Highlight segment can be set to "Fill" (crop, original look) or
  "Fit" (whole image, no cropping).
- [x] Choosing "Fit" removes the image's rounded corners entirely.
- [x] Existing Highlight segments (predating this field) render exactly as
  before.
**Assumption:** "Fit" keeps the existing fixed aspect-ratio box and only
changes `object-fit`/rounding, rather than relaxing the box to the image's
own natural aspect ratio — flag if the client meant the latter.

## [x] Task: 360° viewer image size limit raised to 500KB

**Context:** The client asked for the 360° viewer's per-frame upload limit
to change from 100KB to 500KB.
**Approach:** Two-constant change — both the upload validation and the
admin's own helper text already read from the same two constants, no other
call sites existed.
**Files to create or modify:**
- `src/app/(admin)/admin/product-device/limits.ts`
**Acceptance criteria:**
- [x] A 360° frame between 100KB and 500KB, previously rejected, now
  uploads successfully.
- [x] The admin's own "up to Xkb each" helper text reflects the new limit.
**Do not:** Change `MAX_VIEWER360_FRAMES` (the frame-count limit) — only the
per-frame size limit was in scope.

## [x] Task: Accordion (Tech Specs) background color picker; peach added to the shared palette

**Context:** The client asked for a background color option on the
Accordion segment, which has always rendered a hardcoded
`bg-brand-peach/30`. See ADR-054.
**Approach:** Added a `peach` entry to the existing `SEGMENT_BACKGROUND_COLORS`
palette (previously used only by the List segment) and gave `techSpecs` a
`backgroundColor` field defaulting to `"peach"` specifically (not the
palette's own black default) so existing Accordions render unchanged. The
admin's `ColorSwatchInput` also falls back to the field's own default rather
than the palette's generic one, so an Accordion predating this field shows
"Peach" selected, matching what actually renders publicly.
**Files to create or modify:**
- `src/lib/segment-colors.ts` — `peach` entry
- `src/interfaces/segments.ts` — `ITechSpecsSegment.backgroundColor`
- `src/app/(admin)/admin/product-device/segment-types.ts` — new field
- `src/app/(admin)/admin/product-device/segments-builder.tsx` — colorSwatch
  fallback fix
- `src/app/(user)/components/catalogue/Dropdown.tsx`,
  `src/app/(user)/components/catalogue/ProductPageView.tsx`
- `DECISIONS.md` (ADR-054)
**Acceptance criteria:**
- [x] The Accordion segment has a background color picker, including a
  Peach swatch matching its original look.
- [x] An Accordion segment predating this field renders, and shows as
  selected in the editor, as Peach — not the palette's black default.
- [x] `tsc --noEmit` passes.
**Do not:** Change the individual accordion rows' `bg-white` — only the
outer section background and its header text color are affected.

## [x] Task: Reusable, type-scoped tags on Device/Product Identity

**Context:** The admin wants devices/products taggable (e.g. "Dermatology",
"Skin Restoration") for filtering, with tags created once and reused across
items — not a standalone Tags management page, and explicitly not shared
between the Devices and Products catalogs (see ADR-041).
**Approach:** New `Tag` model, many-to-many with `Product`, scoped by
`type` (`@@unique([type, name])`) the same way `Category` already is. A
custom `TagPicker` combobox (Popover + search Input + scrollable list +
inline "Add ..." create) lives directly on the Identity tab — no new admin
page. `createTag` does a case-insensitive, type-scoped lookup before
creating, so re-typing an existing name (in any casing) reuses it instead of
making a near-duplicate.
**Files to create or modify:**
- `prisma/schema.prisma` — new `Tag` model, `Product.tags` relation
- `prisma/migrations/20260731130000_add_tag/` — new
- `src/interfaces/general.ts` — new `ITag`, `IProduct.tags`
- `src/lib/tags.ts` — new, `getTags(type)`
- `src/lib/products.ts` — `getProductById`/`getPublishedProductBySlug` now
  include and map `tags`
- `src/app/(admin)/admin/product-device/tag-actions.ts` — new, `createTag`
- `src/app/(admin)/admin/product-device/tag-picker.tsx` — new
- `src/app/(admin)/admin/product-device/product-form.tsx` — `tags` prop,
  picker on the Identity tab, `tagIds` in the submitted `FormData`
- `src/app/(admin)/admin/product-device/product-actions.ts` —
  `resolveTagIds` (re-validated against the DB, type-scoped) wired into
  `createProduct`/`updateProduct`
- `src/app/(admin)/admin/product-device/items/editor/page.tsx` — fetches
  and passes `tags`
**Acceptance criteria:**
- [x] Tags can be searched, picked, and created inline from a scrollable
  dropdown on the Identity tab, with no separate Tags page.
- [x] Typing an existing tag's name (any casing) selects the existing tag
  instead of creating a duplicate.
- [x] A tag created while editing a Device never appears, or can be
  attached, while editing a Product — and vice versa.
- [x] Saving persists exactly the selected set of tags (additions and
  removals both reflected).
**Do not:** Build a public-facing tag filter UI or a standalone tag
management page — out of scope for this pass; see the follow-up task below.

## [ ] Task: Public catalogue filtering by tag

**Context:** Follow-up to the task above — tags exist and can be assigned,
but nothing on the public `/devices`/`/products` catalogue pages lets a
visitor filter by them yet.
**Approach:** Not yet designed.
**Files to create or modify:** TBD.
**Acceptance criteria:**
- [ ] TBD once approach is decided.
**Do not:** Assume the filter UI/query shape without checking how the
existing catalogue grid (`GridFeature.tsx`/`DeviceList.tsx`) paginates or
loads today.

## [x] Task: Surface "hidden from navbar" state in the category admin tree

**Context:** ADR-043 made `mapCategoriesToNavMenu` drop any category branch
with no page anywhere in it from the live navbar. `category-tree.tsx` had no
way to tell an admin that a branch they're looking at is currently invisible
in the live nav for exactly that reason. Per-row badge chosen over a
top-of-page summary banner — shows the state at the exact node it applies to,
where the admin is already looking, rather than a list that gets harder to
read as the tree grows. Applies to both Devices and Products — one shared
`CategoryTree` component serves both.
**Approach:** `hasPageInBranch` moved out of `src/lib/categories.ts` (which
imports `prisma`/`next/cache`, both server-only) into a new dependency-free
`src/lib/category-visibility.ts`, so the exact same check backs both the
public nav's filtering and this Client Component's badge instead of two
implementations that could drift apart.
**Files to create or modify:**
- `src/lib/category-visibility.ts` — new, `hasPageInBranch`
- `src/lib/categories.ts` — imports it instead of defining its own copy
- `src/components/ui/tooltip.tsx` — new shadcn-style wrapper (`radix-ui`'s
  `Tooltip`, already a dependency) with a short 150ms `delayDuration` — a
  native `title` attribute's hover delay read as too slow
- `src/app/(admin)/admin/product-device/category-tree.tsx` — an `EyeOff`
  icon next to a node's name when `!hasPageInBranch(node)`, wrapped in that
  `Tooltip` explaining why on hover
**Acceptance criteria:**
- [x] A category branch with no page anywhere in it shows an `EyeOff`
  indicator in the admin tree (for both Devices and Products) that reveals
  why on hover.
- [x] A node that's a page itself, or has a page anywhere beneath it, never
  shows the badge.
**Do not:** Duplicate `hasPageInBranch`'s logic by hand — both call sites
import the same function from `src/lib/category-visibility.ts`.

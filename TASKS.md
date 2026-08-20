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
- `DECISIONS.md` (ADR-051, refined by ADR-056, ADR-057)
**Acceptance criteria:**
- [x] Downloadable Documents rows have a thumbnail upload alongside the
  existing title/file.
- [x] Document Highlight has no file/thumbnail fields of its own — it picks
  one existing document by name, plus its own Header/Subheader.
- [x] The document picker is the first field; picking a document always
  replaces Header with that document's own name (ADR-056).
- [x] Picking a since-removed document shows a visible warning in the admin,
  not a silent broken reference.
- [x] The public page renders that document's real header/subheader/file,
  not hardcoded placeholder content. A thumbnail-less document still
  renders — a small outline "Click to Download" pill button in place of
  the large image card — rather than the segment being dropped (ADR-057).
- [x] The public layout is a fixed three lines: "Download Document", then
  Header, then Subheader (ADR-057).
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

## [x] Task: Fix stale navbar after category edits (on-demand cache invalidation)

**Context:** Reported bug: category changes didn't reliably show up in the
public navbar, even after a hard browser refresh. Root cause: the navbar's
category tree reads (`getPublicDeviceCategoryTree`/
`getPublicProductCategoryTree`) were cached server-side on a 5-minute
time-based window only — invisible to a browser refresh, since the
staleness lives in Next.js's server Data Cache, not the browser. Category
mutations never invalidated this cache on write. See ADR-058.
**Approach:** Tagged both cached reads (`tags: ["device-nav-categories"]` /
`["product-nav-categories"]`); the category mutation actions now call
`updateTag(...)` for the mutated type immediately after writing, giving
instant on-demand invalidation. The time-based fallback stays as a safety
net, raised from 5 minutes to 1 hour since it's no longer the primary
mechanism.
**Files to create or modify:**
- `src/lib/categories.ts` — `tags` option on both `unstable_cache` calls
- `src/app/(admin)/admin/product-device/actions.ts` — `revalidateCategoryPages`
  calls `updateTag`
- `DECISIONS.md` (ADR-058)
**Acceptance criteria:**
- [x] Creating, editing, deleting, or reordering a category is reflected in
  the public navbar on the very next request — no stale window, no browser
  refresh needed.
**Do not:** Change `getCategoryTree`/`getCategoryBySlugPath` (uncached,
used by admin pages and public category/product detail routes) — this fix
is scoped to the two navbar-specific cached reads.

## [x] Task: Rich Text segment's h2/h3/p match the Text & Image segment's sizes

**Context:** The client asked for the product page's Rich Text segment to
use the same font sizes as the Text & Image (Highlight) segment's header/
text, instead of the page-hero scale it inherited from
`.tiptap-content-category` (shared with the Category page's body field).
**Approach:** New `.tiptap-content-product` CSS class — h2/h3/p sized to
match Highlight's own `h2-md-format xl:text-3xl!`/`p-format` classes (h3 has
no Highlight equivalent, so `h3-sm-format` is reused since `Dropdown.tsx`
already pairs it with `h2-md-format` elsewhere). A flat `-compact` variant
was added to match, mirroring the existing category/category-compact
pattern, and wired into the admin's Rich Text field preview
(`segments-builder.tsx`) so what's typed there keeps previewing close to
the real render.
**Files to create or modify:**
- `src/app/globals.css` — `.tiptap-content-product`,
  `.tiptap-content-product-compact`
- `src/app/(user)/components/catalogue/ProductPageView.tsx` — `richText`
  case uses the new class
- `src/app/(admin)/admin/product-device/segments-builder.tsx` — Rich Text
  field's `contentClassName`
**Acceptance criteria:**
- [x] A Rich Text segment's h2/h3/p render at the same size as the Text &
  Image segment's header/text on the public product page.
- [x] The admin's Rich Text field preview reflects the same scale.
**Do not:** Change `.tiptap-content-category`/`-compact` — the Category
page's body field is unaffected; this is a separate, product-page-only
class.

## [x] Task: Thicker bold weight for rich text paragraphs (product + category pages)

**Context:** The client asked for bold text inside rich text paragraphs to
be visually thicker on both the product page (`.tiptap-content-product`)
and the category page (`.tiptap-content-category`). Root cause of the
existing weak look: both paragraph classes are `font-light` (300), and the
browser's default `<strong>`/`<b>` weight is the relative keyword `bolder`,
which the CSS spec resolves from an inherited 300 down to 400 (normal) —
not 700 — so bold text barely stood out from the surrounding light text.
**Approach:** Explicit `font-weight: 800` on `strong`/`b` inside both
paragraph classes, overriding the browser's relative `bolder` resolution
with a fixed heavier weight.
**Files to create or modify:**
- `src/app/globals.css`
**Acceptance criteria:**
- [x] Bold text inside a Rich Text segment's paragraph (product page) and a
  Category page body paragraph both render at a clearly heavier weight than
  the surrounding text.
**Do not:** Change bold weight inside headings (h2/h3) — those aren't
`font-light`, so their `<strong>`/`<b>` already resolves to a proper bold
via the browser default; only paragraph text had the weak-bold bug.

## [x] Task: Catalogue card thumbnail fills the card's full height, no cropping

**Context:** `DeviceCard`'s image slot had no fixed size — it rendered at
`w-full h-auto`, so its actual height was whatever the source thumbnail's
own aspect ratio produced. Cards with a wide thumbnail and cards with a
tall one ended up visibly different shapes in the same grid. A first pass
fixed this with a hardcoded `aspect-square` box, but the client wants the
image to fill the card's actual height instead of being boxed into a fixed
square.
**Approach:** The image container has no explicit height utility on sm+ —
it fills the card's height via the root flex row's default
`align-items: stretch` (a flex item's stretched cross-size is a real,
definite height the `fill`-positioned `<Image>` can size against). Plain
`h-full` (height: 100%) was tried first and doesn't work here: the row's own
height is content-driven (auto), and a percentage height can't resolve
against an indefinite ancestor height, so the box silently collapsed to
zero height — the reported bug ("thumbnail doesn't show any image"). On
mobile (`max-sm:flex-col`), stretch only affects width, not height, so
`max-sm:h-48` gives the box an explicit height there instead. `<Image>` uses
`fill` + `object-contain object-bottom` — `object-contain` scales the image
down to fit without cropping (never `object-cover`), and `object-bottom`
anchors an image shorter than the box to the bottom edge (every device
photo "stands" on the same ground line) instead of floating centered with
empty space above and below.
**Files to create or modify:**
- `src/app/(user)/components/catalogue/DeviceCard.tsx`
**Acceptance criteria:**
- [x] A card's thumbnail fills the card's actual height (matching the text
  column), not a fixed square independent of the card's real size.
- [x] A thumbnail is never cropped — it scales down to fit, letterboxed if
  its own proportions don't match the box.
- [x] A thumbnail shorter than the box sits flush against the bottom edge
  instead of floating centered with a gap above and below.
- [x] The no-image (`ImageOff`) fallback fills the same box.
- [x] The mobile (stacked) layout still shows a visible thumbnail — not
  zero-height — since flex stretch doesn't apply to height in a column
  layout.
**Do not:** Crop thumbnails to fill the box (`object-cover`) — the ask was
for the whole image visible, scaled to fit, not a cropped fill.

## [x] Task: Category page's body/video section renders independently, never empty

**Context:** `CategoryPageView.tsx`'s rich-text-body-and-video section was
gated entirely on `category.body` — a category with a YouTube video but no
rich text body never showed its video at all, and (per the client's own
framing of the fix) the surrounding gradient container needed to stay tied
to "is there anything to show," not just to the body field alone.
**Approach:** The outer gradient container is now gated on `category.body
|| videoId` instead of `category.body` alone; the rich text `div` render is
now its own `category.body &&` check nested inside, and the video render is
no longer nested under the body check at all. Follow-up fix: a Tiptap editor
left untouched still serializes to `<p></p>`, not `""` — a raw truthiness
check on `category.body` counted that as "has content" and still rendered a
visibly empty gradient box. New `hasRichTextContent()` (`src/lib/utils.ts`)
strips tags and checks for real text or an `<img>` tag; `CategoryPageView`
computes `bodyHtml` once (`category.body` only if it passes this check, else
`null`) and uses that everywhere instead of the raw field.
**Files to create or modify:**
- `src/app/(user)/components/catalogue/CategoryPageView.tsx`
- `src/lib/utils.ts` — new `hasRichTextContent()`
**Acceptance criteria:**
- [x] A category with a video but no rich text body still shows the video.
- [x] A category with neither a body nor a video renders no gradient
  container at all.
- [x] A category whose body is only an empty Tiptap paragraph (`<p></p>`,
  no real text or image) and has no video also renders no gradient
  container — not treated as "has content" just because the field is a
  non-empty string.
- [x] A category with both a real body and a video still renders exactly as
  before.
**Do not:** Change the Hero or the sub-category/product grid below this
section — scoped to the body/video block only.

## [x] Task: Text & Image segment keeps line breaks on the public page

**Context:** The Highlight segment's Text field is already a multi-line
textarea in the admin, but line breaks typed there collapsed into one flat
line on the public product page — plain HTML/CSS ignores newlines in text
content unless told otherwise.
**Approach:** Added `whitespace-pre-line` to the paragraph, the same fix
already applied to the Accordion (`Dropdown.tsx`) and List (`GridFeature.tsx`)
segments for the identical issue.
**Files to create or modify:**
- `src/app/(user)/components/catalogue/Highlight.tsx`
**Acceptance criteria:**
- [x] A line break typed in the Highlight segment's Text field renders as a
  line break on the public product page.
**Do not:** Change the admin field itself — it was already a textarea; this
was a public-render-only fix.

## [x] Task: Product hero title/description capped to 2/3 viewport width at xl+

**Context:** The client asked for the product page hero's title and
description to stop stretching full-width on large screens — at xl+ the
banner is wide enough that a full-width line reads uncomfortably long.
**Approach:** Added `xl:max-w-[66.6667vw]` to both the `<h1>` and `<p>`,
scoped to `variant === 'product'` only (`Hero.tsx` is shared with the
Category hero, which is already centered/narrower and wasn't part of the
ask).
**Files to create or modify:**
- `src/app/(user)/components/catalogue/Hero.tsx`
**Acceptance criteria:**
- [x] At xl and above, the product hero's title and description are capped
  to 2/3 of the viewport width.
- [x] Below xl, and the Category hero at any size, are unaffected.
**Do not:** Apply this to the Category hero variant.

## [x] Task: List segment — 1-column layout centers as a block, items stay left-aligned

**Context:** With Columns set to 1, `GridListDevice`'s grid was forced
`md:w-full` regardless of column count, so it always spanned the full
section width with items left-justified inside it — the block itself never
centered, it just filled the row edge-to-edge. The client wants the block
of items centered within the section when there's only 1 column, without
center-aligning each item's own text.
**Approach:** The grid's width is now conditional on `columns` — `2`
keeps the existing `w-fit md:w-full md:grid-cols-2` (needs the full width
for the 2-up layout); `1` stays `w-fit` at every breakpoint, so the existing
`mx-auto` actually centers the (now content-sized) block. Each item's `<p>`
was already `text-left!` and is untouched.
**Files to create or modify:**
- `src/app/(user)/components/catalogue/GridFeature.tsx`
**Acceptance criteria:**
- [x] With Columns = 1, the list block is horizontally centered within the
  section instead of stretching full-width.
- [x] Each item's text stays left-aligned, not centered.
- [x] Columns = 2 is unaffected.
**Do not:** Change item text alignment to `text-center` — only the block as
a whole centers.

## [x] Task: New card layout for "Browse Categories" sub-category grid

**Context:** The client asked for sub-category cards (the "Browse
Categories" grid, `CategoryPageView.tsx`, shown when a category has
children) to look different from product/device cards: a full-bleed
background photo (the sub-category's own largest hero banner) darkened, with
a centered title, description, and CTA button on top — instead of
`DeviceCard`'s side-by-side image+text layout.
**Approach:** New `CategoryCard` component (separate from `DeviceCard`,
which stays exactly as-is — it's also the live preview in the admin product
thumbnail editor, unrelated to this ask). `DeviceFilterList` gained a
`cardVariant?: 'product' | 'category'` prop choosing which card component to
render per item; `CategoryPageView.tsx` passes `'category'` only for the
sub-category grid (`hasChildren`), `'product'` (the existing default) for
the leaf-node product grid.
**Files to create or modify:**
- `src/app/(user)/components/catalogue/CategoryCard.tsx` — new
- `src/app/(user)/components/catalogue/DeviceList.tsx` — `cardVariant` prop
- `src/app/(user)/components/catalogue/CategoryPageView.tsx` — passes it
**Acceptance criteria:**
- [x] The "Browse Categories" grid renders each sub-category as a full-bleed
  banner card with a dark overlay and centered title/description/CTA.
- [x] The product/device grid (leaf-node categories) is unaffected —
  unchanged `DeviceCard` layout.
- [x] The admin product thumbnail editor's live preview (`DeviceCard`) is
  unaffected.
- [x] A sub-category with no banner image still renders a legible card
  (solid dark background instead of a transparent/blank box).
**Do not:** Change `DeviceCard` itself — it's shared with the admin editor
preview; this is a new, separate component.

## [x] Task: Document Highlight can feature a Certification, not just a Document

**Context:** The client asked for the Document Highlight segment to
optionally showcase a certification (from Product Files' Certifications
list) instead of a downloadable document, with its own layout: "View
Certification" instead of "Download Document", the certification's own
logo/name/number, then the segment's Header/Subheader. See ADR-059
(extends ADR-051/ADR-056).
**Approach:** `ICertification` variants gain `id` (backfilled via the
renamed `ensureHeroFileIds`). `IDocumentSegment` drops `documentId` for a
composite `referenceKind`/`referenceId` pair, so the generic required-field
check stays correct with no special-casing. The admin picker is now one
grouped `<Select>` (Documents / Certifications). Three certType-branching
helpers were extracted to `certification-logos.ts` and reused by both the
hero's `CertificationBadge` and the certification-mode renderer.
`ProductPageView.tsx`'s `document` case branches on `referenceKind`. The
certification-mode layout itself went through a same-day correction — see
the follow-up task below (ADR-061): it's not a separate component, it's
`DocumentDevice` itself with one added prop.
**Files to create or modify:**
- `src/interfaces/segments.ts` — `ICertification.id`,
  `IDocumentSegment.referenceKind`/`referenceId`
- `src/lib/certification-logos.ts` — `getCertificationLogo`/
  `getCertificationSubLabel`/`getCertificationHref`
- `src/app/(admin)/admin/product-device/product-files-editor.tsx` —
  `createCertification` generates an id
- `src/app/(admin)/admin/product-device/product-form.tsx` —
  `ensureHeroFileIds` (renamed, backfills both lists)
- `src/app/(admin)/admin/product-device/segment-types.ts` — `referenceId`
  field
- `src/app/(admin)/admin/product-device/segments-builder.tsx` — grouped
  picker, `heroCertifications` threading
- `src/app/(user)/components/catalogue/Document.tsx` — certification
  rendering (see follow-up task for the final shape)
- `src/app/(user)/components/catalogue/ProductPageView.tsx` — `document`
  case branches on `referenceKind`; `CertificationBadge` refactored to use
  the shared helpers
- `DECISIONS.md` (ADR-059, ADR-061)
**Acceptance criteria:**
- [x] The Document Highlight picker lists both Documents and Certifications
  in one grouped dropdown.
- [x] Picking a certification still replaces Header with its name, same as
  picking a document does.
- [x] A certification since removed from Product Files shows the same
  "removed, choose another" warning documents already had.
- [x] Existing Document Highlight segments (referencing a document) are
  unaffected.

## [x] Task: Document Highlight certification layout matches document layout

**Context:** Follow-up correction to the task above. The first pass
rendered certification mode as a separate, single-column component — the
client clarified the layout should be identical to the plain document mode
(same side-by-side text/visual split), with only a larger version of the
hero's logo+name+number certification badge added into the text block,
immediately before the header. See ADR-061 (corrects ADR-059's layout).
**Approach:** Deleted `CertificationHighlightDevice`. `DocumentDevice`
(`Document.tsx`) gained one optional prop, `certification?: { logo?: string;
name: string; number?: string }` — when set, the top label reads "View
Certification" instead of "Download Document", and the logo/name/number
block renders inside the same `<h2>`, before the header. The visual/CTA
side is untouched (certifications have no thumbnail, so it always falls
through to the existing outline button, pointed at the certification's own
`fileUrl`/`linkUrl` via `getCertificationHref`).
**Files to create or modify:**
- `src/app/(user)/components/catalogue/Document.tsx` — `certification` prop
  on `DocumentDevice`, `CertificationHighlightDevice` removed
- `src/app/(user)/components/catalogue/ProductPageView.tsx` — certification
  branch now calls `DocumentDevice`, not a separate component
- `DECISIONS.md` (ADR-061)
**Acceptance criteria:**
- [x] Certification mode uses the exact same side-by-side section structure
  as document mode — not a different single-column layout.
- [x] The only visible additions for certification mode are the "View
  Certification" label and a larger logo+name+number block before the
  header; everything else (header, subheader, visual/CTA side) is
  identical to document mode.
- [x] The visual/CTA side links to the certification's own file/link.
**Do not:** Reintroduce a separate component for certification mode — it's
`DocumentDevice` with one added prop.

## [x] Task: Certification logo/name/number moved inside the download button

**Context:** Follow-up correction to the task above. The client wants the
logo/name/number moved out of the header text block and into the button
itself, replacing "Click to Download" — keeping the download icon. See
ADR-062 (refines ADR-061).
**Approach:** `DocumentDevice`'s `<h2>` reverts to just label + header +
subheader. The no-thumbnail button branch now renders the logo/name/number
stack in place of "Click to Download" when `certification` is set, with the
download icon unconditionally following either. A plain document with no
thumbnail is unaffected — still "Click to Download" + icon.
**Files to create or modify:**
- `src/app/(user)/components/catalogue/Document.tsx`
- `DECISIONS.md` (ADR-062)
**Acceptance criteria:**
- [x] The certification's logo, name, and number (when applicable) render
  inside the button, not in the header text block.
- [x] The download icon stays; "Click to Download" text does not appear
  for certification mode.
- [x] A plain document with no thumbnail still shows "Click to Download" +
  icon, unchanged.
**Do not:** Change the thumbnail-image button branch — certifications never
reach it.

## [x] Task: Certification info back to the text block; Header/Subheader not applicable

**Context:** Second correction in the same session: the logo/name/number
moves back out of the button, under "View Certification" — and Header/
Subheader don't apply to certification mode at all; they shouldn't render.
See ADR-063 (corrects ADR-062).
**Approach:** Button reverts fully to plain "Click to Download" + icon, no
certification branching. In the `<h2>` text block, certification mode and
document mode are now mutually exclusive: document mode shows header/
subheader (as before); certification mode shows the logo/name/number under
"View Certification" instead — never both together.
**Files to create or modify:**
- `src/app/(user)/components/catalogue/Document.tsx`
- `DECISIONS.md` (ADR-063)
**Acceptance criteria:**
- [x] Certification mode shows "View Certification", then logo/name/number
  — no Header or Subheader text anywhere in the section.
- [x] Document mode is fully unchanged: header/subheader in the text block,
  "Click to Download" + icon in the button.
**Do not:** Add conditional-required validation for Header/Subheader based
on `referenceKind` — they stay stored and server-required regardless; this
is a display-only change.

## [x] Task: LKPP gets a real logo

**Context:** ADR-053 gave LKPP no logo since none was available. The client
pointed to existing assets already used by the homepage's Credibility
section: `public/image/home/certificate/lkkp.png`/`lkkp-black.png` (note:
`lkkp`, not `lkpp` — a pre-existing filename typo already relied on
elsewhere, not introduced here). See ADR-060.
**Approach:** Added an `lkpp` entry to `CERTIFICATION_LOGOS`
(`certification-logos.ts`) pointing at those two files, and dropped `lkpp`
from `getCertificationLogo`'s no-logo exclusion (only `other` remains
logo-less). No `ILkppCertification` shape change — the logo resolves by
`certType` at render time like every other style.
**Files to create or modify:**
- `src/lib/certification-logos.ts`
- `DECISIONS.md` (ADR-060, supersedes ADR-053's "no logo" note for LKPP)
**Acceptance criteria:**
- [x] LKPP shows its logo in the hero's certification badge and in the
  Document Highlight segment's certification layout (ADR-059), same as
  every other fixed-logo style.
**Do not:** Rename the `lkkp*` asset files — `Credibility.tsx` (homepage)
already depends on that exact spelling.

## [x] Task: Admin Header/Subheader auto-fill and disable for certification mode

**Context:** Follow-up to ADR-063 (Header/Subheader not applicable to
certification mode on the public page): the admin form still showed both
as freely editable inputs with no indication they're unused. The client
asked for them to auto-fill and lock once a certification is picked. See
ADR-064.
**Approach:** The reference picker's `onValueChange` (`segments-builder.tsx`)
now also sets `subheader` from the picked certification's number
(`getCertificationSubLabel`, empty for styles with none) alongside the
existing `header`-from-`label` autofill. `renderField`'s default branch
gained an `isDisabledCertField` check (document type, `header`/`subheader`
keys, `referenceKind === "certification"`) that disables the input and
shows a small explanatory note, reusing the same `disabled` prop path the
hero's "Same as name/tagline" fields already use.
**Files to create or modify:**
- `src/app/(admin)/admin/product-device/segments-builder.tsx`
- `DECISIONS.md` (ADR-064)
**Acceptance criteria:**
- [x] Picking a certification auto-fills both Header (name) and Subheader
  (number, if the style has one) and disables both inputs.
- [x] Picking a document leaves Subheader exactly as typed — no autofill/
  disable for document mode.
- [x] Switching back to a document re-enables both fields immediately.
**Do not:** Add conditional-required validation based on `referenceKind` —
this is a display/UX-only change, matching ADR-063's own scope note.

## [x] Task: Admin CMS for homepage carousels (Homepage → Carousel)

**Context:** The homepage's product carousels (`ProductHomeSection` ×2 —
"Alma Laser"/"INNO CE") were hardcoded: static `almaCarouselList`/
`innoCarouselList` arrays in `src/lib/data.ts`, every card linking to the
same placeholder `alma-harmony` URL. The client wants to manage these from
the admin, either by pointing a carousel at an existing leaf category (auto-
filling title/products/link) or by building one entirely by hand. See
ADR-066.
**Approach:** New `HomeCarousel` model, discriminated by `mode: "category" |
"custom"`. "category" mode stores only `categoryId` (a leaf `Category` node —
no children of its own); title, product list, and the "See More" URL are all
resolved live from that category at render time via a new
`getCategoryAncestry` helper (`src/lib/categories.ts`) and the existing
`getPublishedProductCards`, rather than snapshotted — so the carousel always
reflects the category's current name/slug and published products. "custom"
mode stores `title`/`items` (ordered `{id, title, img, href}[]` JSON, same
"JSON over join table" precedent as `Gallery.images`/`Product.segments`) /
`seeMoreUrl` directly. A `showSeeMore` toggle (default on) makes the "See
More" button optional in both modes, per the ask. Admin CRUD mirrors the
Gallery/Category table pattern (drag-reorder, dialog add/edit, discard-
changes confirmation). Public homepage renders whatever `HomeCarousel` rows
exist via `getPublicHomeCarousels()`, dropping any row that resolves to zero
items (missing category, or a leaf with no published products) instead of
rendering an empty carousel.
**Files to create or modify:**
- `prisma/schema.prisma`, `prisma/migrations/20260803013954_add_home_carousel/` — new `HomeCarousel` model
- `src/interfaces/general.ts` — `ICarouselItem`, `IHomeCarousel`, `IHomeCarouselListItem`, `IPublicHomeCarousel`
- `src/lib/categories.ts` — new `getCategoryAncestry(categoryId)`
- `src/lib/home-carousels.ts` — new: `getHomeCarousels()`, `getPublicHomeCarousels()`
- `src/app/(admin)/admin/homepage/carousel/limits.ts` — new
- `src/app/(admin)/admin/homepage/carousel/upload-actions.ts` — new: `uploadHomeCarouselItemImage`
- `src/app/(admin)/admin/homepage/carousel/actions.ts` — new: `createHomeCarousel`, `updateHomeCarousel`, `deleteHomeCarousel`, `reorderHomeCarousels`
- `src/app/(admin)/admin/homepage/carousel/carousel-category-picker.tsx` — new: combined Devices/Products leaf-only picker
- `src/app/(admin)/admin/homepage/carousel/carousel-items-editor.tsx` — new: custom-mode item list (drag reorder, image/title/link per row)
- `src/app/(admin)/admin/homepage/carousel/carousel-form.tsx`, `carousel-table.tsx`, `page.tsx` — new
- `src/app/(admin)/components/sidebar.tsx` — new "Homepage → Carousel" nav entry
- `src/app/(user)/(homepage)/page.tsx` — renders `getPublicHomeCarousels()` instead of the two hardcoded sections
- `src/app/(user)/(homepage)/(sections)/Products.tsx` — `href` made optional (button hidden when absent)
- `src/lib/data.ts` — removed the now-unused `almaCarouselList`/`innoCarouselList`
- `ARCHITECTURE.md`, `DECISIONS.md` (ADR-066)
**Acceptance criteria:**
- [x] Admin can create a carousel by picking a leaf category (no
  sub-categories) — title, product cards, and "See More" link populate
  automatically and stay in sync if the category is later renamed/moved or
  its published products change.
- [x] Admin can create a custom carousel with its own title and an ordered,
  drag-reorderable list of items (image upload, title, link).
- [x] The "See More" button is optional in both modes (a toggle hides it;
  custom mode requires a URL only when the toggle is on).
- [x] Carousels can be reordered (drag) and deleted from the list table.
- [x] A category-mode carousel whose category was deleted shows a "category
  missing" warning in the admin list instead of silently breaking.
- [x] The public homepage renders carousels in admin-chosen order and shows
  nothing where a `space-y-20` block would otherwise be if no carousels
  (or a category with zero published products) resolve to any items.
- [x] `tsc --noEmit` passes.
**Do not:** Seed/migrate the old hardcoded Alma/Inno carousel content into
the new system — the client re-creates what they want through the admin.

## [x] Task: Carousel title can be text or image, image mode still requires a text title

**Context:** Follow-up to the task above (ADR-067). The client wants the
carousel's visible name to optionally be an image (e.g. a brand logo)
instead of plain text, in either authoring mode, while still capturing a
text title for accessibility/SEO even when an image is shown.
**Approach:** New `titleDisplayMode: "text" | "image"` + `titleImage`
columns on `HomeCarousel`, independent of `mode`. `titleImage` is required
only when `titleDisplayMode === "image"`. No public component change was
needed — `ProductHomeSection` already renders the text title as an
`sr-only` heading unconditionally and only swaps in `titleImg` visually
when provided.
**Files to create or modify:**
- `prisma/schema.prisma`, `prisma/migrations/20260803015934_home_carousel_title_display/`
- `src/interfaces/general.ts` — `IHomeCarousel`/`IPublicHomeCarousel` gain `titleDisplayMode`/`titleImage`
- `src/lib/home-carousels.ts` — reads/resolves the new fields
- `src/app/(admin)/admin/homepage/carousel/limits.ts` — title image size constants
- `src/app/(admin)/admin/homepage/carousel/upload-actions.ts` — new: `uploadHomeCarouselTitleImage`
- `src/app/(admin)/admin/homepage/carousel/actions.ts` — `parseTitleImage`, wired into create/update
- `src/app/(admin)/admin/homepage/carousel/carousel-form.tsx` — "Carousel Title Display" select + upload field
- `src/app/(user)/(homepage)/page.tsx` — passes `titleImage` through as `titleImg`
- `DECISIONS.md` (ADR-067)
**Acceptance criteria:**
- [x] Admin can switch a carousel's title between "Text" and "Image", in
  either category or custom mode.
- [x] Choosing "Image" requires uploading an image before saving.
- [x] In custom mode, the text Title field remains required even when
  "Image" is chosen, with a note explaining it's kept for accessibility.
- [x] In category mode, the category's own name satisfies the text-title
  requirement automatically — no extra field needed.
- [x] Switching back to "Text" after uploading an image does not delete the
  uploaded image (it reappears if switched back to "Image").
- [x] `tsc --noEmit` passes.
**Do not:** Change `ProductHomeSection`'s public rendering — it already
supports this exact behavior via its existing `titleImg` prop.

## [x] Task: Custom carousel items get a searchable devices/products picker

**Context:** Follow-up to ADR-066. "Custom" mode carousel items required
typing a title, uploading an image, and typing a link by hand for every
item. The client asked for a searchable dropdown across all devices and
products so an admin can pick a real catalogue entry instead. See ADR-068.
**Approach:** New `getPublishedProductPickerOptions()` flattens every
published `Product` (both device and product types) into `{id, type, name,
thumbnail, url}`, resolving each one's real public URL via the existing
`getCategoryAncestry`. A new `ProductPickerField` (reusing the `TagPicker`'s
existing `Popover` + `Input` + filtered-list pattern — no new `cmdk`
dependency) replaces each item row's plain title input: typing still works
as a normal custom title, and a dropdown of matching published devices/
products appears alongside; picking one fills that row's title/image/link
from the selected item.
**Files to create or modify:**
- `src/interfaces/general.ts` — new `IProductPickerOption`
- `src/lib/products.ts` — new `getPublishedProductPickerOptions()`
- `src/app/(admin)/admin/homepage/carousel/product-picker-field.tsx` — new
- `src/app/(admin)/admin/homepage/carousel/carousel-items-editor.tsx` — wires `ProductPickerField` in place of the title `Input`
- `src/app/(admin)/admin/homepage/carousel/carousel-form.tsx`, `carousel-table.tsx`, `page.tsx` — thread `productOptions` through
- `DECISIONS.md` (ADR-068)
**Acceptance criteria:**
- [x] Typing in a custom item's title field shows a dropdown of matching
  published devices/products (searching across both types).
- [x] Picking a result fills that item's title, image, and link from the
  selected catalogue item.
- [x] Typing without picking a result still works as a plain custom title —
  the picker never forces a match (a custom item can link anywhere).
- [x] Only published devices/products are offered, never drafts/hidden ones.
- [x] `tsc --noEmit` passes.
**Do not:** Add the `cmdk` package/shadcn `Command` component for this —
the existing `Popover`+filtered-list pattern (`TagPicker`) covers it.

## [x] Task: Lock picked item's image/link, make the image visible, cap the item list's height

**Context:** Follow-up to the catalogue picker task above (ADR-069). Three
gaps: picking a product still left its image/link freely editable (letting
them drift from the actual product); the image field was an icon-only
upload button with no visible preview; the item list had no height cap, so
it grew past the dialog instead of scrolling.
**Approach:** New `ICarouselItem.productId` (optional/nullable), set by
`ProductPickerField`'s `onPick`; the image `UploadField` and link `Input`
both take `disabled={item.productId != null}` once set — no in-place
unbind, matching the "remove and re-add" precedent already used for a
certification row's fixed style. Row layout redone as a two-line card: the
picker (renamed "Browse or Add Item") on its own full-width line first,
then a real square image preview (`aspect="square"`, `preview` no longer
forced off) beside the link input. The item list itself is wrapped in
`max-h-80 overflow-y-auto`, same precedent as `GalleryForm`'s image grid.
**Files to create or modify:**
- `src/interfaces/general.ts` — `ICarouselItem.productId`
- `src/app/(admin)/admin/homepage/carousel/actions.ts` — `carouselItemSchema` accepts `productId`
- `src/app/(admin)/admin/homepage/carousel/carousel-items-editor.tsx` — two-line card layout, lock-on-pick, scrollable list
- `src/app/(admin)/admin/homepage/carousel/product-picker-field.tsx` — updated placeholder copy
- `DECISIONS.md` (ADR-069)
**Acceptance criteria:**
- [x] Picking a catalogue item disables that row's image upload and link
  input; they show the picked product's own thumbnail/URL.
- [x] The picker field appears above the image/link fields in each row.
- [x] The image field shows an actual visible preview, not just an
  icon-only button.
- [x] The item list scrolls internally past a fixed height instead of
  growing the dialog past its own max height.
- [x] `tsc --noEmit` passes.
**Do not:** Add an "unbind"/"use custom link" control — correcting a wrong
pick means removing the item and adding another.

## [x] Task: Fix carousel add/edit modal scrolling (mirror the Category admin's pattern)

**Context:** The previous task capped the item list's own height
(`max-h-80 overflow-y-auto`) to fix scrolling — the wrong target. The
client meant the add/edit **modal itself** wasn't scrollable, the same way
the Category admin's add/edit modal already is (`category-tree.tsx`'s
`CategoryForm`: only the field area scrolls, Save stays pinned below it).
**Approach:** Removed the item list's own scroll cap. `CarouselForm`'s body
(the mode Tabs, Title Display section, Size/Show-See-More grid, See More
URL) is now wrapped in `flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto
px-1 py-1` — the exact class list `CategoryForm` uses — with the error
message and Save button left outside it, pinned below.
**Files to create or modify:**
- `src/app/(admin)/admin/homepage/carousel/carousel-form.tsx`
- `src/app/(admin)/admin/homepage/carousel/carousel-items-editor.tsx` — dropped the now-redundant inner scroll cap
**Acceptance criteria:**
- [x] With many carousel items, the add/edit dialog scrolls internally
  (Save button stays visible, pinned at the bottom) instead of growing past
  the dialog or the item list scrolling on its own.
- [x] `tsc --noEmit` passes.
**Do not:** Reintroduce a second, nested scroll region on the item list —
the whole modal body is the single scroll container now.

## [x] Task: Banner + rich text management for the static Support pages

**Context:** Registration & Documentation, Warranty & Service, and Career
(under the public Support menu) each had a hardcoded `PageBanner` image and
an empty `<div className="h-150">` placeholder below it, with no admin
control over either. Marcom & Promotion is unaffected — it already has its
own `SocialAccount`-driven content and wasn't part of this ask.
**Approach:** New `SupportPage` model, one row per fixed slug
(`registration-documentation` / `warranty-service` / `career`), upserted by
slug — no add/delete flow. Three banner fields (`bannerXlUrl` 2560x1107
required, `bannerMdUrl` 1363x1107 and `bannerSmUrl` 1107x1107 optional) map
directly onto `PageBanner`'s existing `defImage`/`mdImage`/`smImage` props,
and a `body` rich text field renders where each page's empty placeholder
div used to be. One shared `SupportPageForm`/admin route pattern per slug,
mirroring `Category`'s isPage banner+body shape (ADR-033) without its
tree/taxonomy fields. `UploadField` moved from `product-device/` to
`src/components/upload-field.tsx` since this is now its second, unrelated
caller. See ADR-070.
**Files to create or modify:**
- `prisma/schema.prisma`, `prisma/migrations/20260803022808_add_support_page/` — new `SupportPage` model
- `src/lib/support-pages.ts` — new: `SUPPORT_PAGE_SLUGS`, `getSupportPage(slug)`
- `src/components/upload-field.tsx` — moved from `product-device/upload-field.tsx`
- `src/app/(admin)/admin/product-device/{category-tree,segments-builder,product-files-editor}.tsx`,
  `src/app/(admin)/admin/homepage/carousel/{carousel-form,carousel-items-editor}.tsx` — updated `UploadField` import path
- `src/app/(admin)/admin/support/limits.ts`, `actions.ts` — new: upload actions + `saveSupportPage`
- `src/app/(admin)/admin/support/support-page-form.tsx` — new: shared banner + rich text form
- `src/app/(admin)/admin/support/{registration-documentation,warranty-service,career}/page.tsx` — new
- `src/app/(admin)/components/sidebar.tsx` — added the three nav links (Marcom & Promotion unchanged)
- `src/app/(user)/support/{registration-documentation,warranty-service,career}/page.tsx` — wired to `getSupportPage`
- `ARCHITECTURE.md`, `DECISIONS.md` (ADR-070)
**Acceptance criteria:**
- [x] Each of the three admin pages has a banner section (three uploads,
  2560x1107 marked required, the other two optional) and a rich text editor
  below it, saved via one "Save" action.
- [x] Saving without the 2560x1107 banner is blocked client-side (disabled
  Save button) and rejected server-side (Zod).
- [x] Each public page renders its saved banner across all three responsive
  breakpoints, falling back to its original hardcoded image until a banner
  is saved.
- [x] The rich text body renders below the banner once saved; renders
  nothing (no empty gradient box) when unset, same empty-Tiptap-HTML guard
  `CategoryPageView` already uses.
- [x] Marcom & Promotion's page/route/content are untouched.
- [x] `tsc --noEmit` passes; `eslint` reports nothing new.
**Do not:** Build this on top of `Category` — these pages have no taxonomy
relationship to the device/product tree.

## [x] Task: Carousel "Card Style" renamed Square/Transparent; Square no longer overflows its card

**Context:** The carousel admin's "Card Size" dropdown ("Small"/"Medium")
never described what the two styles actually look like — one is a
self-contained opaque card ("Square"), the other floats the image above a
shorter, partial card ("Transparent"). The client asked for these names.
Separately, the Square style's image visually overflowed past the card's
rounded corners instead of staying inside it. See ADR-071.
**Approach:** Relabeled the `Select`'s options and its own field label
("Card Size" → "Card Style") in `carousel-form.tsx`; the underlying stored
`size: "sm" | "md"` values are unchanged (label-only rename, same precedent
as ADR-055). Fixed the overflow by clipping the Square variant's image
wrapper to the same `rounded-4xl` shape as the card underneath
(`overflow-hidden`), left the Transparent variant untouched since floating
past its shorter card is intentional. Also fixed an unrelated bug found in
the process: every card's "View Details" button linked to a hardcoded dummy
URL instead of `item.href`, so no carousel link ever actually worked.
**Files to create or modify:**
- `src/app/(admin)/admin/homepage/carousel/carousel-form.tsx` — relabeled Select
- `src/app/(user)/components/Carousels.tsx` — `ProductCarousel`'s image-wrapper clipping + `item.href` fix
- `DECISIONS.md` (ADR-071)
**Acceptance criteria:**
- [x] The Card Style dropdown shows "Square" and "Transparent" instead of
  "Small"/"Medium"; existing carousels' stored size still loads correctly.
- [x] Square cards' images stay fully inside the card's rounded boundary at
  every corner, regardless of the image's own aspect ratio.
- [x] Transparent cards are unaffected — the image still floats above the
  shorter card as before.
- [x] Each carousel item's "View Details" button links to that item's own
  URL, not a hardcoded placeholder.
- [x] `tsc --noEmit` passes; `eslint` reports nothing new.
**Do not:** Rename the stored `size` column values — this is a display-only
change plus an unrelated link bug fix.

## [x] Task: Admin Contact dashboard — Content (banner + rich text) and Form Response (stub)

**Context:** The admin needed a new "Contact" sidebar section with two
submenus: "Content", managing the public `/contact` page's banner and rich
text body (previously hardcoded, with an empty `<div className="h-150">`
placeholder), and "Form Response", left empty for now — no requirements
given yet for viewing submitted contact-form entries.
**Approach:** New `ContactPage` model, identical shape to `SupportPage`
(ADR-070), one row per fixed slug (`CONTACT_PAGE_SLUGS`, currently just
`"content"`) — no add/delete flow. Reused the exact Support page pattern:
`ContactPageForm` (banner uploads + `RichTextEditor`), `saveContactPage`
Server Action, public page wired the same way Support's pages are
(`PageBanner` + `BodyWrapper` + `hasRichTextContent` guard). "Form Response"
got a bare placeholder page and no model. See ADR-072.
**Files to create or modify:**
- `prisma/schema.prisma`, `prisma/migrations/20260803063558_add_contact_page/` — new `ContactPage` model
- `src/lib/contact-pages.ts` — new: `CONTACT_PAGE_SLUGS`, `getContactPage(slug)`
- `src/app/(admin)/admin/contact/limits.ts`, `actions.ts` — new: upload actions + `saveContactPage`
- `src/app/(admin)/admin/contact/contact-page-form.tsx` — new: banner + rich text form
- `src/app/(admin)/admin/contact/content/page.tsx` — new
- `src/app/(admin)/admin/contact/form-response/page.tsx` — new placeholder
- `src/app/(admin)/admin/contact/page.tsx` — removed (empty stub, no bare `/admin/contact` route, matching Support's convention)
- `src/app/(admin)/components/sidebar.tsx` — added the Contact section (Content, Form Response)
- `src/app/(user)/contact/page.tsx` — wired to `getContactPage`; also dropped unused `NavbarBg`/`Image`/`React` imports left over from before
- `ARCHITECTURE.md`, `DECISIONS.md` (ADR-072)
**Acceptance criteria:**
- [x] `/admin/contact/content` has a banner section (three uploads,
  2560x1107 marked required) and a rich text editor below it, saved via one
  "Save" action.
- [x] Saving without the 2560x1107 banner is blocked client-side (disabled
  Save button) and rejected server-side (Zod).
- [x] The public `/contact` page renders its saved banner across all three
  responsive breakpoints, falling back to the original hardcoded image
  until a banner is saved.
- [x] The rich text body renders above the existing `<div
  className="h-150">` placeholder once saved; renders nothing when unset.
- [x] `/admin/contact/form-response` renders a placeholder page with no
  errors.
**Do not:** Build a data model for Form Response yet — its shape wasn't
specified.

## [x] Task: Public contact form (validation + Cloudflare Turnstile + submission storage)

**Context:** The public `/contact` page's `<div className="h-150">`
placeholder (left open by the previous task) needed to become a real form:
name, mobile phone, email, and a question field, each with its own
character cap, plus a captcha. Rich text CMS content (previous task) renders
above it; a short "Need Something? / Please fill our contact form / we will
get back to you ASAP" intro sits directly above the fields.
**Approach:** New `ContactSubmission` model (append-only, one row per
submission) and `submitContactForm` Server Action
(`src/app/(user)/contact/actions.ts`) that Zod-validates all four fields
(limits shared with the client via `limits.ts` so they can't drift) and
verifies a Cloudflare Turnstile token server-side before inserting. Turnstile
was the client's pick over reCAPTCHA/a self-hosted challenge (asked via
`AskUserQuestion`). Per-field errors only render once a field is invalid (on
blur, and re-checked on submit) — no standing hint text — except the
question field's `{length}/1000` counter, which is always visible. See
ADR-073.
**Files to create or modify:**
- `prisma/schema.prisma`, `prisma/migrations/20260803065038_add_contact_submission/` — new `ContactSubmission` model
- `.env` — `NEXT_PUBLIC_TURNSTILE_SITE_KEY`/`TURNSTILE_SECRET_KEY` (Cloudflare's published always-pass testing keys for now)
- `src/app/(user)/contact/limits.ts` — new: shared char-limit constants
- `src/app/(user)/contact/actions.ts` — new: `submitContactForm` (Zod + Turnstile `siteverify` + insert)
- `src/app/(user)/contact/contact-form.tsx` — new: the form itself
- `src/app/(user)/contact/page.tsx` — intro copy + `<ContactForm />` in place of the old placeholder div
- `ARCHITECTURE.md`, `DECISIONS.md` (ADR-073)
**Acceptance criteria:**
- [x] Name/phone rejects past 150/20 characters (`maxLength`); email must be
  a valid address; question rejects past 1000 characters. None of the three
  non-counter fields show an error until that field is actually invalid.
- [x] The question field always shows `{length}/1000` regardless of error
  state.
- [x] Submitting without completing the Turnstile widget is blocked
  client-side with an inline message; a forged/absent token is also rejected
  server-side (`siteverify`).
- [x] A successful submission clears the form, resets the captcha, and shows
  a confirmation message; a row lands in `ContactSubmission`.
- [ ] `tsc --noEmit` passes; `eslint` reports nothing new. (not yet run)
**Do not:** Build the admin "Form Response" list view yet, or add an
email/notification-on-submit integration — neither was asked for; both are
follow-up decisions of their own (see ADR-073's consequences).

## [x] Task: Remove Turnstile captcha from the contact form (temporary)

**Context:** With Cloudflare's always-pass testing keys in place, the
Turnstile widget visibly showed Cloudflare's "For testing only" banner. The
client asked to drop the captcha for now rather than set up real Cloudflare
keys at this stage.
**Approach:** Strip the Turnstile widget/script/verification wiring only;
leave the `ContactSubmission` model, the four form fields, and their
validation untouched. See ADR-074.
**Files to create or modify:**
- `src/app/(user)/contact/contact-form.tsx` — removed the widget, its ref/state, `next/script`, and the "complete the captcha" submit gate
- `src/app/(user)/contact/actions.ts` — removed `verifyTurnstileToken` and its call in `submitContactForm`
- `.env` — removed `NEXT_PUBLIC_TURNSTILE_SITE_KEY`/`TURNSTILE_SECRET_KEY`
- `DECISIONS.md` (ADR-074, and ADR-073's Status line noting the partial supersession), `ARCHITECTURE.md` (removed the Captcha stack entry)
**Acceptance criteria:**
- [x] The contact form renders with no captcha widget and submits
  successfully without one.
- [x] Name/phone/email/question validation and the question counter are
  unaffected.
- [ ] `tsc --noEmit` passes; `eslint` reports nothing new. (not yet run)
**Do not:** Remove the `ContactSubmission` model or any of the four fields
— only the captcha layer is being pulled out.

## [x] Task: Admin Media → Podcast CMS (banner + episode list); wire public `/media/podcasts`

**Context:** `/admin/media/podcast` was an empty placeholder. The public
`/media/podcasts` page rendered one hardcoded banner image and one hardcoded
YouTube embed with static copy — no way for the client to manage either.
**Approach:** New `PodcastPage` (banner-only, upserted by fixed slug, same
shape as `ContactPage`/`SupportPage`) and `Podcast` (`youtubeUrl`, `title`,
`description?`, `order`, same shape as `Gallery` minus the image grid)
models. See ADR-076. Admin page combines a banner form (mirrors
`ContactPageForm`, three `UploadField`s) and an episode table (mirrors
`GalleryTable`'s add/edit/delete/drag-reorder pattern) — "Create podcast"
opens a `Dialog` with YouTube link/Title/Description inputs. Confirmed with
the user that the public page should also be wired up, not left inert:
`/media/podcasts` now renders the admin-managed banner (falling back to the
original dummy image) and repeats the page's existing hero/video-plus-text
block once per podcast, alternating side by index parity — same precedent as
`/media/galleries`. Each row's embed id comes from `getYoutubeVideoId`
(already existed, used by the Category video block); the "Watch on Youtube"
button — previously non-functional, no `href` at all — now links to the
real `youtubeUrl`.
**Files to create or modify:**
- `prisma/schema.prisma`, `prisma/migrations/20260803070614_add_podcast/` —
  new `Podcast`/`PodcastPage` models
- `src/interfaces/general.ts` — `IPodcast`
- `src/lib/podcasts.ts` — new: `getPodcasts()`
- `src/lib/podcast-page.ts` — new: `PODCAST_PAGE_SLUGS`, `getPodcastPage()`
- `src/app/(admin)/admin/media/podcast/limits.ts` — new
- `src/app/(admin)/admin/media/podcast/actions.ts` — new: `uploadPodcastPageBanner`,
  `savePodcastPage`, `createPodcast`, `updatePodcast`, `deletePodcast`, `reorderPodcasts`
- `src/app/(admin)/admin/media/podcast/podcast-page-form.tsx` — new
- `src/app/(admin)/admin/media/podcast/podcast-form.tsx` — new
- `src/app/(admin)/admin/media/podcast/podcast-table.tsx` — new
- `src/app/(admin)/admin/media/podcast/page.tsx` — wired up
- `src/app/(user)/media/podcasts/page.tsx` — reads `PodcastPage`/`Podcast` instead of hardcoded content
- `DECISIONS.md` (ADR-076)
**Acceptance criteria:**
- [x] Admin page shows a banner upload section (xl required, md/sm optional)
  above a "Podcast List" table with a "Create podcast" button.
- [x] "Create podcast" opens a modal with YouTube Link, Title, and
  Description fields (matching the Category/Gallery add-modal UX pattern).
- [x] Rows can be edited, deleted (with confirmation), and reordered via
  drag-and-drop; order persists.
- [x] The public `/media/podcasts` banner reflects the admin-saved image,
  falling back to the original dummy image when unset.
- [x] The public page renders one video+text block per saved podcast
  (title, description, real YouTube embed), with an empty state when there
  are none yet.
- [x] The "Watch on Youtube" button links to the podcast's actual URL in a
  new tab.
- [ ] `tsc --noEmit` passes. (ran once during implementation per an explicit
  one-off exception; not re-run after — see feedback memory on this project:
  ask before running typecheck/lint/build.)
**Do not:** ~~Add per-episode fields beyond YouTube link/title/description
(e.g. thumbnail, duration) — not asked for.~~ Superseded by the task below,
which adds an optional thumbnail and length caps.

## [x] Task: Podcast thumbnail (optional) + title/description length caps

**Context:** Follow-up to the task above. The client asked for an optional
thumbnail per podcast, plus a 150-character cap on title and 400 on
description, matching the `Article` editor's title/excerpt length-cap +
counter pattern (ADR-013).
**Approach:** See ADR-077. `Podcast.thumbnailUrl` (nullable) uploads via a
new `uploadPodcastThumbnail` action into its own `/uploads/podcasts-
thumbnails` dir (separate from the banner's `/uploads/podcasts`, since a
thumbnail's lifecycle is tied to its own podcast row — `deletePodcast` now
also removes the uploaded thumbnail file, matching `Gallery`'s
cleanup-on-delete). `title`/`description` gained `maxLength` + a live
`{length}/{max}` counter in the form and matching Zod `.max()` checks
server-side. The thumbnail is stored and editable but intentionally not yet
rendered on the public page — that's a separate design decision (see
ADR-077's Context) not covered by this ask.
**Files to create or modify:**
- `prisma/schema.prisma`, `prisma/migrations/20260803072648_podcast_thumbnail/`
  — `Podcast.thumbnailUrl`
- `src/interfaces/general.ts` — `IPodcast.thumbnailUrl`
- `src/app/(admin)/admin/media/podcast/limits.ts` — `MAX_PODCAST_TITLE_LENGTH`,
  `MAX_PODCAST_DESCRIPTION_LENGTH`, `MAX_PODCAST_THUMBNAIL_SIZE/LABEL`
- `src/app/(admin)/admin/media/podcast/actions.ts` — new `uploadPodcastThumbnail`;
  `podcastFieldsSchema` gains the length caps + `thumbnailUrl`; `deletePodcast`
  cleans up the thumbnail file
- `src/app/(admin)/admin/media/podcast/podcast-form.tsx` — thumbnail
  `UploadField`, `maxLength` + counters on Title/Description
- `DECISIONS.md` (ADR-077), `ARCHITECTURE.md`
**Acceptance criteria:**
- [x] The create/edit modal has an optional Thumbnail upload field.
- [x] Title is capped at 150 characters, Description at 400, both with a
  live counter and enforced server-side too.
- [x] Deleting a podcast that has a thumbnail removes the uploaded file.
- [ ] `tsc --noEmit` passes. (not run — see feedback memory: ask before
  running typecheck/lint/build.)
**Do not:** Wire the thumbnail into the public `/media/podcasts` page in this
task — not asked for; flagged as an open assumption in ADR-077.

## [x] Task: Contact "Form Response" — list + email-style split detail view

**Context:** The admin Contact dashboard's "Form Response" submenu was a
"Coming soon" placeholder (ADR-072) with `ContactSubmission` rows (ADR-073)
already being collected but nothing to view them with. Asked for: a list,
and clicking an entry splits the view with the message on the right, like
an email client.
**Approach:** `getContactSubmissions()` reads all rows newest-first,
server-side. `FormResponseView` renders a two-pane layout — scrollable
left-hand list (name, one-line question preview, timestamp), right-hand
detail pane (name, `mailto:`/`tel:` links, timestamp, full question) for
whichever row is selected client-side (`selectedId` state, no re-fetch on
click). First row auto-selected on load. The detail pane is collapsible
(`isDetailOpen` state, `PanelRightClose`/`PanelRightOpen` toggle buttons) —
collapsing it expands the list to fill the freed width; picking any row
reopens it. See ADR-075.
**Files to create or modify:**
- `src/lib/contact-submissions.ts` — new: `IContactSubmission`, `getContactSubmissions()`
- `src/lib/utils.ts` — new: `formatDateTime` (day + time, sibling to `formatArticleDate`)
- `src/app/(admin)/admin/contact/form-response/form-response-view.tsx` — new: the split list/detail view, with a collapsible detail pane
- `src/app/(admin)/admin/contact/form-response/page.tsx` — fetch + render, replacing the placeholder
- `DECISIONS.md` (ADR-075), `ARCHITECTURE.md` (updated `ContactSubmission` bullet)
**Acceptance criteria:**
- [x] `/admin/contact/form-response` lists every submission, newest first,
  each showing name, a one-line question preview, and its timestamp.
- [x] Clicking a row shows that submission's full name, email, phone,
  timestamp, and complete question text in the right-hand pane; the clicked
  row is visibly highlighted.
- [x] Collapsing the detail pane hides it and the list expands to fill the
  space; clicking a row (or the reopen button) brings the detail pane back.
- [x] With zero submissions, the page shows an empty state instead of a
  blank/broken layout.
- [ ] `tsc --noEmit` passes; `eslint` reports nothing new. (not yet run)
**Do not:** Add mark-as-read/archive/delete/pagination — none of that was
asked for; this is a read-only view of existing data.

## [x] Task: Form Response defaults to collapsed/unselected; unread dot

**Context:** Two follow-up refinements to the task above: the view should
open with nothing selected and the detail pane collapsed (not auto-opening
the newest submission), and unread submissions need a visible marker.
**Approach:** New `ContactSubmission.isRead` column, default `false`,
flipped by `markContactSubmissionAsRead` the moment a row is opened
client-side. `FormResponseView` seeds a local `readIds` set from the
initial `isRead` values so the dot clears immediately on click without
waiting on revalidation; `selectedId`/`isDetailOpen` now both start
closed/empty. See ADR-078.
**Files to create or modify:**
- `prisma/schema.prisma`, `prisma/migrations/20260803073618_add_contact_submission_is_read/` — added `isRead`
- `src/lib/contact-submissions.ts` — `IContactSubmission.isRead`
- `src/app/(admin)/admin/contact/actions.ts` — new: `markContactSubmissionAsRead`
- `src/app/(admin)/admin/contact/form-response/form-response-view.tsx` — default collapsed/unselected state, unread dot + bold name, mark-as-read on open
- `DECISIONS.md` (ADR-078), `ARCHITECTURE.md` (updated `ContactSubmission` bullet)
**Acceptance criteria:**
- [x] Opening `/admin/contact/form-response` shows the list at full width
  with nothing selected and no detail pane.
- [x] Unread submissions show a dot and bold name; opening one clears both
  immediately and persists across a page reload.
- [ ] `tsc --noEmit` passes; `eslint` reports nothing new. (not yet run)
**Do not:** Add a bulk "mark all read," archive, or delete action — only
what was asked.

## [x] Task: Podcast form/table polish — tighter length caps, scrollable modal, working truncation

**Context:** Follow-up to the Podcast CMS tasks above. Title/description
caps needed to be tighter, the create/edit modal wasn't scrollable when its
content grew past the dialog height, and the list table's truncation wasn't
actually clipping long text (risking page-wide horizontal overflow). See
ADR-079.
**Approach:** Lowered `MAX_PODCAST_TITLE_LENGTH`/`MAX_PODCAST_DESCRIPTION_LENGTH`
to 50/200 (no migration needed — `String` columns, DB-unbounded, only the
Zod/`maxLength` caps changed). `PodcastForm` restructured to mirror
`CategoryForm`'s scrollable-modal pattern (inner `overflow-y-auto` field
wrapper, Save/error pinned outside it). `PodcastTable`'s Title/Description
cells fixed to actually truncate (`block max-w-* truncate` + a `title` hover
attribute, matching `article-table.tsx`) instead of an inline `<span>` with
an ineffective `max-w`. Root-caused and fixed the underlying layout bug too:
`ContentWrapper`'s `main` had no `min-w-0`, so as a flex item it wouldn't
shrink below its children's content width — any sufficiently wide admin
table would grow the whole page horizontally instead of scrolling inside
its own `overflow-x-auto` wrapper.
**Files to create or modify:**
- `src/app/(admin)/admin/media/podcast/limits.ts` — 50/200 caps
- `src/app/(admin)/admin/media/podcast/podcast-form.tsx` — scrollable inner wrapper
- `src/app/(admin)/admin/media/podcast/podcast-table.tsx` — fixed truncation, `title` tooltips
- `src/app/(admin)/components/content-wrapper.tsx` — `min-w-0` on `main`
- `DECISIONS.md` (ADR-079)
**Acceptance criteria:**
- [x] Title is capped at 50 characters, Description at 200 (form counters
  and server validation both updated).
- [x] With every field filled (including a thumbnail), the create/edit
  modal scrolls its field area internally — the Save button and any error
  message stay visible, pinned below.
- [x] A long title or description in the list table visibly truncates with
  an ellipsis (and a hover tooltip with the full text) instead of widening
  the column or the page.
- [ ] `tsc --noEmit` passes. (not run — see feedback memory: ask before
  running typecheck/lint/build.)
**Do not:** Fix the identical truncation bug in `gallery-table.tsx` — out of
scope for this ask, left as a known gap (noted in ADR-079).

## [x] Task: Banner + rich text on Marcom & Promotion (Support), above the social media list

**Context:** ADR-070 gave Registration & Documentation, Warranty & Service,
and Career a `SupportPage`-backed banner + rich text body, deliberately
excluding Marcom & Promotion since it already had its own `SocialAccount`
highlight list. The client now wants a banner and rich text on Marcom too,
reflected on the public page with the rich text sitting above the social
media list — not replacing it. See ADR-080.
**Approach:** Added `"marcom"` to `SUPPORT_PAGE_SLUGS` (no migration — `slug`
is a plain unique `String`) rather than a fourth standalone model, since
Marcom already lives in the same admin Support submenu as the other three
`SupportPage` rows. Added `SUPPORT_PAGE_PUBLIC_PATH` to map the admin slug
(`marcom`) to its differently-named public route segment
(`marcom-promotion`) for revalidation, since every other slug is identical
on both sides.
**Files to create or modify:**
- `src/lib/support-pages.ts` — `"marcom"` slug, `SUPPORT_PAGE_PUBLIC_PATH`
- `src/app/(admin)/admin/support/actions.ts` — `revalidateSupportPagePaths`
  uses the new path map
- `src/app/(admin)/admin/support/marcom/page.tsx` — renders `SupportPageForm`
  above the existing `SocialAccountTable`
- `src/app/(user)/support/marcom-promotion/page.tsx` — renders the saved
  banner (falling back to the original dummy image) and, when non-empty,
  the rich text body directly above the "Our Social Media" section
- `ARCHITECTURE.md`, `DECISIONS.md` (ADR-080, amends ADR-070's exclusion)
**Acceptance criteria:**
- [x] `/admin/support/marcom` shows a Banner section (three responsive
  sizes, 2560x1107 required) and a rich text editor above the existing
  social account table, saved independently of it.
- [x] The public `/support/marcom-promotion` page renders the saved banner
  across all three breakpoints and the rich text body above the social
  media list; an empty body renders nothing extra (`hasRichTextContent`
  guard, same as every other Support page).
- [x] Saving the Marcom banner/body revalidates both
  `/admin/support/marcom` and `/support/marcom-promotion`.
- [x] The existing social account CRUD (add/edit/delete/reorder) is
  unchanged.
**Do not:** Replace or restructure the `SocialAccount`-driven highlight
list — the rich text is additive, rendered above it.

## [x] Task: Homepage hero banner (`HomePage` model); "Carousel" menu renamed "Content"

**Context:** The Homepage sidebar section's only submenu was "Carousel",
managing just `HomeCarousel` rows. The ask: add an editable homepage hero
banner at four fixed sizes (2560x1440, 1440x2560, 2048x1536, 1536x2048, only
the largest required) to that same admin page, and rename the menu to
"Content" since it now covers more than the carousel list. See ADR-082.
**Approach:** New `HomePage` model, one row upserted by fixed slug (`"home"`)
— same upsert-by-slug shape as `ContactPage`/`SupportPage`, but reusing
Category's four-size banner set (ADR-035) instead of the usual three-size
one, since that's the exact set asked for. Upload/save actions and banner
limits added to the existing `homepage/carousel/actions.ts`/`limits.ts`
(same precedent as Galleries in ADR-081). `/admin/homepage/carousel` now
renders the new `HomePageForm` banner form above the existing
`CarouselTable`.
**Files to create or modify:**
- `prisma/schema.prisma`, `prisma/migrations/20260803083438_add_home_page/` — new `HomePage` model
- `src/lib/home-page.ts` — new: `getHomePage()`, `HomePageSlug`, `IHomePage`
- `src/app/(admin)/admin/homepage/carousel/limits.ts` — `MAX_HOME_BANNER_SIZE`/`_LABEL`, `ACCEPTED_HOME_IMAGE_TYPES`
- `src/app/(admin)/admin/homepage/carousel/actions.ts` — new: `uploadHomePageBanner`, `saveHomePage`
- `src/app/(admin)/admin/homepage/carousel/home-page-form.tsx` — new: `HomePageForm`
- `src/app/(admin)/admin/homepage/carousel/page.tsx` — renders `HomePageForm` above `CarouselTable`; `AdminTitle` title "Carousel" → "Content"
- `src/app/(admin)/components/sidebar.tsx` — Homepage submenu label "Carousel" → "Content" (slug unchanged)
- `ARCHITECTURE.md`, `DECISIONS.md` (ADR-082)
**Acceptance criteria:**
- [x] The Homepage sidebar submenu reads "Content", still linking to
  `/admin/homepage/carousel`.
- [x] `/admin/homepage/carousel` shows a Banner section (2560x1440,
  1440x2560, 2048x1536, 1536x2048 — only 2560x1440 required) above the
  existing carousel list, saved independently of it via its own Save button.
- [x] Reloading the page after a save shows the previously uploaded images
  in each of the four slots.
- [x] `tsc --noEmit` passes.
**Do not:** Wire the saved banner into the public homepage hero — that
section still renders its own static images; this task is admin-only, same
deferral as Category's banner (ADR-035).

## [x] Task: Product/Device CMS — search, category/tag multiselect filters, pagination

**Context:** `/admin/product-device/{products,devices}/items` load every row of that
`type` in one unfiltered `getProductItems()` call — fine at today's catalogue size, not
once it grows. Need a name search, a category multiselect, a tag multiselect, and
pagination, shared by both Products and Devices since they're the same `ItemTable`
parameterized by `type`. See ADR-083 for how this interacts with the existing
drag-and-drop reorder.
**Approach:** Move filtering/pagination server-side, driven by URL search params (`q`,
`categories`, `tags`, `page`) so `products/items` and `devices/items` (already thin
server components) parse them and pass filtered+paginated data down — no new API route,
no client-side full-list loading.
- `getProductItems(type, filters)` takes `{ search?, categoryIds?, tagIds?, page?,
  pageSize? }`, returns `{ items, total }`. `where` combines: `name` case-insensitive
  `contains` for search (name only, not tagline — no other search in this codebase spans
  multiple fields); `categoryId: { in: categoryIds }` for the category filter (exact
  match against the flattened tree, no descendant expansion — consistent with every
  other place `categoryId` is queried, e.g. `getPublishedProductCards`); `tags: { some:
  { id: { in: tagIds } } }` for the tag filter.
- New generic `MultiSelectFilter` (checkbox popover, modeled on `TagPicker`'s toggle list
  minus its create/delete affordances) reused for both the category filter (fed the
  flattened tree, same `flattenDescendants` shape as `CategoryPicker`) and the tag
  filter (fed `getTags(type)`).
- New `ItemFilterBar` (client component): debounced search `Input`, the two
  `MultiSelectFilter`s, a "Clear filters" action — all read/write the URL via
  `useRouter`/`useSearchParams` (`router.replace`, not `push`, so typing doesn't spam
  history), resetting `page` to 1 on any filter change.
- New `src/components/ui/pagination.tsx` (shadcn's standard Button-based primitive) —
  first pagination control in this codebase; rendered under the table.
- **Reorder gating (ADR-083):** drag-and-drop reorder is only enabled when the view is
  the plain, unfiltered, page-1 list (`!search && categoryIds.length === 0 &&
  tagIds.length === 0 && page === 1`) — `reorderProducts` itself is unchanged, since a
  page-1-unfiltered slice is exactly the lowest-`order` contiguous prefix and rewriting
  its `order` to `0..pageSize-1` stays globally consistent. Any filter or page beyond 1
  disables the grip handle.
- **Page size is user-selectable** (`10 | 20 | 50 | "all"`, `pageSize` URL param,
  `PRODUCT_LIST_PAGE_SIZE_OPTIONS` in `limits.ts`) — `"all"` disables `skip`/`take`
  server-side entirely (`getProductItems` returns every matching row) and always reports
  a single page, which also fully restores free-list reorder (page 1 with `pageSize=all`
  and no filters *is* the complete ordered list, same as before this task).
- `ItemTable` resyncs its local `items` state from the `items` prop via `useEffect`
  rather than a remount-forcing `key` — an earlier version of this task keyed `ItemTable`
  on the filter/page state, which incidentally reset every `MultiSelectFilter` popover's
  own `open` state on each remount, closing it after every single select/unselect.
**Files to create or modify:**
- `src/interfaces/general.ts` — add `IProductListFilters`, `IProductListResult`
- `src/lib/products.ts` — `getProductItems` takes filters, returns `{ items, total }`
- `src/app/(admin)/admin/product-device/limits.ts` — `PRODUCT_LIST_PAGE_SIZE`
- `src/components/ui/pagination.tsx` — new shadcn primitive
- `src/app/(admin)/admin/product-device/multi-select-filter.tsx` — new
- `src/app/(admin)/admin/product-device/item-filter-bar.tsx` — new
- `src/app/(admin)/admin/product-device/parse-item-list-search-params.ts` — new: shared
  `searchParams` → `{ search, categoryIds, tagIds, page }` parsing for both list routes
- `src/app/(admin)/admin/product-device/item-table.tsx` — paginated items, filter bar,
  pagination controls, reorder gated per ADR-083
- `src/app/(admin)/admin/product-device/products/items/page.tsx`,
  `devices/items/page.tsx` — parse `searchParams`, fetch categories/tags for filter
  options, fetch filtered+paginated items
- `ARCHITECTURE.md`, `DECISIONS.md` (ADR-083)
**Acceptance criteria:**
- [ ] Typing in the search box filters the list by product/device name (debounced, no
  full page reload flash). (implemented, not yet browser-verified)
- [ ] Selecting categories/tags in either multiselect narrows the list to matches;
  multiple selections within one filter are OR'd, the two filters AND together with
  search. (implemented, not yet browser-verified)
- [ ] The list is paginated at `PRODUCT_LIST_PAGE_SIZE` per page with working
  prev/next/page-number controls; filters + search persist across page navigation via
  the URL. (implemented, not yet browser-verified)
- [ ] Refreshing the page or sharing the URL preserves the current search/filter/page
  state. (implemented, not yet browser-verified)
- [ ] The reorder grip handle is enabled only when no search/filter is active and
  `page === 1`; it's visibly disabled (not just silently broken) otherwise. (implemented,
  not yet browser-verified)
- [ ] Reordering on the plain page-1 view still persists correctly (existing behavior
  unchanged). (implemented, not yet browser-verified)
- [x] `tsc --noEmit` passes.
**Do not:** Add descendant-inclusive category filtering, cross-page drag reorder, or a
generic reusable pagination/filter data-fetching hook — out of scope for this task.

## [x] Task: Public catalogue — search, category/tag multiselect filters, infinite scroll

**Context:** Same ask as the admin task above (search, category multiselect, tag
multiselect), applied to the public `/devices/[...slug]` and `/products/[...slug]`
catalogue grid (`CategoryPageView`, rendered for a leaf category's own products), but
with infinite scroll instead of page-number pagination — a public shopper-facing grid,
not an admin table. Visual language borrowed from the existing (currently unused)
`CatalogueFilter`/`Filter.tsx` — floating label cut into the trigger's top border,
`text-lg font-medium`, `text-brand-red` label. See ADR-084 for the two real decisions
this forces: filter scope crossing the current category, and a client-triggered public
read path that didn't exist before.
**Approach:**
- New `getPublicCatalogueCards(type, filters)` in `src/lib/products.ts` — published-only
  (`status: "public"`), same `where` shape as the admin task's `getProductItems`
  (search on `name`, exact `categoryId` match, `tags: { some: ... } }`), offset/limit
  pagination (`skip`/`take: limit + 1` to detect `hasMore` without a second `count`
  query). Each card resolves its own URL via `getCategoryAncestry` (same per-product
  ancestry lookup and accepted cost as `getPublishedProductPickerOptions`) rather than a
  single shared `urlPrefix`, since results can now span more than one category.
- New `src/app/(user)/components/catalogue/catalogue-actions.ts` (`"use server"`) —
  thin `loadCatalogueCards(type, filters)` wrapper the client calls for both "filters
  changed" (refetch from offset 0) and "scrolled near the bottom" (fetch the next batch
  and append). Read-only — a server action rather than a new API route, since the
  client only ever needs one round trip per interaction.
- New `CatalogueProductGrid.tsx` (client component) replaces the plain grid in
  `CategoryPageView` for a leaf category: search input + category multiselect (options:
  the full cached `getPublicDeviceCategoryTree`/`getPublicProductCategoryTree`,
  pre-selected to the current category) + tag multiselect (`getTags(type)`) + the
  existing `DeviceCard` grid + an `IntersectionObserver` sentinel that calls
  `loadCatalogueCards` for the next batch while `hasMore` and not already loading.
  Unlike the admin task, filter/scroll state is **not** URL-driven — infinite scroll
  isn't meaningfully deep-linkable the way a numbered page is.
- New `CataloguePopoverFilter.tsx` — the category/tag multiselect popover, restyled to
  match `Filter.tsx`'s floating-label trigger rather than reusing the admin's
  `MultiSelectFilter` (different route group, different visual language).
- `src/app/(user)/components/catalogue/limits.ts` — `CATALOGUE_PAGE_SIZE`.
**Files to create or modify:**
- `src/lib/products.ts` — new `getPublicCatalogueCards`, `IPublicCatalogueFilters`,
  `IPublicCatalogueResult`
- `src/app/(user)/components/catalogue/limits.ts` — new: `CATALOGUE_PAGE_SIZE`
- `src/app/(user)/components/catalogue/catalogue-actions.ts` — new: `loadCatalogueCards`
- `src/app/(user)/components/catalogue/CataloguePopoverFilter.tsx` — new
- `src/app/(user)/components/catalogue/CatalogueProductGrid.tsx` — new
- `src/app/(user)/components/catalogue/CategoryPageView.tsx` — renders
  `CatalogueProductGrid` instead of `DeviceFilterList` for a leaf category's own products
  (the "Browse Categories" sub-category grid is unchanged, still `DeviceFilterList`)
- `src/app/(user)/devices/[...slug]/page.tsx`, `src/app/(user)/products/[...slug]/page.tsx`
  — fetch the first batch via `getPublicCatalogueCards` instead of the fixed
  `getPublishedProductCards`, plus the category tree/tag list for filter options
- `ARCHITECTURE.md`, `DECISIONS.md` (ADR-084)
**Acceptance criteria:**
- [ ] The leaf-category product grid loads its first batch server-side (no
  client-side-only fetch on initial paint). (implemented, not yet browser-verified)
- [ ] Typing in the search box (debounced) or toggling a category/tag replaces the grid
  with a fresh first batch matching the new filters. (implemented, not yet
  browser-verified)
- [ ] Scrolling near the bottom of the grid loads and appends the next batch
  automatically, with no page-number controls anywhere on this page. (implemented, not
  yet browser-verified)
- [x] ~~The category multiselect defaults to the current leaf category pre-selected...~~
  Removed per feedback — the public grid stays scoped to its own leaf category (search +
  tag filter only); `getPublicCatalogueCards` still accepts `categoryIds` generally, it's
  just always called with `[defaultCategoryId]` now, not exposed as a filter control.
- [x] `getPublishedProductCards`/`home-carousels.ts`'s homepage-carousel usage is
  unchanged — this task adds a new function, it does not touch that one.
- [x] `tsc --noEmit` passes.
**Do not:** Make filter/scroll state URL-driven, touch `getPublishedProductCards` (the
homepage carousel's fixed-category fetch), or reuse the admin's `MultiSelectFilter`
component directly across the `(admin)`/`(user)` route-group boundary.

## [x] Task: Product/Device secondary categories (many-to-many cross-listing)

**Context:** A device/product could only ever belong to one `Category`. Ask: let one
product be assigned to multiple categories, so e.g. a device filed under "Laser" can
also show up on the "Skin Restoration" category page. See ADR-085.
**Approach:** Keep `Product.categoryId` as the single required routing/primary category
(unchanged — still drives the product's own URL/breadcrumb, ADR-038) and add an optional
many-to-many `secondaryCategories` for cross-listing only, same implicit-m2m shape as
`Tag` (ADR-041). Extend the two query paths that already resolve each card's URL
per-product (so a secondary-category match can never produce a broken link) to match
either primary or secondary; leave the one path that shares a single `urlPrefix`
(`getPublishedProductCards`/home carousels) untouched.
**Files to create or modify:**
- `prisma/schema.prisma` — `Product.secondaryCategories` / `Category.secondaryProducts`
  implicit m2m relation
- `prisma/migrations/20260803092310_add_product_secondary_categories/` — new, additive
  (`CREATE TABLE` only)
- `src/interfaces/general.ts` — `IProduct.secondaryCategoryIds: string[]`
- `src/app/(admin)/admin/product-device/product-actions.ts` — `resolveSecondaryCategoryIds`,
  wired into `createProduct`/`updateProduct`
- `src/app/(admin)/admin/product-device/product-form.tsx` — "Secondary Categories" field
  (Identity tab), excludes the current primary category from its own options
- `src/app/(admin)/admin/product-device/multi-select-filter.tsx` — optional `className`
  prop so the form field (not just the filter bars) can size the trigger full-width
- `src/lib/products.ts` — `mapProductRow`/`getProductById`/`getPublishedProductBySlug`
  include the relation; `getProductItems`/`getPublicCatalogueCards`'s `categoryIds` filter
  OR-matches primary or secondary
- `DECISIONS.md` (ADR-085)
**Acceptance criteria:**
- [x] Migration is additive only — no existing column altered or dropped.
- [x] Saving a product with one or more secondary categories persists them; picking the
  same category as both primary and secondary is prevented (client-side picker excludes
  it, server re-validates).
- [x] Admin list filter and public catalogue browse/search match a product filed under a
  category either as primary or secondary.
- [x] Every card produced by a secondary-category match still resolves to the product's
  one real (primary-category) URL.
- [x] Home-carousel "category" mode is unaffected — still primary-category-only.
- [x] `tsc --noEmit` passes.
- [ ] Manually verified in the browser (admin form save/reload round-trip, public
  category page cross-listing).
**Do not:** Make `categoryId` itself many-to-many, or let a product resolve at more than
one public URL.

## [x] Task: Per-product "Show in navbar menu" toggle

**Context:** The navbar mega-menu only ever lists `Category` nodes — a product never
appears in it by name. Ask: let specific products show up as named items in their
category's dropdown, without having to model each one as its own `Category` node just to
get a menu entry. See ADR-086.
**Approach:** Add `Product.showInMenu` (per-product, not category-wide, so an admin picks
which products actually warrant a menu entry). `mapCategoriesToNavMenu` becomes async,
fetches every public + menu-flagged product for the type in one query, and appends each
category's matches after its sub-categories in that category's `menu` array — each product
becomes a leaf entry at `/<...ancestorSlugs>/<product.slug>`, a path `resolveDevicesRoute`
already resolves. `LargeDropdown`'s `MenuList` gained a 4th (non-recursive) nesting level
so a product filed under a depth-3 category still renders on desktop, matching
`SidebarDropdown`'s already-uncapped recursion.
**Files to create or modify:**
- `prisma/schema.prisma` — `Product.showInMenu Boolean @default(false)`
- `prisma/migrations/20260805042633_add_product_show_in_menu/` — new, additive
- `src/interfaces/general.ts` — `IProduct.showInMenu: boolean`
- `src/lib/products.ts` — `mapProductRow` includes `showInMenu`
- `src/lib/categories.ts` — `getPublicNavProductsByCategory`, `branchHasNavContent`,
  `mapCategoriesToNavMenu` is now `async` and takes `type`
- `src/app/(user)/layout.tsx` — awaits `mapCategoriesToNavMenu` for both trees
- `src/app/(user)/components/navbar/LargeDropdown.tsx` — `MenuList` renders a 4th level
- `src/app/(admin)/admin/product-device/product-actions.ts` — `showInMenu` in
  `productFieldsSchema`, persisted on create/update
- `src/app/(admin)/admin/product-device/product-form.tsx` — "Show in navbar menu" switch
  in the Identity tab
- `DECISIONS.md` (ADR-086)
**Acceptance criteria:**
- [x] Migration is additive only — no existing column altered or dropped.
- [x] Toggling the switch and publishing a product shows it by name in the navbar dropdown
  under its category, alongside any sub-categories.
- [x] A `hidden` product with the switch on does not appear in the menu.
- [x] A plain breadcrumb category (`isPage: false`) with only menu-flagged products under
  it is no longer pruned from the nav (ADR-043's rule extended, not bypassed).
- [x] Works at every category depth (1-3), including a product filed under the deepest
  (depth-3) category, on both `LargeDropdown` (desktop) and `SidebarDropdown` (mobile).
- [x] `tsc --noEmit` passes.
- [ ] Manually verified in the browser.
**Do not:** Make this a category-wide switch, or let it show a `hidden` product in the
menu.

**Follow-up refinements (same day, see ADR-086's addendum):**
- [x] "Show in navbar" switch moved next to the Category picker in `product-form.tsx`
  (was its own bordered row below Status).
- [x] `CategoryPicker`, `flattenSecondaryCategoryOptions`, and `item-filter-bar.tsx`'s
  `flattenCategoryOptions` all now let a root (depth-1) category be selected directly,
  not just its descendants.
- [x] `CategoryPageView` renders both "Browse Category" (sub-categories) and "Browse
  Catalogue" (this category's own products) when a category has both — previously only
  one or the other, based on `children.length` alone. Both `devices/[...slug]/page.tsx`
  and `products/[...slug]/page.tsx` now always fetch `productCards`.
- [x] `tsc --noEmit` passes.
- [ ] Manually verified in the browser.

## [x] Task: Stop hiding no-page category branches from the navbar

**Context:** ADR-043 dropped any category branch with no page anywhere in it from the live
nav, which made a freshly-created or in-progress branch invisible with no feedback. See
ADR-087 (supersedes ADR-043).
**Approach:** Remove the filter in `buildCategoryNavMenu` entirely; delete the now-dead
`hasPageInBranch`/`branchHasNavContent` helpers; replace the admin tree's "hidden from
navbar" `EyeOff` warning icon with a plain "this category has its own page" `FileText`
indicator driven by `node.isPage` directly (a fact about the node, not a nav-visibility
prediction).
**Files to create or modify:**
- `src/lib/categories.ts` — `buildCategoryNavMenu` drops the `branchHasNavContent` filter
- `src/lib/category-visibility.ts` — deleted (only caller removed)
- `src/app/(admin)/admin/product-device/category-tree.tsx` — `EyeOff`/`hiddenFromNavbar`
  replaced with `FileText`/`node.isPage`
- `DECISIONS.md` (ADR-087, ADR-043 marked superseded)
**Acceptance criteria:**
- [x] A category with `isPage: false` and no children/products still shows in the nav as
  inert breadcrumb text (ADR-033's rule is unaffected).
- [x] Admin tree shows a page icon next to every node with `isPage: true`, regardless of
  its branch's nav visibility.
- [x] `tsc --noEmit` passes.
- [ ] Manually verified in the browser.
**Do not:** Reintroduce branch-level pruning, or change `isPage: false`'s existing
"inert text, not a link" rendering (ADR-033).

## [x] Task: Homepage hero banner accepts an optional MP4 per size, with a required fallback image

**Context:** The client asked for the homepage hero banner (`HomePage` model,
ADR-082) to support a video instead of a static image, starting with just this
one banner. Constraints: MP4 only, 8MB max per size, and a fallback image is
mandatory whenever a video is used. See ADR-089.
**Approach:** Added a nullable `bannerXxxVideoUrl` column per existing banner size
(sm/md/lg/xl) — no type discriminator; presence of the video URL is what triggers
video rendering, and the size's own existing image column becomes required (and
doubles as the `<video>` poster/fallback) once a video is set for that size. New
`UploadField` `kind: "video"` (mp4-only accept, native `<video controls>` preview)
for reuse by future video-capable banners. Public rendering extracted into a new
`HeroBanner` Client Component (`onError` swaps back to the plain image if the
video fails to load/play) so `Hero.tsx` itself stays a Server Component.
**Files to create or modify:**
- `prisma/schema.prisma`, `prisma/migrations/20260819173141_add_home_page_banner_video/`
- `src/lib/home-page.ts` — `IHomePage`/`getHomePage` gain the 4 video fields
- `src/app/(admin)/admin/homepage/content/limits.ts` — `MAX_HOME_BANNER_VIDEO_SIZE`/`_LABEL`, `ACCEPTED_HOME_VIDEO_TYPES`
- `src/app/(admin)/admin/homepage/content/actions.ts` — `uploadHomePageBannerVideo`, `saveHomePage`'s schema/upsert/fallback validation
- `src/app/(admin)/admin/homepage/content/home-page-form.tsx` — a video `UploadField` per size, client-side fallback check before submit
- `src/components/upload-field.tsx` — new `"video"` kind
- `src/app/(user)/(homepage)/(sections)/HeroBanner.tsx` — new
- `src/app/(user)/(homepage)/(sections)/Hero.tsx` — renders `HeroBanner` per size
- `src/app/(user)/(homepage)/page.tsx` — passes the 4 new fields through
- `ARCHITECTURE.md`, `DECISIONS.md` (ADR-089)
**Acceptance criteria:**
- [x] Each of the four banner sizes has its own optional video upload, independent
  of the other three.
- [x] Uploading a video over 8MB, or a non-MP4 file, is rejected with an inline
  error, both via the upload widget and (redundantly) on save.
- [x] Saving a size's video without that size's image is blocked, client- and
  server-side, with a message naming the specific banner size.
- [x] On the public homepage, a size with a video plays it (muted, looped,
  autoplaying, `playsInline`) using its image as the poster; a size with no video
  renders exactly as before.
- [x] If a video fails to load/play, that size falls back to rendering its plain
  image instead of a blank area.
- [x] `tsc --noEmit` passes (pending `npx prisma generate`, blocked mid-session by
  a file lock from a running dev server — rerun after stopping it).
**Do not:** Add a type discriminator column, or build this for any banner besides
the homepage hero — Category/Support/Contact/etc. banners are a separate task if
requested.

## [x] Task: Homepage hero banner video limit raised to 10MB

**Context:** The client asked for the homepage hero banner video cap (added in the
task above) to change from 8MB to 10MB.
**Approach:** Single-constant change — both the upload validation and the admin
form's helper text already read from the same `MAX_HOME_BANNER_VIDEO_SIZE`/
`MAX_HOME_BANNER_VIDEO_LABEL` pair, no other call sites existed. The Server
Action/proxy/Nginx body-size ceilings (ADR-011) were already raised to 100MB
globally, so no change was needed there.
**Files to create or modify:**
- `src/app/(admin)/admin/homepage/content/limits.ts`
- `ARCHITECTURE.md` — "up to 8MB" reference updated
**Acceptance criteria:**
- [x] A banner video between 8MB and 10MB, previously rejected, now uploads
  successfully.
- [x] The admin's own helper text reflects the new limit.
**Do not:** Change the still-image banner cap (`MAX_HOME_BANNER_SIZE`) — only the
video limit was in scope.

## [x] Task: Homepage hero banner form — table layout, real aspect ratios, unified image/video preview

**Context:** The banner form (task above) laid the four sizes out as flex-wrapped
columns, each showing a generic square image preview stacked above a plain video
picker with no view/delete affordance. The client asked for a table instead: one
column per screen size headed by a device icon + dimensions, with that size's
Image and Video uploads side by side and cropped to the size's *real* aspect ratio
(not a square) — plus the same eye-icon-to-view/trash-icon-to-delete interaction
the image upload already had, extended to video.
**Approach:** Rebuilt with the shadcn `Table` primitives, one `<TableHead>`/
`<TableCell>` per size via a small `BANNER_SIZES` config array (icon, dimension
label, real `UploadField` `aspect` — `"video"`/`"4:3"` for the landscape Xl/Lg
sizes, `"3:4"`/`"9:16"` for the portrait Md/Sm sizes — and a preview width class).
`UploadField`'s previously separate `kind: "video"` branch (Replace/Delete
buttons over a `controls` video) was folded into the same preview branch
`"image"`/`"carouselImage"` already use, so video gets the identical box: click
the box to replace, hover for Eye (opens the file in a new tab) and Trash
(delete). The inline `<video>` preview dropped `controls` (muted/looping/
autoplaying instead) since native controls would have swallowed the box's own
click-to-replace handler.
**Files to create or modify:**
- `src/components/upload-field.tsx` — merged the video preview into the image/
  carouselImage branch; `aspect`/`fit`/`preview` now apply to `kind: "video"` too
- `src/app/(admin)/admin/homepage/content/home-page-form.tsx` — table layout,
  `BANNER_SIZES` config, per-size real aspect ratios
**Acceptance criteria:**
- [x] The banner section renders as a table: header row is one icon + dimension
  label per size, body row is one cell per size containing Image and Video
  side by side.
- [x] Each size's Image and Video previews are cropped to that size's own real
  aspect ratio (landscape for Xl/Lg, portrait for Md/Sm), not a square.
- [x] An uploaded video shows an Eye icon (opens the file in a new tab) and a
  Trash icon (deletes it) on hover, matching the existing image behavior.
- [x] `tsc --noEmit` and `eslint` are clean on both changed files.
**Do not:** Change any other `UploadField` caller's behavior — `kind: "image"`/
`"carouselImage"` render identically to before; only `kind: "video"` gained the
box/Eye/Trash treatment it previously lacked.

## [x] Task: Public hero only fetches the video for the visitor's own breakpoint

**Context:** All four `HeroBanner` slots were always mounted (CSS `hidden ...`
classes only control visibility, not mounting), and `<video autoPlay>` fetches
regardless of `display:none` — so a visitor could download all four banner
videos (up to 4×10MB) even though only one is ever visible. See ADR-090.
**Approach:** New `HeroBannerGroup` client component runs a
`useActiveHeroBreakpoint` hook (four `matchMedia` queries mirroring each slot's
own CSS rule) and only mounts the `<video>` for the breakpoint that's actually
active; the other three always render their plain image regardless of whether
they have a video set.
**Files to create or modify:**
- `src/app/(user)/(homepage)/(sections)/HeroBanner.tsx` — replaced the single
  `HeroBanner` export with `HeroBannerGroup` + `useActiveHeroBreakpoint`
- `src/app/(user)/(homepage)/(sections)/Hero.tsx` — renders one `HeroBannerGroup`
  with a `slots` array instead of four separate `HeroBanner` calls
- `DECISIONS.md` (ADR-090)
**Acceptance criteria:**
- [x] Only the video matching the current viewport's orientation+width is
  requested over the network; the other three breakpoints' videos are never
  fetched.
- [x] Resizing/rotating across a breakpoint boundary can newly activate that
  size's video without a page reload.
- [x] The CSS-driven visible banner is unchanged — `isActive` only gates video
  fetching, never what's shown.
- [x] `tsc --noEmit` and `eslint` are clean.
**Do not:** Change which banner is visually shown at a given breakpoint — that's
still entirely the existing `hidden portrait:.../landscape:...` classes.

## [x] Task: One global switch cascades video down through every smaller size until one has its own

**Context:** The client wanted the "use this video for smaller sizes" control
to be one global switch, not per-size — enabling it cascades every size's
video down through smaller sizes with none of their own, across all four
sizes ordered largest → smallest (Xl, Lg, Md, Sm), until cascading reaches a
smaller size that has its own video (which takes over from there). The
switch should live outside the banner table and only be enabled once at
least one size actually has a video. See ADR-091 (this task went through two
prior shapes within the same task before landing here — same-orientation
pairs only, then three independent per-size toggles — both corrected before
anything shipped).
**Approach:** Replaced the three per-size `bannerXxxVideoUseForSmaller`
columns with a single `bannerVideoUseForSmaller` boolean on `HomePage`.
`resolveHomeBannerVideoUrls` (`src/lib/home-page.ts`) walks the four sizes in
order, carrying an "active cascading video" forward: a size with its own
video always resolves to that video and becomes the new active video; a size
with none resolves to the active video when the global switch is on, or to
no video when it's off. `home-page-form.tsx` renders one `Switch` as a
sibling after the `<Table>`, not inside any table cell, disabled unless at
least one of the four video URLs is non-empty.
**Files to create or modify:**
- `prisma/schema.prisma`,
  `prisma/migrations/20260820052500_simplify_home_page_video_cascade_to_global/`
  (hand-written — `prisma migrate dev` requires an interactive destructive-
  change confirmation this environment can't give; applied via
  `prisma migrate deploy` instead)
- `src/lib/home-page.ts` — `IHomePage`/`getHomePage` collapse to the one flag;
  `resolveHomeBannerVideoUrls` takes the single flag instead of three
- `src/app/(admin)/admin/homepage/content/actions.ts` — parses/normalizes the
  one flag (forced `false` server-side when no size has any video)
- `src/app/(admin)/admin/homepage/content/home-page-form.tsx` — removed the
  per-size `canCascade`/`Switch` from each table cell; added one `Switch`
  below the table
- `src/app/(user)/(homepage)/(sections)/Hero.tsx` — single
  `bannerVideoUseForSmaller` prop instead of three
- `src/app/(user)/(homepage)/page.tsx` — passes the one flag through
- `DECISIONS.md` (ADR-091)
**Acceptance criteria:**
- [x] The switch is a single control outside the table, not embedded in any
  size's column.
- [x] The switch is disabled until at least one of the four sizes has a
  video uploaded.
- [x] With the switch on, Xl's video (with nothing else uploaded) plays on
  Lg, Md, and Sm alike.
- [x] Uploading Lg's own video breaks the chain there — Md/Sm inherit from
  Lg, not Xl, once cascading reaches Lg.
- [x] Turning the switch off makes every size show only its own video (or
  image), regardless of what's uploaded elsewhere.
- [x] `tsc --noEmit` and `eslint` are clean.
**Do not:** Reintroduce a per-size toggle — the ask is explicitly one global
control.

## [x] Task: Same banner-video/cascade input format on Articles, Galleries, Podcast, Registration & Documentation, Warranty & Service, Marcom & Promotion, Career, and Contact → Content

**Context:** The client asked for the homepage banner's table/Image+Video/
cascade-switch admin UI, plus the public video-with-fallback rendering, on
all the other banner-bearing pages — following each page's own existing
banner sizes rather than the homepage's. Research found `SupportPage`
(shared by Registration & Documentation, Warranty & Service, Marcom &
Promotion, Career), `ContactPage`, `PodcastPage`, `ArticlesPage`, and
`GalleriesPage` all already share one banner shape (Xl 2560x1107 required,
Md 1363x1107, Sm 1107x1107) and one public `PageBanner` component across all
8 pages — so the work was "extend 5 models + wire 8 pages," not build 8
separate features. See ADR-092.
**Approach:** Extracted the genuinely shared pieces (cascade algorithm,
fallback validation, admin banner-fields UI, public breakpoint-gated media
renderer) into `src/lib/banner-video.ts` / `src/components/page-banner-fields.tsx`
/ `src/app/(user)/components/PageBannerMedia.tsx`; everything page-specific
(Zod schemas, upload actions, `limits.ts` constants) stayed duplicated per
feature folder, matching this codebase's existing per-page-folder convention.
**Files to create or modify:**
- `prisma/schema.prisma`,
  `prisma/migrations/20260820063038_add_static_page_banner_video/` — all 5
  models gain `bannerXlVideoUrl`/`bannerMdVideoUrl`/`bannerSmVideoUrl`/
  `bannerVideoUseForSmaller`
- `src/lib/banner-video.ts` — new: `resolveCascadingVideoUrls<K>`,
  `findMissingBannerVideoFallback`, `PAGE_BANNER_SIZE_ORDER`/
  `PageBannerSizeKey`/`PAGE_BANNER_SIZE_LABELS`
- `src/lib/home-page.ts` — `resolveHomeBannerVideoUrls` now a thin wrapper
  around the shared resolver
- `src/lib/support-pages.ts`, `contact-pages.ts`, `podcast-page.ts`,
  `articles-page.ts`, `galleries-page.ts` — interfaces/`getXxxPage` gain the
  4 new fields
- `src/components/upload-field.tsx` — exported `UploadActionResult`
- `src/components/page-banner-fields.tsx` — new: shared admin banner
  table+cascade-switch UI
- `src/app/(admin)/admin/{support,contact,media/podcast,media/articles,
  media/galleries}/limits.ts` — video size/type constants per area
- `src/app/(admin)/admin/{support,contact,media/podcast,media/articles,
  media/galleries}/actions.ts` — `uploadXxxPageBannerVideo`, extended
  `saveXxxPage` schema/validation/upsert
- `src/app/(admin)/admin/support/support-page-form.tsx`,
  `contact/contact-page-form.tsx`, `media/podcast/podcast-page-form.tsx`,
  `media/articles/articles-page-form.tsx`,
  `media/galleries/galleries-page-form.tsx` — rewritten onto
  `PageBannerFields`
- `src/app/(user)/components/PageBanner.tsx` — video/cascade props, resolves
  effective URLs, renders `PageBannerMedia`
- `src/app/(user)/components/PageBannerMedia.tsx` — new: breakpoint-gated
  slot renderer (mirrors `HeroBanner.tsx`'s pattern, width-only breakpoints)
- The 8 public `page.tsx` files under `src/app/(user)/support/*`,
  `src/app/(user)/contact/`, `src/app/(user)/media/*` — pass the new props
  through to `PageBanner`
- `ARCHITECTURE.md`, `DECISIONS.md` (ADR-092)
**Acceptance criteria:**
- [x] Each of the 5 admin forms shows the same table (icon headers, Image +
  Video side by side, real-ish aspect boxes) and one global cascade switch
  the homepage banner has, sized for that page's own Xl/Md/Sm banner set.
- [x] All 8 public pages only fetch the video matching the visitor's actual
  breakpoint (mirrors ADR-090), with cascade and own-video-wins semantics
  identical to the homepage hero.
- [x] Registration & Documentation, Warranty & Service, Marcom & Promotion,
  and Career (all backed by `SupportPage`) each edit and render
  independently despite sharing one form component and one model.
- [x] `tsc --noEmit` and `eslint` are clean across every touched file.
**Do not:** Build 8 independent copies of the banner UI/logic — reuse the
shared pieces above; only page-specific wiring (schemas, upload actions,
limits) stays duplicated, matching this codebase's existing per-feature-folder
convention.

## [x] Task: Category banner gains the same video/cascade capability

**Context:** The client asked for the Category page banner (four sizes,
Sm/Md/Lg/Xl — ADR-035) to accept the same optional-MP4-per-size + fallback-
image + global-cascade capability `HomePage` and the 5 static pages already
have (ADR-089/090/091/092). Unlike every prior banner form, the Category
banner is edited inside a `Dialog` fixed to `sm:max-w-2xl` (the category
add/edit dialog), too narrow to fit four Image+Video pairs side by side —
Video sits stacked under Image within each size's column instead. See
ADR-093.
**Approach:** Reused the shared cascade algorithm/fallback validation
(`src/lib/banner-video.ts`, already generic from ADR-092) for the write path;
duplicated the admin table UI directly in `category-tree.tsx` (matching this
banner's own pre-existing precedent of living inline, not in a shared
component) with Video stacked under Image per column; extracted the public
breakpoint-gated slot renderer (`HeroBannerGroup`, previously homepage-only)
into a shared location since Category's public rendering shares the exact
same four-size orientation-paired shape as the homepage hero.
**Files to create or modify:**
- `prisma/schema.prisma`,
  `prisma/migrations/20260820072327_add_category_banner_video/` — `Category`
  gains `bannerSmVideoUrl`/`bannerMdVideoUrl`/`bannerLgVideoUrl`/
  `bannerXlVideoUrl`/`bannerVideoUseForSmaller`
- `src/interfaces/general.ts` — `ICategory` gains the 5 new fields
- `src/lib/categories.ts` — `getCategoryTree` reads the new columns; new
  `resolveCategoryBannerVideoUrls`/`CATEGORY_BANNER_SIZE_ORDER` (thin wrapper
  around the shared `resolveCascadingVideoUrls`)
- `src/app/(admin)/admin/product-device/limits.ts` — video size/type
  constants (`MAX_CATEGORY_BANNER_VIDEO_SIZE`/`LABEL`,
  `ACCEPTED_CATEGORY_VIDEO_TYPES`)
- `src/app/(admin)/admin/product-device/actions.ts` — new
  `uploadCategoryBannerVideo`; `categoryPageContentSchema`/
  `parseCategoryPageContent` extended with the video fields, cascade flag,
  and `findMissingBannerVideoFallback` check
- `src/app/(admin)/admin/product-device/category-tree.tsx` — `CategoryForm`
  gains the 5 new fields/state; banner table's per-size column stacks Image
  above Video; global cascade `Switch` below the table
- `src/app/(user)/components/HeroBannerGroup.tsx` — new: moved from
  `src/app/(user)/(homepage)/(sections)/HeroBanner.tsx`, `imageAlt` now a
  required prop instead of a hardcoded string
- `src/app/(user)/(homepage)/(sections)/Hero.tsx` — imports the relocated
  `HeroBannerGroup`, passes explicit `imageAlt`
- `src/app/(user)/components/catalogue/Hero.tsx` (`HeroDevice`) —
  `bannerUrls` gains `smVideo`/`mdVideo`/`lgVideo`/`xlVideo`; renders through
  `HeroBannerGroup` instead of 4 inline `next/image` calls
- `src/app/(user)/components/catalogue/CategoryPageView.tsx` — resolves and
  passes the cascaded video URLs into `HeroDevice`
- `ARCHITECTURE.md`, `DECISIONS.md` (ADR-093)
**Acceptance criteria:**
- [x] The admin banner table shows Video stacked under Image per size
  column, fitting inside the fixed-width category dialog.
- [x] A size's video requires that size's own image, enforced both
  client-side (`CategoryForm`) and server-side (`parseCategoryPageContent`).
- [x] The global cascade switch appears only once at least one size has a
  video, and cascades largest → smallest identically to `HomePage`'s own.
- [x] The public category hero only fetches the video matching the visitor's
  actual breakpoint (mirrors ADR-090), for both new and existing categories.
- [x] `HeroHomeSection`'s rendered output is unchanged after the
  `HeroBannerGroup` relocation.
**Do not:** Reuse `PageBannerFields`/`PAGE_BANNER_SIZE_ORDER` (the 5 static
pages' shared 3-size component) — Category's shape is the four-size Xl/Lg/Md/
Sm set, not Xl/Md/Sm.

## [x] Task: Email contact form submissions to info@red-indonesia.co.id

**Context:** `submitContactForm` (ADR-073) only wrote to `ContactSubmission`,
surfaced in the admin Form Response list. The client also wants every
submission emailed directly to `info@red-indonesia.co.id`.
**Approach:** SMTP via `nodemailer`, using SMTP credentials for the mailbox
that already exists for that domain, rather than a new transactional email
API — see ADR-094. New `src/lib/mailer.ts` wraps a lazily-built, cached
`Transporter` behind `sendMail({ to, subject, text })`, reading
`SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASS`/`SMTP_FROM` from env.
`submitContactForm` calls it after the `ContactSubmission` insert succeeds,
in its own `try/catch` so a broken SMTP config logs and no-ops instead of
failing the visitor's submission.
**Files to create or modify:**
- `src/lib/mailer.ts` — new: `sendMail`
- `src/app/(user)/contact/actions.ts` — call `sendMail` after the
  `ContactSubmission` insert
- `.env` — added `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASS`/`SMTP_FROM`
  (blank locally; real values are host-specific, not committed)
- `package.json` — added `nodemailer`, `@types/nodemailer`
- `ARCHITECTURE.md` (updated `ContactSubmission` bullet + new Infrastructure
  bullet), `DECISIONS.md` (ADR-094)
**Acceptance criteria:**
- [x] A valid contact form submission still creates a `ContactSubmission` row
  and shows the success message even if SMTP is unset/misconfigured.
- [x] With valid `SMTP_*` env vars set, submitting the form sends an email to
  `info@red-indonesia.co.id` containing the name, phone, email, and question.
- [x] A `sendMail` failure is caught and logged, never surfaced to the
  visitor and never blocks the DB write or the success response.
**Do not:** Make the email send block or fail the form submission — the
`ContactSubmission` row is the source of truth.

## [x] Task: Delete and mark-as-unread on Contact Form Response

**Context:** `/admin/contact/form-response` (ADR-075) could only mark a
submission read on open (ADR-078); there was no way to remove one or flip it
back to unread.
**Approach:** Two new server actions in `admin/contact/actions.ts`, same
shape as `markContactSubmissionAsRead`/`deletePodcast`
(`admin/media/podcast/actions.ts`): `deleteContactSubmission` (hard delete,
`revalidatePath`) and `markContactSubmissionAsUnread` (flips `isRead` back to
`false`, same silent-fail reasoning as the existing read action). In
`form-response-view.tsx`, the list now holds local `items` state (synced from
the `submissions` prop via `useEffect`, mirroring `PodcastTable`'s `items`
pattern) so a delete updates the UI immediately; each row grew a
hover-revealed trash button (row restructured into a flex container with two
sibling buttons instead of a nested button, since a `<button>` can't nest
another one) opening a shadcn `Dialog` confirm, same delete-confirmation
pattern as `PodcastTable`. The detail pane header gained a "Mark as unread"
button, shown only while the open message is currently read.
**Files to create or modify:**
- `src/app/(admin)/admin/contact/actions.ts` — new: `deleteContactSubmission`,
  `markContactSubmissionAsUnread`
- `src/app/(admin)/admin/contact/form-response/form-response-view.tsx` —
  local `items` state, per-row delete button + confirm dialog, detail pane
  "Mark as unread" button
- `ARCHITECTURE.md` — updated `ContactSubmission` bullet
**Acceptance criteria:**
- [x] Hovering a row in the Messages list reveals a delete (trash) button
  that does not also open the message.
- [x] Confirming delete removes the row from the list immediately and, if
  that message was open in the detail pane, closes the pane.
- [x] Opening a message marks it read as before; the detail pane then shows
  a "Mark as unread" button that clears the unread dot's absence (dot
  reappears in the list) without needing a page refresh.
- [x] A failed delete shows an error message and leaves the row in place.
**Do not:** Add a soft-delete/trash flag — this is a hard delete, matching
`deletePodcast`/`deleteGallery`'s existing convention for this app.

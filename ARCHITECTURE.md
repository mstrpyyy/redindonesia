# Architecture Overview

This document describes the high-level architecture of the Radian Elok project.

## System Overview

PT. Radian Elok Distriversa is a catalog and marketing website for medical aesthetic devices. The application is built as a modern, high-performance web application using Next.js.

## Tech Stack

- **Frontend Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Icons**: Lucide React, LineIcons
- **Animations**: AOS (Animate on Scroll)
- **Carousels**: Embla Carousel
- **Utilities**: clsx, tailwind-merge

## Component Patterns

### Layout & Sections
- **BodyWrapper**: A standard container used across pages to maintain consistent padding, max-width, and centering (`body-container-limit`).
- **(sections) Grouping**: Complex pages (like the homepage) break down content into a `(sections)` directory to keep the main `page.tsx` clean and modular.
- **Catalogue System**: A specialized set of components in `src/app/components/catalogue` used for product displays:
  - `HeroDevice`: Full-viewport hero sections with breadcrumbs and document download links.
  - `DeviceFilterList`: Combines filtering logic with a responsive grid of product cards.
  - `GridListDevice`: Displays features or treatments in a high-contrast grid (often used on black backgrounds).

## Client-Side Interactivity

- **AOS (Animate on Scroll)**: Used extensively for entry animations. Components use `data-aos` attributes (e.g., `fade-up`, `fade-left`) with standardized durations.
- **Before-After Sliders**: Implemented using `react-compare-slider` for clinical result demonstrations.
- **360 Viewer**: A custom interactive component for rotating product views.
- **Carousels**: Powered by `embla-carousel-react` with custom navigation controls.

## UI Architecture

- **Typography Classes**: Standardized classes like `h2-format`, `h3-format`, and `p-format` are defined in `globals.css` using Tailwind's `@apply` directive to ensure consistent font scaling across devices.
- **Theming**: Tailwind v4 configuration via `@theme` block in `globals.css` using `oklch` and CSS variables for brand colors (`brand-red`, `brand-peach`).

## Data Flow

The application follows a **hybrid data architecture**:
- Static marketing content (navigation labels, brand logos, homepage carousels) is
  managed in `src/lib/data.ts` as constant objects.
- CMS content (articles, the device/product category tree) is stored in PostgreSQL and
  read via Prisma. `/media/articles` queries `Article` directly; the admin
  `/admin/product-device/{devices,products}` pages query `Category` (see ADR-019) —
  neither reads from `src/lib/data.ts`'s `deviceProductMenu`, which is no longer the
  source of truth for either tree (still used as-is for the public navbar dropdown
  until that's wired to `Category` too, see TASKS.md).
- All rendering is performed server-side where possible, with client-side interactivity
  for dropdowns, carousels, and animations.

## CMS & Auth Architecture

- **Database**: PostgreSQL, running in Docker on the VPS (`docker-compose.yml` under
  `~/apps/red-indonesia`), exposed only on `127.0.0.1:5432`. Database `cms_db`, user
  `cms_user`.
- **ORM**: Prisma 6 (`prisma-client-js` provider). Pinned to v6 — v7 requires driver
  adapters and a separate `prisma.config.ts`, not worth adopting yet (see ADR-004).
- **Schema** (`prisma/schema.prisma`):
  - `AdminAccount` — `id`, `username` (unique), `passwordHash`, `updatedAt`. Exactly one
    row is expected; there is no signup flow.
  - `Article` — `id`, `title`, `slug` (unique, auto-generated from `title`, see
    ADR-013), `excerpt?` (labeled "Subtitle" in the editor form, ADR-013),
    `content` (Tiptap-produced HTML), `coverImage?` (relative path under
    `/uploads/articles`), `status` (`"draft" | "published"`), `publishedAt?`,
    `createdAt`, `updatedAt`.
  - `SocialAccount` — `id`, `platform`, `label`, `profileImg` (relative path under
    `/uploads/social-accounts`), `url`, `order`, `createdAt`, `updatedAt`.
  - `Gallery` — `id`, `title`, `description?`, `images` (`String[]`, relative paths
    under `/uploads/galleries`), `order`, `createdAt`, `updatedAt` (see ADR-011).
  - `Category` — self-referential tree backing the admin-managed "Devices" and
    "Products" menus (see ADR-019). `id`, `type` (`"device" | "product"`, same
    string-enum convention as `Article.status`), `name`, `slug`, `depth` (1-3,
    stored rather than derived so the max-depth-3 rule is a single read, not a
    recursive parent walk), `order` (scoped per sibling group), `parentId?`
    (`null` for depth-1 nodes), `createdAt`, `updatedAt`. `onDelete: Cascade` on
    the self-relation means deleting a node deletes its whole subtree. Sibling
    slug uniqueness (scoped to `type` + `parentId`) is enforced in the server
    action, not a DB constraint — Postgres never treats `NULL` as equal to
    `NULL`, so a `@@unique([type, parentId, slug])` index can't catch duplicate
    depth-1 slugs (they all share `parentId = null`). A node can also opt into
    being a real page (`isPage`, ADR-033) with its own `bannerSmUrl`/
    `bannerMdUrl`/`bannerLgUrl`/`bannerXlUrl` (only `bannerXlUrl` required,
    ADR-035), `title`, `description`, `body`, `youtubeUrl` + related fields,
    and `heroTextColor` (ADR-045). Each banner size also has an optional
    `bannerXxxVideoUrl` (mp4, up to 10MB) plus one global
    `bannerVideoUseForSmaller` cascade flag — same mechanism as `HomePage`'s
    (ADR-089/090/091), extended here in ADR-093.
  - `Product` — a device/product detail entry (see ADR-020). `id`, `type`
    (`"device" | "product"`), `name`, `slug` (unique per `type`), `tagline?`,
    `thumbnail?` (relative path under `/uploads/products`), `cardBackground?`
    (one of the tints in `src/lib/card-backgrounds.ts`; null falls back to the
    default), `status`
    (`"draft" | "published"`), `order`, `categoryId` (FK to *any* `Category`
    node, not necessarily a depth-3 leaf — some brands have no sub-brand
    level), `segments` (`Json`, default `[]`), `createdAt`, `updatedAt`.
    `segments` is an ordered array of typed content blocks (hero, highlight,
    treatments grid, 360 viewer, tech spec accordion, applicator carousel,
    before/after, document download) rather than one column/table per
    section — see `src/interfaces/segments.ts` for the exact per-type shapes
    and `src/app/(admin)/admin/product-device/segment-types.ts` for the
    admin form's data-driven field definitions (one generic form-field
    renderer + repeater, not nine bespoke forms). Most "image"/"file" fields
    are plain URL text inputs; the ones that are always a real upload in
    practice (hero background image, hero/document downloadable files,
    certification logo + certificate) upload immediately on file select via
    `uploadSegmentAsset` (`segment-upload-actions.ts`, `/uploads/products-content`)
    and store the resulting URL — see ADR-021. The hero segment's background
    has the same four responsive sizes + optional per-size video + cascade
    flag as `Category`'s own banner (`bannerSmUrl`/`bannerSmVideoUrl`/…/
    `bannerXlUrl`(required)/`bannerXlVideoUrl`/`bannerVideoUseForSmaller`),
    stored as fields on the hero's own JSON entry rather than real columns
    (segments have no schema of their own) — rendered as one combined
    Image+Video table (`HeroBannerFields`, `segments-builder.tsx`) and, on
    the public page, through the same `HeroDevice`/`HeroBannerGroup`
    breakpoint-gated-fetch path Category uses. `imgUrl` is the pre-existing
    single-image field, kept only as a read fallback for a hero saved before
    this (`resolveHeroBannerXlUrl`, `src/lib/products.ts`) — see ADR-095,
    which extends the Category banner's video/cascade capability (ADR-093)
    here.
  - `SupportPage` — one row per static Support page (Registration &
    Documentation, Warranty & Service, Career, and Marcom & Promotion — the
    latter also keeps its own `SocialAccount`-driven highlight list
    alongside its banner/body, see ADR-080), keyed by a fixed `slug`
    (see ADR-070). `id`, `slug` (unique, one of `SUPPORT_PAGE_SLUGS`,
    `src/lib/support-pages.ts`), `bannerXlUrl` (1920x830, required in
    practice via the save action's Zod schema, not a DB constraint),
    `bannerMdUrl?` (1080x878), `bannerSmUrl?` (1080x1080, all relative
    paths under `/uploads/support-pages`), `body?` (Tiptap-produced HTML),
    `createdAt`, `updatedAt`. No add/delete flow — only upsert-by-slug from
    each page's own admin form (`/admin/support/<slug>`). Marcom's admin
    slug (`marcom`) and public route (`/support/marcom-promotion`) differ —
    `SUPPORT_PAGE_PUBLIC_PATH` maps between them for revalidation. Each size
    also has an optional `bannerXxxVideoUrl` (mp4, up to 10MB) plus one
    global `bannerVideoUseForSmaller` cascade flag — same mechanism as
    `HomePage`'s (ADR-089/090/091), extended to this shared 3-size shape
    (Xl/Md/Sm) and to the public `PageBanner` component all five banner-only
    pages below share — see ADR-092.
  - `ContactPage` — same shape as `SupportPage` (video/cascade fields
    included), for the admin Contact dashboard's "Content" submenu (see
    ADR-072). Currently one fixed slug (`content`, `CONTACT_PAGE_SLUGS` in
    `src/lib/contact-pages.ts`) feeding the public `/contact` page's banner +
    rich text body.
  - `ContactSubmission` — one row per public `/contact` form submission (see
    ADR-073). `id`, `name`, `phone`, `email`, `question`, `isRead` (see
    ADR-078), `createdAt`. No `updatedAt` — the only post-insert write is
    `markContactSubmissionAsRead` flipping `isRead`. Read by the admin
    Contact dashboard's "Form Response" list/detail view
    (`/admin/contact/form-response`), which also supports deleting a
    submission and re-flagging a read one as unread (`deleteContactSubmission`/
    `markContactSubmissionAsUnread`, same file). `submitContactForm` also
    emails a copy to `info@red-indonesia.co.id` via `sendMail`
    (`src/lib/mailer.ts`, ADR-094) after the row is written; the DB row is
    the source of truth, so a failed send is logged and swallowed rather
    than failing the submission.
  - `HomeCarousel` — a homepage carousel section (see ADR-066).
    `mode: "category" | "custom"` discriminates two authoring paths:
    "category" stores only `categoryId` (a leaf `Category` node — no
    children of its own); its title, product list, and "See More" link are
    resolved live at render time (`src/lib/home-carousels.ts`,
    `getCategoryAncestry` in `src/lib/categories.ts` +
    `getPublishedProductCards`), never snapshotted, so the carousel tracks
    the category's current name/slug/published products automatically.
    "custom" stores `title`, an ordered `items: Json` array
    (`{id, title, img, href}[]`), and `seeMoreUrl` directly. `showSeeMore`
    (boolean) makes the "See More" button optional in either mode.
    `categoryId` uses `onDelete: SetNull` (not `Cascade`) — a deleted
    category leaves the row in place, flagged in the admin as
    "category missing," rather than silently vanishing. `order` scopes a
    single flat list (no sibling grouping, unlike `Category`).
    `titleDisplayMode: "text" | "image"` + `titleImage` (see ADR-067,
    independent of `mode`) let the visible heading be an image (e.g. a
    brand logo) instead of text; the text title (this row's `title`, or the
    category's `name` in "category" mode) is unconditionally required
    either way and always renders as a screen-reader-only heading —
    `ProductHomeSection` already did this unconditionally before this
    feature existed, so no public component change was needed.
  - `PodcastPage` — same shape as `SupportPage`/`ContactPage` (banner-only,
    upsert-by-fixed-slug, see ADR-076; video/cascade fields included, ADR-092).
    Currently one fixed slug (`podcasts`, `PODCAST_PAGE_SLUGS` in
    `src/lib/podcast-page.ts`) feeding the public `/media/podcasts` page's
    banner.
  - `Podcast` — one episode shown on `/media/podcasts` (admin add/edit/
    delete/drag-reorder list, see ADR-076). `id`, `youtubeUrl`, `title`
    (max 50 chars), `description?` (max 200 chars), `thumbnailUrl?`
    (relative path under `/uploads/podcasts-thumbnails`, optional —
    admin-editable but not yet rendered on the public page, see ADR-077),
    `order`, `createdAt`, `updatedAt`. Same shape as `Gallery` minus the
    image grid — a podcast's only media is its one YouTube video, embedded
    via the existing `getYoutubeVideoId` helper.
  - `ArticlesPage` / `GalleriesPage` — same shape as `PodcastPage`
    (banner-only, upsert-by-fixed-slug, see ADR-081; video/cascade fields
    included, ADR-092), one per Media menu. `ArticlesPage`
    (`ARTICLES_PAGE_SLUGS`, currently just `articles`) feeds
    `/media/articles`'s banner; `GalleriesPage` (`GALLERIES_PAGE_SLUGS`,
    currently just `galleries`) feeds `/media/galleries`'s banner. Kept as
    separate models rather than folding into `PodcastPage`, same reasoning
    as `ContactPage` vs `SupportPage` (ADR-072).
  - All five of `SupportPage`/`ContactPage`/`PodcastPage`/`ArticlesPage`/
    `GalleriesPage` render through the one shared public `PageBanner`
    component (`src/app/(user)/components/PageBanner.tsx`), which itself
    delegates the image/video swapping to `PageBannerMedia.tsx` — same
    breakpoint-gated-fetch pattern as the homepage hero's `HeroBannerGroup`
    (ADR-090), just width-only breakpoints (`sm`=640px, `lg`=1024px) instead
    of orientation+width. The cascade resolution itself
    (`resolveCascadingVideoUrls`, `src/lib/banner-video.ts`) is shared with
    `HomePage`'s own resolver rather than reimplemented — see ADR-092.
  - `HomePage` — the homepage hero banner, upsert-by-fixed-slug (currently
    just `"home"`, `HOME_PAGE_SLUGS` in `src/lib/home-page.ts`), managed on
    the admin Homepage → "Content" page (renamed from "Carousel", see
    ADR-082) above the `HomeCarousel` list. Four banner sizes rather than
    the usual three — `bannerSmUrl`/`bannerMdUrl`/`bannerLgUrl`/
    `bannerXlUrl` at 1440x2560/1536x2048/2048x1536/2560x1440 — reusing the
    exact set `Category` established (ADR-035); only `bannerXlUrl` is
    required. Wired to the public homepage hero (`HeroHomeSection`/
    `HeroBannerGroup`), falling back to the static `herobanner-*.webp` images
    for any size the admin hasn't uploaded. Each size also has an optional
    `bannerXxxVideoUrl` (mp4, up to 10MB — see ADR-089): when set, that size's
    still image becomes required and is used as the `<video>` poster and
    error fallback rather than being replaced. Only the breakpoint matching
    the visitor's actual screen ever fetches its video (ADR-090). One global
    `bannerVideoUseForSmaller` flag (not per-size): when on, each size's video
    also plays on every smaller size down the line — Xl, Lg, Md, Sm, in that
    order — with none of its own, until cascading reaches a smaller size with
    its own video, which takes over from there; see `resolveHomeBannerVideoUrls`
    (`src/lib/home-page.ts`) and ADR-091. The breakpoint-gated slot renderer
    (`HeroBannerGroup`) lives in `src/app/(user)/components/HeroBannerGroup.tsx`
    (moved out of the homepage's own route group) since `Category`'s page
    banner shares this exact four-size orientation-paired shape and reuses it
    too, via `resolveCategoryBannerVideoUrls` (`src/lib/categories.ts`) feeding
    `HeroDevice`'s `bannerUrls` prop — see ADR-093.
- **Auth model**: a single shared login for the whole client team — not multi-user,
  not role-based (see ADR-005). Session is a JWT (signed via `jose`) stored in an
  httpOnly, secure, sameSite cookie. `src/middleware.ts` protects every `/admin/*`
  route except `/admin/login`.
- **Admin UI**: lives inside this same Next.js app under `/admin` (list, editor) rather
  than a separate app or subdomain — no extra Nginx config needed since it's just
  another Next.js route.
- **Editor**: Tiptap for rich text, persisted via Server Actions with Zod validation.
- **Image uploads**: local disk, not a hosted service (see ADR-008, superseding
  ADR-007). Server actions call the shared helpers in `src/lib/uploads.ts`, which
  write files to `<UPLOAD_DIR>/<feature>/<uuid>.<ext>` and store the relative
  `/uploads/<feature>/<filename>` URL in the DB.
  - **Production (VPS)**: `UPLOAD_DIR=/var/lib/radian-elok/uploads` (env var, owned
    by the `deploy` user). Nginx serves this directory at `/uploads/` — files written
    at runtime are never placed under `public/`, because the `next start` server only
    serves `public/` assets that existed at build time, and deploys replace the app
    directory.
  - **Route handler** (`src/app/uploads/[...path]/route.ts`): serves the same files
    from inside the app. Required because the `next/image` optimizer resolves relative
    `url=` sources through the Next.js server's own router, never through Nginx —
    without it, `/_next/image?url=%2Fuploads%2F...` fails with "The requested resource
    isn't a valid image". Browser requests still hit Nginx first in production.
  - **Local dev**: `UPLOAD_DIR` is unset, so the helpers fall back to
    `public/uploads`, which `next dev` serves from disk without a restart.
    `public/uploads` is gitignored.

## Infrastructure & Deployment

- **Hosting**: Self-hosted Hostinger VPS (Ubuntu), not Vercel. A non-root `deploy` user
  owns the app; SSH key auth, firewall enabled.
- **Runtime**: Node.js v20 (via NodeSource), Docker (Postgres container), PM2 as the
  process manager. The app runs as PM2 process `red-indonesia` (`npm start`).
- **Reboot persistence**: `pm2 startup systemd` generates `pm2-deploy.service`, scoped
  to `User=deploy` / `PM2_HOME=/home/deploy/.pm2` (must be scoped to `deploy`, not
  `root` — a root-scoped unit resurrects an empty process list on reboot instead of the
  real app). `pm2 save` persists the process list this service resurrects.
- **Reverse proxy**: Nginx serves two sites on the same VPS:
  - `red-indonesia.co.id` → existing WordPress site (PHP-FPM 7.4), untouched.
  - `demo.red-indonesia.co.id` → proxies to `localhost:3000` (this Next.js app). SSL via
    Certbot. DNS is an A record directly to the VPS IP (not a CNAME to Vercel).
- **User uploads (VPS)**: persistent directory `/var/lib/radian-elok/uploads`, owned
  by `deploy`, exposed to the app via `UPLOAD_DIR` in the PM2 environment (`.env`).
  Nginx serves it directly, before the proxy pass, in the app's server block:

  ```nginx
  location /uploads/ {
      alias /var/lib/radian-elok/uploads/;
      expires 30d;
      add_header Cache-Control "public, immutable"; # safe: filenames are UUIDs
  }
  ```

  A large gallery submission passes through three independent body-size ceilings —
  Nginx's `client_max_body_size`, then Next's `proxyClientMaxBodySize`
  (`src/middleware.ts`, Next 16's "proxy"), then `serverActions.bodySizeLimit` (see
  ADR-011) — all defaulting far below what galleries need (1MB/10MB/1MB
  respectively) and each rejecting the request independently of the others raised.
  `next.config.ts` already raises the latter two to `100mb`; Nginx's default
  `client_max_body_size` (1MB) still needs `client_max_body_size 100m;` added to the
  app's `server` block on the VPS to match — that step is manual, Nginx config isn't
  part of this repo.

  One-time migration when rolling this out: `sudo mkdir -p
  /var/lib/radian-elok/uploads && sudo chown -R deploy:deploy /var/lib/radian-elok`,
  then `mv ~/apps/red-indonesia/<repo>/public/uploads/* /var/lib/radian-elok/uploads/`
  so existing DB paths keep resolving. Back up this directory alongside Postgres.
- **Deploy flow**: build/test locally → `git push` → on VPS: `git pull && npm run build
  && pm2 restart red-indonesia`.
- **Planned cutover** (not yet executed): once this app is fully built and verified on
  the `demo.` subdomain, repoint `red-indonesia.co.id` itself from WordPress to
  `localhost:3000` by editing its Nginx server block. Existing SSL cert stays valid.
  Do not perform this until explicitly instructed.
- **Assets**: Images and fonts are served from the `public` directory.
- **Fonts**: Plus Jakarta Sans (local).
- **Outbound email**: `src/lib/mailer.ts` sends via `nodemailer` over the existing
  `info@red-indonesia.co.id` mailbox's SMTP credentials (`SMTP_HOST`, `SMTP_PORT`,
  `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` in `.env`/PM2 environment) rather than a
  transactional email API — see ADR-094. No local MTA is used.

## Future Considerations

- **Search Optimization**: Implementation of a more robust search index if the product count exceeds static search capabilities.

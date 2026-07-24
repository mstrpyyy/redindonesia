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
- Static catalog/marketing content (navigation, product lists, brand information) is
  managed in `src/lib/data.ts` as constant objects.
- CMS content (articles) is stored in PostgreSQL and read via Prisma. `/media/articles`
  queries `Article` directly rather than static data.
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

## Future Considerations

- **Search Optimization**: Implementation of a more robust search index if the product count exceeds static search capabilities.

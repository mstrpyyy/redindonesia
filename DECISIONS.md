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
**Status:** Accepted

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

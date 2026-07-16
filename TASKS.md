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

## [ ] Task: Article editor (`/admin/articles/new`, `/admin/articles/[id]`)

**Context:** Create and edit articles with rich text content.
**Approach:** Tiptap editor bound to `Article.content`; save via Server Actions,
validate with Zod before writing to the DB.
**Files to create or modify:**
- `src/app/admin/articles/new/page.tsx`
- `src/app/admin/articles/[id]/page.tsx`
- `src/app/admin/articles/actions.ts`
**Acceptance criteria:**
- [ ] Title, slug, excerpt, cover image, status, content are all editable.
- [ ] Slug is unique (surfaced as a form error, not a raw DB error).
- [ ] Draft vs. published status controls whether it appears publicly.
**Gemini decision needed if:** Image upload storage approach (local disk vs.
Cloudinary/other) isn't decided yet — do not scaffold upload handling until resolved.

## [ ] Task: Wire public `/media/articles` to the `Article` table

**Context:** The existing site already has a static `/media/articles` route; it needs
to read published articles from the database instead of static data.
**Approach:** Replace static data source with a Prisma query filtered to
`status: "published"`, ordered by `publishedAt desc`.
**Files to create or modify:**
- `src/app/(pages)/media/articles/page.tsx`
**Acceptance criteria:**
- [ ] Only published articles are visible publicly.
- [ ] Existing page layout/styling is preserved.
- [ ] Draft articles are never reachable via direct slug URL either.

# Claude — Developer & Architect

You are the **developer and architect** for this project. You research, plan, decide
architecture and data models, break work into tasks, and implement them. Your job is to
write correct, clean, production-ready code, and to keep `ARCHITECTURE.md`, `DECISIONS.md`,
and `TASKS.md` accurate as the system evolves.

---

## Your Role

- Own `ARCHITECTURE.md` — system design, data flow, infrastructure. Update it when
  reality changes (new infra, new data model, new pattern)
- Own `DECISIONS.md` — record non-trivial technical decisions as a new ADR (context,
  options considered, decision, consequences) at the time they're made. Never edit a
  past ADR in place — supersede it with a new one and mark the old one superseded
- Own `TASKS.md` — break features into implementation-ready tasks, then implement them
- Flag ambiguities before implementing, not after — state your assumption explicitly
  and proceed rather than blocking, unless the decision is genuinely the user's to make
- Mark tasks complete in `TASKS.md` when done (`[ ]` → `[x]`)

---

## How to Write a Task (in `TASKS.md`)

```md
## [ ] Task: <short name>

**Context:** Why this feature exists. What problem it solves.
**Approach:** The specific technical approach to use. Be prescriptive.
**Files to create or modify:**
- /path/to/file.ts — what to do here
**Acceptance criteria:**
- [ ] Criterion one (testable, not vague)
**Do not:** Constraints that must not be violated. Be explicit.
```

Rules for task writing:
- One task = one logical unit of work (one route, one component, one migration)
- Never bundle unrelated changes in one task
- Acceptance criteria must be testable, not vague ("works correctly" is not valid)

## How to Write an ADR (in `DECISIONS.md`)

```md
## ADR-<number>: <Decision title>

**Date:** YYYY-MM-DD
**Status:** Accepted | Superseded by ADR-N

**Context:** What situation forced this decision.
**Options considered:**
1. Option A — pros / cons
2. Option B — pros / cons
**Decision:** What was chosen and why.
**Consequences:** What this means going forward. What becomes easier or harder.
```

---

## Tech Stack

### Frontend
- **Framework**: Next.js (App Router) with TypeScript
- **Styling**: Tailwind CSS utility classes only — no inline styles, no CSS modules
- **Components**: shadcn/ui as the base component library
- **State**: React state / server state — no Redux unless already in the project

### Backend
- **Database**: PostgreSQL via Prisma, self-hosted on the VPS (see `ARCHITECTURE.md`)
- **Auth**: Single shared admin login, JWT in an httpOnly cookie — no NextAuth, no
  OAuth/social login, no multi-user/role system unless a new ADR says otherwise

---

## Project Structure

```
src/
  app/
    (pages)/          # Route groups for main pages (homepage, about, contact, devices)
      (homepage)/
        (sections)/   # Per-page section components
      about/
        (sections)/
      devices/
        [category]/[brand]/[product]/  # Dynamic catalog routes
    admin/             # CMS: login, article list, article editor — session-protected
    components/       # App-level components (navbar, footer, catalogue, etc.)
      catalogue/      # Product catalog UI components
      navbar/         # Navigation components
    globals.css       # Global styles + Tailwind v4 theme
    layout.tsx        # Root layout
  components/
    ui/               # shadcn/ui primitives — do not edit these
  interfaces/         # Shared TypeScript interfaces (used across files)
  lib/
    data.ts           # Static data (navigation, products)
    session.ts         # JWT session helpers for the admin CMS
    utils.ts          # cn() and other shared utilities
  providers/          # Client-side providers (e.g. AOSProvider)
  middleware.ts        # Protects /admin/* routes
prisma/
  schema.prisma        # AdminAccount, Article, and future CMS models
  seed.ts               # Seeds the single AdminAccount
TASKS.md              # Work queue — always check this first
ARCHITECTURE.md       # System design — read before touching anything
DECISIONS.md          # Why things are the way they are
```

---

## Conventions

### TypeScript
- Strict mode is on — `noImplicitAny`, `strictNullChecks` always enforced
- No `any`. If you truly need an escape hatch, use `unknown` and narrow it
- No `// @ts-ignore` — fix the type, don't suppress it
- Export types and interfaces from `src/interfaces/` if used across more than one file

### Components
- Use shadcn/ui primitives — don't rebuild what already exists (`Button`, `Input`,
  `Dialog`, `Card`, `Table`, etc.)
- Prefer server components by default in Next.js App Router
- Use `"use client"` only when you need interactivity or browser APIs
- No inline styles — Tailwind classes only
- Co-locate component-specific utils in the same file unless they're reused elsewhere

### API & Server Actions
- Prefer server actions over API routes for mutations in Next.js
- For API routes or Express routes: always validate request body with Zod before touching
  the database
- Return consistent error shapes:
  ```ts
  { success: false, error: { code: string, message: string } }
  { success: true, data: T }
  ```
- Never expose raw database errors to the client

### Database
- Follow the schema and approach documented in `ARCHITECTURE.md`
- Changing the schema in a way not yet documented there requires updating
  `ARCHITECTURE.md`/`DECISIONS.md` first, then the migration
- Raw SQL string interpolation is banned regardless of context — parameterized queries only

### Naming
- Files: `kebab-case.ts` for utilities, `PascalCase.tsx` for components
- Functions: `camelCase`
- Types/Interfaces: `PascalCase`, prefix interfaces with `I` (e.g. `INavbarMenu`) — this
  is the established pattern in this project
- Database columns: `snake_case` (Prisma maps these automatically)
- Env variables: `SCREAMING_SNAKE_CASE`

---

## How to Start a Task

1. Read `TASKS.md` — find the first unchecked `[ ]` task
2. Read the full task card: context, approach, files, acceptance criteria, constraints
3. Read the relevant section of `ARCHITECTURE.md` before writing any code
4. If anything in the spec is ambiguous, **state your assumption explicitly** in a comment
   at the top of the relevant file: `// ASSUMPTION: ...`
5. Implement — follow the approach in the spec
6. Verify all acceptance criteria are met before marking done
7. Mark the task `[x]` in `TASKS.md`
8. If the task involved a real architectural decision, record it in `DECISIONS.md`

---

## When to Stop and Flag

Add a comment `// DECISION NEEDED: <reason>` and stop implementing if:

- The task would require modifying the database schema in a destructive way (dropping
  columns/tables with existing data) without an explicit go-ahead
- Something in the spec is technically impossible as written
- The decision is genuinely the user's to make (cost tradeoffs, third-party service
  choice with pricing/ToS implications, anything irreversible)

Otherwise, decide, document the decision as an ADR, and proceed.

---

## Code Quality Rules

- No `console.log` left in committed code — use a logger if debug output is needed
- No commented-out code blocks — delete it, git has history
- No TODOs in code unless explicitly deferring something — in that case:
  `// TODO(task-N): <what and why>`
- Every async function must handle errors — no unhandled promise rejections
- Zod schemas live next to the route or action that uses them, not in a global schemas file

---

## What Good Output Looks Like

When you complete a task, briefly summarize:
- What files you created or modified
- Any assumptions you made
- Any `DECISIONS NEEDED` flags you left and why
- Whether all acceptance criteria are met

Keep it short. One paragraph is enough.

---

## Hard Rules

- String-interpolated SQL is banned — always use parameterized queries
- Never store secrets (passwords, JWT secrets, DB credentials) in committed code — env vars only
- Destructive schema changes (dropping columns/tables with data) require explicit user
  confirmation before running, even after being documented in an ADR

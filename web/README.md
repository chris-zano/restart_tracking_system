# Restart — Next.js Export

This folder is a starter conversion of the HTML prototype into your stack:
**Next.js (App Router) + TypeScript + shadcn/ui + react-hook-form + zod + papaparse**.

It is opinionated about structure and types, and explicitly stubbed wherever it
needs to talk to your backend. Search for `// TODO:` to find every wire-up point.

---

## 1. Drop into your repo

Copy the contents of `nextjs-export/` into the **root** of your Next.js app
(merging `app/`, `lib/`, etc. with what you already have).

```bash
cp -r nextjs-export/* /path/to/your/repo/
```

## 2. Install dependencies

```bash
pnpm add jose papaparse react-hook-form zod @hookform/resolvers \
         date-fns lucide-react sonner clsx tailwind-merge \
         class-variance-authority

pnpm add -D @types/papaparse
```

shadcn primitives used (run once if you haven't already):

```bash
npx shadcn@latest init
npx shadcn@latest add button card input label select textarea \
  dialog sheet tabs table badge accordion separator \
  dropdown-menu avatar sonner progress checkbox
```

## 3. Environment variables

Create `.env.local`:

```
RESTART_API_BASE_URL=http://localhost:8080
JWT_SECRET=<same-secret-your-backend-uses-to-sign-tokens>
```

The frontend never signs tokens — it only **verifies** them server-side and
**forwards** the raw JWT to your backend in `Authorization: Bearer …`. The
secret is needed only if you want to validate signatures locally; if you'd
rather skip and trust the backend, see `lib/auth.ts`.

## 4. Routing model

The OpenAPI spec is split between two scopes — **admin** (no tenant) and
**instructor** (one tenant per JWT). We chose **URL-based multi-tenancy** for
the instructor scope per your direction:

```
app/
  (public)/
    login/page.tsx                    instructor login (tenant in form)
    admin/login/page.tsx              admin login
  admin/                              ADMIN scope — global, no tenant
    page.tsx                          overview
    tenants/
    weekly-targets/
    attendance/
    audit-logs/
  [tenant]/instructor/                INSTRUCTOR scope — tenant in URL
    page.tsx                          home
    cohorts/
    learners/
    attendance/                       Zoom CSV upload flow
    assignments/                      Canvas gradebook flow
    weekly-targets/                   read-only view
```

`middleware.ts` enforces:

- Anything under `/admin/**` requires a valid JWT with `role === "ADMIN"`.
- Anything under `/[tenant]/instructor/**` requires a valid JWT with
  `role === "INSTRUCTOR"` **and** `tenantId === <tenant param>` — preventing
  one instructor from peeking into another tenant's URL.

## 5. Mismatches with the OpenAPI spec — read this

The prototype made some simplifications. Reconciled in this export:

- **WeeklyTarget = `labs: string[]` + `knowledgeChecks: string[]`** (per spec).
  The week cards display counts (`labs.length` / `knowledgeChecks.length`); the
  editor is a tag-style multi-input. The Assignment Report matches Canvas
  gradebook columns to these names — that's why the backend needs the names,
  not just counts.
- **Week numbers are `WEEK_1..WEEK_10`** (10 weeks per the enum).
- **Tracks have no endpoints** in your spec yet. `lib/api/tracks.ts` is stubbed
  with `// TODO: needs backend endpoint`. Until then, hard-code tracks in
  `lib/tracks-temp.ts` or wire to whatever you build.
- **Assignment Report is unimplemented in the backend.** The frontend uploads
  a CSV to `/api/upload/gradebook` (a Next.js route handler that parses with
  papaparse) and computes the per-learner-per-week breakdown client-side from
  the weekly targets. When the backend ships, swap the route handler for a
  call to your endpoint.
- **Zoom CSV** is parsed entirely client-side. Only `participants[]` (resolved
  to `learnerId`s) is sent to `POST /api/instructor/attendance` per spec.
- **Cohort name uniqueness** — the spec doesn't enforce it. We let the form
  submit anything.

## 6. File uploads

Two routes, both server-side parsers:

- `app/api/upload/zoom-csv/route.ts` — accepts a `multipart/form-data` upload,
  parses with papaparse, returns the rows. Used by the attendance flow.
- `app/api/upload/gradebook/route.ts` — same idea for the Canvas gradebook.

Neither route persists the file. They parse → return JSON → the client renders
the matching/review UI → submits a clean payload to the typed Spring API.

## 7. Server Actions vs. client fetch

- **Mutations** (login, create cohort, record attendance, etc.) → Server Actions
  in `app/actions/`. They read the JWT from cookies, call the Spring API
  server-side, and return either typed data or a `{ ok: false, error }` shape.
- **Reads** in pages → Server Components calling `lib/api/*` directly.
- **Reads triggered by client interaction** (e.g. live search) → Server Action,
  not direct fetch from the client. The browser never sees `RESTART_API_BASE_URL`
  or the JWT.

## 8. Auth flow

1. User submits login form → Server Action calls Spring's `/api/auth/login`
   (instructor) or `/api/auth/admin/login` (admin).
2. Server Action stores the returned JWT in an **httpOnly cookie** named
   `restart_token`. We also decode and store role + tenantId in
   `restart_session` (non-httpOnly, for the client to render role-gated UI —
   non-sensitive metadata only).
3. Middleware reads `restart_token` on every request and hard-redirects if
   missing/expired/wrong-role.
4. Logout is a Server Action that clears both cookies.

## 9. Where to start customizing

- **Theming** — your existing shadcn theme will style everything. The accent
  scheme from the prototype isn't carried over; you can re-apply it via
  shadcn's CSS variables if you want.
- **Layout chrome** — `app/admin/layout.tsx` and
  `app/[tenant]/instructor/layout.tsx` each have a sidebar + header. Replace
  with your existing app shell if you have one.
- **Loading / error UI** — every server-rendered page can have `loading.tsx`
  and `error.tsx` siblings. We ship sensible defaults; replace with your house
  style.

## 10. What's NOT included

- Real session management beyond cookies (no refresh tokens; the JWT is just
  forwarded until it expires, then the user re-logs).
- Tests.
- A track-management UI (no backend endpoint yet).
- Fancy charts on the home page — placeholder cards.
- Mobile breakpoints beyond shadcn defaults.

---

Open `MIGRATION.md` after copying for a checklist of integration steps.

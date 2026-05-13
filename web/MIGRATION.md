# Migration checklist

Use this as a step-by-step when integrating into your existing repo.

## ☐ 1. Merge files

Copy everything from `nextjs-export/` into your repo root. Resolve any
collisions in `app/layout.tsx` and `tailwind.config.ts` by keeping yours and
adding the imports from this export.

## ☐ 2. Install deps

```bash
pnpm add jose papaparse react-hook-form zod @hookform/resolvers \
         date-fns lucide-react sonner clsx tailwind-merge \
         class-variance-authority
pnpm add -D @types/papaparse
```

## ☐ 3. shadcn primitives

```bash
npx shadcn@latest add button card input label select textarea dialog sheet \
  tabs table badge accordion separator dropdown-menu avatar sonner progress \
  checkbox
```

## ☐ 4. Env

```
RESTART_API_BASE_URL=http://localhost:8080
JWT_SECRET=<same-as-backend>
```

## ☐ 5. Wire `<Toaster />`

Add `<Toaster />` from `sonner` to your root `app/layout.tsx`.

## ☐ 6. Verify these route shapes against your backend

- `/api/auth/login` — instructor login expects `X-Tenant-ID` header. ✅
- `/api/instructor/attendance` — payload is `{cohortId, sessionDate, duration, participants:[{learnerId, duration}]}`. ✅
- `/api/admin/weekly-targets` — `{trackId, weekNumber, labs[], knowledgeChecks[]}`. ✅

If anything diverges, fix in `lib/api/*.ts` (single source of truth for the
HTTP surface).

## ☐ 7. Decide on tracks

Until your backend ships track endpoints:

- Edit `lib/tracks-temp.ts` and put your real track ids/names there, OR
- Add the endpoints and remove the temp file.

## ☐ 8. Decide on assignment report storage

Right now `app/api/upload/gradebook/route.ts` parses the CSV and the client
computes per-week buckets in memory. Nothing is persisted. When you ship the
backend endpoint:

- Move the parsing into your Spring service.
- Replace the route handler with a Server Action that calls your endpoint.
- Keep the same accordion UI — just feed it from the API response.

## ☐ 9. Cookie security

`lib/auth.ts` sets cookies with `httpOnly: true, sameSite: 'lax', secure: true`
in production. If you're not on HTTPS in dev, that's fine — `secure` is gated
to production.

## ☐ 10. Smoke test

1. Login as admin.
2. Create a tenant.
3. Provision an instructor.
4. Login as that instructor.
5. Add a learner.
6. Bulk-import a CSV.
7. Record attendance from a Zoom CSV.
8. Upload a Canvas gradebook.

If 1–6 work, the auth + API plumbing is correct. 7–8 exercise the upload
routes.

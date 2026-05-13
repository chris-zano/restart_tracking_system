# Restart API — Frontend Integration Guide

> **Companion file**: `docs/api-contract.yaml` — OpenAPI 3.0 spec, importable into Postman,
> Insomnia, or any OpenAPI viewer (e.g. [Swagger Editor](https://editor.swagger.io)).

---

Resume this session with:
claude --resume e7922102-f12b-480e-b2ee-46ef4ab59c5b

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Authentication Flow](#2-authentication-flow)
3. [Making Authenticated Requests](#3-making-authenticated-requests)
4. [Multi-Tenancy — What the Frontend Must Know](#4-multi-tenancy--what-the-frontend-must-know)
5. [Response Envelope](#5-response-envelope)
6. [Error Handling](#6-error-handling)
7. [Roles and Route Protection](#7-roles-and-route-protection)
8. [Resource Reference](#8-resource-reference)
9. [Bulk CSV Upload Flow](#9-bulk-csv-upload-flow)
10. [Audit Logs](#10-audit-logs)
11. [CORS Configuration](#11-cors-configuration)
12. [Recommended Next.js Integration Pattern](#12-recommended-nextjs-integration-pattern)

---

## 1. Architecture Overview

```
┌─────────────────────────────┐
│         Next.js App         │
│  /admin/**   /instructor/** │
└──────────────┬──────────────┘
               │ HTTPS + JWT (Bearer)
               ▼
┌─────────────────────────────┐
│    Spring Boot API (8080)   │
├─────────────────────────────┤
│  PUBLIC SCHEMA              │  ← admin_users, tenants, tracks,
│  (admin data)               │    weekly_targets, audit_logs
├─────────────────────────────┤
│  TENANT SCHEMA: kwame_mensah│  ← users, cohorts, learners, attendance
│  TENANT SCHEMA: ama_owusu   │  ← ... (fully isolated)
│  TENANT SCHEMA: ...         │
└─────────────────────────────┘
```

There are two completely separate user roles:

| Role | Login Endpoint | Where data lives |
|---|---|---|
| **ADMIN** | `POST /api/auth/admin/login` | `public` schema |
| **INSTRUCTOR** | `POST /api/auth/login` + `X-Tenant-ID` header | Tenant-specific schema |

---

## 2. Authentication Flow

### Admin Login

```http
POST /api/auth/admin/login
Content-Type: application/json

{
  "username": "admin",
  "password": "secret123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiJ9..."
  }
}
```

### Instructor Login

The instructor login requires an **`X-Tenant-ID` header** identifying which tenant schema
to authenticate against. This is the only request that needs this header.

```http
POST /api/auth/login
Content-Type: application/json
X-Tenant-ID: kwame_mensah

{
  "username": "kwame",
  "password": "myPassword"
}
```

**Why is X-Tenant-ID needed for login?**
Because "kwame" in `kwame_mensah`'s schema and "kwame" in `ama_owusu`'s schema are entirely
different database rows. The API needs to know which schema to query. After login the JWT
itself embeds the `tenantId` — no further `X-Tenant-ID` headers are needed.

---

## 3. Making Authenticated Requests

Send the JWT as a Bearer token on every protected request:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...
```

### Storing the Token (Next.js)

Store the JWT in an **`httpOnly` cookie** via a Next.js API route. This prevents XSS
access to the token:

```typescript
// app/api/auth/login/route.ts  (Next.js App Router)
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { username, password, tenantId } = await req.json()

  const headers: HeadersInit = { 'Content-Type': 'application/json' }
  if (tenantId) headers['X-Tenant-ID'] = tenantId

  const endpoint = tenantId
    ? `${process.env.API_URL}/api/auth/login`
    : `${process.env.API_URL}/api/auth/admin/login`

  const res = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({ username, password }),
  })

  const body = await res.json()
  if (!body.success) return NextResponse.json(body, { status: 401 })

  const cookieStore = await cookies()
  cookieStore.set('restart_token', body.data.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 86400, // 24 hours (matches JWT expiry)
    path: '/',
  })

  return NextResponse.json({ success: true })
}
```

### Calling the API from Server Components

Read the cookie on the server side and inject the `Authorization` header — the JWT
never reaches the browser:

```typescript
// lib/api.ts
import { cookies } from 'next/headers'

export async function apiFetch(path: string, init?: RequestInit) {
  const cookieStore = await cookies()
  const token = cookieStore.get('restart_token')?.value

  return fetch(`${process.env.API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  })
}
```

---

## 4. Multi-Tenancy — What the Frontend Must Know

| What | Where it comes from | When to use it |
|---|---|---|
| `schemaName` | From `GET /api/tenants` or JWT `tenantId` claim | Admin endpoints that target a specific tenant |
| `X-Tenant-ID` header | You know this from the login form (instructor selects their school) | **Only** on `POST /api/auth/login` |
| JWT `tenantId` claim | Decoded from the instructor's JWT | Automatically used by the backend — no action needed |

### Decoding the JWT (for role-based UI)

```typescript
// lib/jwt.ts — runs on server only
import { jwtDecode } from 'jwt-decode'

interface RestartJwt {
  sub: string        // username
  role: 'ADMIN' | 'INSTRUCTOR'
  tenantId: string | null   // null for admin
  exp: number
}

export function decodeToken(token: string): RestartJwt {
  return jwtDecode<RestartJwt>(token)
}
```

Use this in Next.js `middleware.ts` to protect routes:

```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { jwtDecode } from 'jwt-decode'

export function middleware(req: NextRequest) {
  const token = req.cookies.get('restart_token')?.value
  if (!token) return NextResponse.redirect(new URL('/login', req.url))

  const { role, exp } = jwtDecode<{ role: string; exp: number }>(token)

  if (Date.now() / 1000 > exp) {
    // Token expired — redirect to login
    const res = NextResponse.redirect(new URL('/login', req.url))
    res.cookies.delete('restart_token')
    return res
  }

  if (req.nextUrl.pathname.startsWith('/admin') && role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/forbidden', req.url))
  }
  if (req.nextUrl.pathname.startsWith('/instructor') && role !== 'INSTRUCTOR') {
    return NextResponse.redirect(new URL('/forbidden', req.url))
  }
}

export const config = {
  matcher: ['/admin/:path*', '/instructor/:path*'],
}
```

---

## 5. Response Envelope

Every response — success or error — uses this shape:

```typescript
interface ApiResponse<T> {
  success: boolean
  message: string
  data: T | null
}
```

**Success (201):**
```json
{
  "success": true,
  "message": "Learner created",
  "data": {
    "id": 42,
    "fullname": "Kofi Mensah",
    "email": "kofi@university.edu.gh",
    "phone": "0241234567",
    "university": "UG",
    "graduated": false,
    "cohortId": 1,
    "createdAt": "2026-05-02T10:30:00"
  }
}
```

**Error (404):**
```json
{
  "success": false,
  "message": "Learner not found: 99",
  "data": null
}
```

---

## 6. Error Handling

| HTTP Status | Meaning | Frontend action |
|---|---|---|
| `400 Bad Request` | Validation failed. `message` contains the first failing field. | Show `message` below the relevant field |
| `401 Unauthorized` | Token missing, expired, or invalid | Redirect to login, clear cookie |
| `403 Forbidden` | Valid token but wrong role | Show forbidden page |
| `404 Not Found` | Resource or tenant doesn't exist | Show not-found UI |
| `405 Method Not Allowed` | HTTP method not supported (e.g. POST on a read-only admin endpoint) | Bug in frontend — should never reach users |
| `500 Internal Server Error` | Unexpected server failure | Show generic error, log to Sentry |

---

## 7. Roles and Route Protection

### Admin can:
- All of `/api/tenants/**`
- All of `/api/admin/**`

### Instructor can:
- All of `/api/instructor/**`
- Token must carry their `tenantId` — this is set automatically at login

### Admin acting on a tenant's behalf:
Admin endpoints that modify tenant data follow the pattern:
```
/api/admin/tenants/{schemaName}/[resource]
```
The `schemaName` path variable tells the backend which schema to switch to.

**Admin read-only on attendance** — admin can `GET` attendance records for any tenant
but cannot create/update/delete them. These belong exclusively to the instructor.

---

## 8. Resource Reference

### Learner — phone validation

Ghanaian mobile number: 10 digits, starting with `02`, `03`, `04`, or `05`.

```
Valid:   0241234567  0271234567  0551234567  0301234567
Invalid: 1234567890  024123456 (9 digits)  0611234567
```

### Attendance — participants array

```json
{
  "cohortId": 1,
  "sessionDate": "2026-05-02",
  "duration": 120,
  "participants": [
    { "learnerId": 1, "duration": 120 },
    { "learnerId": 2, "duration": 90 }
  ]
}
```

- All `learnerId` values are validated server-side — if any ID doesn't exist in the
  tenant's `learners` table, the entire request is rejected with `404`.
- `duration` (root level) = total session length in **minutes**.
- `duration` inside each participant = how long that person was present.

### Weekly Targets — week number enum

```
WEEK_1 | WEEK_2 | WEEK_3 | WEEK_4 | WEEK_5
WEEK_6 | WEEK_7 | WEEK_8 | WEEK_9 | WEEK_10
```

The combination `(trackId, weekNumber)` is unique — only one target set per week per track.

### Cohort → Track → Weekly Targets (linking curriculum)

```
Track (admin creates)
  └─ WeeklyTarget × 10 (admin populates)

Cohort (instructor creates, sets trackId)
  └─ Learners
  └─ Attendance records
```

To display the current week's labs and knowledge checks for a cohort:
1. Get cohort: `GET /api/instructor/cohorts/{cohortId}` → read `trackId`
2. Get weekly target: `GET /api/admin/weekly-targets/track/{trackId}/week/WEEK_3`

---

## 9. Bulk CSV Upload Flow

The backend accepts a pre-parsed JSON array — it does **not** accept raw CSV. The frontend
is responsible for parsing the CSV file. Recommended library: [`papaparse`](https://www.papaparse.com/).

```typescript
import Papa from 'papaparse'

function parseLearnersCsv(file: File): Promise<LearnerRequest[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const learners = results.data.map((row: any) => ({
          fullname: row['Full Name'],
          email: row['Email'],
          phone: row['Phone'],
          university: row['University'] ?? null,
          graduated: row['Graduated']?.toLowerCase() === 'true',
          cohortId: row['Cohort ID'] ? Number(row['Cohort ID']) : null,
        }))
        resolve(learners)
      },
      error: reject,
    })
  })
}

// Then send to API
const learners = await parseLearnersCsv(file)
const res = await apiFetch('/api/instructor/learners/bulk', {
  method: 'POST',
  body: JSON.stringify(learners),
})
```

**Expected CSV column headers:**
```
Full Name, Email, Phone, University, Graduated, Cohort ID
```

**Atomicity**: If any single row fails validation (e.g. invalid phone), the entire batch
is rejected and zero records are saved. Show the error `message` to the user so they can
fix the CSV and retry.

---

## 10. Audit Logs

Every API call is recorded. The admin can view them at:

```
GET /api/admin/audit-logs?actorUsername=kwame&page=0&size=20
GET /api/admin/audit-logs?tenantId=kwame_mensah
GET /api/admin/audit-logs?resourceType=LEARNER
GET /api/admin/audit-logs?action=CREATE_ATTENDANCE
```

**Response is paginated:**
```json
{
  "success": true,
  "data": {
    "content": [ { "id": 1, "action": "CREATE_LEARNER", ... } ],
    "totalElements": 150,
    "totalPages": 8,
    "size": 20,
    "number": 0
  }
}
```

**Known action strings:**

| Resource | Actions |
|---|---|
| COHORT | `CREATE_COHORT`, `LIST_COHORTS`, `GET_COHORT`, `UPDATE_COHORT`, `DELETE_COHORT` |
| LEARNER | `CREATE_LEARNER`, `BULK_CREATE_LEARNER`, `LIST_LEARNERS`, `GET_LEARNER`, `UPDATE_LEARNER`, `DELETE_LEARNER` |
| ATTENDANCE | `CREATE_ATTENDANCE`, `LIST_ATTENDANCE`, `LIST_ATTENDANCE_BY_COHORT`, `GET_ATTENDANCE`, `UPDATE_ATTENDANCE`, `DELETE_ATTENDANCE` |
| INSTRUCTOR | `CREATE_INSTRUCTOR`, `LIST_INSTRUCTORS`, `DELETE_INSTRUCTOR` |
| WEEKLY_TARGET | `CREATE_WEEKLY_TARGET`, `GET_WEEKLY_TARGET`, `UPDATE_WEEKLY_TARGET`, `DELETE_WEEKLY_TARGET` |
| LEARNER (admin) | `ADMIN_CREATE_LEARNER`, `ADMIN_BULK_CREATE_LEARNER`, `ADMIN_LIST_LEARNERS`, `ADMIN_GET_LEARNER`, `ADMIN_UPDATE_LEARNER`, `ADMIN_DELETE_LEARNER` |
| ATTENDANCE (admin) | `ADMIN_LIST_ATTENDANCE`, `ADMIN_LIST_ATTENDANCE_BY_COHORT`, `ADMIN_GET_ATTENDANCE` |

---

## 11. CORS Configuration

The backend needs to be configured to allow requests from the Next.js origin. Add this
to `SecurityConfig.java` before going to production:

```java
// In SecurityConfig.securityFilterChain()
.cors(cors -> cors.configurationSource(request -> {
    var config = new CorsConfiguration();
    config.setAllowedOrigins(List.of(
        "http://localhost:3000",     // Next.js dev
        "https://restart.csniico.com" // Production
    ));
    config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
    config.setAllowedHeaders(List.of("*"));
    config.setAllowCredentials(true);
    return config;
}))
```

---

## 12. Recommended Next.js Integration Pattern

### Directory structure

```
restart-web/
├── app/
│   ├── (auth)/
│   │   └── login/page.tsx
│   ├── admin/
│   │   ├── layout.tsx          ← checks role === ADMIN
│   │   ├── page.tsx            ← tenant list dashboard
│   │   ├── tenants/[schema]/
│   │   │   ├── page.tsx        ← tenant detail: instructors, learners, attendance
│   │   │   └── attendance/page.tsx
│   │   ├── weekly-targets/page.tsx
│   │   └── audit-logs/page.tsx
│   └── instructor/
│       ├── layout.tsx          ← checks role === INSTRUCTOR
│       ├── cohorts/page.tsx
│       ├── learners/page.tsx
│       └── attendance/page.tsx
├── lib/
│   ├── api.ts                  ← apiFetch() using httpOnly cookie
│   └── jwt.ts                  ← decodeToken()
└── middleware.ts               ← route protection
```

### Environment variables

```
# .env.local
API_URL=http://localhost:8080
```

### TypeScript types (generated from OpenAPI spec)

Use [openapi-typescript](https://www.npmjs.com/package/openapi-typescript) to generate
types from `docs/api-contract.yaml` automatically:

```bash
npx openapi-typescript ../restart/docs/api-contract.yaml -o lib/api-types.ts
```

Run this whenever the backend API changes.


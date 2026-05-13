/**
 * Thin typed HTTP client around the Spring Restart API.
 *
 * SERVER-ONLY. Every call reads the JWT from the cookie via getToken() and
 * forwards it to Spring as a Bearer header. Pages call these from Server
 * Components or Server Actions; the browser never sees them.
 *
 * Conventions:
 * - Every fn returns the unwrapped `data` from the {success, message, data}
 *   envelope.
 * - On non-2xx, we throw `ApiError` with the parsed message.
 * - Never log the token; never log full responses (PII).
 */

import "server-only";
import { getToken } from "../auth";
import type { ApiEnvelope } from "../types";

export class ApiError extends Error {
  constructor(public status: number, message: string, public body?: unknown) {
    super(message);
    this.name = "ApiError";
  }
}

const BASE = process.env.RESTART_API_BASE_URL ?? "http://localhost:8080";

type FetchOpts = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  /** Used only on /api/auth/login — every other request derives tenant from JWT. */
  tenantId?: string;
  /** Override or extend cache. Defaults to no-store for mutations, default for GET. */
  cache?: RequestCache;
  /** Extra headers (rare). */
  headers?: Record<string, string>;
};

export async function api<T>(path: string, opts: FetchOpts = {}): Promise<T> {
  const { method = "GET", body, tenantId, cache, headers = {} } = opts;
  const token = await getToken();

  const finalHeaders: Record<string, string> = {
    Accept: "application/json",
    ...headers,
  };
  if (body !== undefined) finalHeaders["Content-Type"] = "application/json";
  if (token) finalHeaders.Authorization = `Bearer ${token}`;
  if (tenantId) finalHeaders["X-Tenant-ID"] = tenantId;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: finalHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: cache ?? (method === "GET" ? "default" : "no-store"),
  });

  let parsed: ApiEnvelope<T> | { message?: string } | null = null;
  try { parsed = await res.json(); } catch { /* empty response is fine */ }

  if (!res.ok) {
    const msg = (parsed as { message?: string } | null)?.message ?? `HTTP ${res.status}`;
    throw new ApiError(res.status, msg, parsed);
  }

  // 2xx with no body
  if (parsed === null) return undefined as T;

  // Spring envelope: {success, message, data}
  if (typeof parsed === "object" && parsed !== null && "data" in parsed) {
    return (parsed as ApiEnvelope<T>).data;
  }
  return parsed as T;
}

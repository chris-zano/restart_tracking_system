/**
 * Server-only auth helpers.
 *
 * Cookies:
 *   restart_token    httpOnly  the raw JWT — forwarded to Spring as Bearer
 *   restart_session  not-httpOnly  small JSON {role, tenantId, username} for
 *                                  client-side role-gated UI rendering only
 *
 * The frontend NEVER signs tokens. We only verify them locally via JWT_SECRET
 * to short-circuit obviously-expired requests in middleware. The Spring API
 * is the source of truth.
 */

import { cookies } from "next/headers";
import { jwtVerify, decodeJwt } from "jose";
import type { SessionClaims } from "./types";

const TOKEN_COOKIE = "restart_token";
const SESSION_COOKIE = "restart_session";

const SECRET = process.env.JWT_SECRET
  ? new TextEncoder().encode(process.env.JWT_SECRET)
  : null;

/**
 * Read + verify the JWT cookie. Returns null if missing / expired / invalid.
 *
 * If JWT_SECRET isn't set we fall back to **decode-without-verify** — fine for
 * UI gating because the backend re-validates every call, but you should set
 * the secret in production.
 */
export async function getSession(): Promise<SessionClaims | null> {
  const c = await cookies();
  const token = c.get(TOKEN_COOKIE)?.value;
  if (!token) return null;

  try {
    if (SECRET) {
      const { payload } = await jwtVerify(token, SECRET);
      return payload as unknown as SessionClaims;
    }
    return decodeJwt(token) as unknown as SessionClaims;
  } catch {
    return null;
  }
}

/** Synchronous version for places where we just need claims (no verify). */
export function decodeSession(token: string): SessionClaims | null {
  try {
    return decodeJwt(token) as unknown as SessionClaims;
  } catch {
    return null;
  }
}

export async function getToken(): Promise<string | null> {
  const c = await cookies();
  return c.get(TOKEN_COOKIE)?.value ?? null;
}

export async function setSession(token: string) {
  const claims = decodeSession(token);
  if (!claims) throw new Error("Invalid token");
  const c = await cookies();
  const isProd = process.env.NODE_ENV === "production";
  const maxAge = Math.max(0, claims.exp - Math.floor(Date.now() / 1000));

  c.set(TOKEN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    path: "/",
    maxAge,
  });

  c.set(
    SESSION_COOKIE,
    JSON.stringify({
      username: claims.sub,
      role: claims.role,
      tenantId: claims.tenantId,
    }),
    {
      httpOnly: false,
      sameSite: "lax",
      secure: isProd,
      path: "/",
      maxAge,
    },
  );
}

export async function clearSession() {
  const c = await cookies();
  c.delete(TOKEN_COOKIE);
  c.delete(SESSION_COOKIE);
}

/** Throw if the current session isn't an admin. */
export async function requireAdmin(): Promise<SessionClaims> {
  const s = await getSession();
  if (!s || s.role !== "ADMIN") throw new Error("Unauthorized: admin required");
  return s;
}

/** Throw if the current session isn't an instructor for `tenantId`. */
export async function requireInstructor(tenantId?: string): Promise<SessionClaims> {
  const s = await getSession();
  if (!s || s.role !== "INSTRUCTOR") throw new Error("Unauthorized: instructor required");
  if (tenantId && s.tenantId !== tenantId) {
    throw new Error(`Unauthorized: tenant mismatch (token=${s.tenantId}, url=${tenantId})`);
  }
  return s;
}

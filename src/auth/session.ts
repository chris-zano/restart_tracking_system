/**
 * Simple in-memory session store.
 * Guest access uses a plain cookie value; admin uses a server-side session.
 */

export type Role = "admin" | "guest";

interface Session {
  role: Role;
  expiresAt: number;
}

const ADMIN_SESSION_TTL = 8 * 60 * 60 * 1000; // 8 hours
const store = new Map<string, Session>();

// ── Hardcoded admin credentials ────────────────────────────────────────────
export const ADMIN_EMAIL = "christian.solomon@amalitech.com";
export const ADMIN_PASSWORD = "secureP@55w0Rd!234";
export const ADMIN_OTP = "104803";

// ── Session management ─────────────────────────────────────────────────────

/** Create a new admin session and return the session ID */
export function createAdminSession(): string {
  const id = crypto.randomUUID();
  store.set(id, { role: "admin", expiresAt: Date.now() + ADMIN_SESSION_TTL });
  return id;
}

/** Delete a session */
export function deleteSession(id: string): void {
  store.delete(id);
}

// ── Cookie helpers ─────────────────────────────────────────────────────────

const COOKIE_NAME = "auth";

/** Build a Set-Cookie header for a guest */
export function guestCookie(): string {
  return `${COOKIE_NAME}=guest; HttpOnly; SameSite=Lax; Path=/; Max-Age=${7 * 24 * 3600}`;
}

/** Build a Set-Cookie header for an admin session */
export function adminCookie(sessionId: string): string {
  const maxAge = Math.floor(ADMIN_SESSION_TTL / 1000);
  return `${COOKIE_NAME}=${sessionId}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}

/** Build a Set-Cookie header that clears auth */
export function clearCookie(): string {
  return `${COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;
}

/** Extract role from a request. Returns null if unauthenticated. */
export function getRole(req: Request): Role | null {
  const cookie = req.headers.get("cookie") ?? "";
  const match = cookie.match(/(?:^|;\s*)auth=([^;]+)/);
  if (!match || !match[1]) return null;
  const value = match[1];
  if (value === "guest") return "guest";
  // Treat as session ID
  const session = store.get(value);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    store.delete(value);
    return null;
  }
  return session.role;
}

/** Extract raw cookie value (session ID or 'guest') from request */
export function getCookieValue(req: Request): string | null {
  const cookie = req.headers.get("cookie") ?? "";
  const match = cookie.match(/(?:^|;\s*)auth=([^;]+)/);
  return match?.[1] ?? null;
}

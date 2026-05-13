/**
 * Edge-runtime middleware. Protects route trees:
 *   /admin/**                  → role=ADMIN
 *   /[tenant]/instructor/**    → role=INSTRUCTOR && tenantId === <tenant>
 *
 * We deliberately do NOT verify JWT signatures here (no Node crypto in edge
 * runtime + we'd need to ship JWT_SECRET to edge). Instead we decode and check
 * the exp + role + tenant claims; the Spring API re-validates every call.
 *
 * Unauthenticated → /login (or /admin/login for admin routes).
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decodeJwt } from "jose";

const ADMIN_LOGIN = "/admin/login";
const PUBLIC_LOGIN = "/login";

export const config = {
  matcher: [
    "/admin/:path*",
    "/((?!_next|api|favicon.ico|login|admin/login).*)/instructor/:path*",
  ],
};

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("restart_token")?.value;

  // Decode (no verify) just to check claims — backend is source of truth
  let claims: { role?: string; tenantId?: string | null; exp?: number } | null = null;
  if (token) {
    try { claims = decodeJwt(token); } catch { claims = null; }
    if (claims?.exp && claims.exp * 1000 < Date.now()) claims = null;
  }

  // ADMIN
  if (pathname.startsWith("/admin") && pathname !== ADMIN_LOGIN) {
    if (!claims || claims.role !== "ADMIN") {
      const url = req.nextUrl.clone();
      url.pathname = ADMIN_LOGIN;
      url.searchParams.set("from", pathname);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // INSTRUCTOR — /[tenant]/instructor/...
  const m = pathname.match(/^\/([^/]+)\/instructor(\/|$)/);
  if (m) {
    const urlTenant = m[1];
    if (!claims || claims.role !== "INSTRUCTOR" || claims.tenantId !== urlTenant) {
      const url = req.nextUrl.clone();
      url.pathname = PUBLIC_LOGIN;
      url.searchParams.set("from", pathname);
      url.searchParams.set("tenant", urlTenant);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

/**
 * API Server
 */

import { logger } from "../utils/logger";
import {
  healthHandler,
  studentsHandler,
  analysisHandler,
  attendanceHandler,
  homeHandler,
  studentsHtmlHandler,
  analysisHtmlHandler,
  attendanceHtmlHandler,
} from "./routes";
import {
  getRole,
  createAdminSession,
  guestCookie,
  adminCookie,
  clearCookie,
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  ADMIN_OTP,
} from "../auth/session";
import { renderLoginPage } from "../auth/login-page";
import type { Server } from "bun";

/** Redirect helper */
function redirect(to: string, extraHeaders?: Record<string, string>): Response {
  return new Response(null, {
    status: 302,
    headers: { Location: to, ...extraHeaders },
  });
}

/**
 * Start the API server
 */
export function startServer(port: number = 3000) {
  const server = Bun.serve({
    port,
    async fetch(req) {
      const url = new URL(req.url);
      const path = url.pathname;

      // ── Public auth routes (no session required) ────────────────────────
      if (path === "/login") {
        return new Response(renderLoginPage(), {
          headers: { "Content-Type": "text/html" },
        });
      }

      if (path === "/auth/guest" && req.method === "POST") {
        return redirect("/", { "Set-Cookie": guestCookie() });
      }

      if (path === "/auth/admin-login" && req.method === "POST") {
        const body = (await req.json().catch(() => ({}))) as Record<
          string,
          string
        >;
        if (
          body.email?.trim() === ADMIN_EMAIL &&
          body.password === ADMIN_PASSWORD
        ) {
          return Response.json({ ok: true });
        }
        return Response.json(
          { error: "Invalid email or password." },
          { status: 401 },
        );
      }

      if (path === "/auth/admin-verify" && req.method === "POST") {
        const body = (await req.json().catch(() => ({}))) as Record<
          string,
          string
        >;
        if (body.otp?.trim() === ADMIN_OTP) {
          const sessionId = createAdminSession();
          return Response.json(
            { ok: true },
            { headers: { "Set-Cookie": adminCookie(sessionId) } },
          );
        }
        return Response.json(
          { error: "Invalid verification code." },
          { status: 401 },
        );
      }

      if (path === "/logout") {
        return redirect("/login", { "Set-Cookie": clearCookie() });
      }

      // ── Auth guard ──────────────────────────────────────────────────────
      const role = getRole(req);

      if (!role) {
        return redirect("/login");
      }

      // Guests cannot access /students
      if (role === "guest" && path === "/students") {
        return redirect("/");
      }

      // ── Protected routes ────────────────────────────────────────────────

      if (path === "/" || path === "/index.html") {
        return homeHandler(req);
      }

      if (path === "/students") {
        return await studentsHtmlHandler(req);
      }

      if (path === "/analysis") {
        return await analysisHtmlHandler(req);
      }

      if (path === "/attendance") {
        return await attendanceHtmlHandler(req);
      }

      if (path === "/health") {
        return healthHandler();
      }

      // JSON API (admin only)
      if (role === "guest") {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (path === "/api/students") {
        return await studentsHandler();
      }

      if (path === "/api/analysis") {
        return await analysisHandler();
      }

      if (path === "/api/attendance") {
        return await attendanceHandler();
      }

      // 404
      return new Response(
        "<h1>404 Not Found</h1><p><a href='/'>Go Home</a></p>",
        {
          headers: { "Content-Type": "text/html" },
          status: 404,
        },
      );
    },
  });

  logger.section("API Server Started");
  logger.success(`Listening on http://localhost:${server.port}`);
  logger.line();
  logger.info("Press Ctrl+C to stop");

  return server;
}

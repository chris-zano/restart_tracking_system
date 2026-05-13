"use server";

import { redirect } from "next/navigation";
import { authApi } from "@/lib/api/auth";
import { setSession, clearSession, decodeSession } from "@/lib/auth";
import { ApiError } from "@/lib/api/_client";

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export async function adminLogin(_: unknown, formData: FormData): Promise<ActionResult> {
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");
  try {
    const { token } = await authApi.adminLogin({ username, password });
    await setSession(token);
  } catch (e) {
    return { ok: false, error: e instanceof ApiError ? e.message : "Login failed" };
  }
  redirect("/admin");
}

export async function instructorLogin(_: unknown, formData: FormData): Promise<ActionResult> {
  const tenantId = String(formData.get("tenantId") ?? "");
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");
  if (!tenantId) return { ok: false, error: "Tenant is required" };
  try {
    const { token } = await authApi.instructorLogin(tenantId, { username, password });
    const claims = decodeSession(token);
    if (!claims || claims.tenantId !== tenantId) {
      return { ok: false, error: "Token tenant mismatch — contact support" };
    }
    await setSession(token);
  } catch (e) {
    return { ok: false, error: e instanceof ApiError ? e.message : "Login failed" };
  }
  redirect(`/${tenantId}/instructor`);
}

export async function logout() {
  await clearSession();
  redirect("/login");
}

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function Home() {
  const s = await getSession();
  if (!s) redirect("/login");
  if (s.role === "ADMIN") redirect("/admin");
  if (s.role === "INSTRUCTOR" && s.tenantId) redirect(`/${s.tenantId}/instructor`);
  redirect("/login");
}

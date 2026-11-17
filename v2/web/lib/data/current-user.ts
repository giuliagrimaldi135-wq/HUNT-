import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// The browser session, not a service-role client, owns all user records.
export async function authenticatedContext() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (error || !userId) redirect("/login");
  return { supabase, userId: String(userId) };
}

export function publicHttpsUrl(raw: unknown): string | null {
  try {
    const u = new URL(String(raw || ""));
    if (u.protocol !== "https:" || u.username || u.password) return null;
    return u.href;
  } catch { return null; }
}

export function textList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string" && v.trim().length > 0) : [];
}

"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseConfig } from "./config";
import type { Database } from "@/lib/database.types";

export function createClient() {
  const { url, key } = getSupabaseConfig();
  return createBrowserClient<Database>(url, key);
}

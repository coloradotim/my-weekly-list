"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseConfig } from "@/lib/supabase/env";

export function createSupabaseBrowserClient() {
  const config = getSupabaseConfig();

  if (config.status === "missing") {
    throw new Error(`Missing Supabase env vars: ${config.missing.join(", ")}`);
  }

  return createBrowserClient(config.url, config.anonKey);
}

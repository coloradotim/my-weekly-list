export type SupabaseConfig =
  | {
      status: "configured";
      url: string;
      anonKey: string;
    }
  | {
      status: "missing";
      missing: string[];
    };

export function getSupabaseConfig(): SupabaseConfig {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const missing: string[] = [];

  if (!url) {
    missing.push("NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!anonKey) {
    missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  if (!url || !anonKey) {
    return { status: "missing", missing };
  }

  return {
    status: "configured",
    url: url,
    anonKey: anonKey,
  };
}

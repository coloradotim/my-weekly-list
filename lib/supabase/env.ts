export type SupabaseConfig =
  | {
      status: "configured";
      url: string;
      publishableKey: string;
    }
  | {
      status: "missing";
      missing: string[];
    };

export function getSupabaseConfig(): SupabaseConfig {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  const missing: string[] = [];

  if (!url) {
    missing.push("NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!publishableKey) {
    missing.push("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  }

  if (!url || !publishableKey) {
    return { status: "missing", missing };
  }

  return {
    status: "configured",
    url: url,
    publishableKey: publishableKey,
  };
}

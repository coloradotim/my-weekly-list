import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

export function getAdminClientFromEnv() {
  const url = process.env.SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const missing = [];

  if (!url) {
    missing.push("SUPABASE_URL");
  }

  if (!serviceRoleKey) {
    missing.push("SUPABASE_SERVICE_ROLE_KEY");
  }

  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(", ")}`);
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function getEmailArg(argv) {
  const email = argv[2]?.trim().toLowerCase();

  if (!email || !email.includes("@")) {
    throw new Error("Usage: node <script> user@example.com [temporary-password]");
  }

  return email;
}

export function getTemporaryPassword(argv) {
  return argv[3] ?? generateTemporaryPassword();
}

export function generateTemporaryPassword() {
  return `Mwl-${randomBytes(18).toString("base64url")}-1a`;
}

export async function findUserByEmail(supabase, email) {
  let page = 1;

  while (page <= 50) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 200,
    });

    if (error) {
      throw error;
    }

    const user = data.users.find((candidate) => candidate.email?.toLowerCase() === email);

    if (user) {
      return user;
    }

    if (data.users.length < 200) {
      return null;
    }

    page += 1;
  }

  return null;
}

export async function upsertAccessProfile({
  supabase,
  userId,
  email,
  isAllowed,
  mustChangePassword,
}) {
  const { error } = await supabase.from("profiles").upsert(
    {
      id: userId,
      email,
      is_allowed: isAllowed,
      must_change_password: mustChangePassword,
    },
    { onConflict: "id" },
  );

  if (error) {
    throw error;
  }
}

#!/usr/bin/env node

import {
  findUserByEmail,
  getAdminClientFromEnv,
  getEmailArg,
  upsertAccessProfile,
} from "./lib/admin-users.mjs";

async function main() {
  const email = getEmailArg(process.argv);
  const supabase = getAdminClientFromEnv();
  const user = await findUserByEmail(supabase, email);

  if (!user) {
    throw new Error(`No Supabase Auth user found for ${email}.`);
  }

  await upsertAccessProfile({
    supabase,
    userId: user.id,
    email,
    isAllowed: false,
    mustChangePassword: false,
  });

  console.log(`Disabled app access for ${email}.`);
  console.log("Historical weekly-list data was not deleted.");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

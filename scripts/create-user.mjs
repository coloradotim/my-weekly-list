#!/usr/bin/env node

import {
  findUserByEmail,
  getAdminClientFromEnv,
  getEmailArg,
  getTemporaryPassword,
  upsertAccessProfile,
} from "./lib/admin-users.mjs";

async function main() {
  const email = getEmailArg(process.argv);
  const temporaryPassword = getTemporaryPassword(process.argv);
  const supabase = getAdminClientFromEnv();
  let user = await findUserByEmail(supabase, email);

  if (user) {
    const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
      password: temporaryPassword,
      email_confirm: true,
    });

    if (error) {
      throw error;
    }

    user = data.user;
    console.log(`User already existed. Password reset for ${email}.`);
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
    });

    if (error) {
      throw error;
    }

    user = data.user;
    console.log(`Created user ${email}.`);
  }

  await upsertAccessProfile({
    supabase,
    userId: user.id,
    email,
    isAllowed: true,
    mustChangePassword: true,
  });

  console.log("Temporary password:");
  console.log(temporaryPassword);
  console.log("The user must change this password in the app before normal access.");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

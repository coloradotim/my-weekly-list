export type AuthAccess =
  | { status: "allowed"; email: string }
  | { status: "missing-allowed-email" }
  | { status: "missing-user-email" }
  | { status: "unauthorized"; email: string; allowedEmail: string };

export function normalizeEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() ?? "";
}

export function getAllowedUserEmail() {
  return normalizeEmail(process.env.ALLOWED_USER_EMAIL);
}

export function checkAllowedUser(
  userEmail: string | null | undefined,
  allowedEmail = getAllowedUserEmail(),
): AuthAccess {
  const normalizedAllowedEmail = normalizeEmail(allowedEmail);
  const normalizedUserEmail = normalizeEmail(userEmail);

  if (!normalizedAllowedEmail) {
    return { status: "missing-allowed-email" };
  }

  if (!normalizedUserEmail) {
    return { status: "missing-user-email" };
  }

  if (normalizedUserEmail !== normalizedAllowedEmail) {
    return {
      status: "unauthorized",
      email: normalizedUserEmail,
      allowedEmail: normalizedAllowedEmail,
    };
  }

  return { status: "allowed", email: normalizedUserEmail };
}

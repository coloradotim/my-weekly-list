#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://localhost:3000}"
SIGN_OUT_URL="${BASE_URL%/}/auth/sign-out"

if command -v open >/dev/null 2>&1; then
  open "$SIGN_OUT_URL"
  echo "Opened $SIGN_OUT_URL in your browser."
else
  echo "Open this URL in the browser session you want to sign out:"
  echo "$SIGN_OUT_URL"
fi

echo "This signs out the current browser session and asks Supabase to invalidate refresh tokens for the account."

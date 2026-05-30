#!/usr/bin/env bash
set -euo pipefail

# shellcheck source=scripts/supabase-env.sh
source "$(dirname "$0")/supabase-env.sh"
load_supabase_env

if ! command -v supabase >/dev/null 2>&1; then
  echo "Supabase CLI is not installed or is not on PATH." >&2
  echo "Install it, then rerun this script." >&2
  exit 1
fi

if [[ -z "${SUPABASE_PROJECT_REF:-}" ]]; then
  echo "SUPABASE_PROJECT_REF is required." >&2
  exit 1
fi

if [[ -z "${SUPABASE_DB_PASSWORD:-}" ]]; then
  echo "SUPABASE_DB_PASSWORD is required for non-interactive linked-project commands." >&2
  exit 1
fi

echo "Supabase CLI: $(supabase --version)"
echo "Linking Supabase project ${SUPABASE_PROJECT_REF}..."
supabase link \
  --project-ref "${SUPABASE_PROJECT_REF}" \
  --password "${SUPABASE_DB_PASSWORD}"

echo "Current linked-project migration state:"
supabase migration list \
  --linked \
  --password "${SUPABASE_DB_PASSWORD}"

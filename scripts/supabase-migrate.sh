#!/usr/bin/env bash
set -euo pipefail

MODE="${SUPABASE_MIGRATION_MODE:-dry-run}"

if [[ "${MODE}" != "dry-run" && "${MODE}" != "apply" ]]; then
  echo "SUPABASE_MIGRATION_MODE must be 'dry-run' or 'apply'." >&2
  exit 1
fi

if [[ -z "${SUPABASE_PROJECT_REF:-}" ]]; then
  echo "SUPABASE_PROJECT_REF is required." >&2
  exit 1
fi

if [[ -z "${SUPABASE_DB_PASSWORD:-}" ]]; then
  echo "SUPABASE_DB_PASSWORD is required for non-interactive migration commands." >&2
  exit 1
fi

"$(dirname "$0")/supabase-status.sh"

if [[ "${MODE}" == "dry-run" ]]; then
  echo "Dry run: migrations that would be applied:"
  supabase db push \
    --linked \
    --dry-run \
    --password "${SUPABASE_DB_PASSWORD}"
else
  echo "Applying migrations to linked Supabase project ${SUPABASE_PROJECT_REF}..."
  supabase db push \
    --linked \
    --password "${SUPABASE_DB_PASSWORD}"

  echo "Migration state after apply:"
  supabase migration list \
    --linked \
    --password "${SUPABASE_DB_PASSWORD}"
fi

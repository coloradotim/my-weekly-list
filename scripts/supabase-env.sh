#!/usr/bin/env bash

load_supabase_env() {
  local env_file="${SUPABASE_ENV_FILE:-.env.supabase.local}"

  if [[ ! -f "${env_file}" ]]; then
    return 0
  fi

  set -a
  # shellcheck disable=SC1090
  source "${env_file}"
  set +a
}


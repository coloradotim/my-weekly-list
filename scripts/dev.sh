#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STATE_DIR="$ROOT_DIR/.dev"
PID_FILE="$STATE_DIR/server.pid"
LOG_FILE="$STATE_DIR/server.log"
DEV_HOST="${DEV_HOST:-127.0.0.1}"
DEV_PORT="${DEV_PORT:-3000}"
DEV_URL="http://$DEV_HOST:$DEV_PORT"

usage() {
  cat <<'USAGE'
Usage: scripts/dev.sh <command>

Commands:
  start     Start the Next.js dev server in the background.
  stop      Stop the Next.js dev server.
  restart   Stop, then start the Next.js dev server.
  status    Show server status and local URL.
  logs      Show the dev server log file location.
  open      Open the local app URL in the default browser.

Environment:
  DEV_HOST   Host for next dev. Default: 127.0.0.1
  DEV_PORT   Port for next dev. Default: 3000

USAGE
}

ensure_state_dir() {
  mkdir -p "$STATE_DIR"
}

is_running() {
  local pid="${1:-}"
  [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null
}

pid_from_file() {
  local pid_file="$1"
  if [[ -f "$pid_file" ]]; then
    cat "$pid_file"
  fi
}

pids_on_port() {
  local port="$1"
  lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true
}

wait_for_port() {
  local port="$1"

  for _attempt in {1..80}; do
    if [[ -n "$(pids_on_port "$port")" ]]; then
      return
    fi
    sleep 0.1
  done

  echo "Dev server did not start listening on port $port. Check logs with: scripts/dev.sh logs" >&2
  exit 1
}

stop_pid() {
  local pid="$1"

  if ! is_running "$pid"; then
    return
  fi

  echo "Stopping dev server process $pid..."
  kill "$pid" 2>/dev/null || true

  for _attempt in {1..25}; do
    if ! is_running "$pid"; then
      return
    fi
    sleep 0.2
  done

  echo "Dev server process $pid did not exit after SIGTERM; sending SIGKILL."
  kill -KILL "$pid" 2>/dev/null || true
}

stop_port() {
  local pids
  pids="$(pids_on_port "$DEV_PORT")"
  if [[ -z "$pids" ]]; then
    return
  fi

  while IFS= read -r pid; do
    [[ -z "$pid" ]] && continue
    stop_pid "$pid"
  done <<< "$pids"
}

start_server() {
  local existing_pid port_pids
  ensure_state_dir
  existing_pid="$(pid_from_file "$PID_FILE" || true)"
  port_pids="$(pids_on_port "$DEV_PORT")"

  if [[ -n "$port_pids" ]]; then
    echo "Dev server already running at $DEV_URL (pid(s): ${port_pids//$'\n'/, })."
    return
  fi

  if is_running "$existing_pid"; then
    echo "Dev server already running at $DEV_URL (pid $existing_pid)."
    return
  fi

  if [[ ! -d "$ROOT_DIR/node_modules" ]]; then
    echo "Missing node_modules." >&2
    echo "Run: npm install" >&2
    exit 1
  fi

  echo "Starting dev server at $DEV_URL..."
  (
    cd "$ROOT_DIR"
    exec npm run dev -- --hostname "$DEV_HOST" --port "$DEV_PORT"
  ) >"$LOG_FILE" 2>&1 &
  echo "$!" >"$PID_FILE"

  wait_for_port "$DEV_PORT"
  status
}

stop_server() {
  ensure_state_dir

  local pid
  pid="$(pid_from_file "$PID_FILE" || true)"

  if is_running "$pid"; then
    stop_pid "$pid"
  fi

  stop_port
  rm -f "$PID_FILE"
  echo "Stopped My Weekly List dev server."
}

status() {
  ensure_state_dir

  local pids
  pids="$(pids_on_port "$DEV_PORT")"

  if [[ -n "$pids" ]]; then
    echo "Dev server: running at $DEV_URL (pid(s): ${pids//$'\n'/, })"
  else
    echo "Dev server: stopped"
  fi
}

logs() {
  ensure_state_dir
  echo "Dev server log: $LOG_FILE"
}

open_app() {
  if [[ -z "$(pids_on_port "$DEV_PORT")" ]]; then
    start_server
  fi

  echo "Opening $DEV_URL..."
  if command -v open >/dev/null 2>&1; then
    open "$DEV_URL"
  else
    echo "$DEV_URL"
  fi
}

command="${1:-}"
case "$command" in
  start)
    start_server
    ;;
  stop)
    stop_server
    ;;
  restart)
    stop_server
    start_server
    ;;
  status)
    status
    ;;
  logs)
    logs
    ;;
  open|connect)
    open_app
    ;;
  ""|-h|--help|help)
    usage
    ;;
  *)
    echo "Unknown command: $command"
    usage
    exit 1
    ;;
esac

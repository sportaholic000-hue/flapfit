#!/usr/bin/env bash
set -euo pipefail

# This Expo app is the `mobile` workspace in the monorepo two directories up.
MODE="${1:-start}"
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MONOREPO_DIR="$(cd "$APP_DIR/../.." && pwd)"
WORKSPACE_NAME="mobile"

show_usage() {
  cat <<'USAGE'
usage: ./script/build_and_run.sh [mode]

Modes:
  start, run        Start the Expo Go development server on the LAN
  --ios, ios        Start Expo and open iOS
  --android, android
                   Start Expo and open Android
  --web, web        Start Expo for web
  --dev-client, dev-client
                   Start Expo in development-client mode
  --tunnel, tunnel Start Expo using tunnel transport
  --export-web, export-web
                   Export the web build locally
  --doctor, doctor Run Expo diagnostics
  --help, help     Show this help
USAGE
}

resolve_yarn_cmd() {
  if command -v corepack >/dev/null 2>&1; then
    # Corepack honors the Yarn version declared in the monorepo package.json.
    YARN_CMD=(corepack yarn)
  elif command -v yarn >/dev/null 2>&1; then
    YARN_CMD=(yarn)
  else
    YARN_CMD=()
  fi
}

run_expo() {
  if [[ ${#YARN_CMD[@]} -gt 0 ]]; then
    cd "$MONOREPO_DIR"
    exec "${YARN_CMD[@]}" workspace "$WORKSPACE_NAME" exec expo "$@"
  fi

  # Safe fallback for machines without Corepack/Yarn.
  cd "$APP_DIR"
  exec npx expo "$@"
}

run_doctor() {
  if [[ ${#YARN_CMD[@]} -gt 0 ]]; then
    cd "$MONOREPO_DIR"
    exec "${YARN_CMD[@]}" workspace "$WORKSPACE_NAME" exec expo-doctor
  fi

  cd "$APP_DIR"
  exec npx expo-doctor
}

case "$MODE" in
  start|run)
    # LAN produces the Expo Go QR flow for a phone on the same network.
    resolve_yarn_cmd
    run_expo start --lan
    ;;
  --ios|ios)
    resolve_yarn_cmd
    run_expo start --ios
    ;;
  --android|android)
    resolve_yarn_cmd
    run_expo start --android
    ;;
  --web|web)
    resolve_yarn_cmd
    run_expo start --web
    ;;
  --dev-client|dev-client)
    resolve_yarn_cmd
    run_expo start --dev-client
    ;;
  --tunnel|tunnel)
    resolve_yarn_cmd
    run_expo start --tunnel
    ;;
  --export-web|export-web)
    resolve_yarn_cmd
    run_expo export --platform web
    ;;
  --doctor|doctor)
    resolve_yarn_cmd
    run_doctor
    ;;
  --help|help)
    show_usage
    ;;
  *)
    show_usage >&2
    exit 2
    ;;
esac
